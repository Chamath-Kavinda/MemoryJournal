import { dayIdFromUtc, getDayAccess, type DayAccess } from './time';
import type { DayId, EpochMs } from './types';

/**
 * How far behind the latest time ever seen the device clock may be before it looks wrong. A
 * little slack lets an automatic clock correction pass (section 15.6).
 */
export const CLOCK_TOLERANCE_MS = 5 * 60_000;

/**
 * True when the device clock is more than five minutes behind the latest time the app has
 * seen. Nothing is wrong before a time has been remembered.
 */
export function clockLooksWrong(nowMs: EpochMs, lastSeenAt: EpochMs | null): boolean {
  return lastSeenAt !== null && nowMs < lastSeenAt - CLOCK_TOLERANCE_MS;
}

/** The time to remember after seeing `nowMs`: the latest one, so it never goes backwards. */
export function nextLastSeenAt(nowMs: EpochMs, lastSeenAt: EpochMs | null): EpochMs {
  return lastSeenAt === null ? nowMs : Math.max(nowMs, lastSeenAt);
}

/** The lock state of a day in guest mode: the usual three, or today held shut by a wrong clock. */
export type GuestDayAccess = DayAccess | { state: 'clockWrong' };

/**
 * Lock rules for a guest, who has no server time (section 15.6). While the device clock looks
 * wrong, the latest time seen stands in for it, so no day that was future or locked becomes
 * writable by moving the clock back. Today stays closed with a `clockWrong` state, whatever
 * the hour. Earlier days stay as they were. With a sound clock this is the same as
 * `getDayAccess`.
 */
export function getGuestDayAccess(
  dayId: DayId,
  nowUtcMs: EpochMs,
  utcOffsetMinutes: number,
  lastSeenAt: EpochMs | null,
): GuestDayAccess {
  if (lastSeenAt === null || !clockLooksWrong(nowUtcMs, lastSeenAt)) {
    return getDayAccess(dayId, nowUtcMs, utcOffsetMinutes);
  }
  if (dayId === dayIdFromUtc(lastSeenAt, utcOffsetMinutes)) return { state: 'clockWrong' };
  return getDayAccess(dayId, lastSeenAt, utcOffsetMinutes);
}
