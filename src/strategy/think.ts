import { TaskStatus, TerminationReason, ThinkingLevel, type TaskResult } from '../types';
import type { StrategyParams, CognitiveOps } from './types';

/**
 * THINK strategy — Only PERCEIVE + ASSESS, no execution.
 * Returns assessment for Agent Leader to analyze and delegate.
 */
export async function runThinkStrategy(params: StrategyParams, ops: CognitiveOps): Promise<TaskResult> {
  const { taskId, startTime, userInput, tracker, perception } = params;

  ops.emit('strategy:start', { taskId, strategy: 'think', thinkingLevel: ThinkingLevel.INSTINCT });

  const assessment = await ops.assess(userInput, perception, tracker);
  ops.emit('phase:assess', { taskId, assessment, thinkingLevel: ThinkingLevel.INSTINCT });

  // Format assessment as final answer
  const finalAnswer = `Assessment:\n` +
    `Required skills: ${assessment.skillCategories.join(', ') || 'none'}\n` +
    `Capability match: ${assessment.capabilityMatch || 'N/A'}\n` +
    `Matched: ${assessment.matchedSkillCategories.join(', ') || 'none'}\n` +
    `Missing: ${assessment.missingSkillCategories.join(', ') || 'none'}\n` +
    `Risks: ${assessment.risks.join(', ') || 'none'}`;

  return ops.buildResult(taskId, startTime, tracker, {
    status: TaskStatus.COMPLETED,
    terminationReason: TerminationReason.COMPLETED,
    finalAnswer,
    steps: [],
    cognition: { perception, assessment, plan: ops.emptyPlan() },
  });
}