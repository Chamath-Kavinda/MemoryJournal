import {
  INSIGHTS_MAX_WRITTEN_DAYS,
  LocalRepository,
  addDays,
  type DayMeta,
  type DayRevision,
  type JournalRepository,
  type KeyValueStore,
  type LibraryItem,
} from '@memory-journal/core';

import { loadInsightsInput } from './insightsService';

const OFFSET = 330;
const TODAY = '2026-11-14';

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: (key) => Promise.resolve(data.get(key) ?? null),
    setItem: (key, value) => {
      data.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key) => {
      data.delete(key);
      return Promise.resolve();
    },
    getAllKeys: () => Promise.resolve([...data.keys()]),
  };
}

/** The instant at `hour:minute` local time (UTC+05:30) on a day. */
function at(dayId: string, hour: number, minute = 0): number {
  const [year, month, day] = dayId.split('-').map(Number) as [number, number, number];
  return Date.UTC(year, month - 1, day, hour, minute) - OFFSET * 60_000;
}

const meta = (date: string, overrides: Partial<DayMeta> = {}): DayMeta => ({
  date,
  latestRevision: 1,
  wordCount: 30,
  updatedAt: at(date, 21, 30),
  firstWrittenAt: at(date, 21, 30),
  mentions: [],
  ...overrides,
});

const revision = (n: number, createdAt: number, wordCount = 30): DayRevision => ({
  n,
  createdAt,
  closedAt: null,
  kind: n === 1 ? 'first' : 'later',
  freeNotes: '',
  blocks: [],
  mentions: [],
  wordCount,
  addedWordCount: 0,
});

const libraryItem = (id: string, updatedAt: number): LibraryItem => ({
  id,
  type: 'movie',
  title: id,
  date: null,
  text: '',
  latestRevision: 0,
  updatedAt,
  wordCount: 0,
  mentions: [],
});

async function seedDay(
  repository: JournalRepository,
  day: DayMeta,
  revisions: DayRevision[] = [revision(1, day.firstWrittenAt, day.wordCount)],
) {
  await repository.putDay(day);
  for (const item of revisions) await repository.putRevision(day.date, item);
}

describe('loadInsightsInput', () => {
  let repository: JournalRepository;

  beforeEach(() => {
    repository = new LocalRepository(memoryStore());
  });

  it('works from an empty guest journal', async () => {
    const input = await loadInsightsInput(repository, TODAY, OFFSET);

    expect(input).toEqual({
      today: TODAY,
      utcOffsetMinutes: OFFSET,
      days: [],
      olderStreakDays: [],
      library: { itemCount: 0, lastSavedAt: null },
    });
  });

  it('reads every pass of the recent days, newest day first and oldest pass first', async () => {
    const yesterday = addDays(TODAY, -1);
    await seedDay(repository, meta(yesterday, { latestRevision: 2 }), [
      revision(2, at(TODAY, 8), 40),
      revision(1, at(yesterday, 21, 30)),
    ]);
    await seedDay(repository, meta(TODAY));

    const input = await loadInsightsInput(repository, TODAY, OFFSET);

    expect(input.today).toBe(TODAY);
    expect(input.utcOffsetMinutes).toBe(OFFSET);
    expect(input.olderStreakDays).toEqual([]);
    expect(input.days.map((day) => [day.dayId, day.revisions.map((r) => r.n)])).toEqual([
      [TODAY, [1]],
      [yesterday, [1, 2]],
    ]);
  });

  it('leaves out days after today', async () => {
    await seedDay(repository, meta(TODAY));
    await seedDay(repository, meta(addDays(TODAY, 1)));

    const input = await loadInsightsInput(repository, TODAY, OFFSET);

    expect(input.days.map((day) => day.dayId)).toEqual([TODAY]);
  });

  it('summarises the library by its count and its latest save', async () => {
    await repository.putLibraryItem(libraryItem('a', 5));
    await repository.putLibraryItem(libraryItem('b', 9));

    const { library } = await loadInsightsInput(repository, TODAY, OFFSET);

    expect(library).toEqual({ itemCount: 2, lastSavedAt: 9 });
  });

  describe('days older than the ones read in full', () => {
    const recentDays = Array.from({ length: INSIGHTS_MAX_WRITTEN_DAYS }, (_, i) =>
      meta(addDays(TODAY, -(i + 1))),
    );
    const olderDay = (n: number) => addDays(TODAY, -(INSIGHTS_MAX_WRITTEN_DAYS + n));

    async function seedRecent() {
      for (const day of recentDays) await seedDay(repository, day);
    }

    it('counts a one-pass evening day from its metadata alone', async () => {
      await seedRecent();
      // Only the metadata is stored for these, so reading a revision would find nothing.
      await repository.putDay(meta(olderDay(1))); // one pass, evening, 30 words: counted
      await repository.putDay(meta(olderDay(2), { wordCount: 10 })); // too short
      await repository.putDay(
        meta(olderDay(3), { firstWrittenAt: at(olderDay(3), 10) }), // written in the morning
      );
      const listRevisions = jest.spyOn(repository, 'listRevisions');
      listRevisions.mockClear();

      const input = await loadInsightsInput(repository, TODAY, OFFSET);

      expect(input.olderStreakDays).toEqual([olderDay(1)]);
      expect(input.days).toHaveLength(INSIGHTS_MAX_WRITTEN_DAYS);
      const readDays = listRevisions.mock.calls.map(([dayId]) => dayId);
      expect(readDays.filter((dayId) => dayId <= olderDay(1))).toEqual([]);
    });

    it('reads revision 1 of an older evening day that has later passes', async () => {
      await seedRecent();
      const longEnough = olderDay(1);
      const tooShort = olderDay(2);
      await seedDay(repository, meta(longEnough, { latestRevision: 3, wordCount: 5 }), [
        revision(1, at(longEnough, 21, 30), 25),
        revision(3, at(longEnough, 22), 5),
      ]);
      await seedDay(repository, meta(tooShort, { latestRevision: 2, wordCount: 90 }), [
        revision(1, at(tooShort, 21, 30), 12),
        revision(2, at(tooShort, 22), 90),
      ]);

      const input = await loadInsightsInput(repository, TODAY, OFFSET);

      expect(input.olderStreakDays).toEqual([longEnough]);
    });

    it('does not count an older day whose first pass cannot be read', async () => {
      await seedRecent();
      await repository.putDay(meta(olderDay(1), { latestRevision: 2 }));

      const input = await loadInsightsInput(repository, TODAY, OFFSET);

      expect(input.olderStreakDays).toEqual([]);
    });
  });
});
