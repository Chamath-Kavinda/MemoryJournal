import {
  addMonths,
  buildMonthGrid,
  compareMonths,
  daysInMonth,
  monthDayRange,
  monthOfDayId,
  writtenDayIds,
  type CalendarCell,
} from './calendar';

const NOV_2026 = { year: 2026, month: 11 };

function cells(weeks: (CalendarCell | null)[][]): CalendarCell[] {
  return weeks.flat().filter((cell): cell is CalendarCell => cell !== null);
}

describe('daysInMonth', () => {
  it('knows month lengths and leap years', () => {
    expect(daysInMonth(NOV_2026)).toBe(30);
    expect(daysInMonth({ year: 2026, month: 12 })).toBe(31);
    expect(daysInMonth({ year: 2026, month: 2 })).toBe(28);
    expect(daysInMonth({ year: 2028, month: 2 })).toBe(29);
  });

  it('rejects invalid months', () => {
    expect(() => daysInMonth({ year: 2026, month: 0 })).toThrow(RangeError);
    expect(() => daysInMonth({ year: 2026, month: 13 })).toThrow(RangeError);
    expect(() => daysInMonth({ year: 2026, month: 1.5 })).toThrow(RangeError);
    expect(() => daysInMonth({ year: 2026.5, month: 1 })).toThrow(RangeError);
  });
});

describe('monthOfDayId', () => {
  it('returns the month of a day id', () => {
    expect(monthOfDayId('2026-11-14')).toEqual(NOV_2026);
  });

  it('throws on an invalid day id', () => {
    expect(() => monthOfDayId('2026-02-30')).toThrow(RangeError);
  });
});

describe('addMonths', () => {
  it('moves within a year', () => {
    expect(addMonths(NOV_2026, -1)).toEqual({ year: 2026, month: 10 });
    expect(addMonths(NOV_2026, 0)).toEqual(NOV_2026);
  });

  it('rolls the year over in both directions', () => {
    expect(addMonths(NOV_2026, 2)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2027, month: 1 }, -1)).toEqual({ year: 2026, month: 12 });
    expect(addMonths(NOV_2026, -23)).toEqual({ year: 2024, month: 12 });
  });

  it('rejects an invalid month', () => {
    expect(() => addMonths({ year: 2026, month: 0 }, 1)).toThrow(RangeError);
  });
});

describe('compareMonths', () => {
  it('orders months chronologically', () => {
    expect(compareMonths({ year: 2026, month: 10 }, NOV_2026)).toBeLessThan(0);
    expect(compareMonths({ year: 2027, month: 1 }, NOV_2026)).toBeGreaterThan(0);
    expect(compareMonths(NOV_2026, { year: 2026, month: 11 })).toBe(0);
  });
});

describe('monthDayRange', () => {
  it('gives the first and last day ids', () => {
    expect(monthDayRange(NOV_2026)).toEqual({ first: '2026-11-01', last: '2026-11-30' });
    expect(monthDayRange({ year: 2028, month: 2 })).toEqual({
      first: '2028-02-01',
      last: '2028-02-29',
    });
  });
});

describe('writtenDayIds', () => {
  it('keeps only days with at least one word', () => {
    const written = writtenDayIds([
      { date: '2026-11-01', wordCount: 120 },
      { date: '2026-11-02', wordCount: 0 },
      { date: '2026-11-03', wordCount: 1 },
    ]);
    expect([...written].sort()).toEqual(['2026-11-01', '2026-11-03']);
  });
});

describe('buildMonthGrid', () => {
  // 2026-11-14 is a Saturday; 1 November 2026 is a Sunday.
  const base = { month: NOV_2026, todayId: '2026-11-14', writtenDays: new Set<string>() };

  it('pads the first week so Monday-start rows line up', () => {
    const weeks = buildMonthGrid(base);
    expect(weeks).toHaveLength(6);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0]?.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(weeks[0]?.[6]?.dayId).toBe('2026-11-01');
    expect(weeks[5]?.[0]?.dayId).toBe('2026-11-30');
    expect(weeks[5]?.slice(1)).toEqual([null, null, null, null, null, null]);
  });

  it('supports weeks that start on Sunday', () => {
    const weeks = buildMonthGrid({ ...base, weekStartsOn: 0 });
    expect(weeks).toHaveLength(5);
    expect(weeks[0]?.[0]?.dayId).toBe('2026-11-01');
    expect(weeks[4]?.[1]?.dayId).toBe('2026-11-30');
    expect(weeks[4]?.[2]).toBeNull();
  });

  it('adds no padding when the month fills whole weeks', () => {
    // February 2027 starts on a Monday and has 28 days.
    const weeks = buildMonthGrid({
      month: { year: 2027, month: 2 },
      todayId: '2027-02-10',
      writtenDays: new Set(),
    });
    expect(weeks).toHaveLength(4);
    expect(cells(weeks)).toHaveLength(28);
  });

  it('labels each day as written, empty, today or future', () => {
    const writtenDays = new Set(['2026-11-03', '2026-11-14', '2026-11-20']);
    const all = cells(buildMonthGrid({ ...base, writtenDays }));
    const byId = (id: string) => all.find((cell) => cell.dayId === id);

    expect(byId('2026-11-03')).toMatchObject({
      state: 'written',
      hasWriting: true,
      isToday: false,
      disabled: false,
    });
    expect(byId('2026-11-04')).toMatchObject({
      state: 'empty',
      hasWriting: false,
      isToday: false,
      disabled: false,
    });
    expect(byId('2026-11-14')).toMatchObject({
      state: 'today',
      hasWriting: true,
      isToday: true,
      disabled: false,
    });
    expect(byId('2026-11-15')).toMatchObject({ state: 'future', isToday: false, disabled: true });
    // Writing on a future day cannot exist, so it never shows a dot.
    expect(byId('2026-11-20')).toMatchObject({ state: 'future', hasWriting: false });
  });

  it('shows today without a dot when nothing is written yet', () => {
    const today = cells(buildMonthGrid(base)).find((cell) => cell.isToday);
    expect(today).toMatchObject({ state: 'today', hasWriting: false });
  });

  it('treats every day of a past month as past', () => {
    const all = cells(buildMonthGrid({ ...base, month: { year: 2026, month: 10 } }));
    expect(all.every((cell) => cell.state === 'empty' && !cell.disabled)).toBe(true);
  });

  it('treats every day of a later month as future', () => {
    const all = cells(buildMonthGrid({ ...base, month: { year: 2026, month: 12 } }));
    expect(all.every((cell) => cell.state === 'future' && cell.disabled)).toBe(true);
  });

  it('rejects an invalid today id and an invalid month', () => {
    expect(() => buildMonthGrid({ ...base, todayId: '2026-13-01' })).toThrow(RangeError);
    expect(() => buildMonthGrid({ ...base, month: { year: 2026, month: 0 } })).toThrow(RangeError);
  });
});
