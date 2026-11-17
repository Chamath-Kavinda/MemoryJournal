import { pageOf } from './dayPage';
import type { MessageContext, MessageFirsts } from './messages';
import { contentOf } from './revisions';
import { timeBlocksOf } from './timeLines';
import { daysAway } from './messages';
import { DETAIL_WINDOW_DAYS, recallScore, recallScoreDelta, type ScoreDay } from './score';
import { computeStreak, countsTowardStreak, type StreakStats } from './streak';
import { addDays, compareDayIds, dayIdFromUtc } from './time';
import type { DayId, DayRevision, EpochMs } from './types';

/** The trend shows the score as of each of the last this many days, today included. */
export const TREND_DAYS = 30;
/**
 * The Insights screen reads every pass of this many of the most recent written days. The score
 * looks at 14 written days and each of them at up to 30 days before it, and the oldest trend
 * point is 29 days back, so 80 covers what the screen shows (D-029).
 */
export const INSIGHTS_MAX_WRITTEN_DAYS = 80;

/** The score as it stood at the end of one day. Null before the first written day. */
export interface TrendPoint {
  dayId: DayId;
  score: number | null;
}

/** What the library holds, which is all the engine needs to know about it. */
export interface LibrarySummary {
  itemCount: number;
  /** When any item was last saved, or null for an empty library. */
  lastSavedAt: EpochMs | null;
}

export interface InsightsInput {
  today: DayId;
  /** The user's UTC offset, used to place saved passes on a local day. */
  utcOffsetMinutes: number;
  /** The most recent written days with all their passes (INSIGHTS_MAX_WRITTEN_DAYS of them). */
  days: readonly ScoreDay[];
  /**
   * Days older than those in `days` that counted toward the streak. The streak can be longer than
   * the days read in full, and these are all it needs from the rest.
   */
  olderStreakDays?: readonly DayId[];
  library: LibrarySummary;
}

export interface Insights {
  score: number | null;
  /** The score now minus the score a week ago, or null when either is missing. */
  scoreDelta: number | null;
  streak: StreakStats;
  daysWritten: number;
  /** Oldest first, one point per day, ending with today. */
  trend: TrendPoint[];
  /** Pass this to pickMessage to get the sentence for the screen. */
  context: MessageContext;
}

interface Save {
  dayId: DayId;
  revision: DayRevision;
}

function firstPassOf(day: ScoreDay): DayRevision | undefined {
  return day.revisions.find((revision) => revision.n === 1);
}

/** The days that counted toward the streak (see countsTowardStreak), in no particular order. */
export function streakDaysOf(days: readonly ScoreDay[], utcOffsetMinutes: number): DayId[] {
  return days.flatMap((day) => {
    const first = firstPassOf(day);
    return first !== undefined && countsTowardStreak(day.dayId, first, utcOffsetMinutes)
      ? [day.dayId]
      : [];
  });
}

/** The pass that was created last, over every day. */
function latestSave(days: readonly ScoreDay[]): Save | null {
  let latest: Save | null = null;
  for (const day of days) {
    for (const revision of day.revisions) {
      if (latest === null || revision.createdAt > latest.revision.createdAt) {
        latest = { dayId: day.dayId, revision };
      }
    }
  }
  return latest;
}

const usesTag = (revision: DayRevision): boolean => revision.mentions.length > 0;
const usesMinuteMarker = (revision: DayRevision): boolean =>
  timeBlocksOf(pageOf(contentOf(revision))).some(
    (block) => block.minute !== null && block.text.trim() !== '',
  );

/** Whether `save` is the only pass in the whole journal that does what `uses` looks for. */
function isFirstUse(
  days: readonly ScoreDay[],
  save: Save,
  uses: (revision: DayRevision) => boolean,
): boolean {
  if (!uses(save.revision)) return false;
  return !days.some((day) => day.revisions.some((other) => other !== save.revision && uses(other)));
}

/**
 * Everything the Insights screen shows, worked out from the user's passes alone: the score and
 * its weekly change, the streak, a 30-day trend and the message context (D-028, D-029).
 *
 * "Just saved" means the latest pass was created today. Only then does the context carry the
 * things that depend on a save (a milestone just reached, a later pass on an older day, a first
 * tag or minute marker, a welcome back), so an old celebration does not stay on screen for
 * weeks. A pass is dated by when its sitting began.
 */
export function buildInsights(input: InsightsInput): Insights {
  const { today, utcOffsetMinutes, days, library, olderStreakDays = [] } = input;

  const written = days
    .flatMap((day) => {
      const first = firstPassOf(day);
      return first !== undefined && compareDayIds(day.dayId, today) <= 0
        ? [{ dayId: day.dayId, first }]
        : [];
    })
    .sort((a, b) => compareDayIds(a.dayId, b.dayId));

  const streakDays = [...streakDaysOf(days, utcOffsetMinutes), ...olderStreakDays];
  const streak = computeStreak(streakDays, today);
  const score = recallScore(days, today);
  const scoreDelta = recallScoreDelta(days, today);

  const trend: TrendPoint[] = Array.from({ length: TREND_DAYS }, (_, i) => {
    const dayId = addDays(today, i - (TREND_DAYS - 1));
    return { dayId, score: recallScore(days, dayId) };
  });

  const save = latestSave(days);
  const savedToday =
    save !== null && dayIdFromUtc(save.revision.createdAt, utcOffsetMinutes) === today;

  // The streak before the latest save: without the day that save started, if it did.
  let previousStreak: number | null = null;
  if (savedToday) {
    const before =
      save.revision.n === 1 ? streakDays.filter((id) => id !== save.dayId) : streakDays;
    previousStreak = computeStreak(before, today).currentStreak;
  }

  const laterPass =
    savedToday && save.revision.n > 1 && compareDayIds(save.dayId, today) < 0
      ? { dayId: save.dayId, addedWords: save.revision.addedWordCount }
      : null;

  // Days missed before today's activity, counted from the last day written before today.
  const lastBeforeToday = written.filter((entry) => compareDayIds(entry.dayId, today) < 0).pop();
  const awayDays =
    savedToday && lastBeforeToday !== undefined ? daysAway(lastBeforeToday.dayId, today) : null;

  // Today's first pass against the user's own average over the same 30 days the score uses.
  const todayEntry = written.find((entry) => entry.dayId === today);
  const windowStart = addDays(today, -(DETAIL_WINDOW_DAYS - 1));
  const windowWords = written
    .filter((entry) => compareDayIds(entry.dayId, windowStart) >= 0)
    .map((entry) => entry.first.wordCount);
  const todayDetail =
    todayEntry === undefined
      ? null
      : {
          words: todayEntry.first.wordCount,
          average: windowWords.reduce((sum, count) => sum + count, 0) / windowWords.length,
        };

  const firsts: MessageFirsts = {
    tag: savedToday && isFirstUse(days, save, usesTag),
    minuteMarker: savedToday && isFirstUse(days, save, usesMinuteMarker),
    libraryItem:
      library.itemCount === 1 &&
      library.lastSavedAt !== null &&
      dayIdFromUtc(library.lastSavedAt, utcOffsetMinutes) === today,
  };

  return {
    score,
    scoreDelta,
    streak,
    daysWritten: written.length,
    trend,
    context: {
      today,
      streak,
      previousStreak,
      score,
      scoreDelta,
      daysWritten: written.length,
      writtenToday: todayEntry !== undefined,
      todayDetail,
      laterPass,
      awayDays,
      firsts,
    },
  };
}
