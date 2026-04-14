// ============================================================
// PlanStep ReAct system prompt — assembled from react/plan-step-system.md
// ============================================================

import { renderPrompt } from '../prompts/prompt-system';

export function buildPlanStepSystemPrompt(params: {
  /** Outer systemPrompt (identity + general instructions) */
  baseSystemPrompt: string;
  /** Thinking mode guidance */
  thinkingGuidance: string;
  /** Overall execution plan text */
  planOverview: string;
  /** Current step ID and description */
  currentStep: { id: string; description: string };
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
    skillGapsText,
    memoryText,
  } = params;


  const skillGapsBlock = skillGapsText ? `\n\n${skillGapsText}` : '';
  const memoryBlock = memoryText ? `\n\n[Context from Memory]\n${memoryText}` : '';

  return renderPrompt('react.plan_step_system', {
    baseSystemPrompt,
    thinkingGuidance,
    planOverview,
    currentStepId: currentStep.id,
    currentStepDescription: currentStep.description,
    skillGapsBlock,
    memoryBlock,
  });
}
