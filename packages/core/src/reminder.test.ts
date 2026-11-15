import {
  REMINDER_BODY,
  REMINDER_HOUR,
  REMINDER_LATE_GRACE_MS,
  REMINDER_MINUTE,
  reminderAction,
  reminderDue,
  reminderTimePassed,
  type NotificationPermission,
} from './reminder';
import { UNLOCK_HOUR } from './time';

describe('reminder constants', () => {
  it('fires at 21:00 local time, the same moment the day unlocks', () => {
    expect(REMINDER_HOUR).toBe(21);
    expect(REMINDER_MINUTE).toBe(0);
    expect(REMINDER_HOUR).toBe(UNLOCK_HOUR);
  });

  it('uses the text from the documentation', () => {
    expect(REMINDER_BODY).toBe('Time to write your day. Tap to open.');
  });
});

describe('reminderAction', () => {
  it.each<[NotificationPermission, string]>([
    ['granted', 'schedule'],
    ['undetermined', 'ask'],
    ['denied', 'cancel'],
  ])('with the reminder on and permission %s it should %s', (permission, expected) => {
    expect(reminderAction({ enabled: true, permission })).toBe(expected);
  });

  it.each<NotificationPermission>(['granted', 'undetermined', 'denied'])(
    'cancels and never asks when the reminder is off (permission %s)',
    (permission) => {
      expect(reminderAction({ enabled: false, permission })).toBe('cancel');
    },
  );
});

/** A UTC instant for a local wall-clock time on 2026-11-15 (or another day) at the given offset. */
const local = (hour: number, minute: number, offsetMinutes: number, day = 15, second = 0, ms = 0) =>
  Date.UTC(2026, 10, day, hour, minute, second, ms) - offsetMinutes * 60_000;

describe('reminderTimePassed', () => {
  it('is false before 21:00 and true from 21:00 to the end of the day', () => {
    expect(reminderTimePassed(local(20, 59, 330, 15, 59), 330)).toBe(false);
    expect(reminderTimePassed(local(21, 0, 330), 330)).toBe(true);
    expect(reminderTimePassed(local(23, 59, 330), 330)).toBe(true);
  });

  it('judges the time in the given offset, not in UTC', () => {
    const instant = local(21, 0, 330);
    expect(reminderTimePassed(instant, 330)).toBe(true);
    expect(reminderTimePassed(instant, 0)).toBe(false);
  });
});

describe('reminderDue', () => {
  it('is not due before 21:00', () => {
    expect(reminderDue(local(20, 59, 330, 15, 59, 999), 330, null)).toBeNull();
    expect(reminderDue(local(9, 0, 330), 330, null)).toBeNull();
  });

  it.each([0, 330, -300, 60, -480])('is due at 21:00 local time with offset %i', (offset) => {
    expect(reminderDue(local(21, 0, offset), offset, null)).toBe('2026-11-15');
  });

  it('is due only once a day', () => {
    expect(reminderDue(local(21, 0, 330), 330, '2026-11-15')).toBeNull();
    expect(reminderDue(local(21, 30, 330), 330, '2026-11-15')).toBeNull();
  });

  it('is due again the next evening after a reminder yesterday', () => {
    expect(reminderDue(local(21, 0, 330, 16), 330, '2026-11-15')).toBe('2026-11-16');
  });

  it('still reminds when a missed reminder is found within the grace period', () => {
    expect(REMINDER_LATE_GRACE_MS).toBe(60 * 60_000);
    expect(reminderDue(local(21, 20, 330), 330, null)).toBe('2026-11-15');
    expect(reminderDue(local(22, 0, 330), 330, null)).toBe('2026-11-15');
  });

  it('lets a missed reminder go once the grace period is over', () => {
    expect(reminderDue(local(22, 0, 330, 15, 0, 1), 330, null)).toBeNull();
    expect(reminderDue(local(23, 45, 330), 330, null)).toBeNull();
  });

  it('is not due just after midnight, when the new day has not reached 21:00', () => {
    expect(reminderDue(local(0, 30, 330, 16), 330, null)).toBeNull();
    expect(reminderDue(local(0, 30, 330, 16), 330, '2026-11-15')).toBeNull();
  });

  it('uses the offset to decide which evening it is', () => {
    const instant = local(21, 0, 330);
    expect(reminderDue(instant, 330, null)).toBe('2026-11-15');
    // The same instant is 15:30 in UTC, long before the reminder.
    expect(reminderDue(instant, 0, null)).toBeNull();
  });
});
