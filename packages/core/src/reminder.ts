import { UNLOCK_HOUR, dayIdFromUtc, unlockInstantUtc } from './time';
import type { DayId, EpochMs } from './types';

/** The daily reminder fires at the same local time the day unlocks (section 5.8). */
export const REMINDER_HOUR = UNLOCK_HOUR;
export const REMINDER_MINUTE = 0;

/** The exact text of the reminder (section 5.8). Mobile and desktop show the same words. */
export const REMINDER_TITLE = 'Memory Journal';
export const REMINDER_BODY = 'Time to write your day. Tap to open.';

/**
 * How long after 21:00 a reminder that was missed is still worth showing. A laptop that wakes from
 * sleep at 21:20 should remind the person; one that wakes at midnight should not.
 */
export const REMINDER_LATE_GRACE_MS = 60 * 60_000;

/** What the notification system reports about permission to show notifications. */
export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

/** What the app should do about the daily reminder. */
export type ReminderAction = 'ask' | 'schedule' | 'cancel';

export interface ReminderState {
  /** The reminder toggle in Settings (on by default). */
  enabled: boolean;
  permission: NotificationPermission;
}

/**
 * Decides what to do about the reminder, so mobile and desktop follow the same rules:
 * - with the reminder switched off, nothing is scheduled and the person is never asked;
 * - permission is asked for only while it is undetermined, which is the first launch after
 *   sign-in; a refusal is respected and not asked again;
 * - with permission, the reminder is scheduled (again), which also repairs a missing or stale
 *   schedule, for example after the time zone changed.
 */
export function reminderAction(state: ReminderState): ReminderAction {
  if (!state.enabled) return 'cancel';
  if (state.permission === 'granted') return 'schedule';
  if (state.permission === 'undetermined') return 'ask';
  return 'cancel';
}

/** True once today's reminder time (21:00 local) has been reached. */
export function reminderTimePassed(nowUtcMs: EpochMs, utcOffsetMinutes: number): boolean {
  const today = dayIdFromUtc(nowUtcMs, utcOffsetMinutes);
  return nowUtcMs >= unlockInstantUtc(today, utcOffsetMinutes);
}

/**
 * For a scheduler that checks the clock now and then (the desktop app, which cannot hand a daily
 * repeat to the system). Returns the day id to remember as reminded, or null when nothing is due.
 * A reminder is due once per local day, from 21:00 until REMINDER_LATE_GRACE_MS later.
 * `lastRemindedDay` is the day id returned the last time, or null if none has fired yet.
 */
export function reminderDue(
  nowUtcMs: EpochMs,
  utcOffsetMinutes: number,
  lastRemindedDay: DayId | null,
): DayId | null {
  const today = dayIdFromUtc(nowUtcMs, utcOffsetMinutes);
  if (lastRemindedDay === today) return null;
  const sinceReminderTime = nowUtcMs - unlockInstantUtc(today, utcOffsetMinutes);
  if (sinceReminderTime < 0 || sinceReminderTime > REMINDER_LATE_GRACE_MS) return null;
  return today;
}
