import { compareDayIds } from './time';
import type { DayId, DayMeta } from './types';

/** A day that mentions a tag, as the tag screen lists it. */
export interface MentionedDay {
  dayId: DayId;
  wordCount: number;
}

/**
 * The days whose latest pass mentions the tag, newest first. A day appears once. A day saved
 * before `mentions` was stored on the day document has none, so it is not listed until it is
 * saved again.
 */
export function mentionedDays(
  metas: ReadonlyArray<Pick<DayMeta, 'date' | 'wordCount' | 'mentions'>>,
  tagId: string,
): MentionedDay[] {
  const byDay = new Map<DayId, MentionedDay>();
  for (const meta of metas) {
    if (meta.mentions?.includes(tagId)) {
      byDay.set(meta.date, { dayId: meta.date, wordCount: meta.wordCount });
    }
  }
  return [...byDay.values()].sort((a, b) => compareDayIds(b.dayId, a.dayId));
}
