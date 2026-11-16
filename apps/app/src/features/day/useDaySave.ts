import {
  pickRevision,
  type DayContent,
  type DayId,
  type JournalRepository,
} from '@memory-journal/core';
import { useCallback, useEffect, useRef, useState } from 'react';

import { clearDraft, type KeyValueStorage } from './draftStore';
import { recordSeen } from './guestClock';

import { closeSitting, saveDayContent, type DayHistory } from './revisionService';

export interface DaySave {
  /**
   * Saves the text on screen as a revision. Does nothing if it did not change. Resolves to true
   * only when a new revision was written, so callers can react to a real save.
   */
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
  dayId: DayId;
  /** The saved passes, or null while they are not known yet. */
  history: DayHistory | null;
  /** The text on screen and what to do once it is saved. */
  content: DayContent;
  discardDraft: (saved: DayContent) => void;
  /** False while today is locked or the day cannot be written. */
  editable: boolean;
  storage: KeyValueStorage;
}

/**
 * Saving a day as a revision. Pressing Save commits a revision when the text changed. When
 * the screen closes, unsaved text is saved the same way and the sitting is closed, which makes
 * the revision immutable (section 5.3). The draft on the device is removed once its text is
 * confirmed saved, never before, so a refused or offline save loses nothing.
 */
export function useDaySave(options: Options): DaySave {
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(false);
  // The close at the end of the screen's life must see the newest values, not the first ones.
  const live = useRef(options);
  useEffect(() => {
    live.current = options;
  });

  const save = useCallback(async (): Promise<boolean> => {
    const { repository, dayId, history, content, discardDraft, editable } = live.current;
    if (!repository || !history || !editable) return false;
    setPending((count) => count + 1);
    setFailed(false);
    try {
      const now = Date.now();
      const outcome = await saveDayContent(repository, dayId, history, content, now);
      discardDraft(content);
      // The latest time seen moves forward with every save (section 15.6).
      void recordSeen(repository, now);
      return outcome.saved;
    } catch {
      setFailed(true);
      return false;
    } finally {
      setPending((count) => count - 1);
    }
  }, []);

  const { repository, owner, dayId } = options;
  useEffect(() => {
    return () => {
      const { history, content, editable, storage } = live.current;
      if (!repository || !history || !editable) return;
      void (async () => {
        try {
          const now = Date.now();
          const outcome = await saveDayContent(repository, dayId, history, content, now);
          const open = outcome.saved ? outcome.revision : pickRevision(history.revisions, 'latest');
          if (open !== null && open.closedAt === null) {
            await closeSitting(repository, dayId, open, now);
          }
          if (outcome.saved) await clearDraft(storage, owner, dayId);
        } catch {
          // The text is still in the draft on the device, so it is saved on the next visit.
        }
      })();
    };
  }, [repository, owner, dayId]);

  return { save, saving: pending > 0, failed };
}
