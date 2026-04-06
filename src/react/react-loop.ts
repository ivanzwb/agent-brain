import {
  CognitivePhase,
  StepPhase,
  TaskStatus,
  TerminationReason,
  type Assessment,
  type ExecuteResult,
  type Message,
  type ModelResponse,
  type PlanStep,
  type PlanStepResult,
  type StepLog,
  type ToolDefinition,
  type Plan,
  type IModelClient,
  type IEventPublisher,
} from '../types';
import { LoopController } from './loop-controller';
import { TokenTracker } from '../token/token-tracker';
import { PromptBudget } from '../token/prompt-budget';
import { MemoryHub } from '../memory/memory-hub';
import { InnateToolHub } from '../innate-tools/innate-tool-hub';
import type { SkillHub } from '../skill/skill-hub';

// ============================================================
// ReactLoop — EXECUTE 阶段的 Thought→Action→Observation 内循环
// ============================================================

export interface ReactLoopDeps {
  controller: LoopController;
  model: IModelClient;
  memory?: MemoryHub;
  /** 天生工具提供者（系统内建，固定不变） */
  innateToolHub: InnateToolHub;
  /** 技能中心（预装技能，不支持动态安装） */
  skillHub: SkillHub;
  budget: PromptBudget;
  eventPublisher?: IEventPublisher;
  tracker: TokenTracker;
}

export interface ReactLoopContext {
  /** 外层传入的系统提示 + 认知阶段引导 */
  systemPrompt: string;
  /** PLAN 阶段产出的执行计划 */
  plan: Plan;
  /** ASSESS 阶段产出（含技能缺口信息） */
  assessment: Assessment;
  /** 思维模式引导文本 */
  thinkingGuidance: string;
  /** 用户的上下文信息（包含之前通过 ask_user 提供的信息） */
  userContext?: string;
}

export class ReactLoop {
  private readonly innateToolHub: InnateToolHub;
  private readonly skillHub: SkillHub;

  constructor(private readonly deps: ReactLoopDeps) {
    this.innateToolHub = deps.innateToolHub;
    this.skillHub = deps.skillHub;
  }

  async run(ctx: ReactLoopContext): Promise<ExecuteResult> {
    const { controller, eventPublisher } = this.deps;
    const allSteps: StepLog[] = [];
    const planStepResults: PlanStepResult[] = [];

    // 按依赖顺序逐步执行，每步一个独立 ReAct 循环
    // 上一步的 output 作为下一步的输入上下文
    const stepOutputs = new Map<string, string>();

    controller.start();

    for (const planStep of ctx.plan.steps) {
      // 收集该步骤依赖的前置步骤输出
      const priorContext = this.collectPriorOutputs(planStep, stepOutputs);

      eventPublisher?.publish('planStep:start', { stepId: planStep.id, description: planStep.description });

      const stepResult = await this.runPlanStep(ctx, planStep, priorContext);

      allSteps.push(...stepResult.steps);
      planStepResults.push(stepResult);

      if (stepResult.output) {
        stepOutputs.set(planStep.id, stepResult.output);
      }

      eventPublisher?.publish('planStep:end', {
        stepId: planStep.id,
        terminationReason: stepResult.terminationReason,
        output: stepResult.output,
      });

      // 如果某步非正常完成，终止后续步骤
      if (stepResult.terminationReason !== TerminationReason.COMPLETED) {
        return this.buildResult(allSteps, planStepResults, stepResult.terminationReason, stepResult.output);
      }
    }

    // 所有步骤完成，最后一步的 output 作为最终答案
    const lastOutput = planStepResults[planStepResults.length - 1]?.output;
    return this.buildResult(allSteps, planStepResults, TerminationReason.COMPLETED, lastOutput);
  }

  // ===========================================================
  // 单个计划步骤的 ReAct 内循环
  // ===========================================================

  private async runPlanStep(
    ctx: ReactLoopContext,
    planStep: PlanStep,
    priorContext: string,
  ): Promise<PlanStepResult> {
    const { controller, model, memory, budget, eventPublisher, tracker } = this.deps;
    const steps: StepLog[] = [];

    // 构建计划概览文本（静态）
    const planOverview = this.buildPlanOverviewText(ctx.plan);

    // 记忆只在每个 PlanStep 开始时检索一次，作为初始上下文
    let memoryText = '';
    if (memory) {
      try {
        const memoryQuery = `${ctx.plan.strategy} ${planStep.description}`;
        const result = await memory.memory_search({ query: memoryQuery, topK: 3 });
        const data = JSON.parse(result);
        memoryText = data.results?.map((r: { value: string }) => r.value).join('\n') ?? '';
      } catch {
        // 记忆检索失败不应阻塞执行
      }
    }
    // 构建初始消息
    const systemPrompt = this.buildSystemPrompt(ctx, planOverview, planStep, memoryText);

    const userPrompt = this.buildUserPrompt(ctx.plan, planStep, priorContext, ctx.userContext);

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // 注入用户之前通过 ask_user 提供的所有上下文
    const userProvidedContext = this.innateToolHub.getUserProvidedContext();
    if (userProvidedContext.length > 0) {
      const contextStr = userProvidedContext.map((ctx, i) => `[Response ${i + 1}]: ${ctx}`).join('\n\n');
      messages.push({
        role: 'user',
        content: `[Previous User Responses from ask_user tool]\n${contextStr}\n\nIMPORTANT: Use the information above instead of asking for it again.`,
      });
    }

    // 天生工具
    const innateTools = this.innateToolHub.getTools();
    let skillTools: ToolDefinition[] = [];

    while (true) {
      await controller.waitIfPaused();

      const termCheck = controller.checkTermination();
      if (termCheck.shouldTerminate) {
        return {
          stepId: planStep.id,
          steps,
          terminationReason: termCheck.reason ?? TerminationReason.MAX_STEPS_REACHED,
        };
      }

      controller.incrementStep();
      controller.updateHeartbeat();

      const allTools = [...innateTools, ...skillTools];

      // ---- THOUGHT + (optional) ACTION ----
      let response: ModelResponse;
      try {
        const trimmedMessages = budget.trimMessages(messages, budget.remaining(messages, allTools), 2, 4);
        tracker.trackPrompt(trimmedMessages, allTools);
        response = await model.chat(trimmedMessages, allTools);
        tracker.trackCompletion(response.content);
      } catch (err) {
        controller.recordFailure();
        steps.push(this.logStep(controller.currentStep, StepPhase.THOUGHT, `[Model Error] ${String(err)}`));
        eventPublisher?.publish('step:error', { step: controller.currentStep, error: String(err) });
        continue;
      }

      controller.resetFailures();

      // 记录 THOUGHT
      steps.push(this.logStep(controller.currentStep, StepPhase.THOUGHT, response.content));
      messages.push({ role: 'assistant', content: response.content, toolCall: response.toolCall });
      eventPublisher?.publish('step:thought', { step: controller.currentStep, content: response.content });

      // 无工具调用 → 该步骤完成
      if (!response.toolCall) {
        return {
          stepId: planStep.id,
          steps,
          output: response.content,
          terminationReason: TerminationReason.COMPLETED,
        };
      }
      // 记录 ACTION
      const call = response.toolCall;
      steps.push(this.logStep(controller.currentStep, StepPhase.ACTION, `${call.name}(${JSON.stringify(call.arguments)})`, call.name, call.arguments));
      eventPublisher?.publish('step:action', { step: controller.currentStep, tool: call.name, args: call.arguments });

      // ---- OBSERVATION ----
      // 天生工具优先，找不到则尝试技能工具
      let observation: string;
      if (this.innateToolHub.hasTool(call.name)) {
        try {
          observation = await this.innateToolHub.execute(call.name, call.arguments);
          if (call.name === 'skill_load_main' || call.name === 'skill_load_reference') {
            const skillName: string = call.arguments['skillName'] as string;
            skillTools = this.skillHub.getTools(skillName);
          }
        } catch (err) {
          controller.recordFailure();
          observation = `[Error] Tool execution failed: ${String(err)}`;
        }
      } else {
        try {
          const skillName: string = call.arguments['skillName'] as string;
          observation = await this.skillHub.execute(skillName, call.name, call.arguments);
        } catch (err) {
          controller.recordFailure();
          observation = `[Error] Tool execution failed: ${String(err)}`;
        }
      }
      steps.push(this.logStep(controller.currentStep, StepPhase.OBSERVATION, observation));
      messages.push({ role: 'tool', content: observation, toolCallId: call.id });
      eventPublisher?.publish('step:observation', { step: controller.currentStep, content: observation });
    }
  }

  // ----- private helpers -----

  /**
   * 收集该步骤依赖的前置步骤输出，拼接为上下文文本。
   */
  private collectPriorOutputs(planStep: PlanStep, stepOutputs: Map<string, string>): string {
    if (planStep.dependsOn.length === 0) return '';
    const parts: string[] = [];
    for (const depId of planStep.dependsOn) {
      const output = stepOutputs.get(depId);
      if (output) {
        parts.push(`[Output from step ${depId}]\n${output}`);
      }
    }
    return parts.join('\n\n');
  }

  /**
   * 构建计划概览文本（静态，每个 PlanStep 内不变）。
   */
  private buildPlanOverviewText(plan: Plan): string {
    const lines: string[] = [
      '[Execution Plan]',
      `Strategy: ${plan.strategy}`,
    ];
    for (const step of plan.steps) {
      const deps = step.dependsOn.length > 0 ? ` (after: ${step.dependsOn.join(', ')})` : '';
      lines.push(`  ${step.id}: ${step.description}${deps}`);
    }
    lines.push(`Expected outcome: ${plan.expectedOutcome}`);
    return lines.join('\n');
  }

  /**
   * 构建 system prompt：基础身份 + ReAct 协议 + 计划概览 + 当前步骤 + 记忆。
   */
  private buildSystemPrompt(
    ctx: ReactLoopContext,
    planOverview: string,
    planStep: PlanStep,
    memoryText: string,
  ): string {
    const parts: string[] = [
      ctx.systemPrompt,
      '',
      REACT_PROTOCOL,
      '',
      ctx.thinkingGuidance,
      '',
      planOverview,
      '',
      `[Current Step]`,
      `Step ${planStep.id}: ${planStep.description}`,
      'You are executing ONLY this step. Do not proceed to the next step.',
    ];
    // 技能目录（预装技能，固定不变）
    const skillCatalogText = this.buildSkillCatalogText();
    if (skillCatalogText) {
      parts.push('', skillCatalogText);
    }
    if (memoryText) {
      parts.push('', '[Context from Memory]', memoryText);
    }
    return parts.join('\n');
  }

  /**
   * 构建 user prompt：策略 + 当前步骤目标 + 前置输出 + 行动指令。
   */
  private buildUserPrompt(plan: Plan, planStep: PlanStep, priorContext: string, userContext?: string): string {
    const lines: string[] = [
      `Strategy: ${plan.strategy}`,
      '',
      `Your task: Execute step ${planStep.id} — ${planStep.description}`,
    ];
    if (priorContext) {
      lines.push('', '[Prior Step Outputs]', priorContext);
    }
    if (userContext) {
      lines.push('', '[User Provided Context (from ask_user tool)]', userContext);
    }
    lines.push(
      '',
      `Overall expected outcome: ${plan.expectedOutcome}`,
      '',
      'Begin working on this step. Use the Thought→Action→Observation cycle.',
      'When the step is complete, respond with your final output WITHOUT calling any tool.',
    );
    return lines.join('\n');
  }

  /**
   * 构建已安装技能的目录文本。
   */
  private buildSkillCatalogText(): string {
    const descriptions = this.skillHub.getSkillsDescription();
    if (descriptions.length === 0) return '';
    const lines: string[] = ['[Installed Skills]'];
    for (const desc of descriptions) {
      lines.push(`  - ${desc}`);
    }
    return lines.join('\n');
  }

  private logStep(
    stepNumber: number,
    phase: StepPhase,
    content: string,
    toolName?: string,
    toolArguments?: Record<string, unknown>,
  ): StepLog {
    return {
      stepNumber,
      cognitivePhase: CognitivePhase.EXECUTE,
      phase,
      content,
      toolName,
      toolArguments,
      timestamp: Date.now(),
    };
  }

  private buildResult(
    steps: StepLog[],
    planStepResults: PlanStepResult[],
    reason: TerminationReason,
    finalAnswer?: string,
  ): ExecuteResult {
    const status =
      reason === TerminationReason.COMPLETED
        ? TaskStatus.COMPLETED
        : reason === TerminationReason.USER_TERMINATED
          ? TaskStatus.TERMINATED
          : TaskStatus.FAILED;

    return { status, finalAnswer, steps, planStepResults, terminationReason: reason };
  }
}

// ============================================================
// ReAct 行为协议 — 指导模型遵循 Thought→Action→Observation 循环
// ============================================================

const REACT_PROTOCOL = `[ReAct Protocol]
You operate in a Thought → Action → Observation loop:

1. **Thought**: Analyze the current situation. What do you know? What do you need? What's the best next action?
   - If this is the first iteration, review the step goal and available context.
   - If you have observations from previous actions, reason about what they tell you.
   - Consider whether you have enough information to complete the step.

2. **Action**: Call exactly ONE tool to make progress.
   - Choose the most appropriate tool for your current need.

3. **Observation**: You will receive the tool's output. Use it in your next Thought.

**Completion**: When you have enough information to provide the step's output, respond with your final answer WITHOUT calling any tool.

**Error handling**: If a tool fails, reason about alternatives in your next Thought.

**Constraints**:
- Execute ONLY the current step. Do not attempt subsequent steps.
- Each response should contain either a Thought + tool call, or a final answer.
- Stay focused on the step objective.`;
