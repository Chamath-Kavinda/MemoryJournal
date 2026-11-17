import {
  HOLIDAYS_FIRST_YEAR,
  holidayYearAvailable,
  holidaysByDay,
  holidaysInMonth,
  parseHolidays,
} from './holidays';

describe('holidayYearAvailable', () => {
  it('covers 2021 up to one year after the current year', () => {
    expect(HOLIDAYS_FIRST_YEAR).toBe(2021);
    expect(holidayYearAvailable(2021, 2026)).toBe(true);
    expect(holidayYearAvailable(2026, 2026)).toBe(true);
    expect(holidayYearAvailable(2027, 2026)).toBe(true);
  });

  it('rejects years with no data and values that are not whole years', () => {
    expect(holidayYearAvailable(2020, 2026)).toBe(false);
    expect(holidayYearAvailable(2028, 2026)).toBe(false);
    expect(holidayYearAvailable(2026.5, 2026)).toBe(false);
    expect(holidayYearAvailable(Number.NaN, 2026)).toBe(false);
  });
});

describe('parseHolidays', () => {
  it('reads the date and the name of each entry', () => {
    const holidays = parseHolidays([
      { start: '2026-05-01', end: '2026-05-02', summary: 'Labour Day' },
      { start: '2026-02-04', summary: 'National Day' },
    ]);

    expect(holidays).toEqual([
      { dayId: '2026-02-04', name: 'National Day' },
      { dayId: '2026-05-01', name: 'Labour Day' },
    ]);
  });

  it('uses the first ten characters of a date with a time', () => {
    expect(parseHolidays([{ start: '2026-05-01T00:00:00', summary: 'Labour Day' }])).toEqual([
      { dayId: '2026-05-01', name: 'Labour Day' },
    ]);
  });

  it('skips entries without a valid date or a name', () => {
    const holidays = parseHolidays([
      { start: 'soon', summary: 'Not a date' },
      { start: '2026-05-01', summary: '   ' },
      { start: '2026-05-01' },
      { summary: 'No date' },
      { start: 20260501, summary: 'Number date' },
      null,
      'text',
      42,
      { start: '2026-05-01', summary: 'Labour Day' },
    ]);

    expect(holidays).toEqual([{ dayId: '2026-05-01', name: 'Labour Day' }]);
  });

  it('keeps two holidays on one day, drops exact repeats and trims names', () => {
    const holidays = parseHolidays([
      { start: '2026-05-01', summary: 'Poya Day' },
      { start: '2026-05-01', summary: ' Labour Day ' },
      { start: '2026-05-01', summary: 'Labour Day' },
    ]);

    expect(holidays).toEqual([
      { dayId: '2026-05-01', name: 'Labour Day' },
      { dayId: '2026-05-01', name: 'Poya Day' },
    ]);
  });

  it('returns nothing for data that is not a list', () => {
    expect(parseHolidays(undefined)).toEqual([]);
    expect(parseHolidays(null)).toEqual([]);
    expect(parseHolidays({ start: '2026-05-01', summary: 'Labour Day' })).toEqual([]);
    expect(parseHolidays('2026')).toEqual([]);
  });
});

describe('holidaysByDay', () => {
  it('groups the names of each day', () => {
    const byDay = holidaysByDay([
      { dayId: '2026-05-01', name: 'Labour Day' },
      { dayId: '2026-05-01', name: 'Poya Day' },
      { dayId: '2026-05-12', name: 'Vesak' },
    ]);

    expect(byDay.get('2026-05-01')).toEqual(['Labour Day', 'Poya Day']);
    expect(byDay.get('2026-05-12')).toEqual(['Vesak']);
    expect(byDay.get('2026-05-02')).toBeUndefined();
  });
});

describe('holidaysInMonth', () => {
  const all = [
    { dayId: '2026-04-13', name: 'New Year Eve' },
    { dayId: '2026-05-01', name: 'Labour Day' },
    { dayId: '2026-05-31', name: 'Poya Day' },
    { dayId: '2027-05-01', name: 'Labour Day' },
  ];

  it('keeps only the holidays of that month and year', () => {
    expect(holidaysInMonth(all, { year: 2026, month: 5 })).toEqual([
      { dayId: '2026-05-01', name: 'Labour Day' },
      { dayId: '2026-05-31', name: 'Poya Day' },
    ]);
  });

  it('does not confuse a month with the same digits in another position', () => {
    expect(holidaysInMonth(all, { year: 2026, month: 1 })).toEqual([]);
    expect(holidaysInMonth(all, { year: 2026, month: 4 })).toHaveLength(1);
  });
});
