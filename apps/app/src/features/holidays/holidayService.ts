import AsyncStorage from '@react-native-async-storage/async-storage';
import { holidayYearAvailable, parseHolidays, type Holiday } from '@memory-journal/core';

/**
 * The static data files of the open Sri Lanka holidays project (MIT license, no API key). Its
 * live API needs a private key, which cannot be kept secret inside an app (decision D-040).
 */
export const HOLIDAY_SOURCE =
  'https://raw.githubusercontent.com/Dilshan-H/srilanka-holidays/main/json';

/** Only Sri Lanka is supported, because the app has no country setting (section 17.2). */
const COUNTRY = 'LK';

/** A downloaded year is used for this long before the file is downloaded again. */
export const HOLIDAY_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** A download that takes longer than this is given up, so a bad network never stalls the app. */
export const HOLIDAY_FETCH_TIMEOUT_MS = 8000;

export function holidayUrl(year: number): string {
  return `${HOLIDAY_SOURCE}/${year}.json`;
}

export function holidayCacheKey(year: number): string {
  return `mj.holidays.${COUNTRY}.${year}`;
}

interface HolidayStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface HolidayLoaderDeps {
  fetchFn?: typeof fetch;
  storage?: HolidayStorage;
  now?: () => number;
}

interface CachedYear {
  fetchedAt: number;
  holidays: Holiday[];
}

function isHoliday(value: unknown): value is Holiday {
  if (typeof value !== 'object' || value === null) return false;
  const { dayId, name } = value as { dayId?: unknown; name?: unknown };
  return typeof dayId === 'string' && typeof name === 'string';
}

async function readCache(storage: HolidayStorage, year: number): Promise<CachedYear | null> {
  try {
    const text = await storage.getItem(holidayCacheKey(year));
    if (!text) return null;
    const value = JSON.parse(text) as { fetchedAt?: unknown; holidays?: unknown };
    if (typeof value.fetchedAt !== 'number' || !Array.isArray(value.holidays)) return null;
    return { fetchedAt: value.fetchedAt, holidays: value.holidays.filter(isHoliday) };
  } catch {
    return null;
  }
}

async function writeCache(storage: HolidayStorage, year: number, value: CachedYear): Promise<void> {
  try {
    await storage.setItem(holidayCacheKey(year), JSON.stringify(value));
  } catch {
    // Not being able to keep a copy only means the file is downloaded again next time.
  }
}

/** Downloads one year. Returns null when the network, the status or the data is not usable. */
async function download(fetchFn: typeof fetch, year: number): Promise<Holiday[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HOLIDAY_FETCH_TIMEOUT_MS);
  try {
    const response = await fetchFn(holidayUrl(year), { signal: controller.signal });
    if (!response.ok) return null;
    return parseHolidays(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Loads the public holidays of a year, at most one download a week per year (section 17.2).
 * `load` never rejects: with no network and no saved copy it gives an empty list, so the
 * calendar simply shows no holidays. The request carries only the year in its address.
 */
export function createHolidayLoader(deps: HolidayLoaderDeps = {}) {
  const fetchFn: typeof fetch = deps.fetchFn ?? ((input, init) => fetch(input, init));
  const storage: HolidayStorage = deps.storage ?? AsyncStorage;
  const now = deps.now ?? Date.now;
  const loaded = new Map<number, Promise<Holiday[]>>();

  async function loadYear(year: number): Promise<Holiday[]> {
    if (!holidayYearAvailable(year, new Date(now()).getFullYear())) return [];

    const cached = await readCache(storage, year);
    const age = cached ? now() - cached.fetchedAt : Infinity;
    // A copy saved "in the future" (the clock moved back) is not trusted, so it is downloaded again.
    if (cached && age >= 0 && age < HOLIDAY_CACHE_MAX_AGE_MS) return cached.holidays;

    const fresh = await download(fetchFn, year);
    if (fresh && fresh.length > 0) {
      await writeCache(storage, year, { fetchedAt: now(), holidays: fresh });
      return fresh;
    }
    // The download failed or the file has no usable entry: an older copy is better than nothing.
    return cached?.holidays ?? [];
  }

  return {
    /** Holidays of one year. A good result is remembered for the session; an empty one is retried. */
    load(year: number): Promise<Holiday[]> {
      const known = loaded.get(year);
      if (known) return known;
      const pending = loadYear(year).then((holidays) => {
        if (holidays.length === 0) loaded.delete(year);
        return holidays;
      });
      loaded.set(year, pending);
      return pending;
    },
  };
}

/** The loader the app uses. */
export const holidayLoader = createHolidayLoader();
