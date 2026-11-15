const mockGetDocs = jest.fn();
const mockGetDoc = jest.fn();

jest.mock('@/lib/firebase', () => ({ getFirebase: () => ({ db: {} }) }));
jest.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  where: (field: string, op: string, value: string) => ({ where: field, op, value }),
  orderBy: (field: string, direction?: string) => ({ orderBy: field, direction }),
  query: (ref: { path: string }, ...constraints: unknown[]) => ({ ...ref, constraints }),
  getDocs: (target: unknown) => mockGetDocs(target),
  getDoc: (target: unknown) => mockGetDoc(target),
}));

import { INSIGHTS_MAX_WRITTEN_DAYS, addDays } from '@memory-journal/core';

import { loadInsightsInput } from './insightsService';

const OFFSET = 330;
const TODAY = '2026-11-14';

type Target = { path: string; constraints?: unknown[] };

/** The instant at `hour:minute` local time (UTC+05:30) on a day. */
function at(dayId: string, hour: number, minute = 0): number {
  const [year, month, day] = dayId.split('-').map(Number) as [number, number, number];
  return Date.UTC(year, month - 1, day, hour, minute) - OFFSET * 60_000;
}

const snapshot = (...rows: unknown[]) => ({ docs: rows.map((row) => ({ data: () => row })) });

const meta = (date: string, overrides: Record<string, unknown> = {}) => ({
  date,
  latestRevision: 1,
  wordCount: 30,
  firstWrittenAt: at(date, 21, 30),
  ...overrides,
});

const revision = (n: number, createdAt: number, wordCount = 30) => ({
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

/** Serves each collection from a map of path to rows, and no rows for any other path. */
function serve(collections: Record<string, unknown[]>) {
  mockGetDocs.mockImplementation((target: Target) =>
    Promise.resolve(snapshot(...(collections[target.path] ?? []))),
  );
}

const queried = (path: string) =>
  mockGetDocs.mock.calls.map(([target]) => target as Target).find((target) => target.path === path);

describe('loadInsightsInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDoc.mockResolvedValue({ data: () => undefined });
  });

  it('asks for the days up to today, newest first, under the user', async () => {
    serve({});

    await loadInsightsInput('u1', TODAY, OFFSET);

    expect(queried('users/u1/days')?.constraints).toEqual([
      { where: 'date', op: '<=', value: TODAY },
      { orderBy: 'date', direction: 'desc' },
    ]);
  });

  it('reads every pass of the recent days, oldest pass first', async () => {
    const yesterday = addDays(TODAY, -1);
    serve({
      'users/u1/days': [meta(TODAY), meta(yesterday)],
      [`users/u1/days/${TODAY}/revisions`]: [revision(1, at(TODAY, 21, 30))],
      [`users/u1/days/${yesterday}/revisions`]: [
        revision(1, at(yesterday, 21, 30)),
        revision(2, at(TODAY, 8), 40),
      ],
    });

    const input = await loadInsightsInput('u1', TODAY, OFFSET);

    expect(input.today).toBe(TODAY);
    expect(input.utcOffsetMinutes).toBe(OFFSET);
    expect(input.olderStreakDays).toEqual([]);
    expect(input.days.map((day) => [day.dayId, day.revisions.map((r) => r.n)])).toEqual([
      [TODAY, [1]],
      [yesterday, [1, 2]],
    ]);
    expect(queried(`users/u1/days/${TODAY}/revisions`)?.constraints).toEqual([
      { orderBy: 'n', direction: undefined },
    ]);
  });

  it('leaves out documents that do not have the expected shape', async () => {
    serve({
      'users/u1/days': [meta(TODAY), { date: '2026-11-13' }, meta('2026-11-12')],
      [`users/u1/days/${TODAY}/revisions`]: [revision(1, at(TODAY, 21, 30)), { n: 'two' }],
    });

    const input = await loadInsightsInput('u1', TODAY, OFFSET);

    expect(input.days.map((day) => day.dayId)).toEqual([TODAY, '2026-11-12']);
    expect(input.days[0]?.revisions).toHaveLength(1);
  });

  it('summarises the library by its count and its latest save', async () => {
    serve({ 'users/u1/library': [{ updatedAt: 5 }, { updatedAt: 9 }, { title: 'no time' }] });

    const { library } = await loadInsightsInput('u1', TODAY, OFFSET);

    expect(library).toEqual({ itemCount: 2, lastSavedAt: 9 });
  });

  it('has an empty library summary when there are no items', async () => {
    serve({});

    const { library } = await loadInsightsInput('u1', TODAY, OFFSET);

    expect(library).toEqual({ itemCount: 0, lastSavedAt: null });
  });

  describe('days older than the ones read in full', () => {
    const recentDays = Array.from({ length: INSIGHTS_MAX_WRITTEN_DAYS }, (_, i) =>
      meta(addDays(TODAY, -(i + 1))),
    );
    const olderDay = (n: number) => addDays(TODAY, -(INSIGHTS_MAX_WRITTEN_DAYS + n));

    it('reads only the metadata of a one-pass evening day, and nothing for the rest', async () => {
      serve({
        'users/u1/days': [
          ...recentDays,
          meta(olderDay(1)), // one pass, evening, 30 words: counted
          meta(olderDay(2), { wordCount: 10 }), // one pass, evening, too short
          meta(olderDay(3), { firstWrittenAt: at(olderDay(3), 10) }), // written in the morning
        ],
      });

      const input = await loadInsightsInput('u1', TODAY, OFFSET);

      expect(input.olderStreakDays).toEqual([olderDay(1)]);
      expect(input.days).toHaveLength(INSIGHTS_MAX_WRITTEN_DAYS);
      expect(mockGetDoc).not.toHaveBeenCalled();
    });

    it('reads revision 1 of an older evening day that has later passes', async () => {
      const longEnough = olderDay(1);
      const tooShort = olderDay(2);
      const firstPasses: Record<string, unknown> = {
        [`users/u1/days/${longEnough}/revisions/1`]: revision(1, at(longEnough, 21, 30), 25),
        [`users/u1/days/${tooShort}/revisions/1`]: revision(1, at(tooShort, 21, 30), 12),
      };
      serve({
        'users/u1/days': [
          ...recentDays,
          meta(longEnough, { latestRevision: 3, wordCount: 5 }),
          meta(tooShort, { latestRevision: 2, wordCount: 90 }),
        ],
      });
      mockGetDoc.mockImplementation((target: Target) =>
        Promise.resolve({ data: () => firstPasses[target.path] }),
      );

      const input = await loadInsightsInput('u1', TODAY, OFFSET);

      expect(input.olderStreakDays).toEqual([longEnough]);
      expect(mockGetDoc).toHaveBeenCalledTimes(2);
    });

    it('does not count an older day whose first pass cannot be read', async () => {
      serve({
        'users/u1/days': [...recentDays, meta(olderDay(1), { latestRevision: 2 })],
      });

      const input = await loadInsightsInput('u1', TODAY, OFFSET);

      expect(input.olderStreakDays).toEqual([]);
    });
  });
});
