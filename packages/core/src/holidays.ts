import type { MonthRef } from './calendar';
import { parseDayId } from './time';
import type { DayId } from './types';

/** One public holiday, as the calendar shows it (section 17.2). */
export interface Holiday {
  dayId: DayId;
  name: string;
}

/** The first year the open Sri Lanka holiday data covers. */
export const HOLIDAYS_FIRST_YEAR = 2021;

/**
 * True when holiday data can exist for a year: from 2021 up to one year after the current year.
 * Other years are never requested.
 */
export function holidayYearAvailable(year: number, currentYear: number): boolean {
  return Number.isInteger(year) && year >= HOLIDAYS_FIRST_YEAR && year <= currentYear + 1;
}

/**
 * Reads the list of one year's holiday file. Only the date (`start`, its first ten characters)
 * and the name (`summary`) of each entry are used. An entry without a valid date or a name is
 * skipped, so a changed file never throws. Two different holidays on one day are both kept, an
 * exact repeat is dropped, and the result is in date order.
 */
export function parseHolidays(raw: unknown): Holiday[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const holidays: Holiday[] = [];
  for (const entry of raw as unknown[]) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { start, summary } = entry as { start?: unknown; summary?: unknown };
    if (typeof start !== 'string' || typeof summary !== 'string') continue;
    const dayId = start.slice(0, 10);
    const name = summary.trim();
    if (name === '' || !parseDayId(dayId)) continue;
    const key = `${dayId}|${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    holidays.push({ dayId, name });
  }
  return holidays.sort((a, b) => a.dayId.localeCompare(b.dayId) || a.name.localeCompare(b.name));
}

/** The holiday names of each day that has any, for a quick lookup while drawing a calendar. */
export function holidaysByDay(holidays: readonly Holiday[]): ReadonlyMap<DayId, readonly string[]> {
  const byDay = new Map<DayId, string[]>();
  for (const { dayId, name } of holidays) {
    const names = byDay.get(dayId);
    if (names) names.push(name);
    else byDay.set(dayId, [name]);
  }
  return byDay;
}

/** The holidays that fall in one month, in date order when the input is. */
export function holidaysInMonth(holidays: readonly Holiday[], ref: MonthRef): Holiday[] {
  const prefix = `${ref.year}-${String(ref.month).padStart(2, '0')}-`;
  return holidays.filter((holiday) => holiday.dayId.startsWith(prefix));
}
