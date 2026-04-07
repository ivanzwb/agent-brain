import type {
  ITokenCounter,
  Message,
  ToolDefinition,
  TokenUsage,
} from '../types';

// ============================================================
// TokenTracker - Accumulate and track token usage
// ============================================================

export class TokenTracker {
  private _promptTokens = 0;
  private _completionTokens = 0;

  constructor(private readonly counter: ITokenCounter) {}

  /** Track prompt tokens for one LLM call */
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

  /** Track completion tokens for one LLM call */
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
