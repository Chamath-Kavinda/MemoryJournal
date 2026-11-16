const mockPush = jest.fn();
let mockStatus = 'signed-in';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/features/auth/authStore', () => ({
  useAuthStore: (select: (state: { status: string }) => unknown) => select({ status: mockStatus }),
}));
jest.mock('@/features/calendar/useTodayId', () => ({ useTodayId: () => '2026-11-14' }));

import { renderHook } from '@testing-library/react-native';

import { useDesktopReminder } from './useDesktopReminder';

type Bridge = {
  setReminderEnabled?: jest.Mock;
  onOpenToday?: jest.Mock;
};

const globals = globalThis as { memoryJournal?: Bridge };

describe('useDesktopReminder', () => {
  let setReminderEnabled: jest.Mock;
  let unsubscribe: jest.Mock;
  let onOpenToday: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStatus = 'signed-in';
    setReminderEnabled = jest.fn().mockResolvedValue(undefined);
    unsubscribe = jest.fn();
    onOpenToday = jest.fn().mockReturnValue(unsubscribe);
    globals.memoryJournal = { setReminderEnabled, onOpenToday };
  });

  afterEach(() => {
    delete globals.memoryJournal;
  });

  it('asks the main process for the reminder once a signed-in person is known', async () => {
    await renderHook(() => useDesktopReminder());

    expect(setReminderEnabled).toHaveBeenCalledTimes(1);
    expect(setReminderEnabled).toHaveBeenCalledWith(true);
  });

  it('asks the main process for the reminder for a guest too', async () => {
    mockStatus = 'signed-out';

    await renderHook(() => useDesktopReminder());

    expect(setReminderEnabled).toHaveBeenCalledWith(true);
  });

  it('tells the main process the reminder is off while it is still working out who is using the app', async () => {
    mockStatus = 'loading';

    await renderHook(() => useDesktopReminder());

    expect(setReminderEnabled).toHaveBeenCalledWith(false);
  });

  it('tells the main process the reminder is off when the Settings toggle is off', async () => {
    await renderHook(() => useDesktopReminder(false));

    expect(setReminderEnabled).toHaveBeenCalledWith(false);
  });

  it('keeps the reminder on when a signed-in person signs out and becomes a guest', async () => {
    const view = await renderHook(() => useDesktopReminder());
    expect(setReminderEnabled).toHaveBeenLastCalledWith(true);

    mockStatus = 'signed-out';
    await view.rerender({});

    expect(setReminderEnabled).toHaveBeenCalledTimes(1);
    expect(setReminderEnabled).toHaveBeenLastCalledWith(true);
  });

  it("opens today's page when the notification is tapped", async () => {
    await renderHook(() => useDesktopReminder());

    expect(onOpenToday).toHaveBeenCalledTimes(1);
    const callback = onOpenToday.mock.calls[0][0] as () => void;
    callback();

    expect(mockPush).toHaveBeenCalledWith('/day/2026-11-14');
  });

  it("opens today's page for a guest too", async () => {
    mockStatus = 'signed-out';

    await renderHook(() => useDesktopReminder());

    expect(onOpenToday).toHaveBeenCalledTimes(1);
  });

  it('does not listen for taps while it is still working out who is using the app', async () => {
    mockStatus = 'loading';

    await renderHook(() => useDesktopReminder());

    expect(onOpenToday).not.toHaveBeenCalled();
  });

  it('stops listening when it unmounts', async () => {
    const view = await renderHook(() => useDesktopReminder());

    await view.unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('survives a refused message to the main process', async () => {
    setReminderEnabled.mockRejectedValue(new Error('closed'));

    await expect(renderHook(() => useDesktopReminder())).resolves.toBeDefined();
  });

  it('does nothing without a bridge (phones and plain browsers)', async () => {
    delete globals.memoryJournal;

    await renderHook(() => useDesktopReminder());

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('copes with an older preload that lacks the reminder helpers', async () => {
    globals.memoryJournal = {};

    await expect(renderHook(() => useDesktopReminder())).resolves.toBeDefined();
  });
});
