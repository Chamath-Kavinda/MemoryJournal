import {
  buildRevision,
  checkLibraryDraft,
  closeRevision,
  libraryContent,
  mentionedLibraryItems,
  pickRevision,
  planSave,
  previousRevision,
  toDayRevision,
  toLibraryRevision,
  type DayId,
  type EpochMs,
  type LibraryItem,
  type LibraryItemType,
  type LibraryRevision,
  type MentionedLibraryItem,
} from '@memory-journal/core';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { z } from 'zod';

import { getFirebase } from '@/lib/firebase';

const itemSchema = z.object({
  type: z.enum(['movie', 'book']),
  title: z.string(),
  date: z.string().nullable(),
  text: z.string(),
  latestRevision: z.number().int().min(0),
  updatedAt: z.number(),
  wordCount: z.number(),
  mentions: z.array(z.string()),
});

const revisionSchema = z.object({
  n: z.number().int().min(1),
  createdAt: z.number(),
  closedAt: z.number().nullable(),
  kind: z.enum(['first', 'later']),
  text: z.string(),
  mentions: z.array(z.string()),
  wordCount: z.number(),
  addedWordCount: z.number(),
});

// The tag screen needs no text, only these fields.
const mentionedItemSchema = itemSchema.pick({
  type: true,
  title: true,
  date: true,
  wordCount: true,
  updatedAt: true,
  mentions: true,
});

function libraryPath(uid: string) {
  return collection(getFirebase().db, 'users', uid, 'library');
}

function revisionRef(uid: string, itemId: string, n: number) {
  return doc(getFirebase().db, 'users', uid, 'library', itemId, 'revisions', String(n));
}

/** Listens to the whole library. Works offline; items with an unexpected shape are left out. */
export function subscribeLibrary(
  uid: string,
  onChange: (items: LibraryItem[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    libraryPath(uid),
    (snapshot) => {
      onChange(
        snapshot.docs.flatMap((document) => {
          const parsed = itemSchema.safeParse(document.data());
          return parsed.success ? [{ id: document.id, ...parsed.data }] : [];
        }),
      );
    },
    onError,
  );
}

/** Adds a movie or book with an empty page. Returns its id at once, before the server confirms. */
export function createLibraryItem(
  uid: string,
  draft: { type: LibraryItemType; title: string; date: DayId | null },
  now: EpochMs = Date.now(),
): { id: string; saved: Promise<void> } {
  const ref = doc(libraryPath(uid));
  const item: Omit<LibraryItem, 'id'> = {
    type: draft.type,
    title: draft.title,
    date: draft.date,
    text: '',
    latestRevision: 0,
    // Until the page is saved, this is when the item was added.
    updatedAt: now,
    wordCount: 0,
    mentions: [],
  };
  return { id: ref.id, saved: setDoc(ref, item) };
}

/** Changes the title and the date. The page text and its revisions are not touched. */
export async function updateLibraryItemInfo(
  uid: string,
  itemId: string,
  info: { title: string; date: DayId | null },
): Promise<void> {
  const checked = checkLibraryDraft({
    type: 'movie',
    title: info.title,
    date: info.date ?? '',
  });
  if (!checked.ok) throw new Error(`Invalid library item: ${checked.error}`);
  await updateDoc(doc(libraryPath(uid), itemId), {
    title: checked.value.title,
    date: checked.value.date,
  });
}

/** Everything the item screen needs to know about the passes already saved for a page. */
export interface LibraryHistory {
  item: LibraryItem | null;
  /** Saved passes, oldest first. Passes that do not match the expected shape are left out. */
  revisions: LibraryRevision[];
  /** True while a save is on this device but not yet confirmed by the server. */
  hasPendingWrites: boolean;
}

/** Listens to one item and its passes. The callback first fires once both are known. */
export function subscribeLibraryHistory(
  uid: string,
  itemId: string,
  onChange: (history: LibraryHistory) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const { db } = getFirebase();
  let item: LibraryItem | null | undefined;
  let revisions: LibraryRevision[] | undefined;
  let hasPendingWrites = false;

  const emit = () => {
    if (item === undefined || revisions === undefined) return;
    onChange({ item, revisions, hasPendingWrites });
  };

  const stopItem = onSnapshot(
    doc(db, 'users', uid, 'library', itemId),
    (snapshot) => {
      const parsed = itemSchema.safeParse(snapshot.data());
      item = parsed.success ? { id: snapshot.id, ...parsed.data } : null;
      emit();
    },
    onError,
  );

  const stopRevisions = onSnapshot(
    // Document ids are text ("10" sorts before "2"), so the order comes from the field.
    query(collection(db, 'users', uid, 'library', itemId, 'revisions'), orderBy('n')),
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

  return () => {
    stopItem();
    stopRevisions();
  };
}

export type LibrarySaveOutcome = { saved: false } | { saved: true; revision: LibraryRevision };

/**
 * Saves the page text as a revision with the same rules as a day (section 5.5): nothing
 * happens if the text did not change, the open revision is updated while the sitting is
 * going, and otherwise the next numbered revision is created. There is no 9 PM lock. The
 * revision and the item's summary fields are written together.
 */
export async function saveLibraryText(
  uid: string,
  itemId: string,
  history: Pick<LibraryHistory, 'revisions'> & { lastActivityAt: EpochMs | null },
  text: string,
  now: EpochMs,
): Promise<LibrarySaveOutcome> {
  const days = history.revisions.map(toDayRevision);
  const latest = pickRevision(days, 'latest');
  const content = libraryContent(text);
  const plan = planSave({ latest, lastActivityAt: history.lastActivityAt, content, now });
  if (plan.action === 'none') return { saved: false };

  const previous = plan.action === 'create' ? latest : previousRevision(days, plan.n);
  const built = buildRevision({
    plan,
    content,
    previous,
    existing: plan.action === 'update' ? latest : null,
    now,
  });
  const revision = toLibraryRevision(built);

  const batch = writeBatch(getFirebase().db);
  if (plan.action === 'create' && latest !== null && latest.closedAt === null) {
    // The last sitting ran out without the screen being closed; it ended when it went quiet.
    const ended = closeRevision(latest, history.lastActivityAt ?? latest.createdAt);
    batch.update(revisionRef(uid, itemId, latest.n), { closedAt: ended.closedAt });
  }
  batch.set(revisionRef(uid, itemId, revision.n), revision);
  batch.update(doc(libraryPath(uid), itemId), {
    text: revision.text,
    latestRevision: revision.n,
    wordCount: revision.wordCount,
    updatedAt: now,
    mentions: revision.mentions,
  });
  await batch.commit();
  return { saved: true, revision };
}

/** Ends the sitting of an open revision, which makes it immutable. */
export async function closeLibrarySitting(
  uid: string,
  itemId: string,
  revision: LibraryRevision,
  now: EpochMs,
): Promise<void> {
  const closed = closeRevision(toDayRevision(revision), now);
  await updateDoc(revisionRef(uid, itemId, revision.n), { closedAt: closed.closedAt });
}

/**
 * Listens to the movies and books whose latest pass mentions a tag. The item documents carry
 * the tag ids (D-025), so one query is enough and no page text is read.
 */
export function subscribeMentionedLibraryItems(
  uid: string,
  tagId: string,
  onChange: (items: MentionedLibraryItem[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(libraryPath(uid), where('mentions', 'array-contains', tagId)),
    (snapshot) => {
      const items = snapshot.docs.flatMap((document) => {
        const parsed = mentionedItemSchema.safeParse(document.data());
        return parsed.success ? [{ id: document.id, ...parsed.data }] : [];
      });
      onChange(mentionedLibraryItems(items, tagId));
    },
    onError,
  );
}
