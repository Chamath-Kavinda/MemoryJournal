import { pageOf } from './dayPage';
import { contentOf, countAddedWords } from './revisions';
import { timeBlocksOf } from './timeLines';
import { addDays, compareDayIds, daysBetween } from './time';
import type { DayId, DayRevision } from './types';

/** Points each component can give. They add up to 100 (build documentation section 8.1). */
export const SCORE_WEIGHTS = {
  detail: 30,
  coverage: 20,
  precision: 20,
  laterRecall: 15,
  consistency: 15,
} as const;

/** Revision 1 is compared with the user's own average over this many days, the day included. */
export const DETAIL_WINDOW_DAYS = 30;
/** A day with this many times the average (or more) earns the full Detail points. */
export const DETAIL_CAP_RATIO = 1.5;
/** Waking hours: Coverage is the hours with text out of this many. */
export const WAKING_HOURS = 16;
/** Minute markers plus tag mentions that earn the full Precision points. */
export const PRECISION_TARGET = 10;
/** Words added later that earn the full Later recall points. */
export const LATER_RECALL_TARGET_WORDS = 30;
/** Later passes only count once the day is older than this many days. */
export const LATER_RECALL_MIN_AGE_DAYS = 1;
/** Consistency looks at this many days, the day included. */
export const CONSISTENCY_WINDOW_DAYS = 14;
/** The displayed score is the mean of this many most recent written days. */
export const SMOOTHING_DAYS = 14;
/** The weekly change compares with the score this many days ago. */
export const DELTA_DAYS = 7;

/** A day for scoring: its id and the passes saved for it, in any order. */
export interface ScoreDay {
  dayId: DayId;
  revisions: readonly DayRevision[];
}

/** The points one day earns per component. Not rounded. */
export interface ScoreBreakdown {
  detail: number;
  coverage: number;
  precision: number;
  laterRecall: number;
  consistency: number;
  total: number;
}

function firstRevisionOf(day: ScoreDay): DayRevision | null {
  return day.revisions.find((revision) => revision.n === 1) ?? null;
}

/** Days on or before `today` that have a first pass, oldest first. Repeats of an id are ignored. */
function writtenDays(
  days: readonly ScoreDay[],
  today: DayId,
): { day: ScoreDay; first: DayRevision }[] {
  const seen = new Set<DayId>();
  const written: { day: ScoreDay; first: DayRevision }[] = [];
  for (const day of days) {
    if (seen.has(day.dayId) || compareDayIds(day.dayId, today) > 0) continue;
    const first = firstRevisionOf(day);
    if (first === null) continue;
    seen.add(day.dayId);
    written.push({ day, first });
  }
  return written.sort((a, b) => compareDayIds(a.day.dayId, b.day.dayId));
}

function between(dayId: DayId, from: DayId, to: DayId): boolean {
  return compareDayIds(dayId, from) >= 0 && compareDayIds(dayId, to) <= 0;
}

function scoreWritten(
  entry: { day: ScoreDay; first: DayRevision },
  written: readonly { day: ScoreDay; first: DayRevision }[],
  today: DayId,
): ScoreBreakdown {
  const { day, first } = entry;

  // Detail: revision 1 against the user's own average of the last 30 days.
  const detailStart = addDays(day.dayId, -(DETAIL_WINDOW_DAYS - 1));
  const recent = written.filter((other) => between(other.day.dayId, detailStart, day.dayId));
  const average = recent.reduce((sum, other) => sum + other.first.wordCount, 0) / recent.length;
  const ratio = average > 0 ? Math.min(first.wordCount / average, DETAIL_CAP_RATIO) : 0;
  const detail = (SCORE_WEIGHTS.detail * ratio) / DETAIL_CAP_RATIO;

  // Coverage: distinct hours that have a time line followed by text, out of the waking hours.
  // A pass is read through the day page, so legacy blocks and new time lines count the same way
  // (section 18.6). A page with no time lines has no coverage.
  const timeBlocks = timeBlocksOf(pageOf(contentOf(first))).filter(
    (block) => block.text.trim() !== '',
  );
  const hours = new Set(timeBlocks.map((block) => block.hour)).size;
  const coverage = (SCORE_WEIGHTS.coverage * Math.min(hours, WAKING_HOURS)) / WAKING_HOURS;

  // Precision: time lines with minutes plus tagged people, places and numbers.
  const markers = timeBlocks.filter((block) => block.minute !== null).length;
  const precisionCount = markers + new Set(first.mentions).size;
  const precision =
    (SCORE_WEIGHTS.precision * Math.min(precisionCount, PRECISION_TARGET)) / PRECISION_TARGET;

  // Later recall: words the newest pass has that the first pass did not, once the day is older
  // than a day. This is the net result, not the sum of every pass, so text that was added and
  // then deleted again earns nothing.
  const age = daysBetween(day.dayId, today);
  const latest = day.revisions.reduce(
    (newest, revision) => (revision.n > newest.n ? revision : newest),
    first,
  );
  const added =
    age > LATER_RECALL_MIN_AGE_DAYS && latest.n > first.n
      ? countAddedWords(contentOf(first), contentOf(latest))
      : 0;
  const laterRecall =
    (SCORE_WEIGHTS.laterRecall * Math.min(added, LATER_RECALL_TARGET_WORDS)) /
    LATER_RECALL_TARGET_WORDS;

  // Consistency: days written in the 14 days ending with this one.
  const consistencyStart = addDays(day.dayId, -(CONSISTENCY_WINDOW_DAYS - 1));
  const daysWritten = written.filter((other) =>
    between(other.day.dayId, consistencyStart, day.dayId),
  ).length;
  const consistency = (SCORE_WEIGHTS.consistency * daysWritten) / CONSISTENCY_WINDOW_DAYS;

  return {
    detail,
    coverage,
    precision,
    laterRecall,
    consistency,
    total: detail + coverage + precision + laterRecall + consistency,
  };
}

/**
 * The points one written day earns, as seen on `today`. Returns null for a day that has no first
 * pass or that is after `today`.
 */
export function scoreDay(
  days: readonly ScoreDay[],
  dayId: DayId,
  today: DayId,
): ScoreBreakdown | null {
  const written = writtenDays(days, today);
  const entry = written.find((candidate) => candidate.day.dayId === dayId);
  return entry === undefined ? null : scoreWritten(entry, written, today);
}

/**
 * The displayed recall score, 0 to 100: the mean of the scores of the last 14 written days on or
 * before `today`, rounded to a whole number. Null when no day has been written yet.
 */
export function recallScore(days: readonly ScoreDay[], today: DayId): number | null {
  const written = writtenDays(days, today);
  if (written.length === 0) return null;
  const latest = written.slice(-SMOOTHING_DAYS);
  const mean =
    latest.reduce((sum, entry) => sum + scoreWritten(entry, written, today).total, 0) /
    latest.length;
  return Math.round(mean);
}

/**
 * How the score changed compared with a week ago (positive is better). Null when there was no
 * score a week ago or there is none now.
 */
export function recallScoreDelta(days: readonly ScoreDay[], today: DayId): number | null {
  const now = recallScore(days, today);
  const before = recallScore(days, addDays(today, -DELTA_DAYS));
  return now === null || before === null ? null : now - before;
}
