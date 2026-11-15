const mockGetPermissions = jest.fn();
const mockRequestPermissions = jest.fn();
const mockSchedule = jest.fn();
const mockCancel = jest.fn();
const mockSetChannel = jest.fn();

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: (...args: unknown[]) => mockGetPermissions(...args),
  requestPermissionsAsync: (...args: unknown[]) => mockRequestPermissions(...args),
  scheduleNotificationAsync: (...args: unknown[]) => mockSchedule(...args),
  cancelScheduledNotificationAsync: (...args: unknown[]) => mockCancel(...args),
  setNotificationChannelAsync: (...args: unknown[]) => mockSetChannel(...args),
  setNotificationHandler: jest.fn(),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
}));

import { Platform } from 'react-native';

import { REMINDER_CHANNEL_ID, REMINDER_ID, syncReminder } from './reminderService';

const granted = { granted: true, status: 'granted', canAskAgain: true };
const undetermined = { granted: false, status: 'undetermined', canAskAgain: true };
const refused = { granted: false, status: 'denied', canAskAgain: false };

describe('syncReminder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSchedule.mockResolvedValue('daily-reminder');
    mockCancel.mockResolvedValue(undefined);
    mockSetChannel.mockResolvedValue(null);
  });

  it('schedules a repeating notification at 21:00 with the documented text', async () => {
    mockGetPermissions.mockResolvedValue(granted);

    await expect(syncReminder(true)).resolves.toBe('schedule');

    expect(mockRequestPermissions).not.toHaveBeenCalled();
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(mockSchedule).toHaveBeenCalledWith({
      identifier: REMINDER_ID,
      content: {
        title: 'Memory Journal',
        body: 'Time to write your day. Tap to open.',
        data: { open: 'today' },
      },
      trigger: { type: 'daily', channelId: REMINDER_CHANNEL_ID, hour: 21, minute: 0 },
    });
  });

  it('replaces the reminder under the same id every time, so it is never duplicated', async () => {
    mockGetPermissions.mockResolvedValue(granted);

    await syncReminder(true);
    await syncReminder(true);

    const ids = mockSchedule.mock.calls.map(
      (call) => (call[0] as { identifier: string }).identifier,
    );
    expect(ids).toEqual([REMINDER_ID, REMINDER_ID]);
  });

  it('asks for permission the first time and schedules when it is given', async () => {
    mockGetPermissions.mockResolvedValue(undetermined);
    mockRequestPermissions.mockResolvedValue(granted);

    await expect(syncReminder(true)).resolves.toBe('schedule');

    expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    expect(mockSchedule).toHaveBeenCalledTimes(1);
  });

  it('removes the reminder when the person refuses the permission prompt', async () => {
    mockGetPermissions.mockResolvedValue(undetermined);
    mockRequestPermissions.mockResolvedValue(refused);

    await expect(syncReminder(true)).resolves.toBe('cancel');

    expect(mockSchedule).not.toHaveBeenCalled();
    expect(mockCancel).toHaveBeenCalledWith(REMINDER_ID);
  });

  it('does not ask again after a refusal', async () => {
    mockGetPermissions.mockResolvedValue(refused);

    await expect(syncReminder(true)).resolves.toBe('cancel');

    expect(mockRequestPermissions).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
    expect(mockCancel).toHaveBeenCalledWith(REMINDER_ID);
  });

  it('treats a prompt that cannot be shown again as a refusal', async () => {
    mockGetPermissions.mockResolvedValue({ ...undetermined, canAskAgain: false });

    await expect(syncReminder(true)).resolves.toBe('cancel');

    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it('removes the reminder and never asks when it is switched off', async () => {
    mockGetPermissions.mockResolvedValue(undetermined);

    await expect(syncReminder(false)).resolves.toBe('cancel');

    expect(mockRequestPermissions).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
    expect(mockCancel).toHaveBeenCalledWith(REMINDER_ID);
  });

  it('creates the notification channel on Android only', async () => {
    mockGetPermissions.mockResolvedValue(granted);

    jest.replaceProperty(Platform, 'OS', 'ios');
    await syncReminder(true);
    expect(mockSetChannel).not.toHaveBeenCalled();

    jest.replaceProperty(Platform, 'OS', 'android');
    await syncReminder(true);
    expect(mockSetChannel).toHaveBeenCalledWith(REMINDER_CHANNEL_ID, {
      name: 'Daily reminder',
      importance: 3,
    });
    jest.restoreAllMocks();
  });
});
