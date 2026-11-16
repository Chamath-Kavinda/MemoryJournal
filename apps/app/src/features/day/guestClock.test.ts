import { LocalRepository, type KeyValueStore } from '@memory-journal/core';

import { latestSeenAt, recordSeen, resetSeenCache } from './guestClock';

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

const MINUTE = 60_000;
const NINE_THIRTY_PM = Date.UTC(2026, 10, 14, 21, 30);

describe('recordSeen', () => {
  beforeEach(() => resetSeenCache());

  it('stores the time on the first launch', async () => {
    const repository = new LocalRepository(memoryStore());

    const seen = await recordSeen(repository, NINE_THIRTY_PM);

    expect(seen).toBe(NINE_THIRTY_PM);
    expect(await repository.getLastSeenAt()).toBe(NINE_THIRTY_PM);
    expect(latestSeenAt()).toBe(NINE_THIRTY_PM);
  });

  it('moves the stored time forward', async () => {
    const repository = new LocalRepository(memoryStore());
    await recordSeen(repository, NINE_THIRTY_PM);

    await recordSeen(repository, NINE_THIRTY_PM + 10 * MINUTE);

    expect(await repository.getLastSeenAt()).toBe(NINE_THIRTY_PM + 10 * MINUTE);
  });

  it('never lowers the stored time when the clock is set back', async () => {
    const repository = new LocalRepository(memoryStore());
    await recordSeen(repository, NINE_THIRTY_PM);

    const seen = await recordSeen(repository, NINE_THIRTY_PM - 3 * 60 * MINUTE);

    expect(seen).toBe(NINE_THIRTY_PM);
    expect(await repository.getLastSeenAt()).toBe(NINE_THIRTY_PM);
    expect(latestSeenAt()).toBe(NINE_THIRTY_PM);
  });

  it('keeps the time in memory when the device storage fails', async () => {
    const repository = new LocalRepository(memoryStore());
    jest.spyOn(repository, 'getLastSeenAt').mockRejectedValue(new Error('storage is full'));

    const seen = await recordSeen(repository, NINE_THIRTY_PM);

    expect(seen).toBe(NINE_THIRTY_PM);
    expect(latestSeenAt()).toBe(NINE_THIRTY_PM);
  });
});
