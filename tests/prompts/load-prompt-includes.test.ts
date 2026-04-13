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
    expect(text).toContain('Filesystem business');
    expect(text).toContain('skill_find');
    expect(text).toContain('Long-term memory policy');
    expect(text).toContain('memory_search');
    expect(text).toContain('Knowledge base policy');
    expect(text).toContain('knowledge_search');
    expect(text).toContain('Command-line business');
    expect(text).toContain('Web / HTTP business');
    expect(text).toContain('Cron jobs (business)');
    expect(text).toContain('**ask_user (policy)**');
    expect(text).toContain('Conversation policy');
    expect(text).not.toMatch(/\{\{include:/);
  });

  it('inlines file-business into cognitive.execute', () => {
    const text = loadPrompt('cognitive/execute.md');
    expect(text).toContain('Filesystem business');
    expect(text).toContain('Command-line business');
    expect(text).toContain('Web / HTTP business');
    expect(text).not.toMatch(/\{\{include:/);
  });

  it('inlines cron-business into cognitive.assess', () => {
    const text = loadPrompt('cognitive/assess.md');
    expect(text).toContain('Scheduled jobs');
    expect(text).toContain('Cron jobs (business)');
    expect(text).not.toMatch(/\{\{include:/);
  });

  it('inlines innate business fragments into inter-react-loop', () => {
    const text = loadPrompt('react/inter-react-loop.md');
    expect(text).toContain('Command-line business');
    expect(text).toContain('Web / HTTP business');
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
