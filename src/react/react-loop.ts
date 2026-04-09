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
import type { SecuritySandbox, ActionCategory } from '../sandbox/security-sandbox';

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

      // Log THOUGHT
      steps.push(this.logStep(controller.currentStep, StepPhase.THOUGHT, response.content));
      messages.push({ role: 'assistant', content: response.content, toolCall: response.toolCall });
      eventPublisher?.publish('step:thought', { step: controller.currentStep, content: response.content });

      // No tool call → step completed
      if (!response.toolCall) {
        return {
          stepId: planStep.id,
          steps,
          output: response.content,
          terminationReason: TerminationReason.COMPLETED,
        };
      }
      // Log ACTION
      const call = response.toolCall;
      steps.push(this.logStep(controller.currentStep, StepPhase.ACTION, `${call.name}(${JSON.stringify(call.arguments)})`, call.name, call.arguments));
      eventPublisher?.publish('step:action', { step: controller.currentStep, tool: call.name, args: call.arguments });

      // ---- OBSERVATION ----
      // Sandbox permission check before any tool execution
      let observation: string;
      const isDefaultAllowToolCall = call.name === 'ask_user'
      || call.name.startsWith('conversation_')
      || call.name.startsWith('memory_')
      || call.name.startsWith('knowledge_')
      || call.name.startsWith('skill_')
      || call.name.startsWith('cron_');

      if (this.sandbox && !isDefaultAllowToolCall) {
        const sandboxResult = await this.checkSandboxPermission(call.name, call.arguments);
        if (sandboxResult) {
          observation = sandboxResult;
          steps.push(this.logStep(controller.currentStep, StepPhase.OBSERVATION, observation));
          messages.push({ role: 'tool', content: observation, toolCallId: call.id });
          eventPublisher?.publish('step:observation', { step: controller.currentStep, content: observation });
          continue;
        }
      }

      // Innate tools first, fall back to skill tools if not found
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

      // Track assistant's action and observation to conversation
      if (this.memory) {
        await this.memory.conversation_track(this.conversationId!, 'assistant', `${call.name}: ${JSON.stringify(call.arguments)}`);
        await this.memory.conversation_track(this.conversationId!, 'assistant', `Result: ${observation.substring(0, 500)}`);
      }

      steps.push(this.logStep(controller.currentStep, StepPhase.OBSERVATION, observation));
      messages.push({ role: 'tool', content: observation, toolCallId: call.id });
      eventPublisher?.publish('step:observation', { step: controller.currentStep, content: observation });
    }
  }

  // ----- private helpers -----

  /**
   * Check sandbox permission for a tool call.
   * Returns a denial JSON string if blocked, or undefined if allowed.
   */
  private async checkSandboxPermission(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<string | undefined> {
    if (!this.sandbox) return undefined;

    // Determine action category from the tool's self-declared metadata
    const action: ActionCategory = this.innateToolHub.getActionCategory(toolName) ?? 'skill_exec';
    const target = this.innateToolHub.hasTool(toolName)
      ? this.innateToolHub.getPermissionTarget(toolName, args)
      : `${(args['skillName'] as string) ?? ''}:${toolName}`;

    // Resolve relative paths for fs tools
    const resolvedTarget = action.startsWith('fs_')
      ? this.sandbox.resolvePath(target)
      : target;

    const decision = await this.sandbox.checkPermission({
      action,
      target: resolvedTarget,
      detail: `${toolName}: ${target}`,
    });

    if (!decision.allowed) {
      return JSON.stringify({ status: 'denied', tool: toolName, target, reason: decision.reason });
    }

    // Inject sandbox working directory as default cwd for command tools
    if (action.startsWith('cmd_') && !args['cwd']) {
      args['cwd'] = this.sandbox.workingDirectory;
    }

    // Resolve fs paths so tools receive absolute paths
    if (action.startsWith('fs_') && args['path']) {
      args['path'] = resolvedTarget;
    }
    if (action.startsWith('fs_') && args['directory']) {
      args['directory'] = this.sandbox.resolvePath(args['directory'] as string);
    }

    return undefined;
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
   * Build system prompt: base identity + ReAct protocol + plan overview + current step + memory.
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
    // Skill catalog (pre-installed skills, fixed)
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
   * Build user prompt: strategy + current step goal + prior outputs + action instructions.
   */
  private buildAssistantPrompt(plan: Plan, planStep: PlanStep): string {
    const lines: string[] = [
      `Strategy: ${plan.strategy}`,
      '',
      `Your task: Execute step ${planStep.id} — ${planStep.description}`,
    ];
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
// ReAct Behavior Protocol — Guides model to follow Thought→Action→Observation loop
// ============================================================

const REACT_PROTOCOL = `[ReAct Protocol]
You operate in a Thought → Action → Observation loop:

1. **Thought**: Analyze the current situation. What do you know? What do you need? What's the best next action?
   - If this is the first iteration, review the step goal and available context.
   - If you have observations from previous actions, reason about what they tell you.
   - Consider whether you have enough information to complete the step.

2. **Action**: Call exactly ONE tool to make progress.
  - Choose the most appropriate tool for your current need.
  - When working with skills, if the skill you need is already listed in [Installed Skills] or you know it is pre-installed, DO NOT call skill_install again; go directly to skill_load_main / skill_list_tools / that skill's tools.
  - If a previous call to skill_install failed with an error such as "already exists" or "Skill directory already exists", treat that as meaning the skill is already installed; do not retry installation, just proceed to load and use the skill.
  - When a step requires capabilities like sending emails, chat messages, notifications, or other external actions and you do not have a direct innate tool for them, FIRST try to acquire or use an appropriate skill via skill_find / skill_install / skill_load_main before concluding that the action is impossible.
  - When the user asks about your past work, previous conversations, or requests a daily/weekly report of what **you** did (for example: "写个你昨天工作的日报"), FIRST try to recall from memory tools instead of asking the user:
    - Prefer **conversation_history** with an explicit limit (e.g. {"limit":100}) to fetch recent dialogue when summarising a time range like "昨天".
    - Use **conversation_search**({"query": "...", "limit": N}) only when the user asks about a specific past topic or project, not for generic daily reports.
    - Use **memory_search** / **memory_history** when you need long-term facts or previously stored summaries.
  - Only when memory clearly does not contain the required information should you fall back to ask_user.

3. **Observation**: You will receive the tool's output. Use it in your next Thought.

**Completion**: When you have enough information to provide the step's output, respond with your final answer WITHOUT calling any tool.

**Error handling**: If a tool fails, reason about alternatives in your next Thought.

**Constraints**:
- Execute ONLY the current step. Do not attempt subsequent steps.
- Each response should contain either a Thought + tool call, or a final answer.
- Stay focused on the step objective.`;
