import { ThinkingLevel, type Plan, type ExecuteResult, type Reflection, type TaskResult } from '../types';
import type { StrategyParams, CognitiveOps } from './types';

/**
 * DELIBERATE strategy — Deep reasoning, exploration, multiple hypotheses.
 * Full cycle: ASSESS → PLAN → EXECUTE → REFLECT (with replan loop).
 * Like human deep thinking: extensive, explores multiple paths.
 */
export async function runDeliberateStrategy(params: StrategyParams, ops: CognitiveOps): Promise<TaskResult> {
  const { taskId, startTime, userInput, tracker, perception } = params;

  ops.emit('strategy:start', { taskId, strategy: 'deliberate', thinkingLevel: ThinkingLevel.DELIBERATE });

  // Phase 2: ASSESS (deeper analysis)
  const assessment = await ops.assess(userInput, perception, tracker);
  ops.emit('phase:assess', { taskId, assessment, thinkingLevel: ThinkingLevel.DELIBERATE });

  // Phase 3-5: PLAN → EXECUTE → REFLECT (can loop with replanning)
  let plan: Plan | undefined;
  let executeResult: ExecuteResult | undefined;
  let reflection: Reflection | undefined;
  let replanCount = 0;
  let userContext = userInput;

  while (replanCount <= ops.maxReplans) {
    plan = await ops.plan(userContext, perception, assessment, tracker, reflection, userContext !== userInput ? userContext : undefined);
    ops.emit('phase:plan', { taskId, plan, replanCount, thinkingLevel: ThinkingLevel.DELIBERATE });

    executeResult = await ops.execute(taskId, assessment, plan, tracker, userContext);
    ops.emit('phase:execute:complete', { taskId, result: executeResult });

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