import type { Message } from '../../types';

/** Heuristic importance score for importance-filter compression. */
export function scoreMessageImportance(m: Message): number {
  let s = 0;
  switch (m.role) {
    case 'system':
      s += 10;
      break;
    case 'user':
      s += 8;
      break;
    case 'tool':
      s += 6;
      break;
    case 'assistant':
      s += 5;
      break;
    default:
      s += 4;
  }

  const c = m.content.toLowerCase();
  if (/\b(error|fail|exception|blocked|denied|warning)\b/.test(c)) s += 3;
  if (/\b(success|ok|completed|result|output)\b/.test(c)) s += 1;
  if (/\?/.test(m.content)) s += 1;
  if (m.content.length < 24 && m.role === 'assistant') s -= 2;
  if (m.content.length > 400) s += 1;
  return s;
}

/**
 * Keep top-scoring messages by ratio, preserving chronological order among survivors.
 */
export function filterMiddleByImportance(
  middle: Message[],
  keepRatio: number,
  minKeep: number,
): Message[] {
  if (middle.length === 0) return middle;

  const ratio = Math.min(1, Math.max(0.1, keepRatio));
  const minK = Math.max(1, Math.min(middle.length, minKeep));
  const target = Math.max(minK, Math.ceil(middle.length * ratio));

  const scored = middle.map((msg, i) => ({ msg, i, score: scoreMessageImportance(msg) }));
  scored.sort((a, b) => b.score - a.score);
  const kept = new Set(scored.slice(0, target).map((x) => x.i));
  return middle.filter((_, i) => kept.has(i));
}
