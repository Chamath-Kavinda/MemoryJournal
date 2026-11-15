import {
  AVERAGE_MIN_DAYS,
  MESSAGE_TEMPLATES,
  MESSAGE_TRIGGERS,
  NEAR_MILESTONE_DAYS,
  RETURN_AFTER_DAYS,
  SCORE_RISE_MIN,
  dayReference,
  daysAway,
  firedTriggers,
  pickMessage,
  renderTemplate,
  type MessageContext,
  type MessageTrigger,
} from './messages';

const TODAY = '2026-11-13'; // a Friday
const YESTERDAY = '2026-11-12';

const BASE: MessageContext = {
  today: TODAY,
  streak: { currentStreak: 0, longestStreak: 0, lastStreakDay: null, freezeCount: 0 },
  previousStreak: null,
  score: null,
  scoreDelta: null,
  daysWritten: 0,
  writtenToday: false,
  todayDetail: null,
  laterPass: null,
  awayDays: null,
  firsts: {},
};

const withContext = (changes: Partial<MessageContext>): MessageContext => ({ ...BASE, ...changes });

const streakOf = (
  currentStreak: number,
  extra: Partial<MessageContext['streak']> = {},
): MessageContext['streak'] => ({
  currentStreak,
  longestStreak: currentStreak,
  lastStreakDay: TODAY,
  freezeCount: 0,
  ...extra,
});

const fires = (trigger: MessageTrigger, ctx: MessageContext) =>
  firedTriggers(ctx).some((fired) => fired.trigger === trigger);

/** A context in which each trigger applies. The type forces a case for every new trigger. */
const FIRING: Record<MessageTrigger, MessageContext> = {
  streakMilestone: withContext({ streak: streakOf(7), previousStreak: 6 }),
  laterRevision: withContext({ laterPass: { dayId: '2026-11-10', addedWords: 14 } }),
  scoreRose: withContext({ score: 72, scoreDelta: 6 }),
  firstDay: withContext({ writtenToday: true, daysWritten: 1 }),
  firstTag: withContext({ firsts: { tag: true } }),
  firstMinuteMarker: withContext({ firsts: { minuteMarker: true } }),
  firstLibraryItem: withContext({ firsts: { libraryItem: true } }),
  totalDaysMilestone: withContext({ writtenToday: true, daysWritten: 25 }),
  freezeEarned: withContext({ streak: streakOf(21, { freezeCount: 1 }), previousStreak: 20 }),
  returningAfterBreak: withContext({ awayDays: 5 }),
  returningRecord: withContext({
    awayDays: 5,
    streak: { currentStreak: 0, longestStreak: 9, lastStreakDay: '2026-11-07', freezeCount: 0 },
  }),
  aboveAverage: withContext({
    daysWritten: 10,
    writtenToday: true,
    todayDetail: { words: 120, average: 80.4 },
  }),
  nearMilestone: withContext({ streak: streakOf(5) }),
  streakContinues: withContext({ streak: streakOf(4) }),
  streakAtStake: withContext({ streak: streakOf(4, { lastStreakDay: YESTERDAY }) }),
  freezeBanked: withContext({ streak: streakOf(1, { freezeCount: 2 }) }),
  scoreInfo: withContext({ score: 64 }),
  tip: BASE,
};

describe('message library', () => {
  it('has at least 60 templates, as the documentation requires', () => {
    expect(MESSAGE_TEMPLATES.length).toBeGreaterThanOrEqual(60);
  });

  it('gives every template a unique id of the form trigger.n', () => {
    const ids = MESSAGE_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const template of MESSAGE_TEMPLATES) {
      expect(template.id).toMatch(new RegExp(`^${template.trigger}\\.[1-9]\\d*$`));
    }
  });

  it('has at least two variants per trigger, so a sentence is never forced to repeat', () => {
    for (const trigger of MESSAGE_TRIGGERS) {
      const variants = MESSAGE_TEMPLATES.filter((template) => template.trigger === trigger);
      expect(variants.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('has no duplicate sentences', () => {
    const texts = MESSAGE_TEMPLATES.map((template) => template.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('lists triggers from the highest priority to the lowest', () => {
    const priorities = MESSAGE_TRIGGERS.map(
      (trigger) => MESSAGE_TEMPLATES.find((template) => template.trigger === trigger)!.priority,
    );
    expect(priorities).toEqual([...priorities].sort((a, b) => b - a));
  });

  it('keeps priorities distinct, except the two exclusive returning triggers', () => {
    const shared = new Map<number, MessageTrigger[]>();
    for (const trigger of MESSAGE_TRIGGERS) {
      const { priority } = MESSAGE_TEMPLATES.find((template) => template.trigger === trigger)!;
      shared.set(priority, [...(shared.get(priority) ?? []), trigger]);
    }
    const sharing = [...shared.values()].filter((triggers) => triggers.length > 1);
    expect(sharing).toEqual([
      ['returningRecord', 'returningAfterBreak'],
      ['streakContinues', 'streakAtStake'],
    ]);
  });

  it('has a tip trigger that always applies, as the fallback', () => {
    expect(firedTriggers(BASE).map((fired) => fired.trigger)).toEqual(['tip']);
  });

  it('is encouraging: no template scolds or blames', () => {
    const forbidden = /\b(failed|lazy|should have|you forgot|too late|disappoint|bad)\b/i;
    for (const template of MESSAGE_TEMPLATES) {
      expect(template.text).not.toMatch(forbidden);
    }
  });
});

describe('firedTriggers', () => {
  it.each(MESSAGE_TRIGGERS)('fires %s in its own context', (trigger) => {
    expect(fires(trigger, FIRING[trigger])).toBe(true);
  });

  it.each(MESSAGE_TRIGGERS)('fills every placeholder of %s from the data', (trigger) => {
    const fired = firedTriggers(FIRING[trigger]).find((entry) => entry.trigger === trigger)!;
    for (const template of MESSAGE_TEMPLATES.filter((entry) => entry.trigger === trigger)) {
      const text = renderTemplate(template.text, fired.params);
      expect(text).not.toMatch(/[{}]/);
    }
  });

  it('returns the triggers in priority order', () => {
    const ctx = withContext({
      streak: streakOf(7, { freezeCount: 1 }),
      previousStreak: 6,
      score: 70,
      scoreDelta: 8,
      firsts: { tag: true },
    });
    expect(firedTriggers(ctx).map((fired) => fired.trigger)).toEqual([
      'streakMilestone',
      'scoreRose',
      'firstTag',
      'freezeEarned',
      'streakContinues',
      'freezeBanked',
      'scoreInfo',
      'tip',
    ]);
  });
});

describe('trigger conditions that do not apply', () => {
  const none: [MessageTrigger, string, MessageContext][] = [
    ['streakMilestone', 'nothing was just saved', withContext({ streak: streakOf(7) })],
    [
      'streakMilestone',
      'no milestone was crossed',
      withContext({ streak: streakOf(5), previousStreak: 4 }),
    ],
    ['laterRevision', 'there is no later pass', BASE],
    [
      'laterRevision',
      'the pass added nothing',
      withContext({ laterPass: { dayId: '2026-11-10', addedWords: 0 } }),
    ],
    [
      'laterRevision',
      'the pass was on today',
      withContext({ laterPass: { dayId: TODAY, addedWords: 12 } }),
    ],
    ['scoreRose', 'there is no score', withContext({ scoreDelta: 9 })],
    ['scoreRose', 'there is no delta', withContext({ score: 70 })],
    [
      'scoreRose',
      'the rise is under the threshold',
      withContext({ score: 70, scoreDelta: SCORE_RISE_MIN - 1 }),
    ],
    ['firstDay', 'it is the second day', withContext({ writtenToday: true, daysWritten: 2 })],
    ['firstDay', 'today is not written', withContext({ writtenToday: false, daysWritten: 1 })],
    ['firstTag', 'no tag was used for the first time', withContext({ firsts: { tag: false } })],
    ['firstMinuteMarker', 'no first marker', withContext({ firsts: { tag: true } })],
    ['firstLibraryItem', 'no first library item', withContext({ firsts: { tag: true } })],
    [
      'totalDaysMilestone',
      'today is not written',
      withContext({ writtenToday: false, daysWritten: 25 }),
    ],
    [
      'totalDaysMilestone',
      'the total is not a milestone',
      withContext({ writtenToday: true, daysWritten: 26 }),
    ],
    [
      'freezeEarned',
      'nothing was just saved',
      withContext({ streak: streakOf(21, { freezeCount: 1 }) }),
    ],
    [
      'freezeEarned',
      'the streak did not grow',
      withContext({ streak: streakOf(21, { freezeCount: 1 }), previousStreak: 21 }),
    ],
    [
      'freezeEarned',
      'the streak is not a multiple of 7',
      withContext({ streak: streakOf(22, { freezeCount: 1 }), previousStreak: 21 }),
    ],
    [
      'freezeEarned',
      'no freeze is banked',
      withContext({ streak: streakOf(21, { freezeCount: 0 }), previousStreak: 20 }),
    ],
    ['returningAfterBreak', 'there is no gap value', BASE],
    ['returningAfterBreak', 'the gap is short', withContext({ awayDays: RETURN_AFTER_DAYS - 1 })],
    ['returningAfterBreak', 'the user has a record streak', FIRING.returningRecord],
    ['returningRecord', 'the user has no record streak', FIRING.returningAfterBreak],
    [
      'returningRecord',
      'the gap is short',
      withContext({
        awayDays: RETURN_AFTER_DAYS - 1,
        streak: streakOf(0, { longestStreak: 9 }),
      }),
    ],
    ['aboveAverage', 'today is not written', withContext({ daysWritten: 10, todayDetail: null })],
    [
      'aboveAverage',
      'there are too few days for an average',
      withContext({
        daysWritten: AVERAGE_MIN_DAYS - 1,
        todayDetail: { words: 200, average: 50 },
      }),
    ],
    [
      'aboveAverage',
      'today is not above the rounded average',
      withContext({ daysWritten: 10, todayDetail: { words: 80, average: 80.4 } }),
    ],
    ['nearMilestone', 'there is no streak', BASE],
    ['nearMilestone', 'the milestone is far', withContext({ streak: streakOf(3) })],
    ['nearMilestone', 'every milestone is passed', withContext({ streak: streakOf(365) })],
    ['streakContinues', 'the streak is 1', withContext({ streak: streakOf(1) })],
    [
      'streakContinues',
      'today was not a streak day',
      withContext({ streak: streakOf(4, { lastStreakDay: YESTERDAY }) }),
    ],
    ['streakAtStake', 'there is no streak day', BASE],
    ['streakAtStake', 'today already counted', withContext({ streak: streakOf(4) })],
    ['freezeBanked', 'no freeze is banked', withContext({ streak: streakOf(1) })],
    ['scoreInfo', 'there is no score', BASE],
  ];

  it.each(none)('%s does not fire when %s', (trigger, _reason, ctx) => {
    expect(fires(trigger, ctx)).toBe(false);
  });

  it('fires nearMilestone from 3 days away down to 1', () => {
    for (let remaining = 1; remaining <= NEAR_MILESTONE_DAYS; remaining += 1) {
      expect(fires('nearMilestone', withContext({ streak: streakOf(7 - remaining) }))).toBe(true);
    }
  });
});

describe('pickMessage', () => {
  it('uses the highest-priority trigger that applies', () => {
    const ctx = withContext({
      streak: streakOf(7),
      previousStreak: 6,
      score: 70,
      scoreDelta: 8,
    });
    expect(pickMessage(ctx).trigger).toBe('streakMilestone');
  });

  it('falls back to a tip for a user with no data', () => {
    expect(pickMessage(BASE).trigger).toBe('tip');
  });

  it('uses real numbers from the data', () => {
    const message = pickMessage(FIRING.laterRevision, { seed: 0 });
    expect(message.id).toBe('laterRevision.1');
    expect(message.text).toBe(
      "You remembered 14 new words after the first pass in Tuesday's entry. Details you recall later still count.",
    );
  });

  it('writes singular and plural correctly', () => {
    const one = pickMessage(withContext({ laterPass: { dayId: '2026-11-10', addedWords: 1 } }), {
      seed: 3,
    });
    expect(one.text).toBe("Nice recall: 1 new word added later to Tuesday's entry.");
    const milestone = pickMessage(FIRING.streakMilestone, { seed: 2 });
    expect(milestone.text).toBe('Milestone: 7 days of writing in a row. Well done.');
  });

  it('is deterministic for the same context and seed', () => {
    expect(pickMessage(FIRING.firstTag, { seed: 5 })).toEqual(
      pickMessage(FIRING.firstTag, { seed: 5 }),
    );
  });

  it('rotates through every variant of the trigger as the seed grows', () => {
    const tips = MESSAGE_TEMPLATES.filter((template) => template.trigger === 'tip');
    const ids = new Set(
      Array.from({ length: tips.length }, (_, seed) => pickMessage(BASE, { seed }).id),
    );
    expect(ids.size).toBe(tips.length);
  });

  it('accepts negative and fractional seeds', () => {
    expect(pickMessage(BASE, { seed: -2.7 }).id).toBe(pickMessage(BASE, { seed: 2 }).id);
  });

  it('never repeats the message shown last', () => {
    for (const trigger of MESSAGE_TRIGGERS) {
      const ctx = FIRING[trigger];
      const first = pickMessage(ctx);
      for (let seed = 0; seed < 25; seed += 1) {
        const next = pickMessage(ctx, { lastShownId: first.id, seed });
        expect(next.id).not.toBe(first.id);
        expect(next.text).not.toBe(first.text);
        expect(next.trigger).toBe(first.trigger);
      }
    }
  });

  it('never shows the same sentence twice in a row over a long run', () => {
    let lastShownId: string | null = null;
    let lastText = '';
    for (let seed = 0; seed < 60; seed += 1) {
      const message = pickMessage(BASE, { lastShownId, seed });
      expect(message.text).not.toBe(lastText);
      lastShownId = message.id;
      lastText = message.text;
    }
  });

  it('ignores a last-shown id from another trigger', () => {
    const message = pickMessage(FIRING.firstTag, { lastShownId: 'tip.1', seed: 0 });
    expect(message.id).toBe('firstTag.1');
  });
});

describe('renderTemplate', () => {
  it('replaces placeholders with strings and numbers', () => {
    expect(renderTemplate('{a} and {b}.', { a: '3 days', b: 7 })).toBe('3 days and 7.');
  });

  it('replaces a placeholder every time it appears', () => {
    expect(renderTemplate('{n}, {n}', { n: 2 })).toBe('2, 2');
  });

  it('leaves a placeholder without a value as it is', () => {
    expect(renderTemplate('{known} {unknown}', { known: 1 })).toBe('1 {unknown}');
  });
});

describe('dayReference', () => {
  it.each([
    ['2026-11-12', "yesterday's entry"],
    ['2026-11-10', "Tuesday's entry"],
    ['2026-11-07', "Saturday's entry"],
    ['2026-11-06', 'the entry for 6 November'],
    ['2026-10-01', 'the entry for 1 October'],
    ['2026-11-13', "today's entry"],
    ['2026-11-14', "today's entry"],
    ['not-a-day', 'an earlier entry'],
  ])('refers to %s as %s', (dayId, expected) => {
    expect(dayReference(dayId, TODAY)).toBe(expected);
  });
});

describe('daysAway', () => {
  it('counts the days with nothing written in between', () => {
    expect(daysAway('2026-11-08', TODAY)).toBe(4);
  });

  it('is 0 for consecutive days and for the same day', () => {
    expect(daysAway(YESTERDAY, TODAY)).toBe(0);
    expect(daysAway(TODAY, TODAY)).toBe(0);
  });

  it('is 0 when the last written day is after the day', () => {
    expect(daysAway('2026-11-20', TODAY)).toBe(0);
  });
});
