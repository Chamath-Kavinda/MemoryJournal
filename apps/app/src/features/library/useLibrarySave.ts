import {
  libraryContent,
  type DayContent,
  type EpochMs,
  type JournalRepository,
} from '@memory-journal/core';
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
  /** Saves the text on screen as a revision. Resolves to true when the save went through. */
  save: () => Promise<boolean>;
  /** True while a save has been sent and has not been confirmed yet. */
  saving: boolean;
  /** True when the last save was refused or failed. Cleared by the next save. */
  failed: boolean;
}

interface Options {
  /** The guest journal or the signed-in account's journal; null while that is not known yet. */
  repository: JournalRepository | null;
  /** Whose draft this is on the device: the account id, or a fixed name for the guest. */
  owner: string;
  itemId: string;
  /** The saved passes, or null while they are not known yet. */
  history: LibraryHistory | null;
  /** The text on screen. */
  text: string;
  discardDraft: (saved: DayContent) => void;
  storage: KeyValueStorage;
  /**
   * True once the item is deleted: closing the screen then writes nothing, so a deleted item
   * is never brought back by the save at the end of the screen's life.
   */
  disabled?: boolean;
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
    const { repository, history, text, discardDraft } = live.current;
    if (!repository || !history || history.item === null) return false;
    setPending((count) => count + 1);
    setFailed(false);
    try {
      await saveLibraryText(
        repository,
        { item: history.item, revisions: history.revisions, lastActivityAt: lastSaveOf(history) },
        text,
        Date.now(),
      );
      discardDraft(libraryContent(text));
      return true;
    } catch {
      setFailed(true);
      return false;
    } finally {
      setPending((count) => count - 1);
    }
  }, []);

  const { repository, owner, itemId } = options;
  useEffect(() => {
    return () => {
      const { history, text, storage, disabled } = live.current;
      const item = history?.item ?? null;
      if (disabled || !repository || !history || item === null) return;
      void (async () => {
        try {
          const now = Date.now();
          const outcome = await saveLibraryText(
            repository,
            {
              item,
              revisions: history.revisions,
              lastActivityAt: lastSaveOf(history),
            },
            text,
            now,
          );
          const open = outcome.saved
            ? outcome.revision
            : (history.revisions[history.revisions.length - 1] ?? null);
          if (open !== null && open.closedAt === null) {
            await closeLibrarySitting(repository, itemId, open, now);
          }
          if (outcome.saved) await clearDraft(storage, owner, libraryDraftId(itemId));
        } catch {
          // The text is still in the draft on the device, so it is saved on the next visit.
        }
      })();
    };
  }, [repository, owner, itemId]);

  return { save, saving: pending > 0, failed };
}
