import type {
  ITokenCounter,
  Message,
  ToolDefinition,
} from '../types';

// ============================================================
// PromptBudget — 计算可用 token 预算并裁剪内容
// ============================================================

export class PromptBudget {
  constructor(
    private readonly counter: ITokenCounter,
    private readonly contextSize: number,
  ) {}

  /** 计算给定固定内容后，剩余多少 token 可用于可裁剪内容 */
  remaining(fixedMessages: Message[], tools?: ToolDefinition[]): number {
    let used = 0;
    for (const msg of fixedMessages) {
      used += this.counter.count(msg.content);
    }
    if (tools && tools.length > 0) {
      used += this.counter.countTools(tools);
    }
    return Math.max(0, this.contextSize - used);
  }

  /** 将文本裁剪到不超过 maxTokens */
  trimText(text: string, maxTokens: number): string {
    if (maxTokens <= 0) return '';
    const tokens = this.counter.count(text);
    if (tokens <= maxTokens) return text;

    // 按比例估算截断位置，逐步收紧
    let ratio = maxTokens / tokens;
    let trimmed = text.slice(0, Math.floor(text.length * ratio));
    while (this.counter.count(trimmed) > maxTokens && trimmed.length > 0) {
      ratio *= 0.9;
      trimmed = text.slice(0, Math.floor(text.length * ratio));
    }
    return trimmed + '\n[... truncated due to token budget]';
  }

  /**
   * 裁剪消息列表中较早的步骤。
   * 保留前 keepFirst 条和后 keepLast 条消息，中间部分压缩为摘要。
   */
  trimMessages(
    messages: Message[],
    maxTokens: number,
    keepFirst: number,
    keepLast: number,
  ): Message[] {
    let total = 0;
    for (const msg of messages) {
      total += this.counter.count(msg.content);
    }
    if (total <= maxTokens) return messages;

    // 保留头尾，压缩中间
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
