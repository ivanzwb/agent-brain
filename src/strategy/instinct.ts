import { ThinkingLevel, type TaskResult } from '../types';
import type { StrategyParams, CognitiveOps } from './types';

/**
 * INSTINCT strategy — Pattern matching, experience recall, "I know this".
 * Skip ASSESS/PLAN, use fastPlan directly to EXECUTE.
 * Like human System 1: fast, automatic, based on pattern recognition.
 */
export async function runInstinctStrategy(params: StrategyParams, ops: CognitiveOps): Promise<TaskResult> {
  const { taskId, startTime, userInput, tracker, perception } = params;
  const plan = perception.fastPlan!;
  const assessment = ops.emptyAssessment();

  ops.emit('strategy:start', { taskId, strategy: 'instinct', thinkingLevel: ThinkingLevel.INSTINCT });
  ops.emit('phase:execute', { taskId, plan, thinkingLevel: ThinkingLevel.INSTINCT });

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