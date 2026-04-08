import type {
  IModelClient,
  Message,
  ToolDefinition,
} from '../types';

// ============================================================
// PromptBudget - Calculate available token budget and trim content
// ============================================================

export class PromptBudget {
  constructor(
    private readonly model: IModelClient,
  ) {}

  /** Calculate remaining tokens available for trimmable content after fixed content */
  remaining(fixedMessages: Message[], tools?: ToolDefinition[]): number {
    let used = 0;
    for (const msg of fixedMessages) {
      used += this.model.count(msg.content);
    }
    if (tools && tools.length > 0) {
      used += this.model.countTools(tools);
    }
    return Math.max(0, this.model.contextWindow - used);
  }

  /** Trim text to not exceed maxTokens */
  trimText(text: string, maxTokens: number): string {
    if (maxTokens <= 0) return '';
    const tokens = this.model.count(text);
    if (tokens <= maxTokens) return text;

    // Estimate truncation position by ratio, progressively tighten
    let ratio = maxTokens / tokens;
    let trimmed = text.slice(0, Math.floor(text.length * ratio));
    while (this.model.count(trimmed) > maxTokens && trimmed.length > 0) {
      ratio *= 0.9;
      trimmed = text.slice(0, Math.floor(text.length * ratio));
    }
    return trimmed + '\n[... truncated due to token budget]';
  }

  /**
   * Trim early steps in message list.
   * Keep first keepFirst and last keepLast messages, compress middle to summary.
   */
  trimMessages(
    messages: Message[],
    maxTokens: number,
    keepFirst: number,
    keepLast: number,
  ): Message[] {
    let total = 0;
    for (const msg of messages) {
      total += this.model.count(msg.content);
    }
    if (total <= maxTokens) return messages;

    // Keep head and tail, compress middle
    const head = messages.slice(0, keepFirst);
    const tail = messages.slice(-keepLast);
    const middle = messages.slice(keepFirst, messages.length - keepLast);

    const summary = `[${middle.length} earlier messages omitted to fit token budget]`;

    return [
      ...head,
      { role: 'assistant' as const, content: summary },
      ...tail,
    ];
  }
}
