import { LocalRepository, type KeyValueStore } from '@memory-journal/core';

import { runGuestSignIn, type SignInFlowDeps, type SignInStep } from './signInFlow';

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
    getAllKeys: async () => [...data.keys()],
  };
}

// 22:00 on 2026-11-16 in UTC+05:30.
const NOW = Date.UTC(2026, 10, 16, 16, 30);

async function withGuestDay(guest: LocalRepository, date = '2026-11-10') {
  await guest.putDay({
    date,
    latestRevision: 1,
    wordCount: 2,
    updatedAt: 1,
    firstWrittenAt: 1,
  });
  await guest.putRevision(date, {
    n: 1,
    createdAt: 1,
    closedAt: 2,
    kind: 'first',
    freeNotes: '',
    blocks: [{ hour: 9, minute: null, text: 'hello world' }],
    mentions: [],
    wordCount: 2,
    addedWordCount: 2,
  });
}

function setup(overrides: Partial<SignInFlowDeps> = {}) {
  const guest = new LocalRepository(memoryStore());
  const account = new LocalRepository(memoryStore());
  const steps: SignInStep[] = [];
  const deps: SignInFlowDeps = {
    guest,
    pickAccount: async () => ({ status: 'ok', idToken: 'token' }),
    completeSignIn: jest.fn(async () => ({ status: 'signed-in' as const })),
    decide: jest.fn(async () => 'merge' as const),
    exportGuest: jest.fn(async () => undefined),
    openAccount: async () => ({ repository: account, utcOffsetMinutes: 330 }),
    onStep: (step) => steps.push(step),
    now: () => NOW,
    ...overrides,
  };
  return { guest, account, steps, deps };
}

describe('runGuestSignIn', () => {
  it('signs in without a dialog when the guest journal is empty', async () => {
    const { deps, steps } = setup();
    expect(await runGuestSignIn(deps)).toEqual({ status: 'signed-in' });
    expect(deps.decide).not.toHaveBeenCalled();
    expect(steps).toEqual(['signing-in']);
  });

  it('changes nothing when the account picker is cancelled or fails', async () => {
    const cancelled = setup({ pickAccount: async () => ({ status: 'cancelled' }) });
    expect(await runGuestSignIn(cancelled.deps)).toEqual({ status: 'cancelled' });
    const failed = setup({ pickAccount: async () => ({ status: 'error', message: 'No network' }) });
    expect(await runGuestSignIn(failed.deps)).toEqual({
      status: 'error',
      message: 'No network',
      step: 'picking',
    });
    expect(cancelled.deps.completeSignIn).not.toHaveBeenCalled();
  });

  it('keeps the guest journal and does not sign in when the person cancels the dialog', async () => {
    const { deps, guest } = setup({ decide: jest.fn(async () => 'cancel' as const) });
    await withGuestDay(guest);
    expect(await runGuestSignIn(deps)).toEqual({ status: 'cancelled' });
    expect(deps.completeSignIn).not.toHaveBeenCalled();
    expect((await guest.listDays()).length).toBe(1);
  });

  it('shows the counts, exports on request, and asks again before merging', async () => {
    const decide = jest.fn().mockResolvedValueOnce('export').mockResolvedValueOnce('merge');
    const { deps, guest } = setup({ decide });
    await withGuestDay(guest);
    const result = await runGuestSignIn(deps);
    expect(result.status).toBe('merged');
    expect(deps.exportGuest).toHaveBeenCalledTimes(1);
    expect(decide).toHaveBeenCalledTimes(2);
    expect(decide).toHaveBeenCalledWith({ days: 1, tags: 0, libraryItems: 0 });
  });

  it('merges, verifies and only then clears the guest journal', async () => {
    const { deps, guest, account, steps } = setup();
    await withGuestDay(guest);
    const result = await runGuestSignIn(deps);
    expect(result.status).toBe('merged');
    expect(steps).toEqual(['signing-in', 'adding', 'cleaning']);
    expect((await account.listDays()).map((d) => d.date)).toEqual(['2026-11-10']);
    expect(await guest.listDays()).toEqual([]);
  });

  it('keeps the guest journal when sign-in fails', async () => {
    const { deps, guest } = setup({
      completeSignIn: jest.fn(async () => ({ status: 'error' as const, message: 'Offline' })),
    });
    await withGuestDay(guest);
    expect(await runGuestSignIn(deps)).toEqual({
      status: 'error',
      message: 'Offline',
      step: 'signing-in',
    });
    expect((await guest.listDays()).length).toBe(1);
  });

  it('keeps the guest journal when an entry is rejected', async () => {
    const { deps, guest } = setup();
    await withGuestDay(guest, '2026-11-20'); // a future day
    const result = await runGuestSignIn(deps);
    expect(result.status).toBe('partial');
    if (result.status === 'partial') expect(result.result.rejected).toHaveLength(1);
    expect((await guest.listDays()).length).toBe(1);
  });

  it('keeps the guest journal when a write fails, and can be retried', async () => {
    const { deps, guest, account } = setup();
    await withGuestDay(guest);
    const real = account.putRevision.bind(account);
    let fail = true;
    account.putRevision = async (dayId, revision) => {
      if (fail) throw new Error('offline');
      return real(dayId, revision);
    };
    expect((await runGuestSignIn(deps)).status).toBe('partial');
    expect((await guest.listDays()).length).toBe(1);

    fail = false;
    expect((await runGuestSignIn(deps)).status).toBe('merged');
    expect(await guest.listDays()).toEqual([]);
    expect((await account.listRevisions('2026-11-10')).length).toBe(1);
  });

  it('keeps the guest journal when the account cannot be opened', async () => {
    const { deps, guest } = setup({ openAccount: async () => null });
    await withGuestDay(guest);
    const result = await runGuestSignIn(deps);
    expect(result.status).toBe('error');
    expect((await guest.listDays()).length).toBe(1);
  });
});
