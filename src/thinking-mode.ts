import {
  CognitivePhase,
  ThinkingMode,
  type ThinkingModeWeights,
} from './types';
import {
  COGNITIVE_PHASE_PROMPT_KEYWORD,
  getPromptByKeyword,
} from './prompts/prompt-system';

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

const PHASE_PROMPTS: Record<CognitivePhase, string> = (() => {
  const m = {} as Record<CognitivePhase, string>;
  for (const phase of Object.values(CognitivePhase)) {
    m[phase] = getPromptByKeyword(COGNITIVE_PHASE_PROMPT_KEYWORD[phase]);
  }
  return m;
})();

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
