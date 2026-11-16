import type { JournalRepository, LibraryItem, MentionedLibraryItem } from '@memory-journal/core';
import { useEffect, useState } from 'react';

import {
  subscribeLibrary,
  subscribeLibraryHistory,
  subscribeMentionedLibraryItems,
  type LibraryHistory,
} from './libraryService';

export type LoadStatus = 'loading' | 'ready' | 'error';

/**
 * The hooks below take the repository of whoever is using the app: the guest journal on the
 * device or the signed-in account. It is null while the app is still working out who that is,
 * so nothing is read yet.
 */

/** Live list of every movie and book. */
export function useLibrary(repository: JournalRepository | null): {
  items: LibraryItem[];
  status: LoadStatus;
} {
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setItems(null);
    setFailed(false);
    if (!repository) return;
    return subscribeLibrary(repository, setItems, () => setFailed(true));
  }, [repository]);

  let status: LoadStatus = 'ready';
  if (failed) status = 'error';
  else if (items === null) status = 'loading';
  return { items: items ?? [], status };
}

/** Live item and passes of one page. `history` is null until both are known. */
export function useLibraryHistory(
  repository: JournalRepository | null,
  itemId: string,
): { history: LibraryHistory | null; failed: boolean } {
  const [history, setHistory] = useState<LibraryHistory | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setHistory(null);
    setFailed(false);
    if (!repository || itemId === '') return;
    return subscribeLibraryHistory(repository, itemId, setHistory, () => setFailed(true));
  }, [repository, itemId]);

  return { history, failed };
}

/** Live list of the movies and books that mention a tag, newest first. */
export function useMentionedLibraryItems(
  repository: JournalRepository | null,
  tagId: string,
): { items: MentionedLibraryItem[]; status: LoadStatus } {
  const [items, setItems] = useState<MentionedLibraryItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setItems(null);
    setFailed(false);
    if (!repository || tagId === '') return;
    return subscribeMentionedLibraryItems(repository, tagId, setItems, () => setFailed(true));
  }, [repository, tagId]);

  let status: LoadStatus = 'ready';
  if (failed) status = 'error';
  else if (items === null) status = 'loading';
  return { items: items ?? [], status };
}
