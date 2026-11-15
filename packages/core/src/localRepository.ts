import type { JournalRepository } from './journalRepository';
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

/** The small slice of AsyncStorage (or localStorage) that the guest journal needs. */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
}

const ROOT = 'guest:';
const DAY = `${ROOT}day:`;
const DAY_REV = `${ROOT}dayrev:`;
const CATEGORY = `${ROOT}category:`;
const TAG = `${ROOT}tag:`;
const LIB = `${ROOT}lib:`;
const LIB_REV = `${ROOT}librev:`;
const TUTORIALS = `${ROOT}tutorials`;
const SETTINGS = `${ROOT}settings`;
const STATS = `${ROOT}stats`;
const LAST_SEEN = `${ROOT}lastSeenAt`;

/**
 * The guest journal. One key per day, revision, tag and library item, so no single stored value
 * grows large. Revision keys end in a zero-padded number so they sort in order.
 */
export class LocalRepository implements JournalRepository {
  constructor(private readonly store: KeyValueStore) {}

  private async readAll<T>(prefix: string): Promise<T[]> {
    const keys = (await this.store.getAllKeys()).filter((key) => key.startsWith(prefix)).sort();
    const values = await Promise.all(keys.map((key) => this.store.getItem(key)));
    const items: T[] = [];
    for (const raw of values) {
      if (raw !== null) items.push(JSON.parse(raw) as T);
    }
    return items;
  }

  private async read<T>(key: string): Promise<T | null> {
    const raw = await this.store.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  }

  private write(key: string, value: unknown): Promise<void> {
    return this.store.setItem(key, JSON.stringify(value));
  }

  private async removeAll(prefix: string): Promise<void> {
    const keys = (await this.store.getAllKeys()).filter((key) => key.startsWith(prefix));
    await Promise.all(keys.map((key) => this.store.removeItem(key)));
  }

  private static pad(n: number): string {
    return String(n).padStart(6, '0');
  }

  listDays(): Promise<DayMeta[]> {
    return this.readAll<DayMeta>(DAY);
  }

  getDay(dayId: DayId): Promise<DayMeta | null> {
    return this.read<DayMeta>(`${DAY}${dayId}`);
  }

  putDay(meta: DayMeta): Promise<void> {
    return this.write(`${DAY}${meta.date}`, meta);
  }

  listRevisions(dayId: DayId): Promise<DayRevision[]> {
    return this.readAll<DayRevision>(`${DAY_REV}${dayId}:`);
  }

  putRevision(dayId: DayId, revision: DayRevision): Promise<void> {
    return this.write(`${DAY_REV}${dayId}:${LocalRepository.pad(revision.n)}`, revision);
  }

  listCategories(): Promise<TagCategory[]> {
    return this.readAll<TagCategory>(CATEGORY);
  }

  putCategory(category: TagCategory): Promise<void> {
    return this.write(`${CATEGORY}${category.id}`, category);
  }

  deleteCategory(categoryId: string): Promise<void> {
    return this.store.removeItem(`${CATEGORY}${categoryId}`);
  }

  listTags(): Promise<Tag[]> {
    return this.readAll<Tag>(TAG);
  }

  putTag(tag: Tag): Promise<void> {
    return this.write(`${TAG}${tag.id}`, tag);
  }

  deleteTag(tagId: string): Promise<void> {
    return this.store.removeItem(`${TAG}${tagId}`);
  }

  listLibrary(): Promise<LibraryItem[]> {
    return this.readAll<LibraryItem>(LIB);
  }

  putLibraryItem(item: LibraryItem): Promise<void> {
    return this.write(`${LIB}${item.id}`, item);
  }

  async deleteLibraryItem(itemId: string): Promise<void> {
    await this.removeAll(`${LIB_REV}${itemId}:`);
    await this.store.removeItem(`${LIB}${itemId}`);
  }

  listLibraryRevisions(itemId: string): Promise<LibraryRevision[]> {
    return this.readAll<LibraryRevision>(`${LIB_REV}${itemId}:`);
  }

  putLibraryRevision(itemId: string, revision: LibraryRevision): Promise<void> {
    return this.write(`${LIB_REV}${itemId}:${LocalRepository.pad(revision.n)}`, revision);
  }

  async getTutorialProgress(): Promise<TutorialProgress> {
    return (await this.read<TutorialProgress>(TUTORIALS)) ?? { completed: [] };
  }

  putTutorialProgress(progress: TutorialProgress): Promise<void> {
    return this.write(TUTORIALS, progress);
  }

  getSettings(): Promise<UserSettings | null> {
    return this.read<UserSettings>(SETTINGS);
  }

  putSettings(settings: UserSettings): Promise<void> {
    return this.write(SETTINGS, settings);
  }

  getStats(): Promise<UserStats | null> {
    return this.read<UserStats>(STATS);
  }

  putStats(stats: UserStats): Promise<void> {
    return this.write(STATS, stats);
  }

  getLastSeenAt(): Promise<EpochMs | null> {
    return this.read<EpochMs>(LAST_SEEN);
  }

  putLastSeenAt(at: EpochMs): Promise<void> {
    return this.write(LAST_SEEN, at);
  }

  clearAll(): Promise<void> {
    return this.removeAll(ROOT);
  }
}
