import {
  DAYS_PER_FREEZE,
  MAX_FREEZES,
  STREAK_MILESTONES,
  computeStreak,
  countsTowardStreak,
  newMilestone,
  nextMilestone,
} from './streak';
import { addDays } from './time';

const COLOMBO = 330; // UTC+05:30
const DAY = '2026-11-13';

/** First pass saved at a local time on `DAY` in Colombo. */
const savedAt = (hour: number, minute: number, wordCount = 20, n = 1) => ({
  n,
  wordCount,
  createdAt: Date.UTC(2026, 10, 13, hour, minute) - COLOMBO * 60_000,
});

/** `count` consecutive day ids starting at `start`. */
const run = (start: string, count: number) =>
  Array.from({ length: count }, (_, i) => addDays(start, i));

const D1 = '2026-10-01';
const day = (n: number) => addDays(D1, n - 1); // day(1) is D1

describe('countsTowardStreak', () => {
  it('counts a first pass saved at 21:00 with 20 words', () => {
    expect(countsTowardStreak(DAY, savedAt(21, 0), COLOMBO)).toBe(true);
  });

  it('counts a first pass saved at 23:59', () => {
    expect(countsTowardStreak(DAY, savedAt(23, 59), COLOMBO)).toBe(true);
  });

  it('does not count a pass saved at 20:59, before the unlock', () => {
    expect(countsTowardStreak(DAY, savedAt(20, 59), COLOMBO)).toBe(false);
  });

  it('does not count a pass saved after midnight, which is another calendar day', () => {
    // 00:30 on the 14th: the pass belongs to the 13th but was written on the 14th.
    expect(countsTowardStreak(DAY, savedAt(24, 30), COLOMBO)).toBe(false);
  });

  it('needs at least 20 words', () => {
    expect(countsTowardStreak(DAY, savedAt(21, 30, 19), COLOMBO)).toBe(false);
    expect(countsTowardStreak(DAY, savedAt(21, 30, 20), COLOMBO)).toBe(true);
  });

  it('never counts a later pass', () => {
    expect(countsTowardStreak(DAY, savedAt(22, 0, 100, 2), COLOMBO)).toBe(false);
  });

  it('uses the local time of the offset, not UTC', () => {
    const createdAt = Date.UTC(2026, 10, 13, 15, 30); // 21:00 in Colombo, 15:30 in UTC
    expect(countsTowardStreak(DAY, { n: 1, wordCount: 20, createdAt }, COLOMBO)).toBe(true);
    expect(countsTowardStreak(DAY, { n: 1, wordCount: 20, createdAt }, 0)).toBe(false);
  });
});

describe('computeStreak', () => {
  it('starts at zero with nothing written', () => {
    expect(computeStreak([], DAY)).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      lastStreakDay: null,
      freezeCount: 0,
    });
  });

  it('counts consecutive days up to today', () => {
    expect(computeStreak(run(day(1), 3), day(3))).toEqual({
      currentStreak: 3,
      longestStreak: 3,
      lastStreakDay: day(3),
      freezeCount: 0,
    });
  });

  it('keeps the streak while today is still unwritten', () => {
    const stats = computeStreak(run(day(1), 3), day(4));

    expect(stats.currentStreak).toBe(3);
    expect(stats.lastStreakDay).toBe(day(3));
  });

  it('earns a freeze at 7 days and another at 14', () => {
    expect(computeStreak(run(day(1), 6), day(6)).freezeCount).toBe(0);
    expect(computeStreak(run(day(1), 7), day(7)).freezeCount).toBe(1);
    expect(computeStreak(run(day(1), 13), day(13)).freezeCount).toBe(1);
    expect(computeStreak(run(day(1), 14), day(14)).freezeCount).toBe(2);
  });

  it('banks at most two freezes', () => {
    const stats = computeStreak(run(day(1), 21), day(21));

    expect(stats.freezeCount).toBe(MAX_FREEZES);
    expect(stats.currentStreak).toBe(21);
  });

  it('earns a freeze for every multiple of the number of days', () => {
    expect(DAYS_PER_FREEZE).toBe(7);
  });

  it('resets to zero after a missed day when there is no freeze', () => {
    const days = [...run(day(1), 3), day(5)];

    expect(computeStreak(days, day(5))).toEqual({
      currentStreak: 1,
      longestStreak: 3,
      lastStreakDay: day(5),
      freezeCount: 0,
    });
  });

  it('spends a freeze on a missed day and keeps the streak', () => {
    const days = [...run(day(1), 7), day(9)]; // day 8 is missed

    expect(computeStreak(days, day(9))).toEqual({
      currentStreak: 8,
      longestStreak: 8,
      lastStreakDay: day(9),
      freezeCount: 0,
    });
  });

  it('does not treat today as missed, so no freeze is spent yet', () => {
    const stats = computeStreak(run(day(1), 7), day(8));

    // Day 8 is today, so it is not missed yet and nothing is spent.
    expect(stats.currentStreak).toBe(7);
    expect(stats.freezeCount).toBe(1);
  });

  it('spends the freeze once today has passed without a pass', () => {
    const stats = computeStreak(run(day(1), 7), day(9)); // day 8 is over, day 9 is today

    expect(stats.currentStreak).toBe(7);
    expect(stats.freezeCount).toBe(0);
  });

  it('resets after a second missed day once the freeze is spent', () => {
    const stats = computeStreak(run(day(1), 7), day(10)); // days 8 and 9 are over

    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(7);
    expect(stats.freezeCount).toBe(0);
    expect(stats.lastStreakDay).toBe(day(7));
  });

  it('spends one freeze per missed day, then resets when they run out', () => {
    // 14 days earn two freezes; three missed days spend both and then break the streak.
    const days = [...run(day(1), 14), day(18)];

    expect(computeStreak(days, day(18))).toEqual({
      currentStreak: 1,
      longestStreak: 14,
      lastStreakDay: day(18),
      freezeCount: 0,
    });
  });

  it('keeps a freeze when fewer days are missed than freezes banked', () => {
    const days = [...run(day(1), 14), day(16)]; // day 15 is missed

    const stats = computeStreak(days, day(16));

    expect(stats.currentStreak).toBe(15);
    expect(stats.freezeCount).toBe(1);
  });

  it('earns a new freeze after one was spent', () => {
    const days = [...run(day(1), 7), ...run(day(9), 7)]; // day 8 is missed, streak reaches 14

    expect(computeStreak(days, day(15))).toEqual({
      currentStreak: 14,
      longestStreak: 14,
      lastStreakDay: day(15),
      freezeCount: 1,
    });
  });

  it('starts counting again from 1 after a break', () => {
    const days = [...run(day(1), 4), ...run(day(10), 2)];

    const stats = computeStreak(days, day(11));

    expect(stats.currentStreak).toBe(2);
    expect(stats.longestStreak).toBe(4);
  });

  it('ignores days after today, repeated days and the order of the list', () => {
    const days = [day(3), day(1), day(2), day(2), day(9)];

    expect(computeStreak(days, day(3))).toEqual(computeStreak([day(1), day(2), day(3)], day(3)));
  });

  it('keeps the longest streak after the current one breaks', () => {
    const stats = computeStreak(run(day(1), 5), day(30));

    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(5);
  });
});

describe('milestones', () => {
  it('are 3, 7, 14, 30, 60, 100 and 365', () => {
    expect(STREAK_MILESTONES).toEqual([3, 7, 14, 30, 60, 100, 365]);
  });

  it('finds the next one above the streak', () => {
    expect(nextMilestone(0)).toBe(3);
    expect(nextMilestone(3)).toBe(7);
    expect(nextMilestone(99)).toBe(100);
    expect(nextMilestone(364)).toBe(365);
    expect(nextMilestone(365)).toBeNull();
  });

  it('reports a milestone only on the step that reaches it', () => {
    expect(newMilestone(2, 3)).toBe(3);
    expect(newMilestone(3, 4)).toBeNull();
    expect(newMilestone(0, 1)).toBeNull();
    expect(newMilestone(6, 7)).toBe(7);
  });

  it('reports the highest milestone when one step crosses several', () => {
    expect(newMilestone(0, 14)).toBe(14);
  });

  it('reports nothing when the streak did not grow', () => {
    expect(newMilestone(7, 0)).toBeNull();
    expect(newMilestone(7, 7)).toBeNull();
  });
});
