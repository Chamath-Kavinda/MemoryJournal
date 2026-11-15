import { mentionedDays } from './mentionHistory';

function meta(date: string, mentions: string[] | undefined, wordCount = 10) {
  return mentions === undefined ? { date, wordCount } : { date, wordCount, mentions };
}

describe('mentionedDays', () => {
  it('lists the days that mention the tag, newest first', () => {
    const metas = [
      meta('2026-11-03', ['t1']),
      meta('2026-11-13', ['t1', 't2'], 42),
      meta('2026-11-10', ['t2']),
      meta('2026-10-30', ['t1'], 7),
    ];

    expect(mentionedDays(metas, 't1')).toEqual([
      { dayId: '2026-11-13', wordCount: 42 },
      { dayId: '2026-11-03', wordCount: 10 },
      { dayId: '2026-10-30', wordCount: 7 },
    ]);
  });

  it('orders across month and year boundaries', () => {
    const metas = [
      meta('2025-12-31', ['t1']),
      meta('2026-01-01', ['t1']),
      meta('2026-02-01', ['t1']),
    ];
    expect(mentionedDays(metas, 't1').map((day) => day.dayId)).toEqual([
      '2026-02-01',
      '2026-01-01',
      '2025-12-31',
    ]);
  });

  it('skips days without mentions and days saved before mentions were stored', () => {
    const metas = [
      meta('2026-11-12', []),
      meta('2026-11-11', undefined),
      meta('2026-11-10', ['t1']),
    ];
    expect(mentionedDays(metas, 't1')).toEqual([{ dayId: '2026-11-10', wordCount: 10 }]);
  });

  it('matches the exact tag id only', () => {
    expect(mentionedDays([meta('2026-11-10', ['t10'])], 't1')).toEqual([]);
  });

  it('lists a day once even if it is given twice, keeping the later entry', () => {
    const metas = [meta('2026-11-10', ['t1'], 5), meta('2026-11-10', ['t1'], 9)];
    expect(mentionedDays(metas, 't1')).toEqual([{ dayId: '2026-11-10', wordCount: 9 }]);
  });

  it('returns an empty list when nothing matches', () => {
    expect(mentionedDays([], 't1')).toEqual([]);
    expect(mentionedDays([meta('2026-11-10', ['t2'])], 't1')).toEqual([]);
  });
});
