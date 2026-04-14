import {
  CognitivePhase,
  ExecutionMode,
  TaskStatus,
  TerminationReason,
  ThinkingLevel,
  resolveConfig,
  type AgentBrainOptions,
  type Assessment,
  type ExecuteResult,
  type IEventPublisher,
  type IModelClient,
  type Message,
  type Perception,
  type Plan,
  type Reflection,
  type TaskResult,
} from './types';
import { LoopController } from './react/loop-controller';
import { ThinkingModeScheduler } from './thinking-mode';
import { ReactLoop } from './react/react-loop';
import { TokenTracker } from './token/token-tracker';
import { PromptBudget } from './token/prompt-budget';
import { SkillHub } from './skill/skill-hub';
import { InnateToolHub } from './innate-tools/innate-tool-hub';
import { registerDefaultInnateTools } from './innate-tools/register-default-innate-tools';
import { MemoryHub } from './memory/memory-hub';
import { KnowledgeHub } from './knowledge/knowledge-hub';
import { SecuritySandbox, type PermissionLevel } from './sandbox/security-sandbox';
import {
  runThinkStrategy,
  runPlanStrategy,
  runInstinctStrategy,
  runAnalyticalStrategy,
  runDeliberateStrategy,
} from './strategy';
import { type CognitiveOps } from './strategy/types';
import { renderPrompt } from './prompts/prompt-system';

function generateTaskId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `task_${ts}_${rand}`;
}

// ============================================================
// AgentBrain — Five-phase cognitive loop coordinator
//
//   PERCEIVE → ASSESS → PLAN → EXECUTE → REFLECT
//                          ↑                  │
//                          └── needsReplan ───┘
// ============================================================


export class AgentBrain {
  private readonly model: IModelClient;
  private readonly memory: MemoryHub;
  private readonly knowledge?: KnowledgeHub;

  private readonly innateToolHub: InnateToolHub;
  private readonly skillHub: SkillHub;
  private readonly config: ReturnType<typeof resolveConfig>;
  private readonly eventPublisher?: IEventPublisher;
  private readonly scheduler = new ThinkingModeScheduler();
  private readonly budget: PromptBudget;
  private readonly sandbox: SecuritySandbox;
  /** Set for the duration of `run()`; used as `conversationId` for memory / session grouping. */
  private activeConversationId?: string;

  constructor(opts: AgentBrainOptions) {
    this.config = resolveConfig(opts.config);
    this.model = opts.model;

    this.innateToolHub = new InnateToolHub();

    // Security sandbox: host subclass of SecuritySandbox or built-in rule sandbox + ask_user ASK
    this.sandbox = opts.sandbox
      ? opts.sandbox
      : new SecuritySandbox(this.innateToolHub, this.config.workingDirectory);

    // Default allow for common file operations (no repeated prompts)
    this.sandbox.addRules([
      { action: 'fs_list', pattern: '**', permission: 'ALLOW' as PermissionLevel },
      { action: 'fs_read', pattern: '**', permission: 'ALLOW' as PermissionLevel },
      { action: 'memory_query', pattern: '**', permission: 'ALLOW' as PermissionLevel },
      { action: 'memory_write', pattern: '**', permission: 'ALLOW' as PermissionLevel },
      { action: 'knowledge_query', pattern: '**', permission: 'ALLOW' as PermissionLevel },
      { action: 'knowledge_write', pattern: '**', permission: 'ALLOW' as PermissionLevel },
      { action: 'cron_query', pattern: '**', permission: 'ALLOW' as PermissionLevel },
      { action: 'cron_write', pattern: '**', permission: 'ALLOW' as PermissionLevel },
      { action: 'skill_exec', pattern: '**', permission: 'ALLOW' as PermissionLevel },
      { action: 'web_fetch', pattern: '**', permission: 'ALLOW' as PermissionLevel },
      { action: 'web_search', pattern: '**', permission: 'ALLOW' as PermissionLevel },
    ]);

    this.memory = opts.memory;
    this.knowledge = opts.knowledge;
    this.skillHub = opts.skills;
    registerDefaultInnateTools(this.innateToolHub, {
      memory: this.memory,
      skills: this.skillHub,
      knowledge: this.knowledge,
      cron: opts.cron,
    });

    this.eventPublisher = opts.eventPublisher;
    if (this.eventPublisher) {
      this.innateToolHub.setEventPublisher(this.eventPublisher);
    }
    this.budget = new PromptBudget(this.model);
  }

  private buildSystemBase(guidance: string, phasePrompt: string): string {
    return renderPrompt('agent.system_base', {
      systemPrompt: this.config.systemPrompt,
      workingDirectory: this.sandbox.workingDirectory,
      guidance,
      phasePrompt,
    });
  }

  /**
   * Provide user input when the agent is waiting for input.
   * Call this when you receive a 'user:input-request' event.
   */
  provideUserInput(input: string): void {
    this.innateToolHub.provideUserInput(input);
  }

  /**
   * Check if the agent is waiting for user input.
   */
  isWaitingForUserInput(): boolean {
    return this.innateToolHub['_userInputResolver'] !== undefined;
  }

  // ===========================================================
  // Public Entry Point
  // ===========================================================

  async run(
    userInput: string,
    options?: {
      /**
       * Execution mode (default: `auto`):
       * - `auto`: **execute** after planning for typical tasks; **plan-without-execute** only when `perception.userWantsPlanOnly` is true. Heavier `complex` + `deliberate` (and similar) → `full`.
       * - `think`: PERCEIVE + ASSESS only
       * - `plan`: PERCEIVE + ASSESS + PLAN
       * - `execute`: PERCEIVE + ASSESS + PLAN + EXECUTE
       * - `full`: PERCEIVE + ASSESS + PLAN + EXECUTE + REFLECT
       */
      mode?: ExecutionMode;
    },
  ): Promise<TaskResult> {
    const taskId = generateTaskId();
    const mode = options?.mode ?? ExecutionMode.AUTO;
    const startTime = Date.now();
    const tracker = new TokenTracker(this.model);

    this.activeConversationId = taskId;
    this.emit('task:start', { taskId, userInput, mode });
    await this.memory.conversation_track(taskId, 'user', userInput);

    try {
      // ---- Memory retrieval: recall relevant experience before understanding task ----
      // Get short-term conversation memory (recent chats)
      const conversationResult = await this.memory.conversation_search(userInput, 5);
      console.log('[Memory] conversation raw:', conversationResult);
      const conversationData = JSON.parse(conversationResult);
      const conversationMemory = conversationData.messages?.map((m: { role: string; content: string }) => `[${m.role}]: ${m.content}`).join('\n') ?? '';

      // Get long-term semantic memory
      const memoryResult = await this.memory.memory_search(userInput, 3);
      console.log('[Memory] long-term raw:', memoryResult);
      const memoryData = JSON.parse(memoryResult);
      const longTermMemory = memoryData.results?.map((r: { value: string }) => r.value).join('\n') ?? '';

      // Combine both
      const memory = conversationMemory ? `${conversationMemory}\n\n--- Long-term ---\n${longTermMemory}` : longTermMemory;
      console.log('[Memory] conversation:', conversationMemory.substring(0, 200));
      console.log('[Memory] long-term:', longTermMemory.substring(0, 200));

      // ---- Phase 1: PERCEIVE (includes complexity classification) ----
      let perception = await this.perceive(userInput, memory, tracker);
      this.emit('phase:perceive', { taskId, perception });

      // ---- Resolve mode from complexity when AUTO ----
      let resolvedMode = mode;
      if (mode === ExecutionMode.AUTO) {
        if (perception.userWantsPlanOnly === true) {
          resolvedMode = ExecutionMode.PLAN;
        } else {
          const level = perception.complexity.level;
          const tl = perception.thinkingLevel;
          if (
            perception.complexity.isPatternRecognizable ||
            level === 'simple' ||
            level === 'moderate' ||
            tl === ThinkingLevel.INSTINCT ||
            tl === ThinkingLevel.ANALYTICAL
          ) {
            resolvedMode = ExecutionMode.EXECUTE;
          } else {
            resolvedMode = ExecutionMode.FULL;
          }
        }
      }

      // ---- Mode: THINK ----
      if (resolvedMode === ExecutionMode.THINK) {
        return runThinkStrategy(
          { taskId, startTime, userInput, memoryText: memory, tracker, perception, thinkingLevel: ThinkingLevel.INSTINCT },
          this.createCognitiveOps(),
        );
      }

      // ---- Mode: PLAN ----
      if (resolvedMode === ExecutionMode.PLAN) {
        return runPlanStrategy(
          { taskId, startTime, userInput, memoryText: memory, tracker, perception, thinkingLevel: ThinkingLevel.ANALYTICAL },
          this.createCognitiveOps(),
        );
      }

      // ---- Mode: EXECUTE ----
      if (resolvedMode === ExecutionMode.EXECUTE) {
        if (perception.fastPlan && perception.complexity.isPatternRecognizable) {
          return runInstinctStrategy(
            { taskId, startTime, userInput, memoryText: memory, tracker, perception, thinkingLevel: ThinkingLevel.INSTINCT },
            this.createCognitiveOps(),
          );
        }
        return runAnalyticalStrategy(
          { taskId, startTime, userInput, memoryText: memory, tracker, perception, thinkingLevel: ThinkingLevel.ANALYTICAL },
          this.createCognitiveOps(),
        );
      }

      // ---- Mode: FULL (default) ----
      return runDeliberateStrategy(
        { taskId, startTime, userInput, memoryText: memory, tracker, perception, thinkingLevel: perception.thinkingLevel },
        this.createCognitiveOps(),
      );
    } catch (err) {
      this.emit('task:error', { taskId, error: String(err) });
      return this.buildTaskResult(taskId, startTime, tracker, {
        status: TaskStatus.FAILED,
        terminationReason: TerminationReason.UNRECOVERABLE_ERROR,
        finalAnswer: `Unrecoverable error: ${String(err)}`,
        steps: [],
        cognition: {
          perception: this.emptyPerception(),
          assessment: this.emptyAssessment(),
          plan: this.emptyPlan(),
        },
      });
    } finally {
      this.activeConversationId = undefined;
    }
  }

  // ===========================================================
  // Create CognitiveOps delegate for execution strategies
  // ===========================================================

  private createCognitiveOps(): CognitiveOps {
    return {
      assess: this.assess.bind(this),
      plan: this.plan.bind(this),
      execute: this.execute.bind(this),
      reflect: this.reflect.bind(this),
      saveReflection: this.saveReflection.bind(this),
      emit: this.emit.bind(this),
      trackConversation: (id, role, content) => this.memory.conversation_track(id, role, content),
      buildResult: this.buildTaskResult.bind(this),
      emptyPerception: this.emptyPerception.bind(this),
      emptyAssessment: this.emptyAssessment.bind(this),
      emptyPlan: this.emptyPlan.bind(this),
      maxReplans: this.config.maxReplans,
    };
  }

  // ===========================================================
  // Phase 1: PERCEIVE — Understand task & classify complexity
  // ===========================================================

  private async perceive(userInput: string, memoryText: string, tracker: TokenTracker): Promise<Perception> {
    const phase = CognitivePhase.PERCEIVE;
    const guidance = this.scheduler.generateGuidance(phase);
    const phasePrompt = this.scheduler.getPhasePrompt(phase);

    // Build fixed parts
    const systemBase = this.buildSystemBase(guidance, phasePrompt);
    const baseMessages: Message[] = [
      { role: 'system', content: systemBase },
      { role: 'user', content: userInput },
    ];

    // Calculate memory available budget, trim as needed
    if (memoryText) {
      const available = this.budget.remaining(baseMessages);
      const trimmedMemory = this.budget.trimText(memoryText, available);
      baseMessages[0] = {
        role: 'system',
        content: `${systemBase}\n\n[Relevant Memory / Context]\n${trimmedMemory}`,
      };
    }

    tracker.trackPrompt(baseMessages);
    console.log('[PERCEIVE] messages:', JSON.stringify(baseMessages, null, 2));
    const response = await this.model.chat(baseMessages);
    tracker.trackCompletion(response.content);
    console.log('[PERCEIVE] raw response:', response.content.substring(0, 300));
    const perception = this.parseJson<Perception>(response.content, this.emptyPerception());
    console.log('[PERCEIVE] parsed:', JSON.stringify(perception).substring(0, 200));
    return perception;
  }

  // ===========================================================
  // Phase 2: ASSESS — Evaluate capabilities and resources
  // ===========================================================

  private async assess(userInput: string, perception: Perception, tracker: TokenTracker): Promise<Assessment> {
    const phase = CognitivePhase.ASSESS;
    const guidance = this.scheduler.generateGuidance(phase);
    const phasePrompt = this.scheduler.getPhasePrompt(phase);

    // Innate tools
    const innateTools: string[] = this.innateToolHub.getToolsDescription();
    // Pre-installed skill packages
    const skillSummaries: string[] = this.skillHub.getSkillsDescription();

    const parts: string[] = [];
    if (innateTools.length > 0) {
      parts.push(`Innate tools (usable directly): ${innateTools.join(', \n')}`);
    }
    if (skillSummaries.length > 0) {
      parts.push(`Available skills:\n${skillSummaries.join('\n\n')}`);
    }
    if (parts.length === 0) {
      parts.push('No tools or skills available.');
    }
    const resourceOverview = parts.join('\n\n');

    const messages: Message[] = [
      { role: 'system', content: `${this.buildSystemBase(guidance, phasePrompt)}\n\n${resourceOverview}` },
      { role: 'user', content: userInput },
      { role: 'assistant', content: `[PERCEIVE result]\n${JSON.stringify(perception)}` },
    ];

    const trimmedMessages = await this.budget.trimMessages(messages, this.budget.remaining(messages), 1, 1);
    tracker.trackPrompt(trimmedMessages);
    console.log('[REFLECT] messages:', JSON.stringify(trimmedMessages, null, 2));
    const response = await this.model.chat(trimmedMessages);
    tracker.trackCompletion(response.content);
    return this.parseJson<Assessment>(response.content, this.emptyAssessment());
  }

  // ===========================================================
  // Phase 3: PLAN — Decompose and plan
  // ===========================================================

  private async plan(
    userInput: string,
    perception: Perception,
    assessment: Assessment,
    tracker: TokenTracker,
    previousReflection?: Reflection,
    userContext?: string,
  ): Promise<Plan> {
    const phase = CognitivePhase.PLAN;
    const guidance = this.scheduler.generateGuidance(phase);
    const phasePrompt = this.scheduler.getPhasePrompt(phase);
    // Expose installed skills to the planner so it can prefer reusing them
    const skillSummaries: string[] = this.skillHub.getSkillsDescription();
    const installedSkillsText =
      skillSummaries.length > 0
        ? `\n\n[Installed Skills]\n${skillSummaries.map((s) => `  - ${s}`).join('\n')}`
        : '';

    const messages: Message[] = [
      {
        role: 'system',
        content: `${this.buildSystemBase(guidance, phasePrompt)}${installedSkillsText}`,
      },
      { role: 'user', content: userInput },
    ];

    if (userContext && userContext !== userInput) {
      messages.push({
        role: 'user',
        content: `[Additional context from user interaction during execution]\n${userContext}`,
      });
    }

    messages.push({ role: 'assistant', content: `[PERCEIVE]\n${JSON.stringify(perception)}\n\n[ASSESS]\n${JSON.stringify(assessment)}` });

    if (previousReflection) {
      messages.push({
        role: 'assistant',
        content: `[REFLECT — previous attempt]\n${JSON.stringify(previousReflection)}\n\nPlease revise the plan based on the reflection above.`,
      });
    }

    const trimmedMessages = await this.budget.trimMessages(messages, this.budget.remaining(messages), 1, 1);
    tracker.trackPrompt(trimmedMessages);
    const response = await this.model.chat(trimmedMessages);
    tracker.trackCompletion(response.content);
    console.log('[PLAN] raw response:', response.content.substring(0, 300));
    return this.parseJson<Plan>(response.content, this.emptyPlan());
  }

  // ===========================================================
  // Phase 4: EXECUTE — Execute and monitor
  // ===========================================================

  private async execute(
    conversationId: string,
    assessment: Assessment,
    plan: Plan,
    tracker: TokenTracker,
    userContext?: string,
  ): Promise<ExecuteResult> {
    const controller = new LoopController(
      this.config.maxSteps,
      this.config.maxConsecutiveFailures,
    );

    const guidance = this.scheduler.generateGuidance(CognitivePhase.EXECUTE);
    const phasePrompt = this.scheduler.getPhasePrompt(CognitivePhase.EXECUTE);
    const executeSystemPrompt = this.buildSystemBase(guidance, phasePrompt);

    const loop = new ReactLoop({
      controller,
      model: this.model,
      memory: this.memory,
      innateToolHub: this.innateToolHub,
      skillHub: this.skillHub,
      sandbox: this.sandbox,
      eventPublisher: this.eventPublisher,
      budget: this.budget,
      tracker,
    });

    return loop.run({
      conversationId,
      systemPrompt: executeSystemPrompt,
      plan,
      assessment,
      thinkingGuidance: guidance,
      userContext,
    });
  }

  // ===========================================================
  // Phase 5: REFLECT — Reflect and optimize
  // ===========================================================

  private async reflect(
    userInput: string,
    perception: Perception,
    plan: Plan,
    executeResult: ExecuteResult,
    tracker: TokenTracker,
  ): Promise<Reflection> {
    const phase = CognitivePhase.REFLECT;
    const guidance = this.scheduler.generateGuidance(phase);
    const phasePrompt = this.scheduler.getPhasePrompt(phase);

    // Build execution summary
    const executionSummary = [
      `Status: ${executeResult.status}`,
      `Steps taken: ${executeResult.steps.length}`,
      `Final answer: ${executeResult.finalAnswer ?? '(none)'}`,
      `Termination: ${executeResult.terminationReason}`,
    ].join('\n');

    const messages: Message[] = [
      { role: 'system', content: this.buildSystemBase(guidance, phasePrompt) },
      { role: 'user', content: userInput },
      { role: 'assistant', content: `[Success Criteria]\n${perception.successCriteria.join('\n')}\n\n[Plan]\n${JSON.stringify(plan)}\n\n[Execution Result]\n${executionSummary}` },
    ];

    const trimmedMessages = await this.budget.trimMessages(messages, this.budget.remaining(messages), 1, 1);
    tracker.trackPrompt(trimmedMessages);
    const response = await this.model.chat(trimmedMessages);
    tracker.trackCompletion(response.content);
    return this.parseJson<Reflection>(response.content, this.emptyReflection());
  }

  // ===========================================================
  // Reflection Storage — Save to long-term memory
  // ===========================================================

  private async saveReflection(reflection: Reflection, taskId: string): Promise<void> {
    const key = `reflection:${taskId}`;
    const value = JSON.stringify({
      goalMet: reflection.goalMet,
      strengths: reflection.strengths,
      improvements: reflection.improvements,
      lessonsLearned: reflection.lessonsLearned,
      timestamp: new Date().toISOString(),
    });
    await this.memory.memory_save(key, value);
  }

  // ===========================================================
  // Helpers
  // ===========================================================

  private parseJson<T>(raw: string, fallback: T): T {
    try {
      // Try to extract JSON from markdown code block
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = match ? match[1].trim() : raw.trim();
      return JSON.parse(jsonStr) as T;
    } catch {
      return fallback;
    }
  }

  private emit(type: string, payload: unknown): void {
    this.eventPublisher?.publish(type, payload);
  }

  private buildTaskResult(
    taskId: string,
    startTime: number,
    tracker: TokenTracker,
    partial: Omit<TaskResult, 'taskId' | 'durationMs' | 'tokenUsage'>,
  ): TaskResult {
    return {
      taskId,
      durationMs: Date.now() - startTime,
      tokenUsage: tracker.usage,
      ...partial,
    };
  }

  // ---- Empty fallbacks for parse failures ----

  private emptyPerception(): Perception {
    return {
      surfaceRequest: '',
      deepIntent: '',
      constraints: [],
      ambiguities: [],
      successCriteria: [],
      complexity: {
        level: 'complex',
        estimatedSteps: 10,
        confidence: 0,
        uncertainties: [],
        recommendedLevels: [ThinkingLevel.DELIBERATE],
        isPatternRecognizable: false,
        requiresVerification: true,
      },
      thinkingLevel: ThinkingLevel.DELIBERATE,
    };
  }

  private emptyAssessment(): Assessment {
    return {
      skillCategories: [],
      capabilityMatch: '',
      matchedSkillCategories: [],
      missingSkillCategories: [],
      risks: [],
      complexity: {
        level: 'simple',
        estimatedSteps: 1,
        confidence: 0.5,
        uncertainties: [],
        recommendedLevels: [ThinkingLevel.INSTINCT],
        isPatternRecognizable: true,
        requiresVerification: false,
      },
    };
  }

  private emptyPlan(): Plan {
    return { strategy: '', steps: [], expectedOutcome: '' };
  }

  private emptyReflection(): Reflection {
    return { goalMet: false, strengths: [], improvements: [], lessonsLearned: [], needsReplan: false };
  }
}
