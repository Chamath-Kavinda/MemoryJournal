import { compareDayIds } from './time';
import type { DayId, DayMeta, LibraryItem } from './types';

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

/**
 * How many places mention each tag, for the Tags list: the days whose latest pass mentions it
 * plus the library pages whose latest pass mentions it. A day or page counts once per tag even
 * if the tag appears in it several times, and a tag nobody mentions is not in the map.
 */
export function mentionCounts(
  days: ReadonlyArray<Pick<DayMeta, 'date' | 'mentions'>>,
  items: ReadonlyArray<Pick<LibraryItem, 'id' | 'mentions'>>,
): Map<string, number> {
  const counts = new Map<string, number>();
  const add = (tagIds: readonly string[] | undefined) => {
    for (const tagId of new Set(tagIds ?? [])) counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
  };
  // The same day listed twice still counts once, like `mentionedDays`.
  const byDay = new Map<DayId, readonly string[] | undefined>();
  for (const day of days) byDay.set(day.date, day.mentions);
  for (const tagIds of byDay.values()) add(tagIds);
  const byItem = new Map<string, readonly string[]>();
  for (const item of items) byItem.set(item.id, item.mentions);
  for (const tagIds of byItem.values()) add(tagIds);
  return counts;
}
