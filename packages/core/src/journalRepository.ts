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

/**
 * The one door every screen uses to read and write a journal. `LocalRepository` keeps a guest
 * journal on the device; a Firestore implementation serves a signed-in account. Both use the same
 * shapes as docs/build-documentation.md section 6.
 */
export interface JournalRepository {
  listDays(): Promise<DayMeta[]>;
  getDay(dayId: DayId): Promise<DayMeta | null>;
  putDay(meta: DayMeta): Promise<void>;
  listRevisions(dayId: DayId): Promise<DayRevision[]>;
  putRevision(dayId: DayId, revision: DayRevision): Promise<void>;

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
