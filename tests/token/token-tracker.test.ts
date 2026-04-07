import { TokenTracker } from '../../src/token/token-tracker';
import { Message } from '../../src/types';
import type { ITokenCounter, ToolDefinition } from '../../src/types';

class MockTokenCounter implements ITokenCounter {
  count(text: string): number {
    return Math.ceil(text.length / 4);
  }

  countTools(tools: ToolDefinition[]): number {
    return this.count(JSON.stringify(tools));
  }
}

describe('TokenTracker', () => {
  let counter: MockTokenCounter;
  let tracker: TokenTracker;

  beforeEach(() => {
    counter = new MockTokenCounter();
    tracker = new TokenTracker(counter);
  });

  describe('trackPrompt', () => {
    it('should track prompt tokens from messages', () => {
      const messages: Message[] = [
        { role: 'user', content: 'hello world' },
        { role: 'assistant', content: 'hi there' },
      ];

      tracker.trackPrompt(messages);

      expect(tracker.usage.promptTokens).toBeGreaterThan(0);
    });

    it('should track tools tokens when provided', () => {
      const messages: Message[] = [
        { role: 'user', content: 'test' },
      ];
      const tools: ToolDefinition[] = [
        { name: 'tool1', description: 'desc', parameters: { type: 'object' } },
      ];

      tracker.trackPrompt(messages, tools);

      expect(tracker.usage.promptTokens).toBeGreaterThan(
        tracker.usage.completionTokens
      );
    });

    it('should accumulate multiple calls', () => {
      const messages1: Message[] = [{ role: 'user', content: 'first message' }];
      const messages2: Message[] = [{ role: 'user', content: 'second message' }];

      tracker.trackPrompt(messages1);
      tracker.trackPrompt(messages2);

      expect(tracker.usage.promptTokens).toBe(
        counter.count('first message') + counter.count('second message')
      );
    });

    it('should handle empty messages', () => {
      tracker.trackPrompt([]);

      expect(tracker.usage.promptTokens).toBe(0);
    });

    it('should handle empty tools array', () => {
      const messages: Message[] = [{ role: 'user', content: 'test' }];
      
      tracker.trackPrompt(messages, []);

      expect(tracker.usage.promptTokens).toBe(counter.count('test'));
    });
  });

  describe('trackCompletion', () => {
    it('should track completion tokens', () => {
      tracker.trackCompletion('some response text');

      expect(tracker.usage.completionTokens).toBe(counter.count('some response text'));
    });

    it('should accumulate multiple completions', () => {
      tracker.trackCompletion('first response');
      tracker.trackCompletion('second response');

      expect(tracker.usage.completionTokens).toBe(
        counter.count('first response') + counter.count('second response')
      );
    });

    it('should handle empty content', () => {
      tracker.trackCompletion('');

      expect(tracker.usage.completionTokens).toBe(0);
    });
  });

  describe('usage', () => {
    it('should return correct token usage object', () => {
      const messages: Message[] = [{ role: 'user', content: 'test prompt' }];
      tracker.trackPrompt(messages);
      tracker.trackCompletion('test completion');

      const usage = tracker.usage;

      expect(usage.promptTokens).toBe(counter.count('test prompt'));
      expect(usage.completionTokens).toBe(counter.count('test completion'));
      expect(usage.totalTokens).toBe(usage.promptTokens + usage.completionTokens);
    });

    it('should return zero for all when nothing tracked', () => {
      const usage = tracker.usage;

      expect(usage.promptTokens).toBe(0);
      expect(usage.completionTokens).toBe(0);
      expect(usage.totalTokens).toBe(0);
    });
  });
});
