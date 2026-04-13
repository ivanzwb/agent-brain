import { applySlidingWindowMiddle } from '../../src/token/context-compression/sliding-window-strategy';
import {
  filterMiddleByImportance,
  scoreMessageImportance,
} from '../../src/token/context-compression/importance-filter-strategy';
import { summarizeMiddleMessages } from '../../src/token/context-compression/short-term-workspace-compression';
import type { Message, IModelClient, ToolDefinition } from '../../src/types';

class EchoModel implements IModelClient {
  readonly contextWindow = 128_000;
  count(s: string): number {
    return Math.ceil(s.length / 4);
  }
  countTools(_tools: ToolDefinition[]): number {
    return 0;
  }
  async chat(messages: Message[]): Promise<{ content: string }> {
    const last = messages[messages.length - 1]?.content ?? '';
    return { content: `SUMMARY:${last.slice(0, 80)}` };
  }
}

describe('context-compression', () => {
  it('applySlidingWindowMiddle keeps last N', () => {
    const m: Message[] = [
      { role: 'user', content: '1' },
      { role: 'user', content: '2' },
      { role: 'user', content: '3' },
    ];
    expect(applySlidingWindowMiddle(m, 2).map((x) => x.content)).toEqual(['2', '3']);
  });

  it('scoreMessageImportance ranks user and errors higher than short assistant', () => {
    const u: Message = { role: 'user', content: 'please do X' };
    const a: Message = { role: 'assistant', content: 'ok' };
    const t: Message = { role: 'tool', content: 'error: failed' };
    expect(scoreMessageImportance(u)).toBeGreaterThan(scoreMessageImportance(a));
    expect(scoreMessageImportance(t)).toBeGreaterThan(scoreMessageImportance(a));
  });

  it('filterMiddleByImportance preserves order among kept messages', () => {
    const m: Message[] = [
      { role: 'assistant', content: 'x' },
      { role: 'user', content: 'important question?' },
      { role: 'assistant', content: 'y' },
    ];
    const out = filterMiddleByImportance(m, 0.34, 1);
    expect(out.length).toBeGreaterThanOrEqual(1);
    const idx = out.map((msg) => m.indexOf(msg));
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });

  it('summarizeMiddleMessages wraps with mid-term buffer label', async () => {
    const model = new EchoModel();
    const middle: Message[] = [{ role: 'user', content: 'hello world task' }];
    const out = await summarizeMiddleMessages(model, middle, 200);
    expect(out).toHaveLength(1);
    expect(out[0]!.role).toBe('assistant');
    expect(out[0]!.content).toContain('Mid-term buffer');
    expect(out[0]!.content).toContain('SUMMARY:');
  });
});
