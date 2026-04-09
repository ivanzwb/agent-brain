// ============================================================
// PlanStep ReAct Prompt Template
//
// Used in ReactLoop.runPlanStep() to build system and user messages.
// Each PlanStep is an independent ReAct loop (Thought→Action→Observation),
// and the template guides the model to follow ReAct protocol, focusing on the current step.
// ============================================================

import { getPromptByKeyword } from '../prompts/prompt-system';

const REACT_PROTOCOL = getPromptByKeyword('react.protocol');

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

