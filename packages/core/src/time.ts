import type { DayId, EpochMs } from './types';

/** Today becomes writable at this local hour (21:00). Not configurable. */
export const UNLOCK_HOUR = 21;

const MS_PER_MINUTE = 60_000;
const DAY_ID_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface LocalDateParts {
  year: number;
  /** 1 to 12. */
  month: number;
  /** 1 to 31. */
  day: number;
  /** 0 to 23. */
  hour: number;
  /** 0 to 59. */
  minute: number;
}

/**
 * Converts a UTC instant to local calendar parts using a fixed offset.
 * This is the same arithmetic the Firestore rules use (request.time plus
 * utcOffsetMinutes), so client and server always agree.
 */
export function toLocalParts(utcMs: EpochMs, utcOffsetMinutes: number): LocalDateParts {
  const shifted = new Date(utcMs + utcOffsetMinutes * MS_PER_MINUTE);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

const pad = (value: number, length: number): string => String(value).padStart(length, '0');

export function formatDayId(year: number, month: number, day: number): DayId {
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

/** Returns the date parts of a day id, or null if it is not a real calendar date. */
export function parseDayId(dayId: string): { year: number; month: number; day: number } | null {
  const match = DAY_ID_PATTERN.exec(dayId);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day;
  return isRealDate ? { year, month, day } : null;
}

export function isValidDayId(dayId: string): boolean {
  return parseDayId(dayId) !== null;
}

/** The local calendar date (`yyyy-MM-dd`) of a UTC instant. */
export function dayIdFromUtc(utcMs: EpochMs, utcOffsetMinutes: number): DayId {
  const { year, month, day } = toLocalParts(utcMs, utcOffsetMinutes);
  return formatDayId(year, month, day);
}

/** Adds (or subtracts) whole calendar days to a day id. Throws on an invalid id. */
export function addDays(dayId: DayId, days: number): DayId {
  const parts = parseDayId(dayId);
  if (!parts) throw new RangeError(`Invalid day id: ${dayId}`);
  const moved = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return formatDayId(moved.getUTCFullYear(), moved.getUTCMonth() + 1, moved.getUTCDate());
}

/** Day ids are zero-padded ISO dates, so string order is chronological order. */
export function compareDayIds(a: DayId, b: DayId): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The UTC instant at which the given local day unlocks (21:00 local). */
export function unlockInstantUtc(dayId: DayId, utcOffsetMinutes: number): EpochMs {
  const parts = parseDayId(dayId);
  if (!parts) throw new RangeError(`Invalid day id: ${dayId}`);
  const localUnlock = Date.UTC(parts.year, parts.month - 1, parts.day, UNLOCK_HOUR, 0, 0, 0);
  return localUnlock - utcOffsetMinutes * MS_PER_MINUTE;
}

export type DayAccess =
  | { state: 'future' }
  | { state: 'locked'; unlocksAt: EpochMs; msUntilUnlock: number }
  | { state: 'open' };

/**
 * Lock rules for the Day screen (section 5.3):
 * - a future day cannot be opened,
 * - today is read-only until 21:00 local,
 * - today at or after 21:00 and every past day are writable.
 *
 * `nowUtcMs` must come from server time (or a server-corrected clock), never
 * from the device clock alone.
 */
export function getDayAccess(dayId: DayId, nowUtcMs: EpochMs, utcOffsetMinutes: number): DayAccess {
  if (!isValidDayId(dayId)) throw new RangeError(`Invalid day id: ${dayId}`);
  const today = dayIdFromUtc(nowUtcMs, utcOffsetMinutes);
  const order = compareDayIds(dayId, today);

  if (order > 0) return { state: 'future' };
  if (order < 0) return { state: 'open' };

  const unlocksAt = unlockInstantUtc(dayId, utcOffsetMinutes);
  if (nowUtcMs < unlocksAt) {
    return { state: 'locked', unlocksAt, msUntilUnlock: unlocksAt - nowUtcMs };
  }
  return { state: 'open' };
}

export function canWriteDay(dayId: DayId, nowUtcMs: EpochMs, utcOffsetMinutes: number): boolean {
  return getDayAccess(dayId, nowUtcMs, utcOffsetMinutes).state === 'open';
}

/**
 * The UTC offset in minutes of an IANA time zone at a given instant, for
 * example 330 for `Asia/Colombo`. Used to refresh `utcOffsetMinutes` when the
 * device time zone or daylight saving changes.
 */
export function utcOffsetMinutesForZone(timeZone: string, utcMs: EpochMs): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  });
  const values: Record<string, string> = {};
  for (const part of formatter.formatToParts(new Date(utcMs))) {
    values[part.type] = part.value;
  }
  // Every requested field is always present in the formatted parts.
  const asIfUtc = Date.UTC(
    Number(values['year']),
    Number(values['month']) - 1,
    Number(values['day']),
    Number(values['hour']),
    Number(values['minute']),
    Number(values['second']),
  );

  // Drop sub-second precision from the input so the difference is whole minutes.
  const wholeSeconds = Math.floor(utcMs / 1000) * 1000;
  return Math.round((asIfUtc - wholeSeconds) / MS_PER_MINUTE);
}

/** Whole calendar days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: DayId, to: DayId): number {
  const a = parseDayId(from);
  const b = parseDayId(to);
  if (!a) throw new RangeError(`Invalid day id: ${from}`);
  if (!b) throw new RangeError(`Invalid day id: ${to}`);
  const MS_PER_DAY = 86_400_000;
  return Math.round(
    (Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / MS_PER_DAY,
  );
}
