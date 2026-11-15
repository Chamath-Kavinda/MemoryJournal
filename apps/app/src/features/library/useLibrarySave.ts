import { libraryContent, type DayContent, type EpochMs } from '@memory-journal/core';
import { useCallback, useEffect, useRef, useState } from 'react';

import { clearDraft, type KeyValueStorage } from '@/features/day/draftStore';

import { closeLibrarySitting, saveLibraryText, type LibraryHistory } from './libraryService';

const DRAFT_PREFIX = 'library:';

/** The id under which the device keeps the unsaved text of a page. It cannot clash with a day. */
export function libraryDraftId(itemId: string): string {
  return `${DRAFT_PREFIX}${itemId}`;
}

export function isLibraryDraftId(id: string): boolean {
  return id.startsWith(DRAFT_PREFIX) && id.length > DRAFT_PREFIX.length;
}

/** When the page was last saved, which is when its sitting last had activity. */
export function lastSaveOf(history: LibraryHistory): EpochMs | null {
  const { item } = history;
  return item !== null && item.latestRevision > 0 ? item.updatedAt : null;
}

export interface LibrarySave {
  /** Saves the text on screen as a revision. Does nothing if it did not change. */
  save: () => Promise<void>;
  /** True while a save has been sent and the server has not confirmed it yet. */
  saving: boolean;
  /** True when the last save was refused or failed. Cleared by the next save. */
  failed: boolean;
}

interface Options {
  uid: string | undefined;
  itemId: string;
  /** The saved passes, or null while they are not known yet. */
  history: LibraryHistory | null;
  /** The text on screen. */
  text: string;
  discardDraft: (saved: DayContent) => void;
  storage: KeyValueStorage;
}

/**
 * Saving a page as a revision, with the same rules as `useDaySave`: Save commits a revision
 * when the text changed, and closing the screen saves unsaved text and ends the sitting. The
 * draft on the device is removed only once its text is confirmed saved.
 */
export function useLibrarySave(options: Options): LibrarySave {
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(false);
  // The close at the end of the screen's life must see the newest values, not the first ones.
  const live = useRef(options);
  useEffect(() => {
    live.current = options;
  });

  const save = useCallback(async () => {
    const { uid, itemId, history, text, discardDraft } = live.current;
    if (!uid || !history || history.item === null) return;
    setPending((count) => count + 1);
    setFailed(false);
    try {
      await saveLibraryText(
        uid,
        itemId,
        { revisions: history.revisions, lastActivityAt: lastSaveOf(history) },
        text,
        Date.now(),
      );
      discardDraft(libraryContent(text));
    } catch {
      setFailed(true);
    } finally {
      setPending((count) => count - 1);
    }
  }, []);

  const { uid, itemId } = options;
  useEffect(() => {
    return () => {
      const { history, text, storage } = live.current;
      if (!uid || !history || history.item === null) return;
      void (async () => {
        try {
          const now = Date.now();
          const outcome = await saveLibraryText(
            uid,
            itemId,
            { revisions: history.revisions, lastActivityAt: lastSaveOf(history) },
            text,
            now,
          );
          const open = outcome.saved
            ? outcome.revision
            : (history.revisions[history.revisions.length - 1] ?? null);
          if (open !== null && open.closedAt === null) {
            await closeLibrarySitting(uid, itemId, open, now);
          }
          if (outcome.saved) await clearDraft(storage, uid, libraryDraftId(itemId));
        } catch {
          // The text is still in the draft on the device, so it is saved on the next visit.
        }
      })();
    };
  }, [uid, itemId]);

  return { save, saving: pending > 0, failed };
}
