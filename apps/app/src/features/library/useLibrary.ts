import type { LibraryItem, MentionedLibraryItem } from '@memory-journal/core';
import { useEffect, useState } from 'react';

import {
  subscribeLibrary,
  subscribeLibraryHistory,
  subscribeMentionedLibraryItems,
  type LibraryHistory,
} from './libraryService';

export type LoadStatus = 'loading' | 'ready' | 'error';

/** Live list of every movie and book. */
export function useLibrary(uid: string | undefined): { items: LibraryItem[]; status: LoadStatus } {
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!uid) return;
    setItems(null);
    setFailed(false);
    return subscribeLibrary(uid, setItems, () => setFailed(true));
  }, [uid]);

  let status: LoadStatus = 'ready';
  if (failed) status = 'error';
  else if (items === null) status = 'loading';
  return { items: items ?? [], status };
}

/** Live item and passes of one page. `history` is null until both are known. */
export function useLibraryHistory(
  uid: string | undefined,
  itemId: string,
): { history: LibraryHistory | null; failed: boolean } {
  const [history, setHistory] = useState<LibraryHistory | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!uid || itemId === '') return;
    setHistory(null);
    setFailed(false);
    return subscribeLibraryHistory(uid, itemId, setHistory, () => setFailed(true));
  }, [uid, itemId]);

  return { history, failed };
}

/** Live list of the movies and books that mention a tag, newest first. */
export function useMentionedLibraryItems(
  uid: string | undefined,
  tagId: string,
): { items: MentionedLibraryItem[]; status: LoadStatus } {
  const [items, setItems] = useState<MentionedLibraryItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!uid || tagId === '') return;
    setItems(null);
    setFailed(false);
    return subscribeMentionedLibraryItems(uid, tagId, setItems, () => setFailed(true));
  }, [uid, tagId]);

  let status: LoadStatus = 'ready';
  if (failed) status = 'error';
  else if (items === null) status = 'loading';
  return { items: items ?? [], status };
}
