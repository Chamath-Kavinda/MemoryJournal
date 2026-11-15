import { UNLOCK_HOUR } from './time';

/** The daily reminder fires at the same local time the day unlocks (section 5.8). */
export const REMINDER_HOUR = UNLOCK_HOUR;
export const REMINDER_MINUTE = 0;

/** The exact text of the reminder (section 5.8). Mobile and desktop show the same words. */
export const REMINDER_TITLE = 'Memory Journal';
export const REMINDER_BODY = 'Time to write your day. Tap to open.';

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
