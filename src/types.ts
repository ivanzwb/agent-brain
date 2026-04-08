import type { ToolDefinition } from './innate-tools/types';
import { MemoryHub } from './memory/memory-hub';
import { KnowledgeHub } from './knowledge/knowledge-hub';
import { CronHub } from './cron/cron-hub';
import { SkillHub } from './skill/skill-hub';
import type { SandboxConfig } from './sandbox/security-sandbox';

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
  /** Task complexity classification (determined during PERCEIVE) */
  complexity: 'simple' | 'complex';
  /** For simple tasks: a ready-to-execute single-step plan */
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
  /** Assessed task complexity */
  complexity: 'simple' | 'moderate' | 'complex';
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
  heartbeatTimeoutMs?: number;
  maxConsecutiveFailures?: number;
  /** Maximum number of replans triggered by REFLECT */
  maxReplans?: number;
}

const CONFIG_DEFAULTS = {
  maxSteps: 15,
  heartbeatTimeoutMs: 60_000,
  maxConsecutiveFailures: 3,
  maxReplans: 2,
} as const;

export function resolveConfig(
  config: AgentConfig,
): Required<AgentConfig> {
  return { ...CONFIG_DEFAULTS, ...config } as Required<AgentConfig>;
}

// ============================================================
// Token Counting - Used for statistics and prompt trimming
// ============================================================

/** Token counter implemented by external code (tokenizers vary by model) */
export interface ITokenCounter {
  /** Count tokens in text */
  count(text: string): number;
  /** Count tokens in a set of tool definitions */
  countTools(tools: ToolDefinition[]): number;
}

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
// Framework Contracts - Interfaces to be implemented by users
// ============================================================

/** LLM client supporting tool/function calling and token counting */
export interface IModelClient extends ITokenCounter {
  /** Maximum context window size (in tokens) supported by this model */
  readonly contextWindow: number;

  chat(
    messages: Message[],
    tools?: ToolDefinition[],
  ): Promise<ModelResponse>;
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
  /** Security sandbox configuration (optional). When provided, all tool
   *  executions go through permission checks before running. */
  sandbox?: SandboxConfig;
  config: AgentConfig;
  eventPublisher?: IEventPublisher;
}
