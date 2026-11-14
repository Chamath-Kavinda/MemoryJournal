import {
  UNLOCK_HOUR,
  addDays,
  canWriteDay,
  compareDayIds,
  dayIdFromUtc,
  formatDayId,
  getDayAccess,
  isValidDayId,
  parseDayId,
  toLocalParts,
  unlockInstantUtc,
  utcOffsetMinutesForZone,
} from './time';

const MINUTE = 60_000;
const COLOMBO = 330; // UTC+05:30, no daylight saving
const NEW_YORK_EST = -300;
const NEW_YORK_EDT = -240;

/** UTC epoch ms for a UTC wall-clock time. Month is 1-based. */
const utc = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0, ms = 0): number =>
  Date.UTC(y, mo - 1, d, h, mi, s, ms);

describe('UNLOCK_HOUR', () => {
  it('is 21 (9 PM)', () => {
    expect(UNLOCK_HOUR).toBe(21);
  });
});

describe('toLocalParts', () => {
  it('applies a positive offset and rolls over midnight', () => {
    expect(toLocalParts(utc(2026, 11, 14, 18, 30), COLOMBO)).toEqual({
      year: 2026,
      month: 11,
      day: 15,
      hour: 0,
      minute: 0,
    });
  });

  it('applies a negative offset and rolls back across a year boundary', () => {
    expect(toLocalParts(utc(2026, 1, 1, 3, 0), NEW_YORK_EST)).toEqual({
      year: 2025,
      month: 12,
      day: 31,
      hour: 22,
      minute: 0,
    });
  });

  it('is the identity for offset 0', () => {
    expect(toLocalParts(utc(2026, 6, 1, 12, 34), 0)).toEqual({
      year: 2026,
      month: 6,
      day: 1,
      hour: 12,
      minute: 34,
    });
  });
});

describe('day ids', () => {
  it('formats with zero padding', () => {
    expect(formatDayId(2026, 1, 5)).toBe('2026-01-05');
    expect(formatDayId(2026, 11, 14)).toBe('2026-11-14');
  });

  it('parses valid ids, including a leap day', () => {
    expect(parseDayId('2026-11-14')).toEqual({ year: 2026, month: 11, day: 14 });
    expect(parseDayId('2028-02-29')).toEqual({ year: 2028, month: 2, day: 29 });
  });

  it.each(['2026-02-29', '2026-02-30', '2026-13-01', '2026-00-10', '2026-1-5', 'abc', ''])(
    'rejects %p',
    (value) => {
      expect(parseDayId(value)).toBeNull();
      expect(isValidDayId(value)).toBe(false);
    },
  );

  it('accepts a real date through isValidDayId', () => {
    expect(isValidDayId('2026-11-14')).toBe(true);
  });

  it('derives the local day id from a UTC instant', () => {
    // 23:59:59.999 local on Nov 14 in Colombo is 18:29:59.999 UTC.
    expect(dayIdFromUtc(utc(2026, 11, 14, 18, 29, 59, 999), COLOMBO)).toBe('2026-11-14');
    expect(dayIdFromUtc(utc(2026, 11, 14, 18, 30), COLOMBO)).toBe('2026-11-15');
  });

  describe('addDays', () => {
    it('crosses month and year boundaries', () => {
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
      expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    });

    it('handles leap years', () => {
      expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
      expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    });

    it('returns the same day for zero', () => {
      expect(addDays('2026-11-14', 0)).toBe('2026-11-14');
    });

    it('throws on an invalid id', () => {
      expect(() => addDays('2026-02-30', 1)).toThrow(RangeError);
    });
  });

  it('compares chronologically', () => {
    expect(compareDayIds('2026-11-13', '2026-11-14')).toBe(-1);
    expect(compareDayIds('2026-11-14', '2026-11-14')).toBe(0);
    expect(compareDayIds('2027-01-01', '2026-12-31')).toBe(1);
  });
});

describe('unlockInstantUtc', () => {
  it('is 21:00 local expressed in UTC', () => {
    expect(unlockInstantUtc('2026-11-14', COLOMBO)).toBe(utc(2026, 11, 14, 15, 30));
  });

  it('can fall on the next UTC day for a negative offset', () => {
    expect(unlockInstantUtc('2026-11-14', NEW_YORK_EST)).toBe(utc(2026, 11, 15, 2, 0));
  });

  it('throws on an invalid id', () => {
    expect(() => unlockInstantUtc('nope', 0)).toThrow(RangeError);
  });
});

describe('getDayAccess around 21:00 (Colombo, 2026-11-14)', () => {
  const day = '2026-11-14';
  const unlock = utc(2026, 11, 14, 15, 30); // 21:00 local

  it('is locked at 20:59', () => {
    expect(getDayAccess(day, unlock - MINUTE, COLOMBO)).toEqual({
      state: 'locked',
      unlocksAt: unlock,
      msUntilUnlock: MINUTE,
    });
  });

  it('is still locked 1 ms before 21:00', () => {
    expect(getDayAccess(day, unlock - 1, COLOMBO)).toEqual({
      state: 'locked',
      unlocksAt: unlock,
      msUntilUnlock: 1,
    });
  });

  it('opens exactly at 21:00', () => {
    expect(getDayAccess(day, unlock, COLOMBO)).toEqual({ state: 'open' });
  });

  it('stays open until the end of the day (23:59:59.999)', () => {
    expect(getDayAccess(day, utc(2026, 11, 14, 18, 29, 59, 999), COLOMBO)).toEqual({
      state: 'open',
    });
  });

  it('is locked in the morning with a full countdown', () => {
    const justAfterMidnight = utc(2026, 11, 13, 18, 30); // 00:00 local on the 14th
    expect(getDayAccess(day, justAfterMidnight, COLOMBO)).toEqual({
      state: 'locked',
      unlocksAt: unlock,
      msUntilUnlock: 21 * 60 * MINUTE,
    });
  });
});

describe('getDayAccess around midnight', () => {
  const midnight = utc(2026, 11, 14, 18, 30); // 00:00 local on 2026-11-15 in Colombo

  it('makes the previous day a normal, editable past day', () => {
    expect(getDayAccess('2026-11-14', midnight, COLOMBO)).toEqual({ state: 'open' });
  });

  it('locks the new day until 21:00', () => {
    expect(getDayAccess('2026-11-15', midnight, COLOMBO).state).toBe('locked');
  });

  it('keeps the day after that in the future', () => {
    expect(getDayAccess('2026-11-16', midnight, COLOMBO)).toEqual({ state: 'future' });
  });

  it('treats 23:59:59.999 and 00:00:00.000 as different days', () => {
    expect(getDayAccess('2026-11-15', midnight - 1, COLOMBO)).toEqual({ state: 'future' });
    expect(getDayAccess('2026-11-15', midnight, COLOMBO).state).toBe('locked');
  });
});

describe('getDayAccess rules', () => {
  const now = utc(2026, 11, 14, 5, 0);

  it('never opens a future day', () => {
    expect(getDayAccess('2026-11-20', now, COLOMBO)).toEqual({ state: 'future' });
  });

  it('keeps past days editable at any time of day', () => {
    expect(getDayAccess('2026-01-01', now, COLOMBO)).toEqual({ state: 'open' });
  });

  it('throws on an invalid day id', () => {
    expect(() => getDayAccess('2026-02-30', now, COLOMBO)).toThrow(RangeError);
  });

  it('canWriteDay is true only when the day is open', () => {
    expect(canWriteDay('2026-11-14', now, COLOMBO)).toBe(false); // locked
    expect(canWriteDay('2026-11-20', now, COLOMBO)).toBe(false); // future
    expect(canWriteDay('2026-11-13', now, COLOMBO)).toBe(true); // past
  });
});

describe('utcOffsetMinutesForZone', () => {
  it('returns fixed offsets for zones without daylight saving', () => {
    const instant = utc(2026, 11, 14, 12, 0);
    expect(utcOffsetMinutesForZone('Asia/Colombo', instant)).toBe(330);
    expect(utcOffsetMinutesForZone('UTC', instant)).toBe(0);
    expect(utcOffsetMinutesForZone('Asia/Kathmandu', instant)).toBe(345);
  });

  it('ignores sub-second precision in the instant', () => {
    expect(utcOffsetMinutesForZone('Asia/Colombo', utc(2026, 11, 14, 15, 29, 59, 999))).toBe(330);
  });

  it('follows daylight saving through the year', () => {
    expect(utcOffsetMinutesForZone('America/New_York', utc(2026, 1, 15))).toBe(NEW_YORK_EST);
    expect(utcOffsetMinutesForZone('America/New_York', utc(2026, 7, 15))).toBe(NEW_YORK_EDT);
  });
});

describe('daylight saving (America/New_York, 2026)', () => {
  describe('spring forward on 2026-03-08 at 07:00 UTC', () => {
    const before = utc(2026, 3, 8, 6, 59, 59);
    const after = utc(2026, 3, 8, 7, 0, 0);

    it('switches the zone offset exactly at the transition', () => {
      expect(utcOffsetMinutesForZone('America/New_York', before)).toBe(NEW_YORK_EST);
      expect(utcOffsetMinutesForZone('America/New_York', after)).toBe(NEW_YORK_EDT);
    });

    it('skips local hour 2', () => {
      expect(toLocalParts(before, NEW_YORK_EST).hour).toBe(1);
      expect(toLocalParts(after, NEW_YORK_EDT).hour).toBe(3);
    });

    it('moves the unlock instant one hour earlier in UTC once the offset is refreshed', () => {
      const fresh = unlockInstantUtc('2026-03-08', NEW_YORK_EDT);
      const stale = unlockInstantUtc('2026-03-08', NEW_YORK_EST);
      expect(fresh).toBe(utc(2026, 3, 9, 1, 0));
      expect(stale - fresh).toBe(60 * MINUTE);
    });

    it('opens at 21:00 EDT with the refreshed offset, not with the stale one', () => {
      const nineLocal = utc(2026, 3, 9, 1, 0); // 21:00 EDT
      expect(getDayAccess('2026-03-08', nineLocal, NEW_YORK_EDT)).toEqual({ state: 'open' });
      expect(getDayAccess('2026-03-08', nineLocal, NEW_YORK_EST).state).toBe('locked');
    });
  });

  describe('fall back on 2026-11-01 at 06:00 UTC', () => {
    const before = utc(2026, 11, 1, 5, 59, 59);
    const after = utc(2026, 11, 1, 6, 0, 0);

    it('switches the zone offset exactly at the transition', () => {
      expect(utcOffsetMinutesForZone('America/New_York', before)).toBe(NEW_YORK_EDT);
      expect(utcOffsetMinutesForZone('America/New_York', after)).toBe(NEW_YORK_EST);
    });

    it('repeats local hour 1 on the same calendar day', () => {
      const first = utc(2026, 11, 1, 5, 30); // 01:30 EDT
      const second = utc(2026, 11, 1, 6, 30); // 01:30 EST
      expect(toLocalParts(first, NEW_YORK_EDT)).toMatchObject({ day: 1, hour: 1, minute: 30 });
      expect(toLocalParts(second, NEW_YORK_EST)).toMatchObject({ day: 1, hour: 1, minute: 30 });
      expect(dayIdFromUtc(first, NEW_YORK_EDT)).toBe(dayIdFromUtc(second, NEW_YORK_EST));
    });

    it('unlocks the 25-hour day at 21:00 EST', () => {
      const unlock = unlockInstantUtc('2026-11-01', NEW_YORK_EST);
      expect(unlock).toBe(utc(2026, 11, 2, 2, 0));
      expect(getDayAccess('2026-11-01', unlock - 1, NEW_YORK_EST).state).toBe('locked');
      expect(getDayAccess('2026-11-01', unlock, NEW_YORK_EST)).toEqual({ state: 'open' });
    });
  });
});
