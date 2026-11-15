import {
  buildInsights,
  INSIGHTS_MAX_WRITTEN_DAYS,
  streakDaysOf,
  TREND_DAYS,
  type InsightsInput,
} from './insights';
import { pickMessage } from './messages';
import type { ScoreDay } from './score';
import { addDays } from './time';
import type { DayBlock, DayRevision } from './types';

const OFFSET = 330; // UTC+05:30
const TODAY = '2026-11-14';

/** The instant at `hour:minute` local time on a day. */
function at(dayId: string, hour: number, minute = 0): number {
  const [year, month, day] = dayId.split('-').map(Number) as [number, number, number];
  return Date.UTC(year, month - 1, day, hour, minute) - OFFSET * 60_000;
}

function rev(n: number, overrides: Partial<DayRevision> = {}): DayRevision {
  return {
    n,
    createdAt: 0,
    closedAt: null,
    kind: n === 1 ? 'first' : 'later',
    freeNotes: '',
    blocks: [],
    mentions: [],
    wordCount: 0,
    addedWordCount: 0,
    ...overrides,
  };
}

const day = (dayId: string, ...revisions: DayRevision[]): ScoreDay => ({ dayId, revisions });

/** A day whose first pass was written that evening at 21:30 with the given words. */
const evening = (dayId: string, wordCount = 30, overrides: Partial<DayRevision> = {}): ScoreDay =>
  day(dayId, rev(1, { createdAt: at(dayId, 21, 30), wordCount, ...overrides }));

const EMPTY_LIBRARY = { itemCount: 0, lastSavedAt: null };

function insights(days: ScoreDay[], overrides: Partial<InsightsInput> = {}) {
  return buildInsights({
    today: TODAY,
    utcOffsetMinutes: OFFSET,
    days,
    library: EMPTY_LIBRARY,
    ...overrides,
  });
}

const ago = (days: number) => addDays(TODAY, -days);

describe('constants', () => {
  it('read enough written days for the score windows behind every trend point', () => {
    expect(TREND_DAYS).toBe(30);
    // 14 written days score, each looking up to 30 days back, and the oldest trend point is 29 back.
    expect(INSIGHTS_MAX_WRITTEN_DAYS).toBeGreaterThanOrEqual(14 + 30 + (TREND_DAYS - 1));
  });
});

describe('streakDaysOf', () => {
  it('keeps only days whose first pass was written that evening with at least 20 words', () => {
    const days = [
      evening('2026-11-10', 30),
      evening('2026-11-11', 19), // too short
      day('2026-11-12', rev(1, { createdAt: at('2026-11-12', 20, 59), wordCount: 50 })), // too early
      day('2026-11-13', rev(1, { createdAt: at('2026-11-14', 21, 30), wordCount: 50 })), // next day
      day('2026-11-09'), // no passes at all
      day('2026-11-08', rev(2, { createdAt: at('2026-11-08', 22), wordCount: 50 })), // no first pass
    ];

    expect(streakDaysOf(days, OFFSET)).toEqual(['2026-11-10']);
  });
});

describe('buildInsights for an empty journal', () => {
  it('has no score and no streak, and a trend of empty points ending today', () => {
    const result = insights([]);

    expect(result.score).toBeNull();
    expect(result.scoreDelta).toBeNull();
    expect(result.streak).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      lastStreakDay: null,
      freezeCount: 0,
    });
    expect(result.daysWritten).toBe(0);
    expect(result.trend).toHaveLength(TREND_DAYS);
    expect(result.trend[0]?.dayId).toBe(ago(TREND_DAYS - 1));
    expect(result.trend[TREND_DAYS - 1]?.dayId).toBe(TODAY);
    expect(result.trend.every((point) => point.score === null)).toBe(true);
    expect(result.context).toMatchObject({
      today: TODAY,
      previousStreak: null,
      score: null,
      daysWritten: 0,
      writtenToday: false,
      todayDetail: null,
      laterPass: null,
      awayDays: null,
      firsts: { tag: false, minuteMarker: false, libraryItem: false },
    });
  });

  it('still gives a message: a tip', () => {
    expect(pickMessage(insights([]).context).trigger).toBe('tip');
  });
});

describe('score, streak and trend', () => {
  it('counts the days that counted and the days written', () => {
    const result = insights([evening(ago(2)), evening(ago(1)), evening(TODAY)]);

    expect(result.streak.currentStreak).toBe(3);
    expect(result.streak.lastStreakDay).toBe(TODAY);
    expect(result.daysWritten).toBe(3);
    expect(result.score).not.toBeNull();
    expect(result.context.score).toBe(result.score);
    expect(result.context.streak).toBe(result.streak);
    expect(result.context.daysWritten).toBe(3);
  });

  it('shows the score as of each day, empty before the first written day', () => {
    const result = insights([evening(ago(1)), evening(TODAY)]);

    expect(result.trend[TREND_DAYS - 3]?.score).toBeNull();
    expect(result.trend[TREND_DAYS - 2]?.score).not.toBeNull();
    expect(result.trend[TREND_DAYS - 1]?.score).toBe(result.score);
  });

  it('reports the change against a week ago', () => {
    const result = insights([evening(ago(8)), evening(TODAY, 300)]);

    expect(result.scoreDelta).not.toBeNull();
    expect(result.context.scoreDelta).toBe(result.scoreDelta);
  });

  it('ignores days after today', () => {
    const result = insights([evening(TODAY), evening(addDays(TODAY, 1))]);

    expect(result.daysWritten).toBe(1);
    expect(result.streak.currentStreak).toBe(1);
  });

  it('adds the older days that counted to the streak without scoring them', () => {
    const older = [ago(12), ago(11), ago(10)];
    const result = insights([evening(ago(9)), evening(TODAY)], { olderStreakDays: older });

    // Four in a row up to ago(9), then a gap, so only the longest streak remembers them.
    expect(result.streak.longestStreak).toBe(4);
    expect(result.streak.currentStreak).toBe(1);
    expect(result.daysWritten).toBe(2);
  });
});

describe('what the latest save did', () => {
  it('knows the streak before a first pass that reached a milestone', () => {
    const result = insights([evening(ago(2)), evening(ago(1)), evening(TODAY)]);

    expect(result.context.previousStreak).toBe(2);
    expect(pickMessage(result.context).trigger).toBe('streakMilestone');
  });

  it('keeps the streak unchanged when the latest save was a later pass', () => {
    const earlier = day(
      ago(1),
      rev(1, { createdAt: at(ago(1), 21, 30), wordCount: 30 }),
      rev(2, { createdAt: at(TODAY, 8), wordCount: 40, addedWordCount: 10 }),
    );
    const result = insights([evening(ago(2)), earlier]);

    expect(result.context.previousStreak).toBe(result.streak.currentStreak);
  });

  it('finds a later pass added to an older day', () => {
    const older = day(
      ago(3),
      rev(1, { createdAt: at(ago(3), 21, 30), wordCount: 30 }),
      rev(2, { createdAt: at(TODAY, 8), wordCount: 37, addedWordCount: 7 }),
    );
    const result = insights([older]);

    expect(result.context.laterPass).toEqual({ dayId: ago(3), addedWords: 7 });
    expect(pickMessage(result.context).trigger).toBe('laterRevision');
  });

  it("does not call a second pass on today's own day a later pass", () => {
    const today = day(
      TODAY,
      rev(1, { createdAt: at(TODAY, 21, 30), wordCount: 30 }),
      rev(2, { createdAt: at(TODAY, 23), wordCount: 40, addedWordCount: 10 }),
    );

    expect(insights([today]).context.laterPass).toBeNull();
  });

  it('carries nothing from a save that was not made today', () => {
    const result = insights([evening(ago(2)), evening(ago(1))]);

    expect(result.context.previousStreak).toBeNull();
    expect(result.context.laterPass).toBeNull();
    expect(result.context.awayDays).toBeNull();
    expect(result.context.firsts).toEqual({
      tag: false,
      minuteMarker: false,
      libraryItem: false,
    });
  });

  it('counts the days missed before today when the user comes back', () => {
    const result = insights([evening(ago(6)), evening(TODAY)]);

    expect(result.context.awayDays).toBe(5);
    expect(pickMessage(result.context).trigger).toBe('returningAfterBreak');
  });

  it('has no days away for a first day', () => {
    expect(insights([evening(TODAY)]).context.awayDays).toBeNull();
  });
});

describe("today's detail", () => {
  it("compares today's first pass with the 30-day average of first passes", () => {
    const result = insights([evening(ago(2), 20), evening(ago(1), 60), evening(TODAY, 100)]);

    expect(result.context.writtenToday).toBe(true);
    expect(result.context.todayDetail).toEqual({ words: 100, average: 60 });
  });

  it('leaves older days out of the average', () => {
    const result = insights([evening(ago(40), 1000), evening(TODAY, 100)]);

    expect(result.context.todayDetail).toEqual({ words: 100, average: 100 });
  });

  it('is empty when today is not written', () => {
    const result = insights([evening(ago(1))]);

    expect(result.context.writtenToday).toBe(false);
    expect(result.context.todayDetail).toBeNull();
  });
});

describe('first-time flags', () => {
  const marker = (text: string): DayBlock[] => [{ hour: 9, minute: 25, text }];

  it('flags the first tag only when no other pass has one', () => {
    const first = insights([evening(ago(1)), evening(TODAY, 30, { mentions: ['t1'] })]);
    const notFirst = insights([
      evening(ago(1), 30, { mentions: ['t1'] }),
      evening(TODAY, 30, { mentions: ['t1'] }),
    ]);
    const none = insights([evening(TODAY)]);

    expect(first.context.firsts.tag).toBe(true);
    expect(pickMessage(first.context).trigger).toBe('firstTag');
    expect(notFirst.context.firsts.tag).toBe(false);
    expect(none.context.firsts.tag).toBe(false);
  });

  it('flags the first minute marker, ignoring markers without text', () => {
    const first = insights([evening(ago(1)), evening(TODAY, 30, { blocks: marker('lunch') })]);
    const notFirst = insights([
      evening(ago(1), 30, { blocks: marker('walk') }),
      evening(TODAY, 30, { blocks: marker('lunch') }),
    ]);
    const blank = insights([evening(TODAY, 30, { blocks: marker('  ') })]);

    expect(first.context.firsts.minuteMarker).toBe(true);
    expect(notFirst.context.firsts.minuteMarker).toBe(false);
    expect(blank.context.firsts.minuteMarker).toBe(false);
  });

  it('flags the first library item when it was saved today', () => {
    const saved = (lastSavedAt: number | null, itemCount = 1) =>
      insights([evening(TODAY)], { library: { itemCount, lastSavedAt } }).context.firsts
        .libraryItem;

    expect(saved(at(TODAY, 10))).toBe(true);
    expect(saved(at(TODAY, 10), 2)).toBe(false);
    expect(saved(at(ago(1), 10))).toBe(false);
    expect(saved(null)).toBe(false);
  });
});
