import { isValidDayId, compareDayIds } from './time';
import type { DayContent } from './revisions';
import type { DayId, DayRevision, LibraryItem, LibraryItemType, LibraryRevision } from './types';

/** Longest title a movie or book may have. */
export const LIBRARY_TITLE_MAX = 120;

export const LIBRARY_TYPES: readonly LibraryItemType[] = ['movie', 'book'];

export function libraryTypeLabel(type: LibraryItemType, plural = false): string {
  if (type === 'movie') return plural ? 'Movies' : 'Movie';
  return plural ? 'Books' : 'Book';
}

// ---------------------------------------------------------------------------
// Draft checks
// ---------------------------------------------------------------------------

export interface LibraryItemDraft {
  type: LibraryItemType;
  title: string;
  /** Date watched or read as typed (`yyyy-MM-dd`), or empty for none. */
  date: string;
}

export type LibraryDraftResult =
  | { ok: true; value: { type: LibraryItemType; title: string; date: DayId | null } }
  | { ok: false; error: 'title-empty' | 'title-too-long' | 'date-invalid' };

/** Checks what the person typed for a new or edited item and returns its clean form. */
export function checkLibraryDraft(draft: LibraryItemDraft): LibraryDraftResult {
  const title = draft.title.trim().replace(/\s+/g, ' ');
  if (title === '') return { ok: false, error: 'title-empty' };
  if (title.length > LIBRARY_TITLE_MAX) return { ok: false, error: 'title-too-long' };
  const date = draft.date.trim();
  if (date !== '' && !isValidDayId(date)) return { ok: false, error: 'date-invalid' };
  return { ok: true, value: { type: draft.type, title, date: date === '' ? null : date } };
}

export function libraryDraftMessage(error: Exclude<LibraryDraftResult, { ok: true }>['error']) {
  switch (error) {
    case 'title-empty':
      return 'Give it a title.';
    case 'title-too-long':
      return `Titles can have at most ${LIBRARY_TITLE_MAX} characters.`;
    case 'date-invalid':
      return 'Use a real date written as yyyy-mm-dd, or leave it empty.';
  }
}

// ---------------------------------------------------------------------------
// Pages share the revision rules of days (section 5.5)
// ---------------------------------------------------------------------------

/** A page has one block of text and no time sections, so it is a day with free notes only. */
export function libraryContent(text: string): DayContent {
  return { freeNotes: text, blocks: [] };
}

/** The day-shaped view of a page revision, so the day helpers (planSave and others) apply. */
export function toDayRevision(revision: LibraryRevision): DayRevision {
  return {
    n: revision.n,
    createdAt: revision.createdAt,
    closedAt: revision.closedAt,
    kind: revision.kind,
    freeNotes: revision.text,
    blocks: [],
    mentions: revision.mentions,
    wordCount: revision.wordCount,
    addedWordCount: revision.addedWordCount,
  };
}

/** The stored form of a revision built by `buildRevision` for a page. */
export function toLibraryRevision(revision: DayRevision): LibraryRevision {
  return {
    n: revision.n,
    createdAt: revision.createdAt,
    closedAt: revision.closedAt,
    kind: revision.kind,
    text: revision.freeNotes,
    mentions: revision.mentions,
    wordCount: revision.wordCount,
    addedWordCount: revision.addedWordCount,
  };
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

/** Items of one type, most recently changed first, then by title. */
export function libraryItemsOfType<T extends Pick<LibraryItem, 'type' | 'title' | 'updatedAt'>>(
  items: readonly T[],
  type: LibraryItemType,
): T[] {
  return items
    .filter((item) => item.type === type)
    .sort((a, b) => b.updatedAt - a.updatedAt || a.title.localeCompare(b.title));
}

/** A movie or book that mentions a tag, as the tag screen lists it. */
export interface MentionedLibraryItem {
  itemId: string;
  type: LibraryItemType;
  title: string;
  /** Date watched or read, if set. */
  date: DayId | null;
  wordCount: number;
  updatedAt: number;
}

/**
 * The library items whose latest pass mentions the tag, newest first: by the date watched or
 * read when set, otherwise by when the page last changed. An item appears once.
 */
export function mentionedLibraryItems(
  items: ReadonlyArray<
    Pick<LibraryItem, 'id' | 'type' | 'title' | 'date' | 'wordCount' | 'updatedAt'> & {
      mentions?: string[];
    }
  >,
  tagId: string,
): MentionedLibraryItem[] {
  const byId = new Map<string, MentionedLibraryItem>();
  for (const item of items) {
    if (item.mentions?.includes(tagId)) {
      byId.set(item.id, {
        itemId: item.id,
        type: item.type,
        title: item.title,
        date: item.date,
        wordCount: item.wordCount,
        updatedAt: item.updatedAt,
      });
    }
  }
  return [...byId.values()].sort((a, b) => {
    // Dated items come first, newest date first; the rest follow, newest change first.
    if (a.date !== null && b.date !== null && a.date !== b.date) {
      return compareDayIds(b.date, a.date);
    }
    if ((a.date === null) !== (b.date === null)) return a.date === null ? 1 : -1;
    return b.updatedAt - a.updatedAt || a.title.localeCompare(b.title);
  });
}
