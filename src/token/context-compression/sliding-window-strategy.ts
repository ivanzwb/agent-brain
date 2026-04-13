import type { Message } from '../../types';

/**
 * Sliding window: keep only the last `maxMessages` items in the middle segment.
 */
export function applySlidingWindowMiddle(middle: Message[], maxMessages: number): Message[] {
  if (maxMessages <= 0 || middle.length <= maxMessages) return middle;
  return middle.slice(-maxMessages);
}
