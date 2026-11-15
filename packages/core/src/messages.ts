import { DAYS_PER_FREEZE, newMilestone, nextMilestone, type StreakStats } from './streak';
import { addDays, compareDayIds, daysBetween, parseDayId } from './time';
import type { DayId } from './types';

/** A score rise of at least this many points over last week earns praise. */
export const SCORE_RISE_MIN = 5;
/** Missed days in a row after which the next message is a gentle welcome back. */
export const RETURN_AFTER_DAYS = 3;
/** A streak this close to the next milestone gets a "nearly there" message. */
export const NEAR_MILESTONE_DAYS = 3;
/** Fewer written days than this give no meaningful personal average, so no comparison. */
export const AVERAGE_MIN_DAYS = 3;
/** Totals of written days that are celebrated. */
export const TOTAL_DAYS_MILESTONES: readonly number[] = [10, 25, 50, 100, 200, 365];

/** Why a message was chosen. Each trigger owns several template variants. */
export type MessageTrigger =
  | 'streakMilestone'
  | 'laterRevision'
  | 'scoreRose'
  | 'firstDay'
  | 'firstTag'
  | 'firstMinuteMarker'
  | 'firstLibraryItem'
  | 'totalDaysMilestone'
  | 'freezeEarned'
  | 'returningAfterBreak'
  | 'returningRecord'
  | 'aboveAverage'
  | 'nearMilestone'
  | 'streakContinues'
  | 'streakAtStake'
  | 'freezeBanked'
  | 'scoreInfo'
  | 'tip';

/** Words in today's first pass, and the user's own 30-day average of first-pass words. */
export interface TodayDetail {
  words: number;
  average: number;
}

/** The latest pass that was saved on an older day, and the words it added. */
export interface LaterPass {
  dayId: DayId;
  addedWords: number;
}

/** Things the user did for the first time with the latest save. */
export interface MessageFirsts {
  tag?: boolean;
  minuteMarker?: boolean;
  libraryItem?: boolean;
}

/**
 * Everything the engine reads. The caller builds it from the user's real data, so every number in
 * a message comes from the journal and the engine itself needs no clock, no Firestore and no
 * state.
 */
export interface MessageContext {
  today: DayId;
  /** The streak as shown now (computeStreak). */
  streak: StreakStats;
  /** The current streak before the latest save, or null when nothing was just saved. */
  previousStreak: number | null;
  /** The displayed recall score, or null until a day is written. */
  score: number | null;
  /** The score now minus the score 7 days ago, or null when either is missing. */
  scoreDelta: number | null;
  /** Days with a first pass, up to today. */
  daysWritten: number;
  /** Whether today has a first pass. */
  writtenToday: boolean;
  /** Set only when today was written. */
  todayDetail: TodayDetail | null;
  /** Set when the latest save added to an older day. */
  laterPass: LaterPass | null;
  /** Days missed just before the latest activity (see daysAway), or null for a new user. */
  awayDays: number | null;
  firsts: MessageFirsts;
}

export type MessageParams = Readonly<Record<string, string | number>>;

/** One sentence the engine can show. The id is stable, so callers can remember the last one shown. */
export interface MessageTemplate {
  /** `<trigger>.<n>`, for example `tip.3`. */
  id: string;
  trigger: MessageTrigger;
  priority: number;
  /** Plain text with `{name}` placeholders. */
  text: string;
}

/** The message to show. */
export interface Message {
  id: string;
  trigger: MessageTrigger;
  text: string;
}

export interface FiredTrigger {
  trigger: MessageTrigger;
  priority: number;
  params: MessageParams;
}

interface TriggerRule {
  trigger: MessageTrigger;
  priority: number;
  /** The values for the placeholders when the trigger applies, or null when it does not. */
  params: (ctx: MessageContext) => MessageParams | null;
  /** At least two, so the same sentence is never shown twice in a row. */
  texts: readonly string[];
}

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;
const days = (n: number) => count(n, 'day');

const weekdayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' });
const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' });

/**
 * How to refer to an earlier day in a sentence, as seen from `today`: "yesterday's entry",
 * "Tuesday's entry" within the last week, otherwise "the entry for 5 November".
 */
export function dayReference(dayId: DayId, today: DayId): string {
  const parts = parseDayId(dayId);
  if (parts === null) return 'an earlier entry';
  const age = daysBetween(dayId, today);
  if (age <= 0) return "today's entry";
  if (age === 1) return "yesterday's entry";
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (age <= 6) return `${weekdayFormat.format(date)}'s entry`;
  return `the entry for ${parts.day} ${monthFormat.format(date)}`;
}

/**
 * Whole days with nothing written between `lastWrittenDay` and `day`: a return on the 13th after
 * writing on the 8th gives 4. Use the written day before the latest save as `lastWrittenDay`, and
 * today as `day` (or the day just saved).
 */
export function daysAway(lastWrittenDay: DayId, day: DayId): number {
  return Math.max(0, daysBetween(lastWrittenDay, day) - 1);
}

/** The days away when the user is coming back after a break, otherwise null. */
const returningAfter = (ctx: MessageContext): number | null =>
  ctx.awayDays !== null && ctx.awayDays >= RETURN_AFTER_DAYS ? ctx.awayDays : null;

/**
 * The rules, from the highest priority to the lowest. The first rule that applies decides the
 * message, and the last one (`tip`) always applies.
 */
const RULES: readonly TriggerRule[] = [
  {
    trigger: 'streakMilestone',
    priority: 100,
    params: (ctx) => {
      if (ctx.previousStreak === null) return null;
      const milestone = newMilestone(ctx.previousStreak, ctx.streak.currentStreak);
      return milestone === null ? null : { milestone: days(milestone) };
    },
    texts: [
      'That is {milestone} in a row. Every one of those evenings added to your memory practice.',
      '{milestone} streak reached. You sat down and wrote it all out, evening after evening.',
      'Milestone: {milestone} of writing in a row. Well done.',
      '{milestone} without a gap. The habit is doing its work.',
      'You have now written {milestone} in a row. That kind of regularity is what makes a journal useful.',
    ],
  },
  {
    trigger: 'laterRevision',
    priority: 90,
    params: (ctx) => {
      const later = ctx.laterPass;
      if (later === null || later.addedWords < 1 || compareDayIds(later.dayId, ctx.today) >= 0) {
        return null;
      }
      return {
        added: count(later.addedWords, 'new word'),
        dayRef: dayReference(later.dayId, ctx.today),
      };
    },
    texts: [
      'You remembered {added} after the first pass in {dayRef}. Details you recall later still count.',
      'Coming back to {dayRef} paid off: {added} that were not there before.',
      '{added} added to {dayRef}. Memories often surface after a break, and you caught them.',
      'Nice recall: {added} added later to {dayRef}.',
    ],
  },
  {
    trigger: 'scoreRose',
    priority: 85,
    params: (ctx) => {
      if (ctx.score === null || ctx.scoreDelta === null || ctx.scoreDelta < SCORE_RISE_MIN) {
        return null;
      }
      return { delta: Math.round(ctx.scoreDelta), score: Math.round(ctx.score) };
    },
    texts: [
      'Your recall score is up {delta} points on last week, now {score}. The extra detail is showing.',
      'Up {delta} on last week: your score is {score}. Nice progress.',
      'Your score rose by {delta} this week and stands at {score}. Keep going the way you are.',
      '{score} out of 100, which is {delta} higher than a week ago.',
    ],
  },
  {
    trigger: 'firstDay',
    priority: 80,
    params: (ctx) => (ctx.writtenToday && ctx.daysWritten === 1 ? {} : null),
    texts: [
      'Your first day is written. Everything you remember from here builds on this.',
      'First entry saved. Come back tomorrow evening and add what you remember.',
      'Day one is done. Come back to it any time you remember more.',
    ],
  },
  {
    trigger: 'firstTag',
    priority: 78,
    params: (ctx) => (ctx.firsts.tag === true ? {} : null),
    texts: [
      'You used your first tag. People, places and numbers are easier to find again now.',
      'First tag mention done. Tags turn names and places into something you can look back on.',
      'Your first tag is in a day. Open the tag later to see every day it appears.',
    ],
  },
  {
    trigger: 'firstMinuteMarker',
    priority: 77,
    params: (ctx) => (ctx.firsts.minuteMarker === true ? {} : null),
    texts: [
      'First minute marker added. Exact times make a memory more precise, and they count toward your score.',
      'You pinned a memory to an exact minute. That is the most precise way to remember a moment.',
      'Minute marker used for the first time. Precision is part of your recall score.',
    ],
  },
  {
    trigger: 'firstLibraryItem',
    priority: 76,
    params: (ctx) => (ctx.firsts.libraryItem === true ? {} : null),
    texts: [
      'First movie or book saved. Write down what you remember, and add more whenever it comes back.',
      'Your library has its first page. Come back later and add anything else you remember.',
      'You started your library. A free page is a good place for the plot, the characters and how it felt.',
    ],
  },
  {
    trigger: 'totalDaysMilestone',
    priority: 74,
    params: (ctx) =>
      ctx.writtenToday && TOTAL_DAYS_MILESTONES.includes(ctx.daysWritten)
        ? { total: days(ctx.daysWritten) }
        : null,
    texts: [
      '{total} written in total. That is a real archive of your life now.',
      'You have written {total} so far. Each one is a day you can look back on.',
      'That makes {total} of your life written down. Well done.',
    ],
  },
  {
    trigger: 'freezeEarned',
    priority: 72,
    params: (ctx) => {
      const { currentStreak, freezeCount } = ctx.streak;
      const grew = ctx.previousStreak !== null && currentStreak > ctx.previousStreak;
      return grew && currentStreak % DAYS_PER_FREEZE === 0 && freezeCount >= 1
        ? { streak: days(currentStreak), freezes: count(freezeCount, 'freeze') }
        : null;
    },
    texts: [
      '{streak} in a row is a freeze checkpoint: you have {freezes} banked. A freeze covers one missed day, automatically.',
      'Day {streak} of your streak keeps you at {freezes} banked. One is used automatically if you miss a day.',
    ],
  },
  {
    trigger: 'returningRecord',
    priority: 70,
    params: (ctx) => {
      const away = returningAfter(ctx);
      if (away === null || ctx.streak.longestStreak < 3) return null;
      return { away: days(away), longest: days(ctx.streak.longestStreak) };
    },
    texts: [
      'Welcome back. Your longest streak of {longest} is still on record, and a new one can start tonight.',
      'Good to see you after {away}. Your best run of {longest} shows what you can do, and you can start another.',
    ],
  },
  {
    trigger: 'returningAfterBreak',
    priority: 70,
    params: (ctx) => {
      const away = returningAfter(ctx);
      if (away === null || ctx.streak.longestStreak >= 3) return null;
      return { away: days(away) };
    },
    texts: [
      'Welcome back. Whenever you are ready, today is a fresh start.',
      'Good to see you. After {away} away, any day you write is a good day.',
      'Memories you write down now still count, even after {away}.',
      'Glad you are here. Your earlier days are all still saved, and you can add to them any time.',
    ],
  },
  {
    trigger: 'aboveAverage',
    priority: 60,
    params: (ctx) => {
      const detail = ctx.todayDetail;
      if (detail === null || ctx.daysWritten < AVERAGE_MIN_DAYS) return null;
      const average = Math.round(detail.average);
      return detail.words > average ? { words: detail.words, average } : null;
    },
    texts: [
      'You wrote {words} words today, above your 30-day average of {average}.',
      '{words} words today against your usual {average}. That is a detailed day.',
      'More than usual: {words} words today, with a 30-day average of {average}.',
      "Today's entry ran {words} words, ahead of your {average}-word average. Good detail.",
    ],
  },
  {
    trigger: 'nearMilestone',
    priority: 55,
    params: (ctx) => {
      const current = ctx.streak.currentStreak;
      const next = nextMilestone(current);
      if (current < 1 || next === null || next - current > NEAR_MILESTONE_DAYS) return null;
      return { remaining: days(next - current), milestone: days(next) };
    },
    texts: [
      '{remaining} to go until your {milestone} milestone.',
      'Your next milestone is {milestone}, only {remaining} away.',
      'Almost there: {remaining} until {milestone} in a row.',
    ],
  },
  {
    trigger: 'streakContinues',
    priority: 50,
    params: (ctx) =>
      ctx.streak.currentStreak >= 2 && ctx.streak.lastStreakDay === ctx.today
        ? { streak: days(ctx.streak.currentStreak) }
        : null,
    texts: [
      '{streak} in a row. Steady and consistent.',
      'That is {streak} running. Each evening makes the next one easier.',
      'Another evening written: {streak} in a row now.',
      'Your streak stands at {streak}.',
    ],
  },
  {
    trigger: 'streakAtStake',
    priority: 50,
    params: (ctx) =>
      ctx.streak.lastStreakDay === addDays(ctx.today, -1)
        ? {
            streak: days(ctx.streak.currentStreak),
            next: days(ctx.streak.currentStreak + 1),
          }
        : null,
    texts: [
      'You are on a {streak} streak. Writing opens at 9 PM tonight to keep it going.',
      "{streak} in a row so far. Tonight's entry would make it {next}.",
      'Your {streak} streak is alive. Come back after 9 PM to continue it.',
    ],
  },
  {
    trigger: 'freezeBanked',
    priority: 40,
    params: (ctx) =>
      ctx.streak.freezeCount >= 1 ? { freezes: count(ctx.streak.freezeCount, 'freeze') } : null,
    texts: [
      'You have {freezes} banked. A missed day uses one automatically.',
      '{freezes} in the bank. Your streak has a safety net.',
      'Banked: {freezes}. They cover missed days, so one busy evening does not erase your streak.',
    ],
  },
  {
    trigger: 'scoreInfo',
    priority: 30,
    params: (ctx) => (ctx.score === null ? null : { score: Math.round(ctx.score) }),
    texts: [
      'Your recall score is {score} out of 100, the mean of your last 14 written days.',
      'Recall score: {score}. It is a motivation tool rather than a medical measure.',
      '{score} out of 100 is your current score. It rises with detail, coverage, precision, later recall and consistency.',
    ],
  },
  {
    trigger: 'tip',
    priority: 10,
    params: () => ({}),
    texts: [
      'Details you remember later still count. Come back and add them.',
      'Type @ to mention a tag, and your people, places and numbers become easy to find again.',
      'Minute markers pin a memory to an exact minute and add to your precision.',
      'Free notes hold what you remember but cannot place in time.',
      'A day counts toward your streak when you write it between 9 PM and midnight, with at least 20 words.',
      'Older days can be edited at any time. Extra details improve your score, though not your streak.',
      'Movies and books have their own pages with no time sections. Write whatever comes back.',
      'Walk through your day hour by hour: every hour with text raises your coverage.',
      'Your score compares your detail with your own 30-day average, so you only compete with yourself.',
      'Use the revision toggle on a day to see what you wrote the first, second and third time.',
      'Write what comes to mind first, even out of order. Add the details as they come back.',
      'Your entries are private to you and are never sent to an AI service.',
    ],
  },
];

/** The triggers, from the highest priority to the lowest. */
export const MESSAGE_TRIGGERS: readonly MessageTrigger[] = RULES.map((rule) => rule.trigger);

/** Every template, with ids of the form `<trigger>.<n>`. */
export const MESSAGE_TEMPLATES: readonly MessageTemplate[] = RULES.flatMap((rule) =>
  rule.texts.map((text, index) => ({
    id: `${rule.trigger}.${index + 1}`,
    trigger: rule.trigger,
    priority: rule.priority,
    text,
  })),
);

/** Fills the `{name}` placeholders. A placeholder with no value is left as it is. */
export function renderTemplate(text: string, params: MessageParams): string {
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    String(params[name] ?? placeholder),
  );
}

/** The triggers that apply to `ctx`, highest priority first. `tip` is always among them. */
export function firedTriggers(ctx: MessageContext): FiredTrigger[] {
  return RULES.flatMap((rule) => {
    const params = rule.params(ctx);
    return params === null ? [] : [{ trigger: rule.trigger, priority: rule.priority, params }];
  });
}

export interface PickMessageOptions {
  /** The id of the message shown last, which is never picked again straight away. */
  lastShownId?: string | null;
  /** Chooses between variants. The same context and seed always give the same message. */
  seed?: number;
}

/**
 * The message to show: the highest-priority trigger that applies, with one of its variants
 * filled in from the user's numbers. The variant picked is never `lastShownId`, so the same
 * sentence does not appear twice in a row. A different `seed` (for example the number of
 * messages shown so far) rotates through the variants.
 */
export function pickMessage(ctx: MessageContext, options: PickMessageOptions = {}): Message {
  const { lastShownId = null, seed = 0 } = options;
  // The `tip` rule always applies, so there is always a first entry.
  const top = firedTriggers(ctx)[0] as FiredTrigger;
  const variants = MESSAGE_TEMPLATES.filter(
    (template) => template.trigger === top.trigger && template.id !== lastShownId,
  );
  const template = variants[Math.abs(Math.trunc(seed)) % variants.length] as MessageTemplate;
  return {
    id: template.id,
    trigger: template.trigger,
    text: renderTemplate(template.text, top.params),
  };
}
