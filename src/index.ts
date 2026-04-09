// ============================================================
// Public API
// ============================================================

// --- Core orchestrator ---
export { AgentBrain } from './agent-brain';

// --- Sub-modules (advanced usage) ---
export { ReactLoop } from './react/react-loop';
export type { ReactLoopDeps, ReactLoopContext } from './react/react-loop';
export { LoopController } from './react/loop-controller';
export { SkillHub } from './skill/skill-hub';
export { OpenAIClient } from './model/openai-client';
export type { OpenAIClientOptions } from './model/openai-client';
export { AskUserTool } from './innate-tools/ask-user-tool';
export { KNOWLEDGE_TOOL_DEFINITIONS } from './knowledge/knowledge-tool-definitions';
export { MEMORY_TOOL_DEFINITIONS, CONVERSATION_TOOL_DEFINITIONS } from './memory/memory-tool-definitions';
export { MemoryHub } from './memory/memory-hub';
export { KnowledgeHub } from './knowledge/knowledge-hub';
export { SecuritySandbox } from './sandbox/security-sandbox';
export type {
  PermissionLevel,
  ActionCategory,
  PermissionRule,
  SandboxConfig,
  PermissionRequest,
  PermissionDecision,
  AskHandler,
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
export { interpolate, loadPrompt } from './prompts/load-prompt';

// --- All types, enums & contracts ---
export {
  // Enums
  CognitivePhase,
  StepPhase,
  TaskStatus,
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
  ITokenCounter,
  IHub,
  InnateTool,
  IEventPublisher,
  // Token
  TokenUsage,
} from './types';
