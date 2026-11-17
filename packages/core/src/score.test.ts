import { recallScore, recallScoreDelta, scoreDay, SCORE_WEIGHTS, type ScoreDay } from './score';
import { addDays } from './time';
import type { DayBlock, DayRevision } from './types';

const TODAY = '2026-11-14';

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

const hourBlocks = (from: number, to: number): DayBlock[] =>
  Array.from({ length: to - from + 1 }, (_, i) => ({
    hour: from + i,
    minute: null,
    text: 'word',
  }));

const markers = (count: number, text = 'note'): DayBlock[] =>
  Array.from({ length: count }, (_, i) => ({ hour: 8, minute: i, text }));

const day = (dayId: string, ...revisions: DayRevision[]): ScoreDay => ({ dayId, revisions });

/** A day with only a word count, which is all that Detail looks at. */
const words = (dayId: string, wordCount: number) => day(dayId, rev(1, { wordCount }));

describe('weights', () => {
  it('add up to 100', () => {
    expect(Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe('scoreDay', () => {
  it('gives a full day every component except Later recall, and one day of Consistency', () => {
    const full = day(
      TODAY,
      rev(1, {
        wordCount: 100,
        blocks: [...hourBlocks(6, 21), ...markers(6)],
        mentions: ['a', 'b', 'c', 'd'],
      }),
    );

    const score = scoreDay([full], TODAY, TODAY);

    expect(score).not.toBeNull();
    expect(score?.detail).toBeCloseTo(20); // equal to the user's own average
    expect(score?.coverage).toBe(20);
    expect(score?.precision).toBe(20);
    expect(score?.laterRecall).toBe(0);
    expect(score?.consistency).toBeCloseTo(15 / 14);
    expect(score?.total).toBeCloseTo(60 + 15 / 14);
  });

  it('gives a day with no words nothing but its Consistency point', () => {
    const score = scoreDay([day(TODAY, rev(1))], TODAY, TODAY);

    expect(score?.detail).toBe(0);
    expect(score?.coverage).toBe(0);
    expect(score?.precision).toBe(0);
    expect(score?.total).toBeCloseTo(15 / 14);
  });

  it('is null for a day that has no first pass, is unknown or is in the future', () => {
    const days = [day('2026-11-10', rev(2)), day('2026-11-15', rev(1, { wordCount: 50 }))];

    expect(scoreDay(days, '2026-11-10', TODAY)).toBeNull();
    expect(scoreDay(days, '2026-11-15', TODAY)).toBeNull();
    expect(scoreDay(days, '2026-11-01', TODAY)).toBeNull();
  });

  describe('Detail', () => {
    it('is capped at 1.5 times the average', () => {
      const days = [words('2026-11-13', 100), words(TODAY, 400)];

      expect(scoreDay(days, TODAY, TODAY)?.detail).toBe(30);
      expect(scoreDay(days, '2026-11-13', TODAY)?.detail).toBeCloseTo(20);
    });

    it('scales down below the average', () => {
      const days = [words('2026-11-13', 100), words(TODAY, 50)];

      // The average on the day is 75, so the ratio is 2/3 and the points are 30 * (2/3) / 1.5.
      expect(scoreDay(days, TODAY, TODAY)?.detail).toBeCloseTo(40 / 3);
    });

    it('ignores days older than the 30-day window', () => {
      const days = [words(addDays(TODAY, -30), 1000), words(TODAY, 100)];

      expect(scoreDay(days, TODAY, TODAY)?.detail).toBeCloseTo(20);
    });

    it('includes the day 29 days back', () => {
      const days = [words(addDays(TODAY, -29), 300), words(TODAY, 100)];

      // The average is 200, so the ratio is 0.5.
      expect(scoreDay(days, TODAY, TODAY)?.detail).toBeCloseTo(10);
    });
  });

  describe('Coverage', () => {
    it('counts distinct hours with text out of 16', () => {
      const score = scoreDay([day(TODAY, rev(1, { blocks: hourBlocks(8, 11) }))], TODAY, TODAY);

      expect(score?.coverage).toBeCloseTo((20 * 4) / 16);
    });

    it('stops at 16 hours', () => {
      const score = scoreDay([day(TODAY, rev(1, { blocks: hourBlocks(0, 23) }))], TODAY, TODAY);

      expect(score?.coverage).toBe(20);
    });

    it('does not count free notes or blank blocks', () => {
      const first = rev(1, {
        freeNotes: 'Something I cannot place',
        blocks: [{ hour: 9, minute: null, text: '   ' }],
      });

      expect(scoreDay([day(TODAY, first)], TODAY, TODAY)?.coverage).toBe(0);
    });
  });

  describe('Precision', () => {
    it('adds minute markers and tag mentions, out of 10', () => {
      const first = rev(1, { blocks: markers(3), mentions: ['a', 'b'] });

      expect(scoreDay([day(TODAY, first)], TODAY, TODAY)?.precision).toBe(10);
    });

    it('does not count blank markers, and counts a repeated tag once', () => {
      const first = rev(1, { blocks: [...markers(2), ...markers(2, '  ')], mentions: ['a', 'a'] });

      // Two markers (the other two are blank) and one tag: three out of ten.
      const score = scoreDay([day(TODAY, first)], TODAY, TODAY);
      expect(score?.precision).toBeCloseTo(6);
    });

    it('stops at 10', () => {
      const first = rev(1, { blocks: markers(15), mentions: ['a', 'b'] });

      expect(scoreDay([day(TODAY, first)], TODAY, TODAY)?.precision).toBe(20);
    });
  });

  describe('Later recall', () => {
    /** `count` distinct words that start with `prefix`. */
    const text = (count: number, prefix: string): string =>
      Array.from({ length: count }, (_, i) => `${prefix}${i}`).join(' ');

    const FIRST_TEXT = text(5, 'first');

    /** A first pass of 5 words, then one later pass per entry that keeps the text and adds words. */
    const withLater = (dayId: string, ...added: number[]) => {
      let notes = FIRST_TEXT;
      const later = added.map((count, i) => {
        notes = `${notes} ${text(count, `pass${i + 2}word`)}`.trim();
        return rev(i + 2, { freeNotes: notes });
      });
      return day(dayId, rev(1, { wordCount: 5, freeNotes: FIRST_TEXT }), ...later);
    };

    it('does not count passes on a day that is only one day old', () => {
      const score = scoreDay([withLater('2026-11-13', 30)], '2026-11-13', TODAY);

      expect(score?.laterRecall).toBe(0);
    });

    it('counts words added to a day that is two days old', () => {
      const score = scoreDay([withLater('2026-11-12', 15)], '2026-11-12', TODAY);

      expect(score?.laterRecall).toBeCloseTo(7.5);
    });

    it('adds up what every later pass added and stops at 30 words', () => {
      const some = scoreDay([withLater('2026-11-01', 10, 10)], '2026-11-01', TODAY);
      const many = scoreDay([withLater('2026-11-01', 40, 40)], '2026-11-01', TODAY);

      expect(some?.laterRecall).toBeCloseTo(10);
      expect(many?.laterRecall).toBe(15);
    });

    it('counts a later pass only once the day is old enough, as seen from today', () => {
      const days = [withLater('2026-11-13', 30)];

      expect(scoreDay(days, '2026-11-13', '2026-11-14')?.laterRecall).toBe(0);
      expect(scoreDay(days, '2026-11-13', '2026-11-15')?.laterRecall).toBe(15);
    });

    it('earns nothing for words that were added and then deleted again', () => {
      const added = withLater('2026-11-01', 20);
      const deleted = day(
        '2026-11-01',
        ...added.revisions,
        rev(3, { freeNotes: FIRST_TEXT, addedWordCount: 0 }),
      );

      expect(scoreDay([added], '2026-11-01', TODAY)?.laterRecall).toBeCloseTo(10);
      expect(scoreDay([deleted], '2026-11-01', TODAY)?.laterRecall).toBe(0);
    });

    it('drops by the number of added words that were deleted, and no more', () => {
      const added = withLater('2026-11-01', 20);
      const halfDeleted = day(
        '2026-11-01',
        ...added.revisions,
        rev(3, { freeNotes: `${FIRST_TEXT} ${text(10, 'pass2word')}`, addedWordCount: 0 }),
      );

      expect(scoreDay([halfDeleted], '2026-11-01', TODAY)?.laterRecall).toBeCloseTo(5);
    });

    it('does not depend on the order the passes are listed in', () => {
      const ordered = withLater('2026-11-01', 10, 10);
      const shuffled = day('2026-11-01', ...[...ordered.revisions].reverse());

      expect(scoreDay([shuffled], '2026-11-01', TODAY)?.laterRecall).toBeCloseTo(10);
    });
  });

  describe('Consistency', () => {
    it('is the days written in the last 14 days out of 14', () => {
      const days = Array.from({ length: 14 }, (_, i) => words(addDays(TODAY, -i), 100));

      expect(scoreDay(days, TODAY, TODAY)?.consistency).toBe(15);
    });

    it('does not count days outside the window', () => {
      const days = [words(addDays(TODAY, -14), 100), words(TODAY, 100)];

      expect(scoreDay(days, TODAY, TODAY)?.consistency).toBeCloseTo(15 / 14);
    });
  });
});

describe('recallScore', () => {
  it('is null when no day has a first pass', () => {
    expect(recallScore([], TODAY)).toBeNull();
    expect(recallScore([day('2026-11-10', rev(2))], TODAY)).toBeNull();
  });

  it('ignores days after today', () => {
    expect(recallScore([words('2026-11-20', 100)], TODAY)).toBeNull();
  });

  it('rounds the score of a single full day to a whole number', () => {
    const full = day(
      TODAY,
      rev(1, {
        wordCount: 100,
        blocks: [...hourBlocks(6, 21), ...markers(6)],
        mentions: ['a', 'b', 'c', 'd'],
      }),
    );

    expect(recallScore([full], TODAY)).toBe(61);
  });

  it('does not depend on the order of the days or on a repeated day', () => {
    const days = [words('2026-11-12', 80), words('2026-11-13', 120), words(TODAY, 100)];

    const expected = recallScore(days, TODAY);

    expect(recallScore([...days].reverse(), TODAY)).toBe(expected);
    expect(recallScore([...days, days[0] as ScoreDay], TODAY)).toBe(expected);
  });

  it('is the mean of the last 14 written days only', () => {
    const days = Array.from({ length: 16 }, (_, i) =>
      day(
        addDays(TODAY, -i),
        rev(1, { wordCount: 50 + i * 10, blocks: hourBlocks(8, 8 + (i % 8)) }),
      ),
    );
    const last14 = days.slice(0, 14);
    const mean =
      last14.reduce((sum, d) => sum + (scoreDay(days, d.dayId, TODAY)?.total ?? 0), 0) / 14;

    expect(recallScore(days, TODAY)).toBe(Math.round(mean));
  });

  it('stays between 0 and 100', () => {
    const days = Array.from({ length: 20 }, (_, i) =>
      day(
        addDays(TODAY, -i),
        rev(1, {
          wordCount: 100 + (19 - i) * 100,
          blocks: [...hourBlocks(0, 23), ...markers(10)],
          mentions: ['a', 'b', 'c'],
        }),
        rev(2, { addedWordCount: 100 }),
      ),
    );

    const score = recallScore(days, TODAY);

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('recallScoreDelta', () => {
  it('is the score now minus the score a week ago', () => {
    const days = [
      day('2026-11-04', rev(1, { wordCount: 100, blocks: hourBlocks(8, 11) })),
      day(
        '2026-11-13',
        rev(1, { wordCount: 100, blocks: hourBlocks(6, 21) }),
        rev(2, { addedWordCount: 5 }),
      ),
    ];

    const now = recallScore(days, TODAY) as number;
    const before = recallScore(days, '2026-11-07') as number;

    expect(recallScoreDelta(days, TODAY)).toBe(now - before);
    expect(recallScoreDelta(days, TODAY)).toBeGreaterThan(0);
  });

  it('only looks at days up to a week ago for the earlier score', () => {
    const days = [words('2026-11-10', 100)];

    // A week before 2026-11-14 is 2026-11-07, when nothing was written yet.
    expect(recallScoreDelta(days, TODAY)).toBeNull();
  });

  it('is null when there is no score now', () => {
    expect(recallScoreDelta([], TODAY)).toBeNull();
  });
});
