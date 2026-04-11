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

  return ops.buildResult(taskId, startTime, tracker, {
    status: TaskStatus.COMPLETED,
    terminationReason: TerminationReason.COMPLETED,
    finalAnswer: 'Plan completed',
    steps: [],
    cognition: { perception, assessment, plan },
  });
}