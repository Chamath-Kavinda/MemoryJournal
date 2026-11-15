import { dayIdFromUtc, reminderDue, reminderTimePassed, type DayId } from '@memory-journal/core';

/** How often the clock is looked at. The reminder can come up to this late, which nobody notices. */
export const CHECK_INTERVAL_MS = 30_000;

export interface ReminderSchedulerDeps {
  /** The current time as a UTC instant in milliseconds. */
  now: () => number;
  /** The device's current offset from UTC in minutes, read each time so a new zone or daylight saving is noticed. */
  utcOffsetMinutes: () => number;
  /** Shows the reminder. */
  notify: () => void;
}

export interface ReminderScheduler {
  /** Starts looking at the clock. Does nothing if it is already started. */
  start: () => void;
  stop: () => void;
  /** Whether a reminder is wanted: signed in, and the Settings toggle on. Starts off. */
  setEnabled: (enabled: boolean) => void;
  /** Looks at the clock now; also used when the computer wakes from sleep. */
  check: () => void;
}

/**
 * The desktop reminder (section 5.8). Windows cannot be given a daily repeat the way a phone can,
 * so the main process looks at the clock now and then and shows the reminder once a day from
 * 21:00 (the rule itself is reminderDue in packages/core, shared with the tests there).
 *
 * Switching the reminder on after 21:00 does not remind at once: the person has just opened the app
 * or signed in, so today's reminder counts as given. Switching it off and on again does the same.
 */
export function createReminderScheduler(deps: ReminderSchedulerDeps): ReminderScheduler {
  let enabled = false;
  let lastRemindedDay: DayId | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  const check = (): void => {
    if (!enabled) return;
    const day = reminderDue(deps.now(), deps.utcOffsetMinutes(), lastRemindedDay);
    if (day === null) return;
    lastRemindedDay = day;
    deps.notify();
  };

  return {
    start() {
      if (timer !== null) return;
      timer = setInterval(check, CHECK_INTERVAL_MS);
    },
    stop() {
      if (timer === null) return;
      clearInterval(timer);
      timer = null;
    },
    setEnabled(next) {
      if (next === enabled) return;
      enabled = next;
      if (!enabled) return;
      const now = deps.now();
      const offset = deps.utcOffsetMinutes();
      if (reminderTimePassed(now, offset)) lastRemindedDay = dayIdFromUtc(now, offset);
    },
    check,
  };
}
