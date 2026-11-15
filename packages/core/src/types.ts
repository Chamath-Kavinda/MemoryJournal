/**
 * Domain types for Memory Journal. They mirror the Firestore data model in
 * docs/build-documentation.md section 6, but stay free of any Firebase types:
 * all timestamps are epoch milliseconds (UTC). Platform adapters convert
 * between these and Firestore Timestamps.
 */

/** Local calendar date in `yyyy-MM-dd`. */
export type DayId = string;

/** Epoch milliseconds (UTC). */
export type EpochMs = number;

export type ThemePreference = 'system' | 'light' | 'dark';

export interface UserStats {
  currentStreak: number;
  longestStreak: number;
  lastStreakDay: DayId | null;
  freezeCount: number;
  recallScore: number;
  scoreUpdatedAt: EpochMs | null;
}

export interface UserSettings {
  reminderEnabled: boolean;
  theme: ThemePreference;
}

/** `users/{uid}` */
export interface UserProfile {
  displayName: string;
  email: string;
  /** IANA time zone name, for example `Asia/Colombo`. */
  timeZone: string;
  /** Offset of local time from UTC in minutes, for example 330 for UTC+05:30. */
  utcOffsetMinutes: number;
  createdAt: EpochMs;
  stats: UserStats;
  settings: UserSettings;
}

/** `users/{uid}/days/{dayId}`: metadata only, used for fast calendar rendering. */
export interface DayMeta {
  date: DayId;
  latestRevision: number;
  wordCount: number;
  updatedAt: EpochMs;
  firstWrittenAt: EpochMs;
  /**
   * Ids of tags mentioned in the latest revision, so a tag can find its days without reading
   * revisions. Days saved before this field existed have none.
   */
  mentions?: string[];
}

/** `first` is revision 1 of a day; every later pass is `later`. */
export type RevisionKind = 'first' | 'later';

/**
 * One piece of text inside a day. A block with `minute: null` belongs to the
 * whole hour; a block with a minute is a minute marker such as `:25`.
 */
export interface DayBlock {
  /** 0 to 23. */
  hour: number;
  /** 0 to 59, or null for text that belongs to the hour as a whole. */
  minute: number | null;
  text: string;
}

/** `users/{uid}/days/{dayId}/revisions/{n}` */
export interface DayRevision {
  /** Revision number, starting at 1. */
  n: number;
  createdAt: EpochMs;
  /** Set when the sitting ends. A closed revision is immutable. */
  closedAt: EpochMs | null;
  kind: RevisionKind;
  /** Things the user remembers but cannot place in time. */
  freeNotes: string;
  blocks: DayBlock[];
  /** Ids of tags mentioned in this revision. */
  mentions: string[];
  wordCount: number;
  /** Words that were not present in the previous revision. */
  addedWordCount: number;
}

/** `users/{uid}/tagCategories/{categoryId}` */
export interface TagCategory {
  id: string;
  name: string;
  isDefault: boolean;
  order: number;
}

/** `users/{uid}/tags/{tagId}` */
export interface Tag {
  id: string;
  name: string;
  categoryId: string;
  note: string | null;
  aliases: string[];
  createdAt: EpochMs;
}

export type LibraryItemType = 'movie' | 'book';

/** `users/{uid}/library/{itemId}` */
export interface LibraryItem {
  id: string;
  type: LibraryItemType;
  title: string;
  /** Date watched or read, if the user set one. */
  date: DayId | null;
  text: string;
  latestRevision: number;
  updatedAt: EpochMs;
  /** Words in the latest pass, for lists. */
  wordCount: number;
  /** Ids of tags mentioned in the latest pass, so a tag finds its items with one query (D-025). */
  mentions: string[];
}

/** `users/{uid}/library/{itemId}/revisions/{n}` */
export interface LibraryRevision {
  n: number;
  createdAt: EpochMs;
  /** Set when the sitting ends. A closed revision is immutable (D-025). */
  closedAt: EpochMs | null;
  kind: RevisionKind;
  text: string;
  mentions: string[];
  wordCount: number;
  /** Words that were not present in the previous revision. */
  addedWordCount: number;
}

/** `users/{uid}/progress/tutorials` */
export interface TutorialProgress {
  completed: string[];
}
