import { TaskStatus, TerminationReason, ThinkingLevel, type TaskResult } from '../types';
import type { StrategyParams, CognitiveOps } from './types';

/**
 * PLAN strategy — PERCEIVE + ASSESS + PLAN, no execution.
 * Returns plan for Agent Leader to assign to sub-agents.
 */
export async function runPlanStrategy(params: StrategyParams, ops: CognitiveOps): Promise<TaskResult> {
  const { taskId, startTime, userInput, tracker, perception } = params;

  ops.emit('strategy:start', { taskId, strategy: 'plan', thinkingLevel: ThinkingLevel.ANALYTICAL });

  const assessment = await ops.assess(userInput, perception, tracker);
  ops.emit('phase:assess', { taskId, assessment, thinkingLevel: ThinkingLevel.ANALYTICAL });

  const plan = await ops.plan(userInput, perception, assessment, tracker);
  ops.emit('phase:plan', { taskId, plan, thinkingLevel: ThinkingLevel.ANALYTICAL });

  // Format plan as final answer
  const planText = plan.steps.map(s => `- ${s.description}`).join('\n');
  const finalAnswer = plan.steps.length > 0 
    ? `Plan:\n${planText}\n\nStrategy: ${plan.strategy}`
    : `Strategy: ${plan.strategy}\nExpected: ${plan.expectedOutcome}`;

  return ops.buildResult(taskId, startTime, tracker, {
    status: TaskStatus.COMPLETED,
    terminationReason: TerminationReason.COMPLETED,
    finalAnswer,
    steps: [],
    cognition: { perception, assessment, plan },
  });
}