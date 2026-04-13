import { PromptBudget, mergeConsecutiveSameRoleMessages } from '../../src/token/prompt-budget';
import type { Message, IModelClient, ToolDefinition } from '../../src/types';

class MockModelClient implements IModelClient {
  readonly contextWindow: number;

  constructor(contextWindow: number) {
    this.contextWindow = contextWindow;
  }

  count(text: string): number {
    return Math.ceil(text.length / 4);
  }

  countTools(tools: ToolDefinition[]): number {
    return this.count(JSON.stringify(tools));
  }

  async chat(): Promise<never> {
    throw new Error('MockModelClient.chat should not be called in PromptBudget tests');
  }
}

/** Used when trimMessages runs mid-term compression (calls model.chat). */
class TrimCompressionModel implements IModelClient {
  readonly contextWindow: number;

  constructor(contextWindow = 1000) {
    this.contextWindow = contextWindow;
  }

  count(text: string): number {
    return Math.ceil(text.length / 4);
  }

  countTools(tools: ToolDefinition[]): number {
    return this.count(JSON.stringify(tools));
  }

  async chat(): Promise<{ content: string }> {
    return {
      content:
        '- user goals preserved\n- Mid-term buffer — summarized prior dialogue (stub)\n- tool: ok',
    };
  }
}

/**
 * Any non-empty substring counts as a large constant so the first ratio-based slice
 * can still exceed maxTokens and trigger the shrink loop in trimText.
 */
class PlateauTokenModel implements IModelClient {
  readonly contextWindow = 100_000;
  count(text: string): number {
    return text.length > 0 ? 800 : 0;
  }
  countTools(tools: ToolDefinition[]): number {
    return this.count(JSON.stringify(tools));
  }
  async chat(): Promise<never> {
    throw new Error('PlateauTokenModel.chat should not be called');
  }
}

describe('PromptBudget', () => {
  let model: MockModelClient;
  let budget: PromptBudget;

  beforeEach(() => {
    model = new MockModelClient(1000);
    budget = new PromptBudget(model);
  });

  describe('remaining', () => {
    it('should calculate remaining tokens with empty messages', () => {
      const remaining = budget.remaining([]);
      expect(remaining).toBe(1000);
    });

    it('should subtract message token count from context size', () => {
      const messages: Message[] = [
        { role: 'user', content: 'hello world' }, // 12 chars = 3 tokens
      ];
      const remaining = budget.remaining(messages);
      expect(remaining).toBe(1000 - 3);
    });

    it('should subtract tools token count when provided', () => {
      const messages: Message[] = [
        { role: 'user', content: 'test' },
      ];
      const tools = [
        { name: 'tool1', description: 'desc', parameters: { type: 'object' } },
      ];
      const remaining = budget.remaining(messages, tools);
      expect(remaining).toBeLessThan(1000);
    });

    it('should return 0 when over budget', () => {
      const messages: Message[] = Array(500).fill(null).map((_, i) => ({
        role: 'user' as const,
        content: `message ${i} with lots of content to exceed budget`,
      }));
      const remaining = budget.remaining(messages);
      expect(remaining).toBe(0);
    });

    it('should handle empty tools array', () => {
      const messages: Message[] = [{ role: 'user', content: 'test' }];
      const remaining = budget.remaining(messages, []);
      expect(remaining).toBeLessThan(1000);
    });

    it('should handle undefined tools', () => {
      const messages: Message[] = [{ role: 'user', content: 'test' }];
      const remaining = budget.remaining(messages, undefined);
      expect(remaining).toBeLessThan(1000);
    });
  });

  describe('trimText', () => {
    it('should return empty string for zero maxTokens', () => {
      const result = budget.trimText('some text', 0);
      expect(result).toBe('');
    });

    it('should return empty string for negative maxTokens', () => {
      const result = budget.trimText('some text', -10);
      expect(result).toBe('');
    });

    it('should return original text if under limit', () => {
      const text = 'short text';
      const result = budget.trimText(text, 100);
      expect(result).toBe(text);
    });

    it('should trim text that exceeds limit', () => {
      const text = 'a'.repeat(100);
      const result = budget.trimText(text, 10);
      expect(result).toContain('[... truncated due to token budget]');
      expect(result.length).toBeLessThan(text.length);
    });

    it('should add truncation message', () => {
      const text = 'a'.repeat(100);
      const result = budget.trimText(text, 10);
      expect(result).toContain('[... truncated due to token budget]');
    });

    it('shrinks in steps when first slice still exceeds maxTokens', () => {
      const plateau = new PlateauTokenModel();
      const b = new PromptBudget(plateau);
      const text = 'a'.repeat(80);
      const result = b.trimText(text, 100);
      expect(result).toContain('[... truncated due to token budget]');
      expect(result.length).toBeLessThan(text.length);
    });
  });

  describe('mergeConsecutiveSameRoleMessages', () => {
    it('concatenates adjacent same-role bodies with delimiter', () => {
      const merged = mergeConsecutiveSameRoleMessages([
        { role: 'tool', content: 'a' },
        { role: 'tool', content: 'b' },
        { role: 'assistant', content: 'c' },
        { role: 'tool', content: 'd' },
      ]);
      expect(merged).toHaveLength(3);
      expect(merged[0]!.role).toBe('tool');
      expect(merged[0]!.content).toContain('(same role, merged)');
      expect(merged[0]!.content).toContain('a');
      expect(merged[0]!.content).toContain('b');
      expect(merged[1]!.content).toBe('c');
      expect(merged[2]!.content).toBe('d');
    });
  });

  describe('trimMessages', () => {
    let trimModel: TrimCompressionModel;
    let trimBudget: PromptBudget;

    beforeEach(() => {
      trimModel = new TrimCompressionModel(1000);
      trimBudget = new PromptBudget(trimModel);
    });

    it('should return original messages if under limit', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' },
      ];
      const result = await budget.trimMessages(messages, 1000, 1, 1);
      expect(result).toEqual(messages);
    });

    it('should keep first and last messages', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'second' },
        { role: 'user', content: 'third' },
        { role: 'assistant', content: 'fourth' },
      ];
      const result = await trimBudget.trimMessages(messages, 10, 1, 1);

      expect(result[0].content).toBe('first');
      expect(result[result.length - 1].content).toBe('fourth');
    });

    it('should insert mid-term buffer summary between head and short-term tail', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'second' },
        { role: 'user', content: 'third' },
        { role: 'assistant', content: 'fourth' },
        { role: 'user', content: 'fifth' },
        { role: 'assistant', content: 'last' },
      ];
      const result = await trimBudget.trimMessages(messages, 10, 1, 1);

      expect(result).toHaveLength(3);
      expect(result[1].role).toBe('assistant');
      expect(result[1].content).toMatch(/Mid-term buffer|omitted|prior turn/i);
    });

    it('should summarize evicted long user turns when over token budget', async () => {
      const chunk = 'q'.repeat(320);
      const messages: Message[] = [
        { role: 'system', content: 's' },
        { role: 'user', content: `${chunk}-1` },
        { role: 'user', content: `${chunk}-2` },
        { role: 'assistant', content: 'tail' },
      ];
      const result = await trimBudget.trimMessages(messages, 120, 1, 1);
      expect(result[result.length - 1].content).toBe('tail');
      expect(result[1].role).toBe('assistant');
      expect(result[1].content).toMatch(/Mid-term buffer|stub|omitted/i);
    });

    it('should handle keepFirst=0', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'second' },
        { role: 'user', content: 'third' },
        { role: 'assistant', content: 'fourth' },
        { role: 'user', content: 'fifth' },
        { role: 'assistant', content: 'last' },
      ];
      const result = await trimBudget.trimMessages(messages, 10, 0, 1);

      expect(result[result.length - 1].content).toBe('last');
    });

    it('should handle keepLast=0', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'second' },
        { role: 'user', content: 'third' },
        { role: 'assistant', content: 'fourth' },
        { role: 'user', content: 'fifth' },
        { role: 'assistant', content: 'last' },
      ];
      const result = await trimBudget.trimMessages(messages, 10, 1, 0);

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('first');
      expect(result[1].role).toBe('assistant');
    });

  });
});
