import {
  CognitivePhase,
  TaskStatus,
  TerminationReason,
  resolveConfig,
  type AgentBrainOptions,
  type AgentConfig,
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
import { MemoryHub } from './memory/memory-hub';
import { AskUserTool } from './innate-tools/ask-user-tool';
import {
  SkillListTool,
  SkillInstallTool,
  SkillLoadMainTool,
  SkillLoadReferenceTool,
  SkillListToolsTool,
} from './skill/skill-tools';
import {
  MemorySearchTool,
  MemorySaveTool,
  MemoryListTool,
  MemoryDeleteTool,
  MemoryGetHistoryTool,
  ConversationTrackTool,
  ConversationSearchTool,
  ConversationCompressTool
} from './memory/memory-tools';
import {
  KnowledgeListTool,
  KnowledgeAddTool,
  KnowledgeDeleteTool,
  KnowledgeSearchTool,
  KnowledgeReadTool,
} from './knowledge/knowledge-tools';
import { KnowledgeHub } from './knowledge/knowledge-hub';
import {
  FSReadTool,
  FSWriteTool,
  FSEditTool,
  FSDeleteTool,
  FSListTool,
  FSMkdirTool,
  FSExistsTool,
  FSStatTool,
  FSSearchTool,
  FSGrepTool,
} from './innate-tools/file-system-tool';
import {
  CmdExecTool,
  CmdRunTool,
  CmdKillTool,
  CmdBgTool,
  CmdListTool,
} from './innate-tools/command-tool';
import {
  HttpGetTool,
  HttpPostTool,
  HttpFetchHtmlTool,
  WebSearchTool,
  WebScrapeTool,
} from './innate-tools/web-tool';

function generateTaskId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `task_${ts}_${rand}`;
}

// ============================================================
// AgentBrain — 五阶段认知循环协调器
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
  private readonly config: Required<AgentConfig>;
  private readonly eventPublisher?: IEventPublisher;
  private readonly scheduler = new ThinkingModeScheduler();
  private readonly budget: PromptBudget;

  constructor(opts: AgentBrainOptions) {
    this.config = resolveConfig(opts.config);
    this.model = opts.model;

    this.innateToolHub = new InnateToolHub();

    this.memory = opts.memory;
    this.innateToolHub.register(new ConversationTrackTool(this.memory));
    this.innateToolHub.register(new ConversationSearchTool(this.memory));
    this.innateToolHub.register(new ConversationCompressTool(this.memory));
    this.innateToolHub.register(new MemorySearchTool(this.memory));
    this.innateToolHub.register(new MemorySaveTool(this.memory));
    this.innateToolHub.register(new MemoryListTool(this.memory));
    this.innateToolHub.register(new MemoryDeleteTool(this.memory));
    this.innateToolHub.register(new MemoryGetHistoryTool(this.memory));

    this.knowledge = opts.knowledge;
    if(this.knowledge) {
      this.innateToolHub.register(new KnowledgeListTool(this.knowledge));
      this.innateToolHub.register(new KnowledgeAddTool(this.knowledge));
      this.innateToolHub.register(new KnowledgeDeleteTool(this.knowledge));
      this.innateToolHub.register(new KnowledgeSearchTool(this.knowledge));
      this.innateToolHub.register(new KnowledgeReadTool(this.knowledge));
    }

    this.skillHub = opts.skills;
    this.innateToolHub.register(new SkillListTool(this.skillHub));
    this.innateToolHub.register(new SkillInstallTool(this.skillHub));
    this.innateToolHub.register(new SkillLoadMainTool(this.skillHub));
    this.innateToolHub.register(new SkillLoadReferenceTool(this.skillHub));
    this.innateToolHub.register(new SkillListToolsTool(this.skillHub));

    this.innateToolHub.register(new AskUserTool(this.innateToolHub));

    // 文件系统工具
    this.innateToolHub.register(new FSReadTool());
    this.innateToolHub.register(new FSWriteTool());
    this.innateToolHub.register(new FSEditTool());
    this.innateToolHub.register(new FSDeleteTool());
    this.innateToolHub.register(new FSListTool());
    this.innateToolHub.register(new FSMkdirTool());
    this.innateToolHub.register(new FSExistsTool());
    this.innateToolHub.register(new FSStatTool());
    this.innateToolHub.register(new FSSearchTool());
    this.innateToolHub.register(new FSGrepTool());

    // 命令执行工具
    this.innateToolHub.register(new CmdExecTool());
    this.innateToolHub.register(new CmdRunTool());
    this.innateToolHub.register(new CmdKillTool());
    this.innateToolHub.register(new CmdBgTool());
    this.innateToolHub.register(new CmdListTool());

    // 网络工具
    this.innateToolHub.register(new HttpGetTool());
    this.innateToolHub.register(new HttpPostTool());
    this.innateToolHub.register(new HttpFetchHtmlTool());
    this.innateToolHub.register(new WebSearchTool());
    this.innateToolHub.register(new WebScrapeTool());

    this.eventPublisher = opts.eventPublisher;
    if (this.eventPublisher) {
      this.innateToolHub.setEventPublisher(this.eventPublisher);
    }
    this.budget = new PromptBudget(
      this.model,
      this.config.modelContextSize,
    );
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
  // 公共入口
  // ===========================================================

  async run(userInput: string): Promise<TaskResult> {
    const taskId = generateTaskId();
    const startTime = Date.now();
    const tracker = new TokenTracker(this.model);

    this.emit('task:start', { taskId, userInput });
    await this.memory.conversation_track('user', userInput);

    try {
      // ---- 记忆检索：在理解任务前先回忆相关经验 ----
      const memoryResult = await this.memory.memory_search({ query: userInput, topK: 3 });
      const memoryData = JSON.parse(memoryResult);
      const memory = memoryData.results?.map((r: { value: string }) => r.value).join('\n') ?? '';

      // ---- Phase 1: PERCEIVE ----
      const perception = await this.perceive(userInput, memory, tracker);
      this.emit('phase:perceive', { taskId, perception });

      // ---- Phase 2: ASSESS ----
      const assessment = await this.assess(userInput, perception, tracker);
      this.emit('phase:assess', { taskId, assessment });

      // 如果判定不可行，提前返回
      if (!assessment.feasible) {
        const answer = `I assessed this task and determined it's not feasible. Gaps: ${assessment.gaps.join('; ')}`;
        return this.buildTaskResult(taskId, startTime, tracker, {
          status: TaskStatus.FAILED,
          terminationReason: TerminationReason.COMPLETED,
          finalAnswer: answer,
          steps: [],
          cognition: { perception, assessment, plan: this.emptyPlan() },
        });
      }

      // ---- Phase 3-5: PLAN → EXECUTE → REFLECT (可循环) ----
      let plan: Plan | undefined;
      let executeResult: ExecuteResult | undefined;
      let reflection: Reflection | undefined;
      let replanCount = 0;
      let userContext = userInput;

      while (replanCount <= this.config.maxReplans) {
        // Phase 3: PLAN
        plan = await this.plan(userContext, perception, assessment, tracker, reflection, userContext !== userInput ? userContext : undefined);
        this.emit('phase:plan', { taskId, plan, replanCount });

        // Phase 4: EXECUTE
        executeResult = await this.execute(assessment, plan, tracker, userContext);
        this.emit('phase:execute', { taskId, result: executeResult });

        // Phase 5: REFLECT
        reflection = await this.reflect(userContext, perception, plan, executeResult, tracker);
        this.emit('phase:reflect', { taskId, reflection });

        if (!reflection.needsReplan) break;

        replanCount++;
        this.emit('phase:replan', { taskId, replanCount });
      }

      return this.buildTaskResult(taskId, startTime, tracker, {
        status: executeResult!.status,
        terminationReason: executeResult!.terminationReason,
        finalAnswer: executeResult!.finalAnswer,
        steps: executeResult!.steps,
        cognition: { perception, assessment, plan: plan!, reflection },
      });
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
    }
  }

  // ===========================================================
  // Phase 1: PERCEIVE — 理解任务
  // ===========================================================

  private async perceive(userInput: string, memoryText: string, tracker: TokenTracker): Promise<Perception> {
    const phase = CognitivePhase.PERCEIVE;
    const guidance = this.scheduler.generateGuidance(phase);
    const phasePrompt = this.scheduler.getPhasePrompt(phase);

    // 构建固定部分
    const systemBase = [this.config.systemPrompt, '', guidance, '', phasePrompt].join('\n');
    const baseMessages: Message[] = [
      { role: 'system', content: systemBase },
      { role: 'user', content: userInput },
    ];

    // 计算记忆可用预算，按需裁剪
    if (memoryText) {
      const available = this.budget.remaining(baseMessages);
      const trimmedMemory = this.budget.trimText(memoryText, available);
      baseMessages[0] = {
        role: 'system',
        content: `${systemBase}\n\n[Relevant Memory / Context]\n${trimmedMemory}`,
      };
    }

    tracker.trackPrompt(baseMessages);
    const response = await this.model.chat(baseMessages);
    tracker.trackCompletion(response.content);
    return this.parseJson<Perception>(response.content, this.emptyPerception());
  }

  // ===========================================================
  // Phase 2: ASSESS — 评估能力与资源
  // ===========================================================

  private async assess(userInput: string, perception: Perception, tracker: TokenTracker): Promise<Assessment> {
    const phase = CognitivePhase.ASSESS;
    const guidance = this.scheduler.generateGuidance(phase);
    const phasePrompt = this.scheduler.getPhasePrompt(phase);

    // 天生工具
    const innateTools: string[] = this.innateToolHub.getToolsDescription();
    // 已有技能包
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
      { role: 'system', content: `${this.config.systemPrompt}\n\n${guidance}\n\n${phasePrompt}\n\n${resourceOverview}` },
      { role: 'user', content: userInput },
      { role: 'assistant', content: `[PERCEIVE result]\n${JSON.stringify(perception)}` },
    ];

    const response = await this.model.chat(messages);
    tracker.trackPrompt(messages);
    tracker.trackCompletion(response.content);
    return this.parseJson<Assessment>(response.content, this.emptyAssessment());
  }

  // ===========================================================
  // Phase 3: PLAN — 分解与规划
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

    const messages: Message[] = [
      { role: 'system', content: `${this.config.systemPrompt}\n\n${guidance}\n\n${phasePrompt}` },
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

    tracker.trackPrompt(messages);
    const response = await this.model.chat(messages);
    tracker.trackCompletion(response.content);
    return this.parseJson<Plan>(response.content, this.emptyPlan());
  }

  // ===========================================================
  // Phase 4: EXECUTE — 执行与监控
  // ===========================================================

  private async execute(
    assessment: Assessment,
    plan: Plan,
    tracker: TokenTracker,
    userContext?: string,
  ): Promise<ExecuteResult> {
    const controller = new LoopController(
      this.config.maxSteps,
      this.config.heartbeatTimeoutMs,
      this.config.maxConsecutiveFailures,
    );

    const guidance = this.scheduler.generateGuidance(CognitivePhase.EXECUTE);

    const loop = new ReactLoop({
      controller,
      model: this.model,
      memory: this.memory,
      innateToolHub: this.innateToolHub,
      skillHub: this.skillHub,
      eventPublisher: this.eventPublisher,
      budget: this.budget,
      tracker,
    });

    return loop.run({
      systemPrompt: this.config.systemPrompt,
      plan,
      assessment,
      thinkingGuidance: guidance,
      userContext,
    });
  }

  // ===========================================================
  // Phase 5: REFLECT — 反思与优化
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

    // 构建执行摘要
    const executionSummary = [
      `Status: ${executeResult.status}`,
      `Steps taken: ${executeResult.steps.length}`,
      `Final answer: ${executeResult.finalAnswer ?? '(none)'}`,
      `Termination: ${executeResult.terminationReason}`,
    ].join('\n');

    const messages: Message[] = [
      { role: 'system', content: `${this.config.systemPrompt}\n\n${guidance}\n\n${phasePrompt}` },
      { role: 'user', content: userInput },
      { role: 'assistant', content: `[Success Criteria]\n${perception.successCriteria.join('\n')}\n\n[Plan]\n${JSON.stringify(plan)}\n\n[Execution Result]\n${executionSummary}` },
    ];

    tracker.trackPrompt(messages);
    const response = await this.model.chat(messages);
    tracker.trackCompletion(response.content);
    return this.parseJson<Reflection>(response.content, this.emptyReflection());
  }

  // ===========================================================
  // Helpers
  // ===========================================================

  private parseJson<T>(raw: string, fallback: T): T {
    try {
      // 尝试从 markdown code block 中提取 JSON
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
    return { surfaceRequest: '', deepIntent: '', constraints: [], ambiguities: [], successCriteria: [] };
  }

  private emptyAssessment(): Assessment {
    return { requiredSkills: [], capabilityMatch: '', matchedSkills: [], missingSkills: [], risks: [], complexity: 'simple', feasible: true, gaps: [] };
  }

  private emptyPlan(): Plan {
    return { strategy: '', steps: [], expectedOutcome: '' };
  }

  private emptyReflection(): Reflection {
    return { goalMet: false, strengths: [], improvements: [], lessonsLearned: [], needsReplan: false };
  }
}
