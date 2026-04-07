import {
  TaskStatus,
  TerminationReason,
  type Plan,
  type ExecuteResult,
  type Reflection,
  type TaskResult,
} from '../types';
import type { ExecutionStrategy, StrategyParams, CognitiveOps } from './types';

/**
 * Full cognitive cycle — ASSESS → PLAN → EXECUTE → REFLECT.
 * PERCEIVE is already done before strategy selection.
 * Supports replan loop when REFLECT determines the goal was not met.
 */
export class FullCycleStrategy implements ExecutionStrategy {
  async run(params: StrategyParams, ops: CognitiveOps): Promise<TaskResult> {
    const { taskId, startTime, userInput, tracker, perception } = params;

    // Phase 2: ASSESS
    const assessment = await ops.assess(userInput, perception, tracker);
    ops.emit('phase:assess', { taskId, assessment });

    if (!assessment.feasible) {
      const answer = `I assessed this task and determined it's not feasible. Missing skills: ${assessment.missingSkillCategories.join(', ')}`;
      return ops.buildResult(taskId, startTime, tracker, {
        status: TaskStatus.FAILED,
        terminationReason: TerminationReason.COMPLETED,
        finalAnswer: answer,
        steps: [],
        cognition: { perception, assessment, plan: ops.emptyPlan() },
      });
    }

    // Phase 3-5: PLAN → EXECUTE → REFLECT (can loop)
    let plan: Plan | undefined;
    let executeResult: ExecuteResult | undefined;
    let reflection: Reflection | undefined;
    let replanCount = 0;
    let userContext = userInput;

    while (replanCount <= ops.maxReplans) {
      plan = await ops.plan(userContext, perception, assessment, tracker, reflection, userContext !== userInput ? userContext : undefined);
      ops.emit('phase:plan', { taskId, plan, replanCount });

      executeResult = await ops.execute(taskId, assessment, plan, tracker, userContext);
      ops.emit('phase:execute', { taskId, result: executeResult });

      reflection = await ops.reflect(userContext, perception, plan, executeResult, tracker);
      ops.emit('phase:reflect', { taskId, reflection });

      if (!reflection.needsReplan) break;

      replanCount++;
      ops.emit('phase:replan', { taskId, replanCount });
    }

    const finalAnswer = executeResult!.finalAnswer;
    if (finalAnswer) {
      await ops.trackConversation(taskId, 'assistant', finalAnswer);
    }

    return ops.buildResult(taskId, startTime, tracker, {
      status: executeResult!.status,
      terminationReason: executeResult!.terminationReason,
      finalAnswer: executeResult!.finalAnswer,
      steps: executeResult!.steps,
      cognition: { perception, assessment, plan: plan!, reflection },
    });
  }
}
