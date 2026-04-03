import type {
  ITokenCounter,
  Message,
  ToolDefinition,
  TokenUsage,
} from '../types';

// ============================================================
// TokenTracker — 累计统计 token 使用量
// ============================================================

export class TokenTracker {
  private _promptTokens = 0;
  private _completionTokens = 0;

  constructor(private readonly counter: ITokenCounter) {}

  /** 记录一次 LLM 调用的 prompt token */
  trackPrompt(messages: Message[], tools?: ToolDefinition[]): void {
    let tokens = 0;
    for (const msg of messages) {
      tokens += this.counter.count(msg.content);
    }
    if (tools && tools.length > 0) {
      tokens += this.counter.countTools(tools);
    }
    this._promptTokens += tokens;
  }

  /** 记录一次 LLM 调用的 completion token */
  trackCompletion(content: string): void {
    this._completionTokens += this.counter.count(content);
  }

  get usage(): TokenUsage {
    return {
      promptTokens: this._promptTokens,
      completionTokens: this._completionTokens,
      totalTokens: this._promptTokens + this._completionTokens,
    };
  }
}
