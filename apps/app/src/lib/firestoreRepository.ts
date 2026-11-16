import {
  cleanCompleted,
  readSettings,
  type DayId,
  type DayMeta,
  type DayRange,
  type DayRevision,
  type DaySave,
  type EpochMs,
  type JournalRepository,
  type LibraryItem,
  type LibrarySave,
  type LibraryRevision,
  type Tag,
  type TagCategory,
  type TutorialProgress,
  type UserSettings,
  type UserStats,
} from '@memory-journal/core';
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type CollectionReference,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import { z } from 'zod';

import { getFirebase } from '@/lib/firebase';

const dayMetaSchema = z.object({
  date: z.string(),
  latestRevision: z.number(),
  wordCount: z.number(),
  updatedAt: z.number(),
  firstWrittenAt: z.number(),
  // Days saved before tag mentions existed have none (D-024).
  mentions: z.array(z.string()).optional(),
});

const dayRevisionSchema = z.object({
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

const categorySchema = z.object({
  name: z.string(),
  isDefault: z.boolean(),
  order: z.number(),
});

const tagSchema = z.object({
  name: z.string(),
  categoryId: z.string(),
  note: z.string().nullable(),
  aliases: z.array(z.string()),
  createdAt: z.number(),
});

const libraryItemSchema = z.object({
  type: z.enum(['movie', 'book']),
  title: z.string(),
  date: z.string().nullable(),
  text: z.string(),
  latestRevision: z.number().int().min(0),
  updatedAt: z.number(),
  wordCount: z.number(),
  mentions: z.array(z.string()),
});

const libraryRevisionSchema = z.object({
  n: z.number().int().min(1),
  createdAt: z.number(),
  closedAt: z.number().nullable(),
  kind: z.enum(['first', 'later']),
  text: z.string(),
  mentions: z.array(z.string()),
  wordCount: z.number(),
  addedWordCount: z.number(),
});

const statsSchema = z.object({
  currentStreak: z.number(),
  longestStreak: z.number(),
  lastStreakDay: z.string().nullable(),
  freezeCount: z.number(),
  recallScore: z.number(),
  scoreUpdatedAt: z.number().nullable(),
});

/** Firestore refuses undefined values, and days saved before tag mentions existed have none. */
function storedDay(meta: z.infer<typeof dayMetaSchema>): DayMeta {
  const { mentions, ...rest } = meta;
  return mentions === undefined ? rest : { ...rest, mentions };
}

/** Splits a document's own id off, because Firestore keeps ids outside the stored fields. */
function withoutId<T extends { id: string }>(value: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = value;
  return rest;
}

/**
 * The signed-in journal, stored in Firestore under `users/{uid}` as described in
 * docs/build-documentation.md section 6. It keeps the same paths, shapes and write rules the
 * services used before the repository existed, and works offline through Firestore's own cache.
 * Documents with an unexpected shape are left out of every list, as before.
 *
 * `subscribe` listens to the collections that hold the journal and tells listeners when
 * something changes, including a change made on another device. A write made here tells them at
 * once, then again when the server confirms it.
 */
export class FirestoreRepository implements JournalRepository {
  private readonly listeners = new Set<() => void>();
  private stopListening: Unsubscribe[] = [];

  constructor(
    private readonly uid: string,
    private readonly db: Firestore = getFirebase().db,
    private readonly onError: (error: Error) => void = () => undefined,
  ) {}

  private notify(): void {
    for (const listener of [...this.listeners]) listener();
  }

  private pendingWrites = 0;

  hasPendingWrites(): boolean {
    return this.pendingWrites > 0;
  }

  /** Runs a write, telling listeners when it is queued and again when it settles. */
  private async write(action: () => Promise<void>): Promise<void> {
    this.pendingWrites += 1;
    const pending = action();
    this.notify();
    try {
      await pending;
    } finally {
      this.pendingWrites -= 1;
      this.notify();
    }
  }

  private col(...segments: string[]): CollectionReference {
    return collection(this.db, 'users', this.uid, ...segments);
  }

  private userRef() {
    return doc(this.db, 'users', this.uid);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    if (this.listeners.size === 1) this.startListening();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.stopAll();
    };
  }

  private startListening(): void {
    // The first snapshot is what the screen already loaded, so only later ones count.
    const track = (
      attach: (onNext: () => void, onError: (error: Error) => void) => Unsubscribe,
    ): Unsubscribe => {
      let first = true;
      return attach(
        () => {
          if (first) first = false;
          else this.notify();
        },
        (error) => this.onError(error),
      );
    };
    this.stopListening = [
      track((next, fail) => onSnapshot(this.col('days'), next, fail)),
      track((next, fail) => onSnapshot(this.col('tagCategories'), next, fail)),
      track((next, fail) => onSnapshot(this.col('tags'), next, fail)),
      track((next, fail) => onSnapshot(this.col('library'), next, fail)),
      track((next, fail) => onSnapshot(this.userRef(), next, fail)),
      track((next, fail) =>
        onSnapshot(doc(this.db, 'users', this.uid, 'progress', 'tutorials'), next, fail),
      ),
    ];
  }

  private stopAll(): void {
    for (const stop of this.stopListening) stop();
    this.stopListening = [];
  }

  async listDays(range?: DayRange): Promise<DayMeta[]> {
    // Day ids are dates written as year-month-day, so their text order is date order.
    const source = range
      ? query(
          this.col('days'),
          where(documentId(), '>=', range.first),
          where(documentId(), '<=', range.last),
        )
      : this.col('days');
    const snapshot = await getDocs(source);
    return snapshot.docs.flatMap((document) => {
      const parsed = dayMetaSchema.safeParse(document.data());
      return parsed.success ? [storedDay(parsed.data)] : [];
    });
  }

  async getDay(dayId: DayId): Promise<DayMeta | null> {
    const snapshot = await getDoc(doc(this.col('days'), dayId));
    const parsed = dayMetaSchema.safeParse(snapshot.data());
    return parsed.success ? storedDay(parsed.data) : null;
  }

  putDay(meta: DayMeta): Promise<void> {
    return this.write(() => setDoc(doc(this.col('days'), meta.date), storedDay(meta)));
  }

  async listRevisions(dayId: DayId): Promise<DayRevision[]> {
    // Document ids are text ("10" sorts before "2"), so the order comes from the field.
    const snapshot = await getDocs(query(this.col('days', dayId, 'revisions'), orderBy('n')));
    return snapshot.docs.flatMap((document) => {
      const parsed = dayRevisionSchema.safeParse(document.data());
      return parsed.success ? [parsed.data] : [];
    });
  }

  putRevision(dayId: DayId, revision: DayRevision): Promise<void> {
    return this.write(() =>
      setDoc(doc(this.col('days', dayId, 'revisions'), String(revision.n)), revision),
    );
  }

  /** One batch, so the calendar never shows a day without its text. */
  saveDay({ dayId, revision, meta, close }: DaySave): Promise<void> {
    return this.write(() => {
      const batch = writeBatch(this.db);
      const revisions = this.col('days', dayId, 'revisions');
      if (close !== undefined) {
        batch.update(doc(revisions, String(close.n)), { closedAt: close.closedAt });
      }
      batch.set(doc(revisions, String(revision.n)), revision);
      batch.set(doc(this.col('days'), dayId), storedDay(meta));
      return batch.commit();
    });
  }

  async listCategories(): Promise<TagCategory[]> {
    const snapshot = await getDocs(this.col('tagCategories'));
    return snapshot.docs.flatMap((document) => {
      const parsed = categorySchema.safeParse(document.data());
      return parsed.success ? [{ id: document.id, ...parsed.data }] : [];
    });
  }

  putCategory(category: TagCategory): Promise<void> {
    return this.write(() =>
      setDoc(doc(this.col('tagCategories'), category.id), withoutId(category)),
    );
  }

  deleteCategory(categoryId: string): Promise<void> {
    return this.write(() => deleteDoc(doc(this.col('tagCategories'), categoryId)));
  }

  async listTags(): Promise<Tag[]> {
    const snapshot = await getDocs(this.col('tags'));
    return snapshot.docs.flatMap((document) => {
      const parsed = tagSchema.safeParse(document.data());
      return parsed.success ? [{ id: document.id, ...parsed.data }] : [];
    });
  }

  putTag(tag: Tag): Promise<void> {
    return this.write(() => setDoc(doc(this.col('tags'), tag.id), withoutId(tag)));
  }

  deleteTag(tagId: string): Promise<void> {
    return this.write(() => deleteDoc(doc(this.col('tags'), tagId)));
  }

  async listLibrary(): Promise<LibraryItem[]> {
    const snapshot = await getDocs(this.col('library'));
    return snapshot.docs.flatMap((document) => {
      const parsed = libraryItemSchema.safeParse(document.data());
      return parsed.success ? [{ id: document.id, ...parsed.data }] : [];
    });
  }

  putLibraryItem(item: LibraryItem): Promise<void> {
    return this.write(() => setDoc(doc(this.col('library'), item.id), withoutId(item)));
  }

  /** Firestore does not remove subcollections, so the revisions go in the same batch. */
  deleteLibraryItem(itemId: string): Promise<void> {
    return this.write(async () => {
      const revisions = await getDocs(this.col('library', itemId, 'revisions'));
      const batch = writeBatch(this.db);
      for (const document of revisions.docs) batch.delete(document.ref);
      batch.delete(doc(this.col('library'), itemId));
      await batch.commit();
    });
  }

  async listLibraryRevisions(itemId: string): Promise<LibraryRevision[]> {
    const snapshot = await getDocs(query(this.col('library', itemId, 'revisions'), orderBy('n')));
    return snapshot.docs.flatMap((document) => {
      const parsed = libraryRevisionSchema.safeParse(document.data());
      return parsed.success ? [parsed.data] : [];
    });
  }

  putLibraryRevision(itemId: string, revision: LibraryRevision): Promise<void> {
    return this.write(() =>
      setDoc(doc(this.col('library', itemId, 'revisions'), String(revision.n)), revision),
    );
  }

  /** One batch, so an item never shows text that has no revision. */
  saveLibraryPage({ itemId, revision, item, close }: LibrarySave): Promise<void> {
    return this.write(() => {
      const batch = writeBatch(this.db);
      const revisions = this.col('library', itemId, 'revisions');
      if (close !== undefined) {
        batch.update(doc(revisions, String(close.n)), { closedAt: close.closedAt });
      }
      batch.set(doc(revisions, String(revision.n)), revision);
      batch.set(doc(this.col('library'), item.id), withoutId(item));
      return batch.commit();
    });
  }

  async getTutorialProgress(): Promise<TutorialProgress> {
    const snapshot = await getDoc(doc(this.db, 'users', this.uid, 'progress', 'tutorials'));
    return { completed: cleanCompleted(snapshot.data()?.completed) };
  }

  putTutorialProgress(progress: TutorialProgress): Promise<void> {
    return this.write(() =>
      setDoc(
        doc(this.db, 'users', this.uid, 'progress', 'tutorials'),
        { completed: progress.completed },
        { merge: true },
      ),
    );
  }

  async getSettings(): Promise<UserSettings | null> {
    const raw: unknown = (await getDoc(this.userRef())).data()?.settings;
    return raw === undefined ? null : readSettings(raw);
  }

  /** Two fields, so a device that changes one setting does not overwrite the other. */
  putSettings(settings: UserSettings): Promise<void> {
    return this.write(() =>
      updateDoc(this.userRef(), {
        'settings.reminderEnabled': settings.reminderEnabled,
        'settings.theme': settings.theme,
      }),
    );
  }

  async getStats(): Promise<UserStats | null> {
    const parsed = statsSchema.safeParse((await getDoc(this.userRef())).data()?.stats);
    return parsed.success ? parsed.data : null;
  }

  putStats(stats: UserStats): Promise<void> {
    return this.write(() => updateDoc(this.userRef(), { stats }));
  }

  /** A signed-in user has the server clock and the security rules, so there is no guard to keep. */
  getLastSeenAt(): Promise<EpochMs | null> {
    return Promise.resolve(null);
  }

  putLastSeenAt(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Deliberately not supported: deleting an account's data is the job of the delete service,
   * which confirms with the user and removes the documents in batches.
   */
  clearAll(): Promise<void> {
    return Promise.reject(
      new Error('FirestoreRepository cannot clear an account; use the delete service.'),
    );
  }
}
