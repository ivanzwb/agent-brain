// ============================================================
// PlanStep ReAct Prompt 模板
//
// 用于 ReactLoop.runPlanStep() 中构建 system 和 user 消息。
// 每个 PlanStep 是一个独立的 ReAct 循环（Thought→Action→Observation），
// 模板引导模型遵循 ReAct 协议，聚焦当前步骤。
// ============================================================

/**
 * 构建 PlanStep ReAct 循环的 system prompt。
 *
 * 结构：
 *   1. 角色与行为协议（ReAct 循环规则）
 *   2. 执行计划概览（全局上下文）
 *   3. 当前步骤聚焦
 *   4. 可用资源（技能目录 + 记忆）
 *   5. 约束与终止条件
 */
export function buildPlanStepSystemPrompt(params: {
  /** 外层 systemPrompt（身份 + 通用指令） */
  baseSystemPrompt: string;
  /** 思维模式引导 */
  thinkingGuidance: string;
  /** 整体执行计划文本 */
  planOverview: string;
  /** 当前步骤 ID 和描述 */
  currentStep: { id: string; description: string };
  /** 技能目录文本（可能为空） */
  skillCatalogText: string;
  /** 技能缺口提示（可能为空） */
  skillGapsText: string;
  /** 记忆上下文（可能为空） */
  memoryText: string;
}): string {
  const {
    baseSystemPrompt,
    thinkingGuidance,
    planOverview,
    currentStep,
    skillCatalogText,
    skillGapsText,
    memoryText,
  } = params;

  const parts: string[] = [];

  // ---- 1. 基础身份 ----
  parts.push(baseSystemPrompt);

  // ---- 2. ReAct 行为协议 ----
  parts.push('');
  parts.push(REACT_PROTOCOL);

  // ---- 3. 思维模式 ----
  parts.push('');
  parts.push(thinkingGuidance);

  // ---- 4. 执行计划概览 ----
  parts.push('');
  parts.push(planOverview);

  // ---- 5. 当前步骤聚焦 ----
  parts.push('');
  parts.push('[Current Step]');
  parts.push(`Step ${currentStep.id}: ${currentStep.description}`);
  parts.push('You are executing ONLY this step. Do not proceed to the next step.');

  // ---- 6. 技能目录（动态） ----
  if (skillCatalogText) {
    parts.push('');
    parts.push(skillCatalogText);
  }

  // ---- 7. 技能缺口 ----
  if (skillGapsText) {
    parts.push('');
    parts.push(skillGapsText);
  }

  // ---- 8. 记忆上下文 ----
  if (memoryText) {
    parts.push('');
    parts.push('[Context from Memory]');
    parts.push(memoryText);
  }

  return parts.join('\n');
}

/**
 * 构建 PlanStep ReAct 循环的 user 消息（首条 user message）。
 *
 * 结构：
 *   1. 整体策略（一句话）
 *   2. 当前步骤目标
 *   3. 前置步骤输出（如有依赖）
 *   4. 行动指令
 */
export function buildPlanStepUserPrompt(params: {
  /** 整体策略 */
  strategy: string;
  /** 当前步骤 */
  currentStep: { id: string; description: string };
  /** 前置步骤输出（已拼接的文本，可为空） */
  priorContext: string;
  /** 预期最终产出 */
  expectedOutcome: string;
}): string {
  const { strategy, currentStep, priorContext, expectedOutcome } = params;

  const lines: string[] = [];

  lines.push(`Strategy: ${strategy}`);
  lines.push('');
  lines.push(`Your task: Execute step ${currentStep.id} — ${currentStep.description}`);

  if (priorContext) {
    lines.push('');
    lines.push('[Prior Step Outputs]');
    lines.push('The following outputs from previous steps are available as context:');
    lines.push(priorContext);
  }

  lines.push('');
  lines.push(`Overall expected outcome: ${expectedOutcome}`);
  lines.push('');
  lines.push('Begin working on this step. Use the Thought→Action→Observation cycle.');
  lines.push('When the step is complete, respond with your final output WITHOUT calling any tool.');

  return lines.join('\n');
}

// ============================================================
// ReAct 行为协议 — 指导模型在每轮如何思考和行动
// ============================================================

const REACT_PROTOCOL = `[ReAct Protocol]
You operate in a Thought → Action → Observation loop:

1. **Thought**: Analyze the current situation. What do you know? What do you need? What's the best next action?
   - If this is the first iteration, review the step goal and available context.
   - If you have observations from previous actions, reason about what they tell you.
   - Consider whether you have enough information to complete the step.

2. **Action**: Call exactly ONE tool to make progress.
   - Choose the most appropriate tool for your current need.
   - If you need a skill you don't have, use innate tools (search_skills → install_skill) to acquire it.
   - After installing a skill, use skill_load_main to load its context before using its tools.

3. **Observation**: You will receive the tool's output. Use it in your next Thought.

**Completion**: When you have enough information to provide the step's output, respond with your final answer WITHOUT calling any tool. This signals the step is complete.

**Error handling**: If a tool fails, reason about alternatives in your next Thought. Try a different approach before giving up.

**Constraints**:
- Execute ONLY the current step. Do not attempt subsequent steps.
- Each response should contain either a Thought + tool call, or a final answer.
- Stay focused on the step objective. Avoid unnecessary tool calls.`;
