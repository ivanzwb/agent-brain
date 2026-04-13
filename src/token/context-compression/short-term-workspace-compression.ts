import type { IModelClient, Message } from '../../types';
import { filterMiddleByImportance } from './importance-filter-strategy';

/**
 * Fixed short-term workspace policy (not host-configurable):
 * evicted dialogue (everything outside the sliding tail) → importance-guided subset → one summary
 * placed between the kept prefix and the verbatim tail.
 */
const IMPORTANCE_KEEP_RATIO = 0.5;
const IMPORTANCE_MIN_KEEP = 2;
const SUMMARY_MAX_OUTPUT_TOKENS = 512;

const SUMMARY_SYSTEM_PROMPT =
  'You compress prior dialogue into a concise summary for the model context. ' +
  'The turns may already be a subset chosen by importance heuristics — merge them into one coherent recap. ' +
  'Preserve: user goals, decisions, tool errors/successes, blocking issues, and key facts. ' +
  'Use short bullets or a numbered list. No preamble or meta-commentary.';

/**
 * Model call: turn a (possibly importance-filtered) slice into one assistant summary message.
 * Exported for advanced reuse; the host trim path uses {@link summarizeEvictedForMidTermBuffer}.
 */
export async function summarizeMiddleMessages(
  model: IModelClient,
  middle: Message[],
  maxOutputTokens = 512,
): Promise<Message[]> {
  if (middle.length === 0) return middle;

  const transcript = middle.map((m) => `[${m.role}] ${m.content}`).join('\n\n');

  const messages: Message[] = [
    { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Summarize these prior turns (they may be long):\n\n${transcript}`,
    },
  ];

  const res = await model.chat(messages);
  let text = (res.content ?? '').trim();
  if (!text) {
    return [{ role: 'assistant', content: '[Summarization returned empty; prior context dropped]' }];
  }

  const cap = Math.max(64, maxOutputTokens);
  while (text.length > 0 && model.count(text) > cap) {
    text = text.slice(0, Math.floor(text.length * 0.88));
  }
  if (text.length < (res.content ?? '').trim().length) {
    text = `${text}\n[summary truncated]`;
  }

  return [{ role: 'assistant', content: `[Mid-term buffer — summarized prior dialogue]\n${text}` }];
}

/**
 * Build the mid-term buffer message: importance filter then model summary of the evicted turns.
 */
export async function summarizeEvictedForMidTermBuffer(
  model: IModelClient,
  evicted: Message[],
): Promise<Message> {
  if (evicted.length === 0) {
    return {
      role: 'assistant',
      content: '[No messages between kept prefix and short-term workspace]',
    };
  }

  const focused = filterMiddleByImportance(evicted, IMPORTANCE_KEEP_RATIO, IMPORTANCE_MIN_KEEP);

  try {
    const out = await summarizeMiddleMessages(model, focused, SUMMARY_MAX_OUTPUT_TOKENS);
    const first = out[0];
    if (first?.content?.trim()) {
      return first;
    }
  } catch {
    // fall through
  }

  const excerpt = focused
    .map((m) => `[${m.role}] ${m.content}`)
    .join('\n')
    .slice(0, 4000);
  return {
    role: 'assistant',
    content: `[Mid-term buffer — excerpt (summary failed)]\n${excerpt}`,
  };
}
