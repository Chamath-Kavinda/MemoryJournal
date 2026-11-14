import { compareDayIds, formatDayId, parseDayId } from './time';
import type { DayId, DayMeta } from './types';

/** A calendar month. `month` runs from 1 to 12. */
export interface MonthRef {
  year: number;
  month: number;
}

/**
 * `written`: a past day that has text. `empty`: a past day without text.
 * `today`: the current local day. `future`: a day that cannot be opened yet.
 */
export type CalendarDayState = 'written' | 'empty' | 'today' | 'future';

export interface CalendarCell {
  dayId: DayId;
  /** Day of the month, 1 to 31. */
  day: number;
  state: CalendarDayState;
  /** True for the dot: the day has any writing (also true for today). */
  hasWriting: boolean;
  /** True for the ring. */
  isToday: boolean;
  /** Future days cannot be opened. */
  disabled: boolean;
}

/** 0 = Sunday, 1 = Monday. */
export type WeekStart = 0 | 1;

function assertMonth({ year, month }: MonthRef): void {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`Invalid month: ${year}-${month}`);
  }
}

export function daysInMonth(ref: MonthRef): number {
  assertMonth(ref);
  return new Date(Date.UTC(ref.year, ref.month, 0)).getUTCDate();
}

/** The month a day id falls in. Throws on an invalid id. */
export function monthOfDayId(dayId: DayId): MonthRef {
  const parts = parseDayId(dayId);
  if (!parts) throw new RangeError(`Invalid day id: ${dayId}`);
  return { year: parts.year, month: parts.month };
}

/** Moves a month forward or backward by whole months, rolling the year over. */
export function addMonths(ref: MonthRef, delta: number): MonthRef {
  assertMonth(ref);
  const index = ref.year * 12 + (ref.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (((index % 12) + 12) % 12) + 1 };
}

/** Chronological order of two months, like `compareDayIds`. */
export function compareMonths(a: MonthRef, b: MonthRef): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

/** First and last day ids of a month, used to query only the visible month. */
export function monthDayRange(ref: MonthRef): { first: DayId; last: DayId } {
  return {
    first: formatDayId(ref.year, ref.month, 1),
    last: formatDayId(ref.year, ref.month, daysInMonth(ref)),
  };
}

/** The day ids that count as written: any day whose metadata shows at least one word. */
export function writtenDayIds(
  metas: ReadonlyArray<Pick<DayMeta, 'date' | 'wordCount'>>,
): Set<DayId> {
  return new Set(metas.filter((meta) => meta.wordCount > 0).map((meta) => meta.date));
}

function cellFor(
  ref: MonthRef,
  day: number,
  todayId: DayId,
  writtenDays: ReadonlySet<DayId>,
): CalendarCell {
  const dayId = formatDayId(ref.year, ref.month, day);
  const order = compareDayIds(dayId, todayId);
  const isFuture = order > 0;
  const isToday = order === 0;
  const hasWriting = !isFuture && writtenDays.has(dayId);
  const state: CalendarDayState = isFuture
    ? 'future'
    : isToday
      ? 'today'
      : hasWriting
        ? 'written'
        : 'empty';
  return { dayId, day, state, hasWriting, isToday, disabled: isFuture };
}

/**
 * The month as rows of seven cells. Slots before the 1st and after the last day are
 * null so every row is complete. Defaults to weeks starting on Monday.
 */
export function buildMonthGrid(input: {
  month: MonthRef;
  todayId: DayId;
  writtenDays: ReadonlySet<DayId>;
  weekStartsOn?: WeekStart;
}): (CalendarCell | null)[][] {
  const { month, todayId, writtenDays, weekStartsOn = 1 } = input;
  if (!parseDayId(todayId)) throw new RangeError(`Invalid day id: ${todayId}`);

  const total = daysInMonth(month);
  const firstWeekday = new Date(Date.UTC(month.year, month.month - 1, 1)).getUTCDay();
  const leading = (firstWeekday - weekStartsOn + 7) % 7;

  const slots: (CalendarCell | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= total; day += 1) {
    slots.push(cellFor(month, day, todayId, writtenDays));
  }
  while (slots.length % 7 !== 0) slots.push(null);

  const weeks: (CalendarCell | null)[][] = [];
  for (let start = 0; start < slots.length; start += 7) {
    weeks.push(slots.slice(start, start + 7));
  }
  return weeks;
}
