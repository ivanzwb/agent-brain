// ============================================================
// Public API
// ============================================================

// --- Core orchestrator ---
export { AgentBrain } from './agent-brain';

// --- Sub-modules (advanced usage) ---
export { ReactLoop } from './react/react-loop';
export type { ReactLoopDeps, ReactLoopContext } from './react/react-loop';
export { LoopController } from './react/loop-controller';
export { ThinkingModeScheduler } from './thinking-mode';
export { TokenTracker } from './token/token-tracker';
export { PromptBudget } from './token/prompt-budget';
export { InnateToolHub } from './innate-tools/innate-tool-hub';
export { SkillHub } from './skill/skill-hub';
export { OpenAIClient } from './model/openai-client';
export type { OpenAIClientOptions } from './model/openai-client';

// --- All types, enums & contracts ---
export {
  // Enums
  CognitivePhase,
  StepPhase,
  TaskStatus,
  ThinkingMode,
  TerminationReason,
  // Config
  resolveConfig,
} from './types';

export type {
  // Cognitive artifacts
  Perception,
  Assessment,
  Plan,
  PlanStep,
  PlanStepResult,
  Reflection,
  // Tool & model
  ToolDefinition,
  Message,
  ModelResponse,
  // Results
  StepLog,
  ExecuteResult,
  TaskResult,
  TerminationCheck,
  ThinkingModeWeights,
  // Config
  AgentConfig,
  AgentBrainOptions,
  // Framework contracts
  IModelClient,
  ITokenCounter,
  IHub,
  InnateTool,
  IEventPublisher,
  // Token
  TokenUsage,
} from './types';
