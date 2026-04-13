import type { IModelClient, Message, ToolDefinition } from '../types';
import { summarizeEvictedForMidTermBuffer } from './context-compression/short-term-workspace-compression';

// ============================================================
// PromptBudget - Calculate available token budget and trim content
// ============================================================

/** Separator when concatenating consecutive messages of the same role. */
const SAME_ROLE_MERGE_DELIM = '\n\n--- (same role, merged) ---\n\n';

/**
 * Collapse adjacent messages with the same `role` into one (bodies concatenated).
 * Preserves order; does not merge across a different role in between.
 */
export function mergeConsecutiveSameRoleMessages(middle: Message[]): Message[] {
  const out: Message[] = [];
  for (const m of middle) {
    const last = out[out.length - 1];
    if (last && last.role === m.role) {
      last.content = `${last.content}${SAME_ROLE_MERGE_DELIM}${m.content}`;
    } else {
      out.push({ role: m.role, content: m.content });
    }
  }
  return out;
}

function sumMessageTokens(model: IModelClient, messages: Message[]): number {
  let n = 0;
  for (const m of messages) {
    n += model.count(m.content);
  }
  return n;
}

export class PromptBudget {
  constructor(private readonly model: IModelClient) {}

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
   * Short-term workspace model (fixed logic, not strategy-configurable):
   *
   * - **Sliding window** — the last `keepLast` messages stay verbatim (new dialogue accumulates here).
   * - **Overflow** — when total tokens exceed the caller’s soft `maxTokens`, everything between `keepFirst`
   *   and that tail is **evicted** from the hot window.
   * - **Mid-term buffer** — evicted turns are reduced with an **importance filter**, then **summarized** by the model.
   * - **Updated context** — `[...head, one assistant summary, ...tail]` so the buffer sits **in front of** the
   *   short-term window; the window can then accept new turns on the next assembly.
   *
   * Trigger: **soft budget only** — `sum(tokens) > maxTokens`.
   */
  async trimMessages(
    messages: Message[],
    maxTokens: number,
    keepFirst: number,
    keepLast: number,
  ): Promise<Message[]> {
    const total = sumMessageTokens(this.model, messages);
    if (total <= maxTokens) {
      return messages;
    }

    const head = keepFirst > 0 ? messages.slice(0, keepFirst) : [];
    const tail = keepLast > 0 ? messages.slice(-keepLast) : [];
    const middleEnd = keepLast > 0 ? messages.length - keepLast : messages.length;
    const evicted = keepFirst < middleEnd ? messages.slice(keepFirst, middleEnd) : [];

    const headT = sumMessageTokens(this.model, head);
    const tailT = sumMessageTokens(this.model, tail);
    const syntheticOverhead = this.model.count('\n');
    let budgetForBuffer = maxTokens - headT - tailT - syntheticOverhead;
    if (budgetForBuffer < 1) {
      budgetForBuffer = 1;
    }

    const bufferMsg = await summarizeEvictedForMidTermBuffer(this.model, evicted);
    let bufferContent = this.trimText(bufferMsg.content, Math.max(1, budgetForBuffer));
    let result: Message[] = [...head, { role: 'assistant' as const, content: bufferContent }, ...tail];

    let used = sumMessageTokens(this.model, result);
    let bufCap = budgetForBuffer;
    for (let i = 0; i < 32 && used > maxTokens; i++) {
      bufCap = Math.max(1, bufCap - 1);
      const next = this.trimText(bufferContent, bufCap);
      if (next === bufferContent) {
        bufferContent = `[${evicted.length} prior turn(s) omitted — kept prefix / short-term window only]`;
      } else {
        bufferContent = next;
      }
      result = [...head, { role: 'assistant' as const, content: bufferContent }, ...tail];
      used = sumMessageTokens(this.model, result);
    }

    return result;
  }
}
