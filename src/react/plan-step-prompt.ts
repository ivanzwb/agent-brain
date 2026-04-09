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
  - When you call skill_find, it returns a JSON array of skills (objects with fields such as slug, name, description, source, repo).
  - From that JSON, pick the best-matching skill and then call skill_install with arguments like {"source":"<the chosen skill slug or name>"}.
  - Do not stop after printing the JSON; if a missing capability can be provided by a skill, complete the chain skill_find → skill_install → skill_load_main before using the new tools.
  - After installing a skill, use skill_load_main to load its context before using its tools.
  - When planning for questions about your past work, previous conversations, or daily/weekly reports of what **you** did, include steps that read from memory tools instead of asking the user:
   - Prefer conversation_history with a limit (for example: {"limit":100}) to fetch recent dialogue for time-based summaries like "昨天".
   - Use conversation_search({"query":"...","limit":N}) only for topic- or project-specific lookups.
   - Use memory_search / memory_history to recall long-term facts or previously stored summaries.

3. **Observation**: You will receive the tool's output. Use it in your next Thought.

**Completion**: When you have enough information to provide the step's output, respond with your final answer WITHOUT calling any tool. This signals the step is complete.

**Error handling**: If a tool fails, reason about alternatives in your next Thought. Try a different approach before giving up.

**Constraints**:
- Execute ONLY the current step. Do not attempt subsequent steps.
- Each response should contain either a Thought + tool call, or a final answer.
- Stay focused on the step objective. Avoid unnecessary tool calls.`;
