jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));

import {
  HOLIDAY_CACHE_MAX_AGE_MS,
  createHolidayLoader,
  holidayCacheKey,
  holidayUrl,
} from './holidayService';

const NOW = new Date('2026-11-17T10:00:00Z').getTime();

const FILE_2026 = [
  { start: '2026-05-01', end: '2026-05-02', summary: 'Labour Day' },
  { start: '2026-02-04', end: '2026-02-05', summary: 'National Day' },
];
const PARSED_2026 = [
  { dayId: '2026-02-04', name: 'National Day' },
  { dayId: '2026-05-01', name: 'Labour Day' },
];

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: jest.fn((key: string) => Promise.resolve(data.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      data.set(key, value);
      return Promise.resolve();
    }),
  };
}

function okResponse(body: unknown): Response {
  return { ok: true, json: () => Promise.resolve(body) } as unknown as Response;
}

function savedCopy(fetchedAt: number): string {
  return JSON.stringify({ fetchedAt, holidays: [{ dayId: '2026-05-01', name: 'Saved Day' }] });
}

describe('holiday loader', () => {
  it('downloads the file of the year, keeps only date and name, and saves a copy', async () => {
    const storage = fakeStorage();
    const fetchFn = jest.fn().mockResolvedValue(okResponse(FILE_2026));
    const loader = createHolidayLoader({ fetchFn, storage, now: () => NOW });

    const holidays = await loader.load(2026);

    expect(holidays).toEqual(PARSED_2026);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0]?.[0]).toBe(
      'https://raw.githubusercontent.com/Dilshan-H/srilanka-holidays/main/json/2026.json',
    );
    expect(holidayUrl(2026)).toBe(fetchFn.mock.calls[0]?.[0]);
    const saved = JSON.parse(storage.data.get(holidayCacheKey(2026)) ?? '{}') as {
      fetchedAt: number;
      holidays: unknown;
    };
    expect(saved.fetchedAt).toBe(NOW);
    expect(saved.holidays).toEqual(PARSED_2026);
  });

  it('sends nothing but the year: no body, no headers, no account', async () => {
    const fetchFn = jest.fn().mockResolvedValue(okResponse(FILE_2026));
    const loader = createHolidayLoader({ fetchFn, storage: fakeStorage(), now: () => NOW });

    await loader.load(2026);

    const init = fetchFn.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(Object.keys(init)).toEqual(['signal']);
  });

  it('uses a saved copy younger than a week without downloading', async () => {
    const storage = fakeStorage({ [holidayCacheKey(2026)]: savedCopy(NOW - 60_000) });
    const fetchFn = jest.fn();
    const loader = createHolidayLoader({ fetchFn, storage, now: () => NOW });

    expect(await loader.load(2026)).toEqual([{ dayId: '2026-05-01', name: 'Saved Day' }]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('downloads again when the saved copy is a week old, and replaces it', async () => {
    const storage = fakeStorage({
      [holidayCacheKey(2026)]: savedCopy(NOW - HOLIDAY_CACHE_MAX_AGE_MS - 1),
    });
    const fetchFn = jest.fn().mockResolvedValue(okResponse(FILE_2026));
    const loader = createHolidayLoader({ fetchFn, storage, now: () => NOW });

    expect(await loader.load(2026)).toEqual(PARSED_2026);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it('does not trust a copy saved in the future', async () => {
    const storage = fakeStorage({ [holidayCacheKey(2026)]: savedCopy(NOW + 86_400_000) });
    const fetchFn = jest.fn().mockResolvedValue(okResponse(FILE_2026));
    const loader = createHolidayLoader({ fetchFn, storage, now: () => NOW });

    expect(await loader.load(2026)).toEqual(PARSED_2026);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('falls back to an old copy when the download fails', async () => {
    const storage = fakeStorage({
      [holidayCacheKey(2026)]: savedCopy(NOW - HOLIDAY_CACHE_MAX_AGE_MS * 3),
    });
    const fetchFn = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    const loader = createHolidayLoader({ fetchFn, storage, now: () => NOW });

    expect(await loader.load(2026)).toEqual([{ dayId: '2026-05-01', name: 'Saved Day' }]);
  });

  it('gives an empty list, without throwing, when offline and nothing is saved', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    const loader = createHolidayLoader({ fetchFn, storage: fakeStorage(), now: () => NOW });

    await expect(loader.load(2026)).resolves.toEqual([]);
  });

  it('gives an empty list for an error status and for data that is not usable', async () => {
    const storage = fakeStorage();
    const missing = jest.fn().mockResolvedValue({ ok: false, status: 404 } as Response);
    const broken = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    } as unknown as Response);

    expect(
      await createHolidayLoader({ fetchFn: missing, storage, now: () => NOW }).load(2026),
    ).toEqual([]);
    expect(
      await createHolidayLoader({ fetchFn: broken, storage, now: () => NOW }).load(2026),
    ).toEqual([]);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('ignores a damaged saved copy', async () => {
    const storage = fakeStorage({ [holidayCacheKey(2026)]: '{not json' });
    const fetchFn = jest.fn().mockResolvedValue(okResponse(FILE_2026));
    const loader = createHolidayLoader({ fetchFn, storage, now: () => NOW });

    expect(await loader.load(2026)).toEqual(PARSED_2026);
  });

  it('still returns the holidays when the copy cannot be saved', async () => {
    const storage = fakeStorage();
    storage.setItem.mockRejectedValue(new Error('storage full'));
    const fetchFn = jest.fn().mockResolvedValue(okResponse(FILE_2026));
    const loader = createHolidayLoader({ fetchFn, storage, now: () => NOW });

    expect(await loader.load(2026)).toEqual(PARSED_2026);
  });

  it('does not request years that have no data', async () => {
    const fetchFn = jest.fn();
    const loader = createHolidayLoader({ fetchFn, storage: fakeStorage(), now: () => NOW });

    expect(await loader.load(2019)).toEqual([]);
    expect(await loader.load(2040)).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('remembers a good year for the session and retries an empty one', async () => {
    const fetchFn = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValue(okResponse(FILE_2026));
    const loader = createHolidayLoader({ fetchFn, storage: fakeStorage(), now: () => NOW });

    expect(await loader.load(2026)).toEqual([]);
    expect(await loader.load(2026)).toEqual(PARSED_2026);
    expect(await loader.load(2026)).toEqual(PARSED_2026);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
