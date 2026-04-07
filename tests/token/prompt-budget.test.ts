import { PromptBudget } from '../../src/token/prompt-budget';
import { Message } from '../../src/types';
import type { ITokenCounter } from '../../src/types';

class MockTokenCounter implements ITokenCounter {
  count(text: string): number {
    return Math.ceil(text.length / 4);
  }

  countTools(tools: any[]): number {
    return this.count(JSON.stringify(tools));
  }
}

describe('PromptBudget', () => {
  let counter: MockTokenCounter;
  let budget: PromptBudget;

  beforeEach(() => {
    counter = new MockTokenCounter();
    budget = new PromptBudget(counter, 1000);
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
  });

  describe('trimMessages', () => {
    it('should return original messages if under limit', () => {
      const messages: Message[] = [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' },
      ];
      const result = budget.trimMessages(messages, 1000, 1, 1);
      expect(result).toEqual(messages);
    });

    it('should keep first and last messages', () => {
      const messages: Message[] = [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'second' },
        { role: 'user', content: 'third' },
        { role: 'assistant', content: 'fourth' },
      ];
      const result = budget.trimMessages(messages, 10, 1, 1);
      
      expect(result[0].content).toBe('first');
      expect(result[result.length - 1].content).toBe('fourth');
    });

    it('should add summary for omitted middle messages', () => {
      const messages: Message[] = [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'second' },
        { role: 'user', content: 'third' },
        { role: 'assistant', content: 'fourth' },
        { role: 'user', content: 'fifth' },
        { role: 'assistant', content: 'last' },
      ];
      const result = budget.trimMessages(messages, 10, 1, 1);
      
      expect(result).toHaveLength(3);
      expect(result[1].content).toContain('earlier messages omitted');
    });

    it('should handle keepFirst=0', () => {
      const messages: Message[] = [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'second' },
        { role: 'user', content: 'third' },
        { role: 'assistant', content: 'fourth' },
        { role: 'user', content: 'fifth' },
        { role: 'assistant', content: 'last' },
      ];
      const result = budget.trimMessages(messages, 10, 0, 1);
      
      expect(result[result.length - 1].content).toBe('last');
    });

    it('should handle keepLast=0', () => {
      const messages: Message[] = [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'second' },
        { role: 'user', content: 'third' },
        { role: 'assistant', content: 'fourth' },
        { role: 'user', content: 'fifth' },
        { role: 'assistant', content: 'last' },
      ];
      const result = budget.trimMessages(messages, 10, 1, 0);
      
      expect(result[0].content).toBe('first');
    });
  });
});
