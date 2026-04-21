import * as os from 'os';
import * as path from 'path';
import { CognitivePhase } from '../../src/types';
import {
  COGNITIVE_PHASE_PROMPT_KEYWORD,
  aliasesForPrompt,
  composePrompt,
  listPromptCategories,
  listPromptTemplates,
  reloadPromptRegistry,
  renderPrompt,
  resolvePromptPath,
} from '../../src/prompts/prompt-system';

describe('prompt-system', () => {
  afterEach(() => {
    reloadPromptRegistry();
  });

  describe('COGNITIVE_PHASE_PROMPT_KEYWORD', () => {
    it('maps each phase to a registry keyword', () => {
      expect(COGNITIVE_PHASE_PROMPT_KEYWORD[CognitivePhase.PLAN]).toBe('cognitive.plan');
      expect(COGNITIVE_PHASE_PROMPT_KEYWORD[CognitivePhase.EXECUTE]).toBe('cognitive.execute');
    });
  });

  describe('resolvePromptPath', () => {
    it('resolves by keyword', () => {
      expect(resolvePromptPath('cognitive.plan')).toBe('cognitive/plan.md');
    });

    it('resolves by template id', () => {
      expect(resolvePromptPath('cognitive.perceive')).toBe('cognitive/perceive.md');
    });

    it('throws for unknown keyword or id', () => {
      expect(() => resolvePromptPath('no.such.template')).toThrow(/Unknown prompt keyword or id/);
    });
  });

  describe('agent.system_base template', () => {
    it('puts cwd label and newlines in the template; code passes path only', () => {
      const out = renderPrompt('agent.system_base', {
        systemPrompt: 'SYS',
        workingDirectory: '/tmp/w',
        guidance: 'G',
        phasePrompt: 'P',
        resourceOverview: 'R',
      });
      expect(out).toBe('SYS\nCurrent working directory: /tmp/w\n\nG\n\nP\n\nR');
    });

    it('resolves default-style path from placeholder only', () => {
      const defaultWs = path.join(os.tmpdir(), '.bios-agent');
      const out = renderPrompt('agent.system_base', {
        systemPrompt: 'SYS',
        workingDirectory: defaultWs,
        guidance: 'G',
        phasePrompt: 'P',
        resourceOverview: '',
      });
      expect(out).toContain(`Current working directory: ${defaultWs}`);
      expect(out).toContain('G');
    });
  });

  describe('renderPrompt', () => {
    it('returns body unchanged when vars omitted', () => {
      const body = renderPrompt('cognitive.reflect');
      expect(body.length).toBeGreaterThan(0);
      expect(body).not.toMatch(/^\s*$/);
    });

    it('returns body unchanged when vars is empty object', () => {
      const a = renderPrompt('cognitive.reflect', {});
      const b = renderPrompt('cognitive.reflect');
      expect(a).toBe(b);
    });
  });

  describe('composePrompt', () => {
    it('joins blocks with default separator', () => {
      const out = composePrompt([
        { keyword: 'cognitive.plan' },
        { keyword: 'cognitive.reflect' },
      ]);
      expect(out).toContain('\n\n');
      expect(out).toContain('PLAN');
    });

    it('uses custom separator', () => {
      const out = composePrompt(
        [
          { keyword: 'cognitive.plan' },
          { keyword: 'cognitive.reflect' },
        ],
        { separator: '---' },
      );
      expect(out.split('---').length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('listPromptTemplates', () => {
    it('returns all templates without filter', () => {
      const all = listPromptTemplates();
      expect(all.length).toBeGreaterThan(5);
      expect(all.some((t) => t.id === 'cognitive.plan')).toBe(true);
    });

    it('filters by category', () => {
      const reactOnly = listPromptTemplates({ category: 'react' });
      expect(reactOnly.length).toBeGreaterThan(0);
      expect(reactOnly.every((t) => t.category === 'react')).toBe(true);
    });
  });

  describe('listPromptCategories', () => {
    it('returns sorted unique categories', () => {
      const cats = listPromptCategories();
      expect(cats).toContain('cognitive');
      expect(cats).toContain('agent');
      expect(cats).toEqual([...cats].sort());
    });
  });

  describe('aliasesForPrompt', () => {
    it('returns all keywords for the same template file', () => {
      const aliases = aliasesForPrompt('plan');
      expect(aliases).toContain('cognitive.plan');
      expect(aliases).toContain('PLAN');
    });
  });

  describe('reloadPromptRegistry', () => {
    it('allows re-reading registry after clear', () => {
      reloadPromptRegistry();
      expect(resolvePromptPath('cognitive.plan')).toBe('cognitive/plan.md');
    });
  });
});
