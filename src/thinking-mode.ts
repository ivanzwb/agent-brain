import {
  CognitivePhase,
  ThinkingMode,
  type ThinkingModeWeights,
} from './types';

// ============================================================
// Thinking mode weight ratios for each cognitive phase
// ============================================================

const WEIGHT_TABLE: Record<CognitivePhase, ThinkingModeWeights> = {
  // Understand task: empathy primary (understand what they really want), logic secondary
  [CognitivePhase.PERCEIVE]: {
    [ThinkingMode.CREATIVE]: 0.10,
    [ThinkingMode.LOGICAL]: 0.25,
    [ThinkingMode.EMPATHETIC]: 0.50,
    [ThinkingMode.STRUCTURAL]: 0.15,
  },
  // Assess capability: logic primary (objective judgment), structural secondary
  [CognitivePhase.ASSESS]: {
    [ThinkingMode.CREATIVE]: 0.05,
    [ThinkingMode.LOGICAL]: 0.45,
    [ThinkingMode.EMPATHETIC]: 0.10,
    [ThinkingMode.STRUCTURAL]: 0.40,
  },
  // Plan and decompose: structural primary (break down task), creativity secondary
  [CognitivePhase.PLAN]: {
    [ThinkingMode.CREATIVE]: 0.20,
    [ThinkingMode.LOGICAL]: 0.25,
    [ThinkingMode.EMPATHETIC]: 0.05,
    [ThinkingMode.STRUCTURAL]: 0.50,
  },
  // Execute and monitor: logic primary (rigorous execution), creativity as needed
  [CognitivePhase.EXECUTE]: {
    [ThinkingMode.CREATIVE]: 0.15,
    [ThinkingMode.LOGICAL]: 0.50,
    [ThinkingMode.EMPATHETIC]: 0.10,
    [ThinkingMode.STRUCTURAL]: 0.25,
  },
  // Reflect and optimize: balanced logic + empathy (objective evaluation + quality feeling)
  [CognitivePhase.REFLECT]: {
    [ThinkingMode.CREATIVE]: 0.15,
    [ThinkingMode.LOGICAL]: 0.35,
    [ThinkingMode.EMPATHETIC]: 0.30,
    [ThinkingMode.STRUCTURAL]: 0.20,
  },
};

// ============================================================
// System prompt guidance for each cognitive phase
// ============================================================

const PHASE_PROMPTS: Record<CognitivePhase, string> = {
  [CognitivePhase.PERCEIVE]: `You are in the PERCEIVE phase (Understand Task).
Your goal: Deeply understand the task before doing anything.
- Identify the surface request vs. the true underlying intent
- Spot ambiguities — what is unclear or assumed?
- Define what success looks like
- Consider: if this request came from a real person, what would they REALLY want?

Respond in JSON:
{"surfaceRequest":"...","deepIntent":"...","constraints":[],"ambiguities":[],"successCriteria":[]}`,

  [CognitivePhase.ASSESS]: `You are in the ASSESS phase (Evaluate Capabilities & Resources).
Your goal: Think from the TASK's perspective first, then check what you have.

Step 1 — What does the task NEED? (task-driven, regardless of what you have)
- What domain knowledge is required? (e.g., security audit methodology, data analysis)
- What operational skills are required? (e.g., database querying, report generation)
- What external resources are needed? (e.g., historical data, templates)

Step 2 — What do you HAVE?
- Innate tools: system defaults you can use directly without any domain knowledge
- Skill packages: each provides domain knowledge + scenarios + tools — most tools only make sense combined with the right skill
- Innate skill — acquiring new skills: you can search/install skill packages at execution time

Step 3 — Gap analysis
- Which required skills are matched by available skill packages?
- Which required skills are missing? (could be acquired during execution via innate skill)
- What are the risks and overall complexity?

Respond in JSON:
{"requiredSkills":[],"capabilityMatch":"...","matchedSkills":[],"missingSkills":[],"risks":[],"complexity":"simple|moderate|complex","feasible":true,"gaps":[]}`,

  [CognitivePhase.PLAN]: `You are in the PLAN phase (Decompose & Plan).
Your goal: Create a concrete execution plan.
- Break the task into clear, ordered steps
- Each step should be actionable (can be done with available tools or reasoning)
- Identify dependencies between steps
- Simple tasks may need just 1-2 steps; don't over-plan
- IMPORTANT: If the assessment identified MISSING SKILLS, include steps to acquire them
  (search for and install the needed skill packages) BEFORE the steps that depend on them.
  Skill acquisition uses innate skills (search_skills, install_skill) — these are always available.

Respond in JSON:
{"strategy":"...","steps":[{"id":"s1","description":"...","dependsOn":[]}],"expectedOutcome":"..."}`,

  [CognitivePhase.EXECUTE]: `You are in the EXECUTE phase (Execute & Monitor).
Your goal: Execute the plan step by step using available tools.
- Follow the plan, but adapt when you encounter unexpected situations
- Monitor your own progress — are you on track?
- If a tool fails, try an alternative approach before giving up
- If you discover you need a skill you don't have, use innate skills (search_skills, install_skill) to acquire it
- After acquiring new skills, their tools become available immediately — use them
- When all plan steps are complete, respond WITHOUT a tool call to signal completion`,

  [CognitivePhase.REFLECT]: `You are in the REFLECT phase (Reflect & Optimize).
Your goal: Evaluate the work that was done, learn from it, and decide next steps.

Result evaluation:
- Did the result meet the success criteria defined earlier?
- What went well? What could be improved?

Experience accumulation:
- Extract lessons that would help with similar future tasks
- What methods worked? What didn't? Any better approaches discovered?

Confidence calibration:
- Success → increase confidence for similar tasks in the future
- Failure → analyze root cause objectively, focus on what can be improved, avoid over-negativity

Replan decision:
- If the result is clearly inadequate, should we revise the plan and retry?
- Only suggest replan if there's a realistic chance of improvement with a different approach

Respond in JSON:
{"goalMet":true,"strengths":[],"improvements":[],"lessonsLearned":[],"needsReplan":false}`,
};

// ============================================================
// Thinking mode descriptions
// ============================================================

const MODE_NAMES: Record<ThinkingMode, string> = {
  [ThinkingMode.CREATIVE]: 'Creative Thinking',
  [ThinkingMode.LOGICAL]: 'Logical Thinking',
  [ThinkingMode.EMPATHETIC]: 'Empathetic Insight',
  [ThinkingMode.STRUCTURAL]: 'Structural Planning',
};

const MODE_DESCRIPTIONS: Record<ThinkingMode, string> = {
  [ThinkingMode.CREATIVE]:
    'Generate novel ideas, explore multiple possibilities, use analogies.',
  [ThinkingMode.LOGICAL]:
    'Reason about cause and effect, verify consistency, eliminate contradictions.',
  [ThinkingMode.EMPATHETIC]:
    'Understand emotions and deep needs from the user perspective.',
  [ThinkingMode.STRUCTURAL]:
    'Decompose tasks, arrange priorities, manage dependencies.',
};

// ============================================================
// ThinkingModeScheduler
// ============================================================

export class ThinkingModeScheduler {
  getWeights(phase: CognitivePhase): ThinkingModeWeights {
    return { ...WEIGHT_TABLE[phase] };
  }

  getPhasePrompt(phase: CognitivePhase): string {
    return PHASE_PROMPTS[phase];
  }

  generateGuidance(phase: CognitivePhase): string {
    const weights = WEIGHT_TABLE[phase];
    const sorted = (Object.entries(weights) as [ThinkingMode, number][]).sort(
      (a, b) => b[1] - a[1],
    );
    const primary = sorted.filter(([, w]) => w >= 0.3);
    const secondary = sorted.filter(([, w]) => w >= 0.15 && w < 0.3);

    const lines: string[] = ['[Thinking Mode Guidance]', ''];

    if (primary.length > 0) {
      lines.push('Primary:');
      for (const [mode] of primary) {
        lines.push(`  ★ ${MODE_NAMES[mode]}: ${MODE_DESCRIPTIONS[mode]}`);
      }
    }
    if (secondary.length > 0) {
      lines.push('Supporting:');
      for (const [mode] of secondary) {
        lines.push(`  ○ ${MODE_NAMES[mode]}: ${MODE_DESCRIPTIONS[mode]}`);
      }
    }

    return lines.join('\n');
  }
}
