import type { ToolDefinition } from './innate-tools/types';
import { MemoryHub } from './memory/memory-hub';
import { KnowledgeHub } from './knowledge/knowledge-hub';
import { SkillHub } from './skill/skill-hub';

// ============================================================
// 认知阶段 — 模拟人类思考的五阶段
// ============================================================

/**
 * 人类面对任何任务时的五个认知阶段：
 *
 *   PERCEIVE → ASSESS → PLAN → EXECUTE → REFLECT
 *   理解任务    评估能力   分解规划  执行监控   反思优化
 *
 * 简单任务：五阶段快速流过（秒级）
 * 复杂任务：EXECUTE 内部迭代，REFLECT 可能触发回到 PLAN 修正
 */
export enum CognitivePhase {
  /** 理解任务：接收信息、识别意图、澄清模糊点 */
  PERCEIVE = 'PERCEIVE',
  /** 评估能力与资源：知识匹配、资源盘点、风险判断 */
  ASSESS = 'ASSESS',
  /** 分解与规划：任务分解、设定目标、制定计划 */
  PLAN = 'PLAN',
  /** 执行与监控：按计划行动、实时调整、自我监控 */
  EXECUTE = 'EXECUTE',
  /** 反思与优化：结果评估、经验积累、教训总结 */
  REFLECT = 'REFLECT',
}

// ============================================================
// ReAct 内循环阶段（EXECUTE 阶段内部使用）
// ============================================================

export enum StepPhase {
  THOUGHT = 'THOUGHT',
  ACTION = 'ACTION',
  OBSERVATION = 'OBSERVATION',
}

// ============================================================
// 其他枚举
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
  /** 发散：产生新颖想法、建立意外联系 */
  CREATIVE = 'CREATIVE',
  /** 收敛：推理因果、验证一致性 */
  LOGICAL = 'LOGICAL',
  /** 共情：理解情绪、审美偏好与深层需求 */
  EMPATHETIC = 'EMPATHETIC',
  /** 工程：分解任务、管理依赖与资源 */
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
// 五阶段认知产物
// ============================================================

/** PERCEIVE 阶段产出：对任务的深度理解 */
export interface Perception {
  /** 表层需求 */
  surfaceRequest: string;
  /** 深层意图 */
  deepIntent: string;
  /** 识别出的约束条件 */
  constraints: string[];
  /** 未澄清的模糊点 */
  ambiguities: string[];
  /** 成功标准 */
  successCriteria: string[];
}

/** ASSESS 阶段产出：自我能力评估 */
export interface Assessment {
  /** 任务所需的知识与技能（从任务出发，与自身有无无关） */
  requiredSkills: string[];
  /** 可用工具/技能与任务的匹配度描述 */
  capabilityMatch: string;
  /** 匹配到的可用技能（名称列表） */
  matchedSkills: string[];
  /** 任务所需但当前缺失的技能 */
  missingSkills: string[];
  /** 识别出的风险 */
  risks: string[];
  /** 判定的任务复杂度 */
  complexity: 'simple' | 'moderate' | 'complex';
  /** 是否有能力完成 */
  feasible: boolean;
  /** 如果不完全可行，缺什么 */
  gaps: string[];
}

/** PLAN 阶段产出：执行计划 */
export interface Plan {
  /** 整体策略描述 */
  strategy: string;
  /** 有序的步骤列表 */
  steps: PlanStep[];
  /** 预期最终产出 */
  expectedOutcome: string;
}

export interface PlanStep {
  id: string;
  description: string;
  /** 依赖的前置步骤 ID */
  dependsOn: string[];
}

/** 单个计划步骤的执行结果 */
export interface PlanStepResult {
  /** 对应的计划步骤 ID */
  stepId: string;
  /** 该步骤的 ReAct 迭代日志 */
  steps: StepLog[];
  /** 该步骤的最终输出（作为后续步骤的输入） */
  output?: string;
  /** 终止原因 */
  terminationReason: TerminationReason;
}

/** REFLECT 阶段产出：反思记录 */
export interface Reflection {
  /** 结果是否达到预期 */
  goalMet: boolean;
  /** 做得好的方面 */
  strengths: string[];
  /** 可改进的方面 */
  improvements: string[];
  /** 总结的经验教训（可存入长期记忆） */
  lessonsLearned: string[];
  /** 是否需要重新规划 */
  needsReplan: boolean;
}

// ============================================================
// 思维模式权重
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
  /** 每个计划步骤的独立执行结果 */
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
  /** token 使用量统计 */
  tokenUsage: TokenUsage;
  /** 完整的认知过程记录 */
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
  /** 模型上下文窗口大小（token 数） */
  modelContextSize: number;
  maxSteps?: number;
  heartbeatTimeoutMs?: number;
  maxConsecutiveFailures?: number;
  /** REFLECT 触发重规划的最大次数 */
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
// Token 计数 — 用于统计和 prompt 裁剪
// ============================================================

/** Token 计数器，由外部实现（不同模型的 tokenizer 不同） */
export interface ITokenCounter {
  /** 计算文本的 token 数 */
  count(text: string): number;
  /** 计算一组工具声明的 token 数 */
  countTools(tools: ToolDefinition[]): number;
}

/** 单次任务的 token 使用量统计 */
export interface TokenUsage {
  /** 输入 token 总数（所有 LLM 调用的 prompt token 累计） */
  promptTokens: number;
  /** 输出 token 总数（所有 LLM 调用的 completion token 累计） */
  completionTokens: number;
  /** 总计 */
  totalTokens: number;
}

// ============================================================
// Framework Contracts — 用户需要实现的接口
// ============================================================

/** LLM 客户端，支持 tool/function calling，同时提供 token 计数能力 */
export interface IModelClient extends ITokenCounter {
  chat(
    messages: Message[],
    tools?: ToolDefinition[],
  ): Promise<ModelResponse>;
}


/**
 * 工具提供者：提供一组工具定义及其执行能力。
 * 用于天生工具（InnateToolHub）等系统内建工具。
 */
export interface IHub {
   getToolDefinition(toolName: string): ToolDefinition | undefined;
   hasTool(toolName: string): boolean;
}


/** 可选的事件发布者，用于可观测性 */
export interface IEventPublisher {
  publish(type: string, payload: unknown): void;
}

// ============================================================
// AgentBrain 初始化选项
// ============================================================

export interface AgentBrainOptions {
  model: IModelClient;
  memory: MemoryHub;
  /** 知识库（可选，用于存储和检索结构化知识文档） */
  knowledge?: KnowledgeHub;
  /** 技能中心（统一管理动态安装的技能包） */
  skills: SkillHub;
  config: AgentConfig;
  eventPublisher?: IEventPublisher;
}
