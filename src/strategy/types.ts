import type {
  Assessment,
  ExecuteResult,
  Perception,
  Plan,
  Reflection,
  TaskResult,
  ThinkingLevel,
} from '../types';
import type { TokenTracker } from '../token/token-tracker';

// ============================================================
// Execution Strategy — Strategy pattern for task execution paths
// Based on ThinkingLevel (human System 1/2 thinking)
// ============================================================

/** Parameters passed to execution strategies */
export interface StrategyParams {
  taskId: string;
  startTime: number;
  userInput: string;
  memoryText: string;
  tracker: TokenTracker;
  /** Perception result (includes complexity and thinking level) */
  perception: Perception;
  /** Selected thinking level for this execution */
  thinkingLevel: ThinkingLevel;
}

/** Cognitive operations delegate — exposes brain capabilities to strategies */
export interface CognitiveOps {
  assess(userInput: string, perception: Perception, tracker: TokenTracker): Promise<Assessment>;
  plan(userInput: string, perception: Perception, assessment: Assessment, tracker: TokenTracker, previousReflection?: Reflection, userContext?: string): Promise<Plan>;
  execute(conversationId: string, assessment: Assessment, plan: Plan, tracker: TokenTracker, userContext?: string): Promise<ExecuteResult>;
  reflect(userInput: string, perception: Perception, plan: Plan, executeResult: ExecuteResult, tracker: TokenTracker): Promise<Reflection>;
  /** Save reflection to long-term memory */
  saveReflection(reflection: Reflection, taskId: string): Promise<void>;
  emit(type: string, payload: unknown): void;
  trackConversation(id: string, role: string, content: string): Promise<void>;
  buildResult(taskId: string, startTime: number, tracker: TokenTracker, partial: Omit<TaskResult, 'taskId' | 'durationMs' | 'tokenUsage'>): TaskResult;
  emptyPerception(): Perception;
  emptyAssessment(): Assessment;
  emptyPlan(): Plan;
  maxReplans: number;
}

/** Strategy interface for task execution */
export interface ExecutionStrategy {
  run(params: StrategyParams, ops: CognitiveOps): Promise<TaskResult>;
}
