import path from 'path';
import {
  clearPromptTemplateCache,
  loadPrompt,
  setPromptsRootForTesting,
} from '../../src/prompts/load-prompt';
import { getPromptByKeyword, listPromptCategories } from '../../src/prompts/prompt-system';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

describe('load-prompt includes', () => {
  afterEach(() => {
    clearPromptTemplateCache();
    setPromptsRootForTesting(undefined);
  });

  it('inlines fragment into cognitive.plan', () => {
    const text = loadPrompt('cognitive/plan.md');
    expect(text).toContain('PLAN phase');
    expect(text).toContain('skill_find');
    expect(text).not.toMatch(/\{\{include:/);
  });

  it('getPromptByKeyword expands includes for cognitive.plan', () => {
    const text = getPromptByKeyword('cognitive.plan');
    expect(text).toContain('skill_install');
  });

  it('detects circular includes', () => {
    setPromptsRootForTesting(FIXTURES_DIR);
    expect(() => loadPrompt('self-include.md')).toThrow(/Circular prompt include/);
  });

  it('rejects parent segments in include path', () => {
    setPromptsRootForTesting(FIXTURES_DIR);
    expect(() => loadPrompt('bad-dotdot.md')).toThrow(/Invalid include path/);
  });

  it('registers fragments category', () => {
    expect(listPromptCategories()).toContain('fragments');
  });

  it('rejects empty include path', () => {
    setPromptsRootForTesting(FIXTURES_DIR);
    expect(() => loadPrompt('empty-include.md')).toThrow(/Empty include path/);
  });

  it('throws when prompt file is missing', () => {
    setPromptsRootForTesting(FIXTURES_DIR);
    expect(() => loadPrompt('does-not-exist.md')).toThrow(/Prompt file not found/);
  });
});
