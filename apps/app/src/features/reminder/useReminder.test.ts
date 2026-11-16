const mockSync = jest.fn();
const mockPush = jest.fn();
const mockOffset = jest.fn();
let mockStatus = 'signed-in';
let mockResponse: unknown = null;

jest.mock('expo-notifications', () => ({
  useLastNotificationResponse: () => mockResponse,
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/features/auth/authStore', () => ({
  useAuthStore: (select: (state: { status: string }) => unknown) => select({ status: mockStatus }),
}));
jest.mock('@/features/calendar/useTodayId', () => ({ useTodayId: () => '2026-11-14' }));
jest.mock('@/features/profile/profileService', () => ({
  deviceZone: () => ({ utcOffsetMinutes: mockOffset() }),
}));
jest.mock('./reminderService', () => ({
  REMINDER_DATA: { open: 'today' },
  configureNotificationDisplay: jest.fn(),
  remindersSupported: true,
  syncReminder: (...args: unknown[]) => mockSync(...args),
}));

import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { useReminder } from './useReminder';

function tap(open: string, date = 1000) {
  return {
    notification: { date, request: { identifier: 'daily-reminder', content: { data: { open } } } },
  };
}

describe('useReminder', () => {
  let changeAppState: (state: AppStateStatus) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStatus = 'signed-in';
    mockResponse = null;
    mockOffset.mockReturnValue(330);
    mockSync.mockResolvedValue('schedule');
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      changeAppState = listener as (state: AppStateStatus) => void;
      return { remove: jest.fn() };
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('schedules the reminder once the person is signed in', async () => {
    await renderHook(() => useReminder());

    expect(mockSync).toHaveBeenCalledTimes(1);
    expect(mockSync).toHaveBeenCalledWith(true);
  });

  it('does nothing while it is still working out who is using the app', async () => {
    mockStatus = 'loading';

    await renderHook(() => useReminder());

    expect(mockSync).not.toHaveBeenCalled();
  });

  it('schedules the reminder for a guest too', async () => {
    mockStatus = 'signed-out';

    await renderHook(() => useReminder());

    expect(mockSync).toHaveBeenCalledTimes(1);
    expect(mockSync).toHaveBeenCalledWith(true);
  });

  it('passes the Settings toggle on', async () => {
    await renderHook(() => useReminder(false));

    expect(mockSync).toHaveBeenCalledWith(false);
  });

  it('schedules again when the time zone changed while the app was in the background', async () => {
    await renderHook(() => useReminder());
    expect(mockSync).toHaveBeenCalledTimes(1);

    mockOffset.mockReturnValue(-300);
    await act(async () => changeAppState('active'));

    expect(mockSync).toHaveBeenCalledTimes(2);
  });

  it('does not schedule again when the app returns and the offset is the same', async () => {
    await renderHook(() => useReminder());

    await act(async () => changeAppState('active'));

    expect(mockSync).toHaveBeenCalledTimes(1);
  });

  it('keeps running when scheduling fails', async () => {
    mockSync.mockRejectedValue(new Error('no notification service'));

    await expect(renderHook(() => useReminder())).resolves.toBeDefined();
  });

  it('opens today\u2019s page when the reminder is tapped', async () => {
    mockResponse = tap('today');

    await renderHook(() => useReminder());

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/day/2026-11-14');
  });

  it('opens the page once for one tap, even when the screen draws again', async () => {
    mockResponse = tap('today');

    const { rerender } = await renderHook(() => useReminder());
    await rerender({});

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('ignores a notification that is not the reminder', async () => {
    mockResponse = tap('somewhere-else');

    await renderHook(() => useReminder());

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('waits until it knows who is using the app before opening the page', async () => {
    mockStatus = 'loading';
    mockResponse = tap('today');

    await renderHook(() => useReminder());

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('opens the page for a guest too', async () => {
    mockStatus = 'signed-out';
    mockResponse = tap('today');

    await renderHook(() => useReminder());

    expect(mockPush).toHaveBeenCalledWith('/day/2026-11-14');
  });
});
