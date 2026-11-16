import {
  buildRevision,
  closeRevision,
  pickRevision,
  planSave,
  previousRevision,
  type DayContent,
  type DayId,
  type DayMeta,
  type DayRevision,
  type EpochMs,
  type JournalRepository,
} from '@memory-journal/core';
import { z } from 'zod';

export const revisionSchema = z.object({
  n: z.number().int().min(1),
  createdAt: z.number(),
  closedAt: z.number().nullable(),
  kind: z.enum(['first', 'later']),
  freeNotes: z.string(),
  blocks: z.array(
    z.object({
      hour: z.number().int().min(0).max(23),
      minute: z.number().int().min(0).max(59).nullable(),
      text: z.string(),
    }),
  ),
  mentions: z.array(z.string()),
  wordCount: z.number(),
  addedWordCount: z.number(),
});

/** Everything the Day screen needs to know about the passes already saved for a day. */
export interface DayHistory {
  /** Saved passes, oldest first. */
  revisions: DayRevision[];
  /** When the day was last saved, used to tell whether a sitting is still open. */
  lastActivityAt: EpochMs | null;
  /** True while a save made on this device has not been confirmed yet. Never true for a guest. */
  hasPendingWrites: boolean;
}

/**
 * Reports the saved passes of one day and the day's last save time, now and again whenever
 * the journal changes. A save made offline shows up here at once, marked as pending until it
 * is confirmed. A slow read that is overtaken by a newer one is dropped, so the screen never
 * goes back to older text.
 */
export function subscribeDayHistory(
  repository: JournalRepository,
  dayId: DayId,
  onChange: (history: DayHistory) => void,
  onError: (error: Error) => void,
): () => void {
  let active = true;
  let latest = 0;

  const load = (): void => {
    const read = ++latest;
    Promise.all([repository.listRevisions(dayId), repository.getDay(dayId)]).then(
      ([revisions, meta]) => {
        if (!active || read !== latest) return;
        onChange({
          // Numbered order, whatever order the repository returned them in.
          revisions: [...revisions].sort((a, b) => a.n - b.n),
          lastActivityAt: meta?.updatedAt ?? null,
          hasPendingWrites: repository.hasPendingWrites(),
        });
      },
      (error: unknown) => {
        if (active && read === latest) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
      },
    );
  };

  load();
  const stop = repository.subscribe(load);
  return () => {
    active = false;
    stop();
  };
}

export type SaveOutcome = { saved: false } | { saved: true; revision: DayRevision };

/**
 * Saves the text of a day as a revision, following the rules of section 5.3:
 * nothing happens if the text did not change, the open revision is updated while the
 * sitting is still going, and otherwise the next numbered revision is created.
 * The revision and the day's metadata are written together, so the calendar never shows
 * a day without its text. When a new sitting starts after the last one ran out, the old
 * revision is closed in the same write. For a signed-in user this resolves when the server
 * has confirmed it; while offline it waits, and the saved text is already visible through
 * `subscribeDayHistory` in the meantime.
 */
export async function saveDayContent(
  repository: JournalRepository,
  dayId: DayId,
  history: Pick<DayHistory, 'revisions' | 'lastActivityAt'>,
  content: DayContent,
  now: EpochMs,
): Promise<SaveOutcome> {
  const latest = pickRevision(history.revisions, 'latest');
  const plan = planSave({ latest, lastActivityAt: history.lastActivityAt, content, now });
  if (plan.action === 'none') return { saved: false };

  const previous = plan.action === 'create' ? latest : previousRevision(history.revisions, plan.n);
  const revision = buildRevision({
    plan,
    content,
    previous,
    existing: plan.action === 'update' ? latest : null,
    now,
  });

  const meta: DayMeta = {
    date: dayId,
    latestRevision: revision.n,
    wordCount: revision.wordCount,
    updatedAt: now,
    firstWrittenAt: pickRevision(history.revisions, 1)?.createdAt ?? now,
    // The tags of the latest pass, so a tag can find its days with one query (D-024).
    mentions: revision.mentions,
  };

  if (plan.action === 'create' && latest !== null && latest.closedAt === null) {
    // The last sitting ran out without the screen being closed; it ended when it went quiet.
    const ended = closeRevision(latest, history.lastActivityAt ?? latest.createdAt);
    await repository.saveDay({
      dayId,
      revision,
      meta,
      close: { n: latest.n, closedAt: ended.closedAt as EpochMs },
    });
  } else {
    await repository.saveDay({ dayId, revision, meta });
  }
  return { saved: true, revision };
}

/** Ends the sitting of an open revision, which makes it immutable (section 7.1). */
export async function closeSitting(
  repository: JournalRepository,
  dayId: DayId,
  revision: DayRevision,
  now: EpochMs,
): Promise<void> {
  await repository.putRevision(dayId, closeRevision(revision, now));
}
