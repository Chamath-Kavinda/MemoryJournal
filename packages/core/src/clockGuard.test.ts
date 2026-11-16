import {
  CLOCK_TOLERANCE_MS,
  clockLooksWrong,
  getGuestDayAccess,
  nextLastSeenAt,
} from './clockGuard';
import { getDayAccess } from './time';

// Colombo is UTC+5:30, so 21:00 local on 2026-11-16 is 15:30 UTC.
const OFFSET = 330;
const utc = (day: number, hour: number, minute = 0) => Date.UTC(2026, 10, day, hour, minute);
const MINUTE = 60_000;

describe('clockLooksWrong', () => {
  it('is never wrong before a time has been remembered', () => {
    expect(clockLooksWrong(utc(16, 10), null)).toBe(false);
  });

  it('allows the device clock to be up to five minutes behind', () => {
    const seen = utc(16, 10);
    expect(clockLooksWrong(seen - CLOCK_TOLERANCE_MS, seen)).toBe(false);
    expect(clockLooksWrong(seen - CLOCK_TOLERANCE_MS - 1, seen)).toBe(true);
  });

  it('is fine when the clock is ahead or equal', () => {
    const seen = utc(16, 10);
    expect(clockLooksWrong(seen, seen)).toBe(false);
    expect(clockLooksWrong(seen + 3 * 60 * MINUTE, seen)).toBe(false);
  });
});

describe('nextLastSeenAt', () => {
  it('starts from the first time seen', () => {
    expect(nextLastSeenAt(utc(16, 10), null)).toBe(utc(16, 10));
  });

  it('moves forward with the clock and never back', () => {
    expect(nextLastSeenAt(utc(16, 11), utc(16, 10))).toBe(utc(16, 11));
    expect(nextLastSeenAt(utc(16, 9), utc(16, 10))).toBe(utc(16, 10));
  });
});

describe('getGuestDayAccess', () => {
  it('matches the usual rules when nothing has been seen yet', () => {
    for (const dayId of ['2026-11-15', '2026-11-16', '2026-11-17']) {
      expect(getGuestDayAccess(dayId, utc(16, 10), OFFSET, null)).toEqual(
        getDayAccess(dayId, utc(16, 10), OFFSET),
      );
    }
  });

  it('matches the usual rules when the clock only runs ahead', () => {
    const seen = utc(16, 10);
    const now = utc(16, 16);
    expect(getGuestDayAccess('2026-11-16', now, OFFSET, seen)).toEqual({ state: 'open' });
  });

  it('keeps today locked when the clock is moved back after 21:00', () => {
    // Seen at 22:00 local, clock now says 21:30 local: the device alone would call today open.
    const seen = utc(16, 16, 30);
    const now = utc(16, 16);
    expect(getDayAccess('2026-11-16', now, OFFSET)).toEqual({ state: 'open' });
    expect(getGuestDayAccess('2026-11-16', now, OFFSET, seen)).toEqual({ state: 'clockWrong' });
  });

  it('keeps today locked for a clock moved back a whole day', () => {
    const seen = utc(16, 12);
    const now = utc(15, 12);
    expect(getGuestDayAccess('2026-11-16', now, OFFSET, seen)).toEqual({ state: 'clockWrong' });
  });

  it('keeps earlier days writable and later days closed while the clock is wrong', () => {
    const seen = utc(16, 12);
    const now = utc(15, 12);
    expect(getGuestDayAccess('2026-11-15', now, OFFSET, seen)).toEqual({ state: 'open' });
    expect(getGuestDayAccess('2026-11-17', now, OFFSET, seen)).toEqual({ state: 'future' });
  });

  it('judges days by the time seen, not by a clock that has gone back across midnight', () => {
    // Seen 01:30 local on the 17th; the clock now says 22:30 local on the 16th.
    const seen = utc(16, 20);
    const now = utc(16, 17);
    expect(getGuestDayAccess('2026-11-17', now, OFFSET, seen)).toEqual({ state: 'clockWrong' });
    expect(getGuestDayAccess('2026-11-16', now, OFFSET, seen)).toEqual({ state: 'open' });
  });

  it('lets a small correction through', () => {
    const seen = utc(16, 10, 4);
    const now = utc(16, 10);
    expect(getGuestDayAccess('2026-11-16', now, OFFSET, seen)).toEqual(
      getDayAccess('2026-11-16', now, OFFSET),
    );
  });
});
