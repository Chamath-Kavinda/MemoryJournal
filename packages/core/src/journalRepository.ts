import type {
  DayId,
  DayMeta,
  DayRevision,
  EpochMs,
  LibraryItem,
  LibraryRevision,
  Tag,
  TagCategory,
  TutorialProgress,
  UserSettings,
  UserStats,
} from './types';

/** One save of a day: the revision, the day's metadata and, when a sitting ran out, the revision to close. */
export interface DaySave {
  dayId: DayId;
  revision: DayRevision;
  meta: DayMeta;
  /** The earlier revision whose sitting ended without being closed, with the time it ended. */
  close?: { n: number; closedAt: EpochMs };
}

/**
 * The one door every screen uses to read and write a journal. `LocalRepository` keeps a guest
 * journal on the device; a Firestore implementation serves a signed-in account. Both use the same
 * shapes as docs/build-documentation.md section 6.
 */
export interface JournalRepository {
  /**
   * Calls the listener after the journal changes, so screens refresh. Returns a function that
   * stops listening. A Firestore implementation also calls it when another device changes data.
   */
  subscribe(listener: () => void): () => void;

  listDays(): Promise<DayMeta[]>;
  getDay(dayId: DayId): Promise<DayMeta | null>;
  putDay(meta: DayMeta): Promise<void>;
  listRevisions(dayId: DayId): Promise<DayRevision[]>;
  putRevision(dayId: DayId, revision: DayRevision): Promise<void>;
  /**
   * Writes the revision and the day's metadata together (and closes the earlier sitting when
   * asked), so a day never appears without its text (section 6).
   */
  saveDay(save: DaySave): Promise<void>;

  listCategories(): Promise<TagCategory[]>;
  putCategory(category: TagCategory): Promise<void>;
  deleteCategory(categoryId: string): Promise<void>;

  listTags(): Promise<Tag[]>;
  putTag(tag: Tag): Promise<void>;
  deleteTag(tagId: string): Promise<void>;

  listLibrary(): Promise<LibraryItem[]>;
  putLibraryItem(item: LibraryItem): Promise<void>;
  /** Removes the item and all of its revisions. */
  deleteLibraryItem(itemId: string): Promise<void>;
  listLibraryRevisions(itemId: string): Promise<LibraryRevision[]>;
  putLibraryRevision(itemId: string, revision: LibraryRevision): Promise<void>;

  getTutorialProgress(): Promise<TutorialProgress>;
  putTutorialProgress(progress: TutorialProgress): Promise<void>;

  getSettings(): Promise<UserSettings | null>;
  putSettings(settings: UserSettings): Promise<void>;
  getStats(): Promise<UserStats | null>;
  putStats(stats: UserStats): Promise<void>;

  /** Latest device time ever seen, for the guest backwards-clock guard (section 15.6). */
  getLastSeenAt(): Promise<EpochMs | null>;
  putLastSeenAt(at: EpochMs): Promise<void>;

  /** Removes everything this repository holds. */
  clearAll(): Promise<void>;
}
