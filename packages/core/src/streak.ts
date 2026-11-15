import { UNLOCK_HOUR, compareDayIds, dayIdFromUtc, daysBetween, toLocalParts } from './time';
import type { DayId, DayRevision, UserStats } from './types';

/** A first pass needs at least this many words to count toward the streak. */
export const STREAK_MIN_WORDS = 20;
/** One freeze is earned each time the streak reaches a multiple of this many days. */
export const DAYS_PER_FREEZE = 7;
/** Freezes that can be banked at once. */
export const MAX_FREEZES = 2;
/** Streak lengths that are celebrated. */
export const STREAK_MILESTONES: readonly number[] = [3, 7, 14, 30, 60, 100, 365];

/** The streak fields of `users/{uid}.stats`. */
export type StreakStats = Pick<
  UserStats,
  'currentStreak' | 'longestStreak' | 'lastStreakDay' | 'freezeCount'
>;

/**
 * Whether a day counts toward the streak: its first pass was saved on that same local calendar
 * day, from 21:00 on, with at least 20 words. A pass written on a later day, or any later pass,
 * improves the score but does not count here (build documentation section 8.2).
 */
export function countsTowardStreak(
  dayId: DayId,
  first: Pick<DayRevision, 'n' | 'createdAt' | 'wordCount'>,
  utcOffsetMinutes: number,
): boolean {
  if (first.n !== 1 || first.wordCount < STREAK_MIN_WORDS) return false;
  if (dayIdFromUtc(first.createdAt, utcOffsetMinutes) !== dayId) return false;
  return toLocalParts(first.createdAt, utcOffsetMinutes).hour >= UNLOCK_HOUR;
}

/**
 * The streak as seen on `today`, worked out from the days that counted (see
 * countsTowardStreak). Days after today and repeated days are ignored, and the order does not
 * matter.
 *
 * A day that is missed spends one banked freeze, and the streak stays as it was; with no freeze
 * left, the streak goes back to 0. Today is never missed, because it can be written until
 * midnight. A freeze is earned when the streak reaches 7, 14, 21 and so on, with at most 2 banked.
 */
export function computeStreak(streakDays: readonly DayId[], today: DayId): StreakStats {
  const days = [...new Set(streakDays)]
    .filter((dayId) => compareDayIds(dayId, today) <= 0)
    .sort(compareDayIds);

  let currentStreak = 0;
  let longestStreak = 0;
  let freezeCount = 0;

  const miss = (missedDays: number) => {
    if (missedDays <= 0) return;
    const spent = Math.min(freezeCount, missedDays);
    freezeCount -= spent;
    if (missedDays > spent) currentStreak = 0;
  };

  let previous: DayId | null = null;
  for (const dayId of days) {
    if (previous !== null) miss(daysBetween(previous, dayId) - 1);
    currentStreak += 1;
    longestStreak = Math.max(longestStreak, currentStreak);
    if (currentStreak % DAYS_PER_FREEZE === 0) {
      freezeCount = Math.min(MAX_FREEZES, freezeCount + 1);
    }
    previous = dayId;
  }
  if (previous !== null) miss(daysBetween(previous, today) - 1);

  return { currentStreak, longestStreak, lastStreakDay: previous, freezeCount };
}

/** The next milestone above `streak`, or null once the last one has been passed. */
export function nextMilestone(streak: number): number | null {
  return STREAK_MILESTONES.find((milestone) => milestone > streak) ?? null;
}

/**
 * The milestone reached when the streak went from `previous` to `current`, or null. If one step
 * crossed several, the highest is returned.
 */
export function newMilestone(previous: number, current: number): number | null {
  const reached = STREAK_MILESTONES.filter(
    (milestone) => milestone > previous && milestone <= current,
  );
  return reached.length === 0 ? null : Math.max(...reached);
}
