const mockClearDrafts = jest.fn();
const mockSyncReminder = jest.fn();
let mockRemindersSupported = true;

jest.mock('@/features/day/draftStorage', () => ({
  clearUserDrafts: (...args: unknown[]) => mockClearDrafts(...args),
}));
jest.mock('@/features/reminder/reminderService', () => ({
  get remindersSupported() {
    return mockRemindersSupported;
  },
  syncReminder: (...args: unknown[]) => mockSyncReminder(...args),
}));

import { LocalRepository, type KeyValueStore } from '@memory-journal/core';

import { eraseGuestData } from './eraseGuestService';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
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

describe('eraseGuestData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemindersSupported = true;
    mockClearDrafts.mockResolvedValue(undefined);
    mockSyncReminder.mockResolvedValue(undefined);
  });

  it('empties the on-device journal, removes the guest drafts and cancels the reminder', async () => {
    const store = memoryStore();
    const repo = new LocalRepository(store);
    await repo.putDay({
      date: '2026-11-14',
      latestRevision: 1,
      wordCount: 2,
      updatedAt: 1,
      firstWrittenAt: 1,
    });
    await repo.putSettings({ reminderEnabled: true, theme: 'light' });
    await repo.putLastSeenAt(5);

    const result = await eraseGuestData(repo);

    expect(result).toEqual({ status: 'erased' });
    expect(await repo.listDays()).toEqual([]);
    expect(await repo.getSettings()).toBeNull();
    expect(await repo.getLastSeenAt()).toBeNull();
    expect(store.data.size).toBe(0);
    expect(mockClearDrafts).toHaveBeenCalledWith('guest');
    expect(mockSyncReminder).toHaveBeenCalledWith(false);
  });

  it('skips the reminder where reminders are not supported', async () => {
    mockRemindersSupported = false;

    const result = await eraseGuestData(new LocalRepository(memoryStore()));

    expect(result).toEqual({ status: 'erased' });
    expect(mockSyncReminder).not.toHaveBeenCalled();
  });

  it('still erases when cancelling the reminder fails', async () => {
    mockSyncReminder.mockRejectedValue(new Error('no permission'));

    const result = await eraseGuestData(new LocalRepository(memoryStore()));

    expect(result).toEqual({ status: 'erased' });
  });

  it('reports a failed erase instead of claiming success', async () => {
    const repo = new LocalRepository(memoryStore());
    jest.spyOn(repo, 'clearAll').mockRejectedValue(new Error('storage is full'));

    const result = await eraseGuestData(repo);

    expect(result).toEqual({ status: 'error', message: 'storage is full' });
    expect(mockClearDrafts).not.toHaveBeenCalled();
  });
});
