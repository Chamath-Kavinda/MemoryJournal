import {
  REMINDER_BODY,
  REMINDER_HOUR,
  REMINDER_MINUTE,
  reminderAction,
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
