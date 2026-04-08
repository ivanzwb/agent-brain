import type { TaskResult } from '../types';
import type { ExecutionStrategy, StrategyParams, CognitiveOps } from './types';

/**
 * Fast path — skip ASSESS/PLAN/REFLECT for simple tasks.
 * Uses the perception-generated fastPlan and goes directly to EXECUTE.
 */
export class FastPathStrategy implements ExecutionStrategy {
  async run(params: StrategyParams, ops: CognitiveOps): Promise<TaskResult> {
    const { taskId, startTime, userInput, tracker, perception } = params;
    const plan = perception.fastPlan!;
    const assessment = ops.emptyAssessment();
    assessment.complexity = 'simple';

    ops.emit('phase:plan', { taskId, plan, replanCount: 0, fastPath: true });

    const executeResult = await ops.execute(taskId, assessment, plan, tracker, userInput);
    ops.emit('phase:execute', { taskId, result: executeResult });

    const finalAnswer = executeResult.finalAnswer;
    if (finalAnswer) {
      await ops.trackConversation(taskId, 'assistant', finalAnswer);
    }

    return ops.buildResult(taskId, startTime, tracker, {
      status: executeResult.status,
      terminationReason: executeResult.terminationReason,
      finalAnswer: executeResult.finalAnswer,
      steps: executeResult.steps,
      cognition: {
        perception,
        assessment,
        plan,
      },
    });
  }
}
