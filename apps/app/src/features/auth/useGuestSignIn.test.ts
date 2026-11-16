const mockChoose = jest.fn();
const mockRunGuestSignIn = jest.fn();
const mockExportGuestData = jest.fn();
const mockSyncUserProfile = jest.fn();
const mockGetJournalRepository = jest.fn();
const mockCurrentUser = { current: { uid: 'u1' } as { uid: string } | null };
const guestRepository = { name: 'guest' };
const accountRepository = { name: 'account' };

jest.mock('@/components/useConfirm', () => ({ useChoice: () => mockChoose }));
jest.mock('@/features/calendar/useTodayId', () => ({ useTodayId: () => '2026-11-16' }));
jest.mock('@/features/profile/profileService', () => ({
  deviceZone: () => ({ utcOffsetMinutes: 330 }),
  syncUserProfile: (...args: unknown[]) => mockSyncUserProfile(...args),
}));
jest.mock('@/features/settings/exportService', () => ({
  exportGuestData: (...args: unknown[]) => mockExportGuestData(...args),
}));
jest.mock('@/lib/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: mockCurrentUser.current }),
}));
jest.mock('@/lib/journal', () => ({
  getJournalRepository: (...args: unknown[]) => mockGetJournalRepository(...args),
}));
jest.mock('@/platform/auth/google', () => ({
  pickGoogleAccount: jest.fn(),
  completeGoogleSignIn: jest.fn(),
}));
jest.mock('./signInFlow', () => ({
  runGuestSignIn: (...args: unknown[]) => mockRunGuestSignIn(...args),
}));

import { act, renderHook } from '@testing-library/react-native';

import { describeGuestCounts, mergeDialogMessage, useGuestSignIn } from './useGuestSignIn';

const emptyMerge = { rejected: [], failed: [], complete: true };

describe('describeGuestCounts', () => {
  it('names each kind of entry and leaves out zero counts', () => {
    expect(describeGuestCounts({ days: 12, tags: 5, libraryItems: 2 })).toBe(
      '12 days, 5 tags and 2 library items',
    );
    expect(describeGuestCounts({ days: 1, tags: 0, libraryItems: 1 })).toBe(
      '1 day and 1 library item',
    );
    expect(describeGuestCounts({ days: 3, tags: 0, libraryItems: 0 })).toBe('3 days');
    expect(describeGuestCounts({ days: 0, tags: 0, libraryItems: 0 })).toBe('Nothing');
  });
});

describe('mergeDialogMessage', () => {
  it('says what will be added and that nothing in the account is overwritten or deleted', () => {
    expect(mergeDialogMessage({ days: 2, tags: 1, libraryItems: 0 })).toBe(
      '2 days and 1 tag will be added. Nothing already in the account is overwritten or deleted.',
    );
  });
});

describe('useGuestSignIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser.current = { uid: 'u1' };
    mockSyncUserProfile.mockResolvedValue('ready');
    mockExportGuestData.mockResolvedValue('delivered');
    mockGetJournalRepository.mockImplementation((uid: string | null) =>
      uid === null ? guestRepository : accountRepository,
    );
  });

  it('starts idle', async () => {
    const { result } = await renderHook(() => useGuestSignIn());

    expect(result.current.state).toEqual({ phase: 'idle' });
  });

  it('finishes after a merge', async () => {
    mockRunGuestSignIn.mockResolvedValue({ status: 'merged', result: emptyMerge });
    const { result } = await renderHook(() => useGuestSignIn());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.state).toEqual({ phase: 'finished' });
  });

  it('finishes when there was nothing to merge', async () => {
    mockRunGuestSignIn.mockResolvedValue({ status: 'signed-in' });
    const { result } = await renderHook(() => useGuestSignIn());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.state).toEqual({ phase: 'finished' });
  });

  it('goes back to idle when the person cancels', async () => {
    mockRunGuestSignIn.mockResolvedValue({ status: 'cancelled' });
    const { result } = await renderHook(() => useGuestSignIn());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.state).toEqual({ phase: 'idle' });
  });

  it('shows the step the flow reports while it runs', async () => {
    let finish: (value: unknown) => void = () => undefined;
    mockRunGuestSignIn.mockImplementation(
      (deps: { onStep: (step: string) => void }) =>
        new Promise((resolve) => {
          deps.onStep('adding');
          finish = resolve;
        }),
    );
    const { result } = await renderHook(() => useGuestSignIn());

    let pending: Promise<void> = Promise.resolve();
    await act(async () => {
      pending = result.current.start();
    });
    expect(result.current.state).toEqual({ phase: 'running', step: 'adding' });

    await act(async () => {
      finish({ status: 'signed-in' });
      await pending;
    });
    expect(result.current.state).toEqual({ phase: 'finished' });
  });

  it('ignores a second start while one is running', async () => {
    let finish: (value: unknown) => void = () => undefined;
    mockRunGuestSignIn.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { result } = await renderHook(() => useGuestSignIn());

    let first: Promise<void> = Promise.resolve();
    await act(async () => {
      first = result.current.start();
    });
    await act(async () => {
      await result.current.start();
    });
    expect(mockRunGuestSignIn).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish({ status: 'signed-in' });
      await first;
    });
  });

  it('reports a flow error and lets the person try again', async () => {
    mockRunGuestSignIn.mockResolvedValueOnce({
      status: 'error',
      message: 'Google sign-in failed.',
      step: 'signing-in',
    });
    mockRunGuestSignIn.mockResolvedValueOnce({ status: 'signed-in' });
    const { result } = await renderHook(() => useGuestSignIn());

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.state).toEqual({
      phase: 'problem',
      message: 'Google sign-in failed.',
      notAdded: [],
    });

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.state).toEqual({ phase: 'finished' });
  });

  it('lists what was not added when the merge is partial', async () => {
    mockRunGuestSignIn.mockResolvedValue({
      status: 'partial',
      result: {
        rejected: [{ kind: 'day', id: '2026-01-02', reason: 'too long' }],
        failed: [{ kind: 'tag', id: 'travel', reason: 'offline' }],
        complete: false,
      },
    });
    const { result } = await renderHook(() => useGuestSignIn());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.state).toEqual({
      phase: 'problem',
      message:
        'Some entries were not added to your account. Your guest journal is still on this device.',
      notAdded: ['day 2026-01-02: too long', 'tag travel: offline'],
    });
  });

  it('turns an unexpected throw into a problem message', async () => {
    mockRunGuestSignIn.mockRejectedValue(new Error('boom'));
    const { result } = await renderHook(() => useGuestSignIn());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.state).toEqual({ phase: 'problem', message: 'boom', notAdded: [] });
  });

  it('asks in a calm three-button dialog and maps the choice to a decision', async () => {
    let decide: (counts: {
      days: number;
      tags: number;
      libraryItems: number;
    }) => Promise<string> = () => Promise.resolve('');
    mockRunGuestSignIn.mockImplementation(async (deps: { decide: typeof decide }) => {
      decide = deps.decide;
      return { status: 'signed-in' };
    });
    const { result } = await renderHook(() => useGuestSignIn());
    await act(async () => {
      await result.current.start();
    });

    mockChoose.mockResolvedValueOnce('confirm');
    expect(await decide({ days: 2, tags: 0, libraryItems: 0 })).toBe('merge');
    expect(mockChoose).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '2 days will be added. Nothing already in the account is overwritten or deleted.',
        confirmLabel: 'Merge and sign in',
        alternativeLabel: 'Export guest data (JSON)',
        neutral: true,
      }),
    );

    mockChoose.mockResolvedValueOnce('alternative');
    expect(await decide({ days: 2, tags: 0, libraryItems: 0 })).toBe('export');

    mockChoose.mockResolvedValueOnce('cancel');
    expect(await decide({ days: 2, tags: 0, libraryItems: 0 })).toBe('cancel');
  });

  it('opens the account only after the profile has been written', async () => {
    let openAccount: () => Promise<unknown> = () => Promise.resolve(null);
    mockRunGuestSignIn.mockImplementation(async (deps: { openAccount: typeof openAccount }) => {
      openAccount = deps.openAccount;
      return { status: 'signed-in' };
    });
    const { result } = await renderHook(() => useGuestSignIn());
    await act(async () => {
      await result.current.start();
    });

    expect(await openAccount()).toEqual({
      repository: accountRepository,
      utcOffsetMinutes: 330,
    });
    expect(mockSyncUserProfile).toHaveBeenCalledWith({ uid: 'u1' }, expect.any(Number));

    mockSyncUserProfile.mockResolvedValue('unavailable');
    expect(await openAccount()).toBeNull();

    mockCurrentUser.current = null;
    expect(await openAccount()).toBeNull();
  });

  it('exports the on-device journal', async () => {
    const { result } = await renderHook(() => useGuestSignIn());

    await act(async () => {
      await result.current.exportGuest();
    });

    expect(mockExportGuestData).toHaveBeenCalledWith(guestRepository, '2026-11-16');
  });
});
