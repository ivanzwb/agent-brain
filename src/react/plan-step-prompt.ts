// ============================================================
// PlanStep ReAct Prompt Template
//
// Used in ReactLoop.runPlanStep() to build system and user messages.
// Each PlanStep is an independent ReAct loop (Thought→Action→Observation),
// and the template guides the model to follow ReAct protocol, focusing on the current step.
// ============================================================

/**
 * Build system prompt for PlanStep ReAct loop.
 *
 * Structure:
 *   1. Role and behavior protocol (ReAct loop rules)
 *   2. Execution plan overview (global context)
 *   3. Current step focus
 *   4. Available resources (skill catalog + memory)
 *   5. Constraints and termination conditions
 */
export function buildPlanStepSystemPrompt(params: {
  /** Outer systemPrompt (identity + general instructions) */
  baseSystemPrompt: string;
  /** Thinking mode guidance */
  thinkingGuidance: string;
  /** Overall execution plan text */
  planOverview: string;
  /** Current step ID and description */
  currentStep: { id: string; description: string };
  /** Skill catalog text (may be empty) */
  skillCatalogText: string;
  /** Skill gaps hint (may be empty) */
  skillGapsText: string;
  /** Memory context (may be empty) */
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

  // ---- 1. Base Identity ----
  parts.push(baseSystemPrompt);

  // ---- 2. ReAct Behavior Protocol ----
  parts.push('');
  parts.push(REACT_PROTOCOL);

  // ---- 3. Thinking Mode ----
  parts.push('');
  parts.push(thinkingGuidance);

  // ---- 4. Execution Plan Overview ----
  parts.push('');
  parts.push(planOverview);

  // ---- 5. Current Step Focus ----
  parts.push('');
  parts.push('[Current Step]');
  parts.push(`Step ${currentStep.id}: ${currentStep.description}`);
  parts.push('You are executing ONLY this step. Do not proceed to the next step.');

  // ---- 6. Skill Catalog (Dynamic) ----
  if (skillCatalogText) {
    parts.push('');
    parts.push(skillCatalogText);
  }

  // ---- 7. Skill Gaps ----
  if (skillGapsText) {
    parts.push('');
    parts.push(skillGapsText);
  }

  // ---- 8. Memory Context ----
  if (memoryText) {
    parts.push('');
    parts.push('[Context from Memory]');
    parts.push(memoryText);
  }

  return parts.join('\n');
}

/**
 * Build user message for PlanStep ReAct loop (first user message).
 *
 * Structure:
 *   1. Overall strategy (one sentence)
 *   2. Current step goal
 *   3. Prior step outputs (if dependencies exist)
 *   4. Action instructions
 */
export function buildPlanStepUserPrompt(params: {
  /** Overall strategy */
  strategy: string;
  /** Current step */
  currentStep: { id: string; description: string };
  /** Prior step outputs (concatenated text, may be empty) */
  priorContext: string;
  /** Expected final output */
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
// ReAct Behavior Protocol — Guides model how to think and act in each round
// ============================================================

const REACT_PROTOCOL = `[ReAct Protocol]
You operate in a Thought → Action → Observation loop:

1. **Thought**: Analyze the current situation. What do you know? What do you need? What's the best next action?
   - If this is the first iteration, review the step goal and available context.
   - If you have observations from previous actions, reason about what they tell you.
   - Consider whether you have enough information to complete the step.

2. **Action**: Call exactly ONE tool to make progress.
   - Choose the most appropriate tool for your current need.
   - If you need a skill you don't have, use innate tools (skill_find → skill_install) to acquire it.
   - After installing a skill, use skill_load_main to load its context before using its tools.

3. **Observation**: You will receive the tool's output. Use it in your next Thought.

**Completion**: When you have enough information to provide the step's output, respond with your final answer WITHOUT calling any tool. This signals the step is complete.

**Error handling**: If a tool fails, reason about alternatives in your next Thought. Try a different approach before giving up.

**Constraints**:
- Execute ONLY the current step. Do not attempt subsequent steps.
- Each response should contain either a Thought + tool call, or a final answer.
- Stay focused on the step objective. Avoid unnecessary tool calls.`;
