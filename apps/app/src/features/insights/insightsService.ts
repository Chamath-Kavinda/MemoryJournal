import {
  INSIGHTS_MAX_WRITTEN_DAYS,
  STREAK_MIN_WORDS,
  countsTowardStreak,
  type DayId,
  type DayMeta,
  type DayRevision,
  type InsightsInput,
  type JournalRepository,
  type LibrarySummary,
  type ScoreDay,
} from '@memory-journal/core';

/** The passes of a day, oldest first whatever order the repository returns them in. */
async function readRevisions(repository: JournalRepository, dayId: DayId): Promise<DayRevision[]> {
  const revisions = await repository.listRevisions(dayId);
  return [...revisions].sort((a, b) => a.n - b.n);
}

/**
 * Whether an older day counted toward the streak, read as cheaply as possible. The day's metadata
 * holds when revision 1 was saved, which rules most days out. When the day has only one pass, the
 * metadata also holds its word count; only a day with later passes needs revision 1 itself,
 * because the metadata's word count belongs to the latest pass (D-027).
 */
async function olderDayCounted(
  repository: JournalRepository,
  meta: DayMeta,
  utcOffsetMinutes: number,
): Promise<boolean> {
  const timing = { n: 1, createdAt: meta.firstWrittenAt };
  if (
    !countsTowardStreak(meta.date, { ...timing, wordCount: STREAK_MIN_WORDS }, utcOffsetMinutes)
  ) {
    return false;
  }
  if (meta.latestRevision === 1) {
    return countsTowardStreak(
      meta.date,
      { ...timing, wordCount: meta.wordCount },
      utcOffsetMinutes,
    );
  }
  const first = (await repository.listRevisions(meta.date)).find((revision) => revision.n === 1);
  return first !== undefined && countsTowardStreak(meta.date, first, utcOffsetMinutes);
}

/**
 * Reads what the Insights screen works from (D-029): every pass of the most recent written days,
 * which feeds the score and the trend; for older days only whether they counted toward the streak;
 * and a summary of the library. It reads through the journal repository, so it serves a guest's
 * journal on the device and a signed-in account alike. Journal text is read on the device and goes
 * nowhere else. Works offline.
 */
export async function loadInsightsInput(
  repository: JournalRepository,
  today: DayId,
  utcOffsetMinutes: number,
): Promise<InsightsInput> {
  const [allDays, libraryItems] = await Promise.all([
    repository.listDays(),
    repository.listLibrary(),
  ]);

  // Newest first, so the first days are the ones read in full. Days after today are not read.
  const metas = allDays
    .filter((meta) => meta.date <= today)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const recent = metas.slice(0, INSIGHTS_MAX_WRITTEN_DAYS);
  const older = metas.slice(INSIGHTS_MAX_WRITTEN_DAYS);

  const [days, counted] = await Promise.all([
    Promise.all(
      recent.map(async (meta): Promise<ScoreDay> => ({
        dayId: meta.date,
        revisions: await readRevisions(repository, meta.date),
      })),
    ),
    Promise.all(
      older.map(async (meta) =>
        (await olderDayCounted(repository, meta, utcOffsetMinutes)) ? [meta.date] : [],
      ),
    ),
  ]);

  const savedTimes = libraryItems.map((item) => item.updatedAt);
  const library: LibrarySummary = {
    itemCount: savedTimes.length,
    lastSavedAt: savedTimes.length === 0 ? null : Math.max(...savedTimes),
  };

  return { today, utcOffsetMinutes, days, olderStreakDays: counted.flat(), library };
}
