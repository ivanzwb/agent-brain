import type { ToolDefinition } from './innate-tools/types';
import { MemoryHub } from './memory/memory-hub';
import { KnowledgeHub } from './knowledge/knowledge-hub';
import { CronHub } from './cron/cron-hub';
import { SkillHub } from './skill/skill-hub';
import type { SecuritySandbox } from './sandbox/security-sandbox';

// ============================================================
// Cognitive Phases - Five-stage human-like thinking process
// ============================================================

/**
 * Five cognitive phases simulating human thinking:
 *
 *   PERCEIVE → ASSESS → PLAN → EXECUTE → REFLECT
 *   Understand   Evaluate  Plan     Execute   Reflect
 *
 * Simple tasks: rapid flow through all phases (seconds)
 * Complex tasks: EXECUTE iterates internally, REFLECT may trigger replanning
 */
export enum CognitivePhase {
  /** PERCEIVE: Receive information, identify intent, clarify ambiguities */
  PERCEIVE = 'PERCEIVE',
  /** ASSESS: Evaluate capabilities and resources, match knowledge, assess risks */
  ASSESS = 'ASSESS',
  /** PLAN: Decompose task, set goals, create execution plan */
  PLAN = 'PLAN',
  /** EXECUTE: Execute plan, monitor progress, make real-time adjustments */
  EXECUTE = 'EXECUTE',
  /** REFLECT: Evaluate results, accumulate experience, summarize lessons */
  REFLECT = 'REFLECT',
}

// ============================================================
// ReAct Inner Loop Phases (used within EXECUTE phase)
// ============================================================

export enum StepPhase {
  THOUGHT = 'THOUGHT',
  ACTION = 'ACTION',
  OBSERVATION = 'OBSERVATION',
}

// ============================================================
// Other Enums
// ============================================================

export enum TaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED',
  TERMINATED = 'TERMINATED',
}

export enum ExecutionMode {
  /** Auto mode: complexity is determined by PERCEIVE phase (default) */
  AUTO = 'auto',
  /** Think only: PERCEIVE + ASSESS (no execution) */
  THINK = 'think',
  /** Plan only: PERCEIVE + ASSESS + PLAN (no execution) */
  PLAN = 'plan',
  /** Execute: PERCEIVE + ASSESS + PLAN + EXECUTE (no REFLECT) */
  EXECUTE = 'execute',
  /** Full: PERCEIVE + ASSESS + PLAN + EXECUTE + REFLECT */
  FULL = 'full',
}

/** Thinking level - like human System 1/2 thinking, maps to execution strategies */
export enum ThinkingLevel {
  /** INSTINCT: Pattern matching, experience recall, "I know this" - fast, automatic */
  INSTINCT = 'instinct',
  /** ANALYTICAL: Step-by-step reasoning, verification - controlled, methodical */
  ANALYTICAL = 'analytical',
  /** DELIBERATE: Deep reasoning, exploration, multiple hypotheses - extensive thinking */
  DELIBERATE = 'deliberate',
}

/** Task complexity with dynamic adjustment potential */
export interface TaskComplexity {
  /** Overall complexity level */
  level: 'simple' | 'moderate' | 'complex';
  /** Estimated steps needed */
  estimatedSteps: number;
  /** Confidence in complexity assessment (0-1) */
  confidence: number;
  /** Key uncertainty factors */
  uncertainties: string[];
  /** Required thinking approaches */
  recommendedLevels: ThinkingLevel[];
  /** Can be resolved with instinct (pattern match)? */
  isPatternRecognizable: boolean;
  /** Requires exploration/verification? */
  requiresVerification: boolean;
}

export enum ThinkingMode {
  /** CREATIVE: Generate novel ideas, explore multiple possibilities */
  CREATIVE = 'CREATIVE',
  /** LOGICAL: Reason about cause and effect, verify consistency */
  LOGICAL = 'LOGICAL',
  /** EMPATHETIC: Understand emotions, aesthetic preferences, deep needs */
  EMPATHETIC = 'EMPATHETIC',
  /** STRUCTURAL: Decompose tasks, manage dependencies and resources */
  STRUCTURAL = 'STRUCTURAL',
}

export enum TerminationReason {
  COMPLETED = 'COMPLETED',
  MAX_STEPS_REACHED = 'MAX_STEPS_REACHED',
  USER_TERMINATED = 'USER_TERMINATED',
  UNRECOVERABLE_ERROR = 'UNRECOVERABLE_ERROR',
  HEARTBEAT_TIMEOUT = 'HEARTBEAT_TIMEOUT',
}

// ============================================================
// Tool & Model Types
// ============================================================

export type { ToolDefinition } from './innate-tools/types';
export type { InnateTool } from './innate-tools/types';
export { KNOWLEDGE_TOOL_DEFINITIONS } from './knowledge/knowledge-tool-definitions';

export interface ToolCallIntent {
  id?: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCall?: ToolCallIntent;
}

export interface ModelResponse {
  content: string;
  toolCall?: ToolCallIntent;
}

// ============================================================
// Step Log
// ============================================================

export interface StepLog {
  stepNumber: number;
  cognitivePhase: CognitivePhase;
  phase: StepPhase;
  content: string;
  toolName?: string;
  toolArguments?: Record<string, unknown>;
  timestamp: number;
}

// ============================================================
// Five-Phase Cognitive Artifacts
// ============================================================

/** PERCEIVE phase output: deep understanding of the task */
export interface Perception {
  /** Surface-level request */
  surfaceRequest: string;
  /** True underlying intent */
  deepIntent: string;
  /** Identified constraints */
  constraints: string[];
  /** Unclarified ambiguities */
  ambiguities: string[];
  /** Success criteria */
  successCriteria: string[];
  /** Dynamic task complexity with confidence and recommendations */
  complexity: TaskComplexity;
  /** Thinking level based on task analysis */
  thinkingLevel: ThinkingLevel;
  /** For simple/instinct tasks: a ready-to-execute single-step plan */
  fastPlan?: Plan;
}

/** ASSESS phase output: self-capability assessment */
export interface Assessment {
  /** Skill categories required (broader groupings, e.g., "summarization") */
  skillCategories: string[];
  /** Description of tool/skill match with the task */
  capabilityMatch: string;
  /** Skill categories that are matched by available skills */
  matchedSkillCategories: string[];
  /** Skill categories that are required but currently missing */
  missingSkillCategories: string[];
  /** Identified risks */
  risks: string[];
  /** Dynamic task complexity (may adjust based on capability assessment) */
  complexity: TaskComplexity;
}

/** PLAN phase output: execution plan */
export interface Plan {
  /** Overall strategy description */
  strategy: string;
  /** Ordered list of steps */
  steps: PlanStep[];
  /** Expected final outcome */
  expectedOutcome: string;
}

export interface PlanStep {
  id: string;
  description: string;
  /** IDs of prerequisite steps */
  dependsOn: string[];
}

/** Execution result for a single plan step */
export interface PlanStepResult {
  /** Corresponding plan step ID */
  stepId: string;
  /** ReAct iteration logs for this step */
  steps: StepLog[];
  /** Final output of this step (used as input for subsequent steps) */
  output?: string;
  /** Termination reason */
  terminationReason: TerminationReason;
}

/** REFLECT phase output: reflection record */
export interface Reflection {
  /** Whether result met the goal */
  goalMet: boolean;
  /** What went well */
  strengths: string[];
  /** Areas for improvement */
  improvements: string[];
  /** Lessons learned (can be stored in long-term memory) */
  lessonsLearned: string[];
  /** Whether replanning is needed */
  needsReplan: boolean;
}

// ============================================================
// Thinking Mode Weights
// ============================================================

export interface ThinkingModeWeights {
  [ThinkingMode.CREATIVE]: number;
  [ThinkingMode.LOGICAL]: number;
  [ThinkingMode.EMPATHETIC]: number;
  [ThinkingMode.STRUCTURAL]: number;
}

// ============================================================
// Results
// ============================================================

export interface TerminationCheck {
  shouldTerminate: boolean;
  reason?: TerminationReason;
}

export interface ExecuteResult {
  status: TaskStatus;
  finalAnswer?: string;
  steps: StepLog[];
  /** Independent execution results for each plan step */
  planStepResults: PlanStepResult[];
  terminationReason: TerminationReason;
}

export interface TaskResult {
  taskId: string;
  status: TaskStatus;
  finalAnswer?: string;
  terminationReason: TerminationReason;
  steps: StepLog[];
  durationMs: number;
  /** Token usage statistics */
  tokenUsage: TokenUsage;
  /** Complete cognitive process record */
  cognition: {
    perception: Perception;
    assessment: Assessment;
    plan: Plan;
    reflection?: Reflection;
  };
}

// ============================================================
// Configuration
// ============================================================

export interface AgentConfig {
  systemPrompt: string;
  maxSteps?: number;
  maxConsecutiveFailures?: number;
  /** Maximum number of replans triggered by REFLECT */
  maxReplans?: number;
  /**
   * Built-in sandbox only: resolved working directory for tools (fs/cmd paths).
   * Ignored when a custom `sandbox` is passed to `AgentBrain`. Omit for `os.tmpdir()/.bios-agent`.
   */
  workingDirectory?: string;
}

const CONFIG_DEFAULTS = {
  maxSteps: 15,
  maxConsecutiveFailures: 3,
  maxReplans: 2,
} as const;

/** Appended to host `systemPrompt` once — documents innate cron_, skill_*, and ask_user expectations. */
const INNATE_TOOLS_GUIDANCE_MARKER = '[AgentBrain: innate tools guidance]';
const INNATE_TOOLS_SYSTEM_SUPPLEMENT = `## Built-in (innate) tools
- **Scheduling**: Recurring or in-app scheduled work uses the **cron_** tools (e.g. \`cron_add\` with a standard cron expression in UTC). Prefer them over asking which external device or app to use when the request can be satisfied in the host application.
- **ask_user**: Do not call \`ask_user\` to ask which phone, PC, or third-party app to use unless the user explicitly needs an integration outside the host. For reminders or schedules inside the host, use **cron_** tools directly without platform clarification.
- **Skill registry**: If the user asks to find, search, or list skills from the online registry (e.g. "find UX skills", "有没有设计类 skill"), you **must** call \`skill_find\` with a short \`query\` (English keywords often work well), then answer from the tool JSON — do not invent package names or pretend you searched without calling \`skill_find\`.`;

export function resolveConfig(
  config: AgentConfig,
): AgentConfig & typeof CONFIG_DEFAULTS {
  const merged = { ...CONFIG_DEFAULTS, ...config } as AgentConfig & typeof CONFIG_DEFAULTS;
  const base = merged.systemPrompt != null ? String(merged.systemPrompt) : '';
  if (base.includes(INNATE_TOOLS_GUIDANCE_MARKER)) {
    return merged;
  }
  const suffix = `${INNATE_TOOLS_GUIDANCE_MARKER}\n${INNATE_TOOLS_SYSTEM_SUPPLEMENT}`;
  merged.systemPrompt = base ? `${base}\n\n${suffix}` : suffix;
  return merged;
}

// ============================================================
// Token Counting - Used for statistics and prompt trimming
/** Token usage statistics for a single task */
export interface TokenUsage {
  /** Total input tokens (cumulative prompt tokens from all LLM calls) */
  promptTokens: number;
  /** Total output tokens (cumulative completion tokens from all LLM calls) */
  completionTokens: number;
  /** Total tokens */
  totalTokens: number;
}

// ============================================================

/** LLM client supporting tool/function calling and token counting */
export interface IModelClient {
  /** Maximum context window size (in tokens) supported by this model */
  readonly contextWindow: number;

  chat(
    messages: Message[],
    tools?: ToolDefinition[],
  ): Promise<ModelResponse>;

  /** Count tokens in text */
  count(text: string): number;
  /** Count tokens in a set of tool definitions */
  countTools(tools: ToolDefinition[]): number;
}


/**
 * Tool provider: provides tool definitions and execution capability.
 * Used for innate tools (InnateToolHub) and other system-built-in tools.
 */
export interface IHub {
   getToolDefinition(toolName: string): ToolDefinition | undefined;
   hasTool(toolName: string): boolean;
}


/** Optional event publisher for observability */
export interface IEventPublisher {
  publish(type: string, payload: unknown): void;
}

// ============================================================
// AgentBrain Initialization Options
// ============================================================

export interface AgentBrainOptions {
  model: IModelClient;
  memory: MemoryHub;
  /** Knowledge hub (optional, for storing and retrieving structured knowledge documents) */
  knowledge?: KnowledgeHub;
  /** Cron hub (optional, for scheduling and managing background tasks) */
  cron?: CronHub;
  /** Skill hub (unified management of dynamically installed skill packages) */
  skills: SkillHub;
  /**
   * Custom security sandbox (e.g. DB + UI approval). Omit to use the built-in rule sandbox whose
   * `askPermission` routes to `ask_user`. Subclass {@link SecuritySandbox} and override
   * `askPermission` as needed.
   */
  sandbox?: SecuritySandbox;
  config: AgentConfig;
  eventPublisher?: IEventPublisher;
}
