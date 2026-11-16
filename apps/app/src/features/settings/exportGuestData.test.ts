const mockDeliver = jest.fn();
const mockGetFirebase = jest.fn(() => {
  throw new Error('a guest export must not touch Firebase');
});

jest.mock('@/lib/firebase', () => ({ getFirebase: () => mockGetFirebase() }));
jest.mock('firebase/firestore', () => ({}));
jest.mock('./exportDelivery', () => ({
  deliverExport: (...args: unknown[]) => mockDeliver(...args),
}));

import { LocalRepository, type KeyValueStore } from '@memory-journal/core';

import { exportGuestData } from './exportService';

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

describe('exportGuestData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeliver.mockResolvedValue('delivered');
  });

  it('delivers the on-device journal as one JSON file named for the local day, without Firebase', async () => {
    const repo = new LocalRepository(memoryStore());
    await repo.putDay({
      date: '2026-11-14',
      latestRevision: 1,
      wordCount: 2,
      updatedAt: 1,
      firstWrittenAt: 1,
    });
    await repo.putRevision('2026-11-14', {
      n: 1,
      createdAt: 1,
      closedAt: 1,
      kind: 'first',
      freeNotes: 'hello',
      blocks: [],
      mentions: [],
      wordCount: 1,
      addedWordCount: 1,
    });

    const result = await exportGuestData(repo, '2026-11-16', Date.UTC(2026, 10, 16, 9));

    expect(result).toBe('delivered');
    expect(mockGetFirebase).not.toHaveBeenCalled();
    const [fileName, json] = mockDeliver.mock.calls[0] as [string, string];
    expect(fileName).toBe('memory-journal-export-2026-11-16.json');
    const parsed = JSON.parse(json) as { days: { id: string; revisions: { id: string }[] }[] };
    expect(parsed.days[0]?.id).toBe('2026-11-14');
    expect(parsed.days[0]?.revisions.map((r) => r.id)).toEqual(['1']);
  });

  it('passes a failed read on instead of delivering a partial file', async () => {
    const repo = new LocalRepository(memoryStore());
    jest.spyOn(repo, 'listLibrary').mockRejectedValue(new Error('read failed'));

    await expect(exportGuestData(repo, '2026-11-16')).rejects.toThrow('read failed');
    expect(mockDeliver).not.toHaveBeenCalled();
  });
});
