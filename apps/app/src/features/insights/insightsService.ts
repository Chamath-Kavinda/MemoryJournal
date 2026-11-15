import {
  INSIGHTS_MAX_WRITTEN_DAYS,
  STREAK_MIN_WORDS,
  countsTowardStreak,
  type DayId,
  type DayRevision,
  type InsightsInput,
  type LibrarySummary,
  type ScoreDay,
} from '@memory-journal/core';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { z } from 'zod';

import { revisionSchema } from '@/features/day/revisionService';
import { getFirebase } from '@/lib/firebase';

const dayMetaSchema = z.object({
  date: z.string(),
  latestRevision: z.number().int().min(1),
  wordCount: z.number(),
  firstWrittenAt: z.number(),
});
type DayMetaRow = z.infer<typeof dayMetaSchema>;

const libraryMetaSchema = z.object({ updatedAt: z.number() });

async function readRevisions(uid: string, dayId: DayId): Promise<DayRevision[]> {
  const snapshot = await getDocs(
    // Document ids are text ("10" sorts before "2"), so the order comes from the field.
    query(collection(getFirebase().db, 'users', uid, 'days', dayId, 'revisions'), orderBy('n')),
  );
  return snapshot.docs.flatMap((document) => {
    const parsed = revisionSchema.safeParse(document.data());
    return parsed.success ? [parsed.data] : [];
  });
}

/**
 * Whether an older day counted toward the streak, read as cheaply as possible. The day's metadata
 * holds when revision 1 was saved, which rules most days out. When the day has only one pass, the
 * metadata also holds its word count; only a day with later passes needs revision 1 itself,
 * because the metadata's word count belongs to the latest pass (D-027).
 */
async function olderDayCounted(
  uid: string,
  meta: DayMetaRow,
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
  const snapshot = await getDoc(
    doc(getFirebase().db, 'users', uid, 'days', meta.date, 'revisions', '1'),
  );
  const first = revisionSchema.safeParse(snapshot.data());
  return first.success && countsTowardStreak(meta.date, first.data, utcOffsetMinutes);
}

/**
 * Reads what the Insights screen works from (D-029): every pass of the most recent written days,
 * which feeds the score and the trend; for older days only whether they counted toward the streak;
 * and a summary of the library. Journal text is read on the device and goes nowhere else.
 * Works offline when Firestore has the data in its local cache.
 */
export async function loadInsightsInput(
  uid: string,
  today: DayId,
  utcOffsetMinutes: number,
): Promise<InsightsInput> {
  const { db } = getFirebase();
  const [daySnapshot, librarySnapshot] = await Promise.all([
    getDocs(
      query(
        collection(db, 'users', uid, 'days'),
        where('date', '<=', today),
        orderBy('date', 'desc'),
      ),
    ),
    getDocs(collection(db, 'users', uid, 'library')),
  ]);

  // Newest first, so the first days are the ones read in full.
  const metas = daySnapshot.docs.flatMap((document) => {
    const parsed = dayMetaSchema.safeParse(document.data());
    return parsed.success ? [parsed.data] : [];
  });
  const recent = metas.slice(0, INSIGHTS_MAX_WRITTEN_DAYS);
  const older = metas.slice(INSIGHTS_MAX_WRITTEN_DAYS);

  const [days, counted] = await Promise.all([
    Promise.all(
      recent.map(async (meta): Promise<ScoreDay> => ({
        dayId: meta.date,
        revisions: await readRevisions(uid, meta.date),
      })),
    ),
    Promise.all(
      older.map(async (meta) =>
        (await olderDayCounted(uid, meta, utcOffsetMinutes)) ? [meta.date] : [],
      ),
    ),
  ]);

  const savedTimes = librarySnapshot.docs.flatMap((document) => {
    const parsed = libraryMetaSchema.safeParse(document.data());
    return parsed.success ? [parsed.data.updatedAt] : [];
  });
  const library: LibrarySummary = {
    itemCount: savedTimes.length,
    lastSavedAt: savedTimes.length === 0 ? null : Math.max(...savedTimes),
  };

  return { today, utcOffsetMinutes, days, olderStreakDays: counted.flat(), library };
}
