import type {
  Assessment,
  ExecuteResult,
  Perception,
  Plan,
  Reflection,
  TaskResult,
} from '../types';
import type { TokenTracker } from '../token/token-tracker';

// ============================================================
// Execution Strategy — Strategy pattern for task execution paths
// ============================================================

/** Parameters passed to execution strategies */
export interface StrategyParams {
  taskId: string;
  startTime: number;
  userInput: string;
  memoryText: string;
  tracker: TokenTracker;
  /** Perception result (includes complexity classification) */
  perception: Perception;
}

/** Cognitive operations delegate — exposes brain capabilities to strategies */
export interface CognitiveOps {
  assess(userInput: string, perception: Perception, tracker: TokenTracker): Promise<Assessment>;
  plan(userInput: string, perception: Perception, assessment: Assessment, tracker: TokenTracker, previousReflection?: Reflection, userContext?: string): Promise<Plan>;
  execute(conversationId: string, assessment: Assessment, plan: Plan, tracker: TokenTracker, userContext?: string): Promise<ExecuteResult>;
  reflect(userInput: string, perception: Perception, plan: Plan, executeResult: ExecuteResult, tracker: TokenTracker): Promise<Reflection>;
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
