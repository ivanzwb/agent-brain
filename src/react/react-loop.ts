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
import type { ActionCategory, SecuritySandbox } from '../sandbox/security-sandbox';
import { renderPrompt } from '../prompts/prompt-system';
import { buildPlanStepSystemPrompt } from './plan-step-prompt';

// ============================================================
// ReactLoop — Inner loop (Thought→Action→Observation) within EXECUTE phase
// ============================================================

export interface ReactLoopDeps {
  controller: LoopController;
  model: IModelClient;
  memory: MemoryHub;
  /** Innate tool provider (system-built, fixed) */
  innateToolHub: InnateToolHub;
  /** Skill hub (pre-installed skills, no dynamic installation) */
  skillHub: SkillHub;
  /** Security sandbox for permission checks before tool execution */
  sandbox?: SecuritySandbox;
  budget: PromptBudget;
  eventPublisher?: IEventPublisher;
  tracker: TokenTracker;
}

export interface ReactLoopContext {
  /** Conversation ID, used to track which task session messages belong to */
  conversationId: string;
  /** System prompt from outer layer + cognitive phase guidance */
  systemPrompt: string;
  /** Execution plan from PLAN phase */
  plan: Plan;
  /** Assessment from ASSESS phase (includes skill gap info) */
  assessment: Assessment;
  /** Thinking mode guidance text */
  thinkingGuidance: string;
  /** User context information (includes info provided via ask_user) */
  userContext?: string;
}

export class ReactLoop {
  private readonly innateToolHub: InnateToolHub;
  private readonly skillHub: SkillHub;
  private readonly memory: MemoryHub;
  private readonly sandbox?: SecuritySandbox;
  private conversationId!: string;

  constructor(private readonly deps: ReactLoopDeps) {
    this.innateToolHub = deps.innateToolHub;
    this.skillHub = deps.skillHub;
    this.memory = deps.memory;
    this.sandbox = deps.sandbox;
  }

  async run(ctx: ReactLoopContext): Promise<ExecuteResult> {
    this.conversationId = ctx.conversationId;
    const { controller, eventPublisher } = this.deps;
    const allSteps: StepLog[] = [];
    const planStepResults: PlanStepResult[] = [];

    // Execute step by step in dependency order, each step is an independent ReAct loop
    // Previous step's output serves as next step's input context
    const stepOutputs = new Map<string, string>();

    controller.start();

    for (const planStep of ctx.plan.steps) {
      // Collect outputs from prerequisite steps this step depends on
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

      // If any step doesn't complete normally, terminate subsequent steps
      if (stepResult.terminationReason !== TerminationReason.COMPLETED) {
        return this.buildResult(allSteps, planStepResults, stepResult.terminationReason, stepResult.output);
      }
    }

    // All steps completed, last step's output serves as final answer
    const lastOutput = planStepResults[planStepResults.length - 1]?.output;
    return this.buildResult(allSteps, planStepResults, TerminationReason.COMPLETED, lastOutput);
  }

  // ===========================================================
  // ReAct inner loop for a single plan step
  // ===========================================================

  private async runPlanStep(
    ctx: ReactLoopContext,
    planStep: PlanStep,
    priorContext: string,
  ): Promise<PlanStepResult> {
    const { controller, model, memory, budget, eventPublisher, tracker } = this.deps;
    const steps: StepLog[] = [];

    // Build plan overview text (static)
    const planOverview = this.buildPlanOverviewText(ctx.plan);

    // Memory is retrieved once at the start of each PlanStep as initial context
    let memoryText = '';
    if (memory) {
      try {
        const memoryQuery = `${ctx.plan.strategy} ${planStep.description}`;
        const result = await memory.memory_search(memoryQuery, 3);
        const data = JSON.parse(result);
        memoryText = data.results?.map((r: { value: string }) => r.value).join('\n') ?? '';
      } catch {
        // Memory retrieval failure should not block execution
      }
    }
    // Build initial messages
    const systemPrompt = this.buildSystemPrompt(ctx, planOverview, planStep, memoryText);

    const assistantPrompt = this.buildAssistantPrompt(ctx.plan, planStep);

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'assistant', content: assistantPrompt },
    ];

    // Attach prior step outputs and explicit user-provided context as assistant messages
    if (priorContext) {
      messages.push({
        role: 'assistant',
        content: `[Prior Step Outputs]\n${priorContext}`,
      });
    }
    if (ctx.userContext) {
      messages.push({
        role: 'user',
        content: `[User Provided Context]\n${ctx.userContext}`,
      });
    }

    // Inject all context provided by user via ask_user
    const userProvidedContext = this.innateToolHub.getUserProvidedContext();
    if (userProvidedContext.length > 0) {
      const contextStr = userProvidedContext.map((ctx, i) => `[Response ${i + 1}]: ${ctx}`).join('\n\n');
      messages.push({
        role: 'user',
        content: `[Previous User Responses from ask_user tool]\n${contextStr}\n\nIMPORTANT: Use the information above instead of asking for it again.`,
      });
    }

    // Innate tools
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

      const allTools = [...innateTools, ...skillTools];

      // ---- THOUGHT + (optional) ACTION ----
      let response: ModelResponse;
      try {
        const trimmedMessages = await budget.trimMessages(
          messages,
          budget.remaining(messages, allTools),
          2,
          4,
        );
        console.log(`[ReAct] step=${controller.currentStep}, tools=${allTools.length}, messages=${trimmedMessages.length}`);
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

      // Log THOUGHT
      steps.push(this.logStep(controller.currentStep, StepPhase.THOUGHT, response.content));
      messages.push({ role: 'assistant', content: response.content, toolCall: response.toolCall });
      eventPublisher?.publish('step:thought', { step: controller.currentStep, content: response.content });

      // No tool call → step completed
      if (!response.toolCall) {
        console.log(`[Step] ${planStep.id} completed without tool call. thought: ${response.content.substring(0, 200)}`);
        return {
          stepId: planStep.id,
          steps,
          output: response.content,
          terminationReason: TerminationReason.COMPLETED,
        };
      }
      // Log ACTION
      const call = response.toolCall;
      console.log(`[ReAct] ACTION: ${call.name}(${JSON.stringify(call.arguments)})`);
      steps.push(this.logStep(controller.currentStep, StepPhase.ACTION, `${call.name}(${JSON.stringify(call.arguments)})`, call.name, call.arguments));
      eventPublisher?.publish('step:action', { step: controller.currentStep, tool: call.name, args: call.arguments });

      // ---- OBSERVATION ----
      // Sandbox: innate tools omit check when they declare no actionCategory (see InnateTool).
      let observation: string;
      const innateTool = this.innateToolHub.getRegisteredTool(call.name);
      const skipSandbox =
        innateTool != null && innateTool.actionCategory === undefined;

      if (this.sandbox && !skipSandbox) {
        const sandboxResult = await this.checkSandboxPermission(call.name, call.arguments);
        if (sandboxResult) {
          observation = sandboxResult;
          console.log(`[Sandbox] denied:`, sandboxResult);
          if (this.memory) {
            await this.memory.conversation_track(this.conversationId!, 'assistant', `${call.name}: ${JSON.stringify(call.arguments)}`);
            await this.memory.conversation_track(this.conversationId!, 'assistant', `Result: ${observation}`);
          }
          steps.push(this.logStep(controller.currentStep, StepPhase.OBSERVATION, observation));
          messages.push({ role: 'tool', content: observation, toolCallId: call.id });
          eventPublisher?.publish('step:observation', { step: controller.currentStep, content: observation });
          continue;
        }
      }

      // Innate tools first, fall back to skill tools if not found
      if (innateTool) {
        try {
          observation = await this.innateToolHub.execute(call.name, call.arguments);
          console.log(`[Tool] ${call.name} result:`, observation.substring(0, 500));
          if (this.memory && call.name === 'ask_user') {
            const q = call.arguments['question'];
            const userResponse =
              (typeof q === 'string' ? q : '(tool)') + ' -> ' + observation;
            await this.memory.conversation_track(this.conversationId!, 'user', userResponse);
          }
          if (call.name === 'skill_load_main' || call.name === 'skill_load_reference') {
            const loaded =
              (typeof call.arguments['skillName'] === 'string' && call.arguments['skillName']) ||
              (typeof call.arguments['name'] === 'string' && call.arguments['name']) ||
              '';
            if (loaded) {
              skillTools = this.skillHub.getTools(loaded);
            }
          }
        } catch (err) {
          controller.recordFailure();
          observation = `[Error] Tool execution failed: ${String(err)}`;
        }
      } else {
        try {
          const { skillName, toolName } = this.resolveSkillToolCall(call.name, call.arguments);
          if (!skillName) {
            observation = JSON.stringify({
              error: 'Missing skill name for skill tool execution',
              toolCallName: call.name,
              hint:
                'Tool names from agent-skills use skill.<skillName>.<toolName>; skill name is parsed from the name when not passed in arguments.',
            });
          } else {
            observation = await this.skillHub.execute(skillName, toolName, call.arguments);
            console.log(`[Tool] ${call.name} result:`, observation.substring(0, 500));
          }
        } catch (err) {
          controller.recordFailure();
          observation = `[Error] Tool execution failed: ${String(err)}`;
          console.log(`[Tool] ${call.name} error:`, String(err));
        }
      }

      // Track assistant's action and observation to conversation
      if (this.memory) {
        await this.memory.conversation_track(this.conversationId!, 'assistant', `${call.name}: ${JSON.stringify(call.arguments)}`);
        await this.memory.conversation_track(this.conversationId!, 'assistant', `Result: ${observation}`);
      }

      steps.push(this.logStep(controller.currentStep, StepPhase.OBSERVATION, observation));
      messages.push({ role: 'tool', content: observation, toolCallId: call.id });
      eventPublisher?.publish('step:observation', { step: controller.currentStep, content: observation });
    }
  }

  // ----- private helpers -----

  /**
   * Resolve skill package name and manifest tool name for skill business tools.
   * The agent-skills package (and the Agent Skills spec) namespaces tools as skill.<skillName>.<toolName>.
   * The last path segment after the first dot is the manifest tool name; the prefix (after skill.) is the skill package name (may contain dots).
   */
  private resolveSkillToolCall(
    toolCallName: string,
    args: Record<string, unknown>,
  ): { skillName: string | undefined; toolName: string } {
    let skillName =
      typeof args['skillName'] === 'string' ? (args['skillName'] as string) : undefined;
    let toolName = toolCallName;
    if (typeof toolName === 'string' && toolName.startsWith('skill.')) {
      const rest = toolName.slice('skill.'.length);
      const lastDot = rest.lastIndexOf('.');
      if (lastDot > 0) {
        if (skillName == null || skillName === '') {
          skillName = rest.slice(0, lastDot);
        }
        toolName = rest.slice(lastDot + 1);
      }
    }
    return { skillName, toolName };
  }

  /**
   * Check sandbox permission for a tool call.
   * Returns a denial JSON string if blocked, or undefined if allowed.
   */
  private async checkSandboxPermission(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<string | undefined> {
    if (!this.sandbox) return undefined;
    return this.sandbox.checkToolPermission(toolName, args);
  }

  /**
   * Collect outputs from prerequisite steps this step depends on, concatenate as context text.
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
   * Build plan overview text (static, unchanged within each PlanStep).
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
   * Build system prompt from template `react/plan-step-system.md`.
   */
  private buildSystemPrompt(
    ctx: ReactLoopContext,
    planOverview: string,
    planStep: PlanStep,
    memoryText: string,
  ): string {
    return buildPlanStepSystemPrompt({
      baseSystemPrompt: ctx.systemPrompt,
      thinkingGuidance: ctx.thinkingGuidance,
      planOverview,
      currentStep: { id: planStep.id, description: planStep.description },
      skillCatalogText: this.buildSkillCatalogText(),
      skillGapsText: this.formatSkillGapsText(ctx.assessment),
      memoryText,
    });
  }

  private formatSkillGapsText(assessment: Assessment): string {
    const missing = assessment.missingSkillCategories ?? [];
    if (missing.length === 0) return '';
    return (
      '[Skill gaps]\n' +
      `Required capabilities not yet covered by installed skills: ${missing.join(', ')}. ` +
      'Consider skill_find / skill_install when appropriate.'
    );
  }

  /**
   * Build user prompt: strategy + current step goal + prior outputs + action instructions.
   */
  private buildAssistantPrompt(plan: Plan, planStep: PlanStep): string {
    return renderPrompt('react.execute-step-assistant', {
      strategy: plan.strategy,
      stepId: planStep.id,
      stepDescription: planStep.description,
      expectedOutcome: plan.expectedOutcome,
    });
  }

  /**
   * Build catalog text of installed skills.
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

  /**
   * When a plan step ends without a tool-less final response (e.g. max steps), `output` is unset
   * but the last THOUGHT/OBSERVATION still holds the model-visible answer — use it as finalAnswer.
   */
  private inferFinalAnswerFromSteps(steps: StepLog[]): string | undefined {
    for (let i = steps.length - 1; i >= 0; i--) {
      const s = steps[i];
      if (s.phase === StepPhase.THOUGHT) {
        const c = String(s.content ?? '').trim();
        if (c && !c.startsWith('[Model Error]')) return s.content;
      }
    }
    for (let i = steps.length - 1; i >= 0; i--) {
      const s = steps[i];
      if (s.phase === StepPhase.OBSERVATION) {
        const c = String(s.content ?? '').trim();
        if (c) return s.content;
      }
    }
    return undefined;
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

    let resolved = finalAnswer;
    if (typeof resolved !== 'string' || !resolved.trim()) {
      resolved = this.inferFinalAnswerFromSteps(steps);
    }

    return { status, finalAnswer: resolved, steps, planStepResults, terminationReason: reason };
  }
}
