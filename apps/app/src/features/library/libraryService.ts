import {
  buildRevision,
  checkLibraryDraft,
  closeRevision,
  libraryContent,
  mentionedLibraryItems,
  newId,
  pickRevision,
  planSave,
  previousRevision,
  toDayRevision,
  toLibraryRevision,
  type DayId,
  type EpochMs,
  type JournalRepository,
  type LibraryItem,
  type LibraryItemType,
  type LibraryRevision,
  type MentionedLibraryItem,
} from '@memory-journal/core';

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Runs `read` now and again whenever the journal changes. A slow read that is overtaken by a
 * newer one is dropped, so a screen never goes back to older data.
 */
function watch<T>(
  repository: JournalRepository,
  read: () => Promise<T>,
  onChange: (value: T) => void,
  onError: (error: Error) => void,
): () => void {
  let active = true;
  let latest = 0;

  const load = (): void => {
    const current = ++latest;
    read().then(
      (value) => {
        if (active && current === latest) onChange(value);
      },
      (error: unknown) => {
        if (active && current === latest) onError(asError(error));
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

/** Reports the whole library now and whenever it changes, for a guest or a signed-in user. */
export function subscribeLibrary(
  repository: JournalRepository,
  onChange: (items: LibraryItem[]) => void,
  onError: (error: Error) => void,
): () => void {
  return watch(repository, () => repository.listLibrary(), onChange, onError);
}

/**
 * Adds a movie or book with an empty page. Returns its id at once, before the write is
 * confirmed; `saved` settles when it is.
 */
export function createLibraryItem(
  repository: JournalRepository,
  draft: { type: LibraryItemType; title: string; date: DayId | null },
  now: EpochMs = Date.now(),
): { id: string; saved: Promise<void> } {
  const id = newId();
  const item: LibraryItem = {
    id,
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
  return { id, saved: repository.putLibraryItem(item) };
}

/** Changes the title and the date. The page text and its revisions are not touched. */
export async function updateLibraryItemInfo(
  repository: JournalRepository,
  itemId: string,
  info: { title: string; date: DayId | null },
): Promise<void> {
  const checked = checkLibraryDraft({
    type: 'movie',
    title: info.title,
    date: info.date ?? '',
  });
  if (!checked.ok) throw new Error(`Invalid library item: ${checked.error}`);
  // Read the item again, so a page saved a moment ago is not overwritten with older text.
  const current = (await repository.listLibrary()).find((item) => item.id === itemId);
  if (current === undefined) throw new Error('This item no longer exists.');
  await repository.putLibraryItem({
    ...current,
    title: checked.value.title,
    date: checked.value.date,
  });
}

/**
 * Deletes the item and all of its saved passes. Callers must ask the person first (section
 * 15.10).
 */
export function deleteLibraryItem(repository: JournalRepository, itemId: string): Promise<void> {
  return repository.deleteLibraryItem(itemId);
}

/** Everything the item screen needs to know about the passes already saved for a page. */
export interface LibraryHistory {
  item: LibraryItem | null;
  /** Saved passes, oldest first. */
  revisions: LibraryRevision[];
  /** True while a save made on this device has not been confirmed yet. Never true for a guest. */
  hasPendingWrites: boolean;
}

/** Reports one item and its passes, now and whenever the journal changes. */
export function subscribeLibraryHistory(
  repository: JournalRepository,
  itemId: string,
  onChange: (history: LibraryHistory) => void,
  onError: (error: Error) => void,
): () => void {
  return watch(
    repository,
    async () => {
      const [items, revisions] = await Promise.all([
        repository.listLibrary(),
        repository.listLibraryRevisions(itemId),
      ]);
      return {
        item: items.find((item) => item.id === itemId) ?? null,
        // Numbered order, whatever order the repository returned them in.
        revisions: [...revisions].sort((a, b) => a.n - b.n),
        hasPendingWrites: repository.hasPendingWrites(),
      };
    },
    onChange,
    onError,
  );
}

export type LibrarySaveOutcome = { saved: false } | { saved: true; revision: LibraryRevision };

/**
 * Saves the page text as a revision with the same rules as a day (section 5.5): nothing
 * happens if the text did not change, the open revision is updated while the sitting is
 * going, and otherwise the next numbered revision is created. There is no 9 PM lock. The
 * revision and the item's summary fields are written together.
 */
export async function saveLibraryText(
  repository: JournalRepository,
  history: Pick<LibraryHistory, 'revisions'> & {
    item: LibraryItem;
    lastActivityAt: EpochMs | null;
  },
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

  const item: LibraryItem = {
    ...history.item,
    text: revision.text,
    latestRevision: revision.n,
    wordCount: revision.wordCount,
    updatedAt: now,
    mentions: revision.mentions,
  };
  const itemId = history.item.id;

  if (plan.action === 'create' && latest !== null && latest.closedAt === null) {
    // The last sitting ran out without the screen being closed; it ended when it went quiet.
    const ended = closeRevision(latest, history.lastActivityAt ?? latest.createdAt);
    await repository.saveLibraryPage({
      itemId,
      revision,
      item,
      close: { n: latest.n, closedAt: ended.closedAt as EpochMs },
    });
  } else {
    await repository.saveLibraryPage({ itemId, revision, item });
  }
  return { saved: true, revision };
}

/** Ends the sitting of an open revision, which makes it immutable. */
export async function closeLibrarySitting(
  repository: JournalRepository,
  itemId: string,
  revision: LibraryRevision,
  now: EpochMs,
): Promise<void> {
  const closed = closeRevision(toDayRevision(revision), now);
  await repository.putLibraryRevision(itemId, { ...revision, closedAt: closed.closedAt });
}

/**
 * Reports the movies and books whose latest pass mentions a tag, newest first. The item
 * summaries carry the tag ids (D-025), so no page text is read.
 */
export function subscribeMentionedLibraryItems(
  repository: JournalRepository,
  tagId: string,
  onChange: (items: MentionedLibraryItem[]) => void,
  onError: (error: Error) => void,
): () => void {
  return watch(
    repository,
    async () => {
      return mentionedLibraryItems(await repository.listLibrary(), tagId);
    },
    onChange,
    onError,
  );
}
