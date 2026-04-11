import { ThinkingLevel, type TaskResult } from '../types';
import type { StrategyParams, CognitiveOps } from './types';

/**
 * ANALYTICAL strategy — Step-by-step reasoning, verification.
 * ASSESS → PLAN → EXECUTE (no REFLECT loop by default).
 * Like human System 2 but focused: controlled, methodical.
 */
export async function runAnalyticalStrategy(params: StrategyParams, ops: CognitiveOps): Promise<TaskResult> {
  const { taskId, startTime, userInput, tracker, perception } = params;

  ops.emit('strategy:start', { taskId, strategy: 'analytical', thinkingLevel: ThinkingLevel.ANALYTICAL });

  // Phase 2: ASSESS
  const assessment = await ops.assess(userInput, perception, tracker);
  ops.emit('phase:assess', { taskId, assessment, thinkingLevel: ThinkingLevel.ANALYTICAL });

  // Phase 3: PLAN
  const plan = await ops.plan(userInput, perception, assessment, tracker);
  ops.emit('phase:plan', { taskId, plan, thinkingLevel: ThinkingLevel.ANALYTICAL });

  // Phase 4: EXECUTE
  const executeResult = await ops.execute(taskId, assessment, plan, tracker, userInput);
  ops.emit('phase:execute:complete', { taskId, result: executeResult });

  const finalAnswer = executeResult.finalAnswer;
  if (finalAnswer) {
    await ops.trackConversation(taskId, 'assistant', finalAnswer);
  }

  return ops.buildResult(taskId, startTime, tracker, {
    status: executeResult.status,
    terminationReason: executeResult.terminationReason,
    finalAnswer: executeResult.finalAnswer,
    steps: executeResult.steps,
    cognition: { perception, assessment, plan },
  });
}