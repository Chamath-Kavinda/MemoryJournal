import {
  buildRevision,
  closeRevision,
  pickRevision,
  planSave,
  previousRevision,
  type DayContent,
  type DayId,
  type DayRevision,
  type EpochMs,
} from '@memory-journal/core';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { z } from 'zod';

import { getFirebase } from '@/lib/firebase';

const revisionSchema = z.object({
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

const dayMetaSchema = z.object({ updatedAt: z.number() });

/** Everything the Day screen needs to know about the passes already saved for a day. */
export interface DayHistory {
  /** Saved passes, oldest first. Passes that do not match the expected shape are left out. */
  revisions: DayRevision[];
  /** When the day was last saved, used to tell whether a sitting is still open. */
  lastActivityAt: EpochMs | null;
  /** True while a save is on this device but not yet confirmed by the server. */
  hasPendingWrites: boolean;
}

function revisionRef(uid: string, dayId: DayId, n: number) {
  return doc(getFirebase().db, 'users', uid, 'days', dayId, 'revisions', String(n));
}

/**
 * Listens to the saved passes of one day and to the day's last save time. The callback
 * first fires once both are known. Works offline: Firestore serves its local cache, and
 * a save made offline shows up here at once, marked as pending until it syncs.
 */
export function subscribeDayHistory(
  uid: string,
  dayId: DayId,
  onChange: (history: DayHistory) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const { db } = getFirebase();
  let revisions: DayRevision[] | null = null;
  let hasPendingWrites = false;
  let lastActivityAt: EpochMs | null = null;
  let metaKnown = false;

  const emit = () => {
    if (revisions === null || !metaKnown) return;
    onChange({ revisions, lastActivityAt, hasPendingWrites });
  };

  const stopRevisions = onSnapshot(
    // Document ids are text ("10" sorts before "2"), so the order comes from the field.
    query(collection(db, 'users', uid, 'days', dayId, 'revisions'), orderBy('n')),
    (snapshot) => {
      revisions = snapshot.docs.flatMap((document) => {
        const parsed = revisionSchema.safeParse(document.data());
        return parsed.success ? [parsed.data] : [];
      });
      hasPendingWrites = snapshot.metadata.hasPendingWrites;
      emit();
    },
    onError,
  );

  const stopMeta = onSnapshot(
    doc(db, 'users', uid, 'days', dayId),
    (snapshot) => {
      const parsed = dayMetaSchema.safeParse(snapshot.data());
      lastActivityAt = parsed.success ? parsed.data.updatedAt : null;
      metaKnown = true;
      emit();
    },
    onError,
  );

  return () => {
    stopRevisions();
    stopMeta();
  };
}

export type SaveOutcome = { saved: false } | { saved: true; revision: DayRevision };

/**
 * Saves the text of a day as a revision, following the rules of section 5.3:
 * nothing happens if the text did not change, the open revision is updated while the
 * sitting is still going, and otherwise the next numbered revision is created.
 * The revision and the day's metadata are written together, so the calendar never shows
 * a day without its text. When a new sitting starts after the last one ran out, the old
 * revision is closed in the same write. Resolves when the server has confirmed it; while
 * offline it waits until the connection returns, and the saved text is already visible
 * through `subscribeDayHistory` in the meantime.
 */
export async function saveDayContent(
  uid: string,
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

  const firstWrittenAt = pickRevision(history.revisions, 1)?.createdAt ?? now;
  const batch = writeBatch(getFirebase().db);

  if (plan.action === 'create' && latest !== null && latest.closedAt === null) {
    // The last sitting ran out without the screen being closed; it ended when it went quiet.
    const ended = closeRevision(latest, history.lastActivityAt ?? latest.createdAt);
    batch.update(revisionRef(uid, dayId, latest.n), { closedAt: ended.closedAt });
  }

  batch.set(revisionRef(uid, dayId, revision.n), revision);
  batch.set(doc(getFirebase().db, 'users', uid, 'days', dayId), {
    date: dayId,
    latestRevision: revision.n,
    wordCount: revision.wordCount,
    updatedAt: now,
    firstWrittenAt,
  });
  await batch.commit();
  return { saved: true, revision };
}

/** Ends the sitting of an open revision, which makes it immutable (section 7.1). */
export async function closeSitting(
  uid: string,
  dayId: DayId,
  revision: DayRevision,
  now: EpochMs,
): Promise<void> {
  const closed = closeRevision(revision, now);
  await updateDoc(revisionRef(uid, dayId, revision.n), { closedAt: closed.closedAt });
}
