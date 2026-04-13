// ============================================================
// Public API
// ============================================================

// --- Core orchestrator ---
export { AgentBrain } from './agent-brain';

// --- Sub-modules (advanced usage) ---
export { SkillHub } from './skill/skill-hub';
export { OpenAIClient } from './model/openai-client';
export type { OpenAIClientOptions } from './model/openai-client';
export { MemoryHub } from './memory/memory-hub';
export { KnowledgeHub } from './knowledge/knowledge-hub';
export type { CronHub } from './cron/cron-hub';
export { SecuritySandbox } from './sandbox/security-sandbox';
export type {
  PermissionLevel,
  ActionCategory,
  PermissionRule,
  PermissionRequest,
  PermissionDecision,
} from './sandbox/security-sandbox';

// --- Prompt templates (keyword registry + compose) ---
export {
  COGNITIVE_PHASE_PROMPT_KEYWORD,
  composePrompt,
  getPromptByKeyword,
  listPromptCategories,
  listPromptTemplates,
  reloadPromptRegistry,
  renderPrompt,
  resolvePromptPath,
  aliasesForPrompt,
} from './prompts/prompt-system';
export type {
  PromptBlock,
  PromptTemplateEntry,
  ComposePromptOptions,
} from './prompts/prompt-system';
export { clearPromptTemplateCache, interpolate, loadPrompt } from './prompts/load-prompt';

export { PromptBudget, mergeConsecutiveSameRoleMessages } from './token/prompt-budget';
export {
  summarizeEvictedForMidTermBuffer,
  summarizeMiddleMessages,
} from './token/context-compression/short-term-workspace-compression';
export { applySlidingWindowMiddle } from './token/context-compression/sliding-window-strategy';
export {
  scoreMessageImportance,
  filterMiddleByImportance,
} from './token/context-compression/importance-filter-strategy';

// --- All types, enums & contracts ---
export {
  // Enums
  CognitivePhase,
  ExecutionMode,
  StepPhase,
  TaskStatus,
  ThinkingLevel,
  ThinkingMode,
  TerminationReason,
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
  IHub,
  InnateTool,
  IEventPublisher,
  // Token
  TokenUsage,
} from './types';
