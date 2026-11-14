import { emptyContent, isValidDayId, type DayContent } from '@memory-journal/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { loadDraft, saveDraft, type KeyValueStorage } from './draftStore';

/** How long typing may go on before the draft is written to the device (section 5.3). */
export const DRAFT_SAVE_DELAY_MS = 3000;

export type DraftSaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface DayDraft {
  content: DayContent;
  /** Replaces the draft text and schedules a local save. */
  setContent: (next: DayContent) => void;
  /** False until the stored draft has been read, so a stored draft is never overwritten. */
  ready: boolean;
  saveState: DraftSaveState;
}

interface Options {
  uid: string | undefined;
  dayId: string;
  storage: KeyValueStorage;
  delayMs?: number;
}

/**
 * The text being written for a day, kept on the device. It is read when the day opens and
 * written at most every `delayMs` while typing, and also when the app goes to the background
 * or the screen closes, so nothing typed is lost. A day with no text has no stored draft.
 * Saving the draft as a revision comes in commit 22.
 */
export function useDayDraft({
  uid,
  dayId,
  storage,
  delayMs = DRAFT_SAVE_DELAY_MS,
}: Options): DayDraft {
  const [content, setContentState] = useState<DayContent>(emptyContent);
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<DraftSaveState>('idle');
  // Edits arrive faster than saves, so the newest text lives in a ref.
  const latest = useRef<DayContent>(content);
  const schedule = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let dirty = false;
    let loaded = false;
    // Writes go one after another, so an older write can never land after a newer one.
    let queue: Promise<void> = Promise.resolve();

    const reset = emptyContent();
    latest.current = reset;
    setContentState(reset);
    setSaveState('idle');
    setReady(false);
    schedule.current = null;

    if (!uid || !isValidDayId(dayId)) return;

    const writeNow = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (!dirty) return;
      dirty = false;
      const toSave = latest.current;
      if (!cancelled) setSaveState('saving');
      queue = queue
        .then(() => saveDraft(storage, uid, dayId, toSave, Date.now()))
        .then(
          () => {
            if (!cancelled) setSaveState('saved');
          },
          () => {
            // Keep the text marked as unsaved so the next change, or leaving, tries again.
            dirty = true;
            if (!cancelled) setSaveState('error');
          },
        );
    };

    schedule.current = () => {
      if (!loaded) return;
      dirty = true;
      timer ??= setTimeout(writeNow, delayMs);
    };

    loadDraft(storage, uid, dayId).then(
      (draft) => {
        if (cancelled) return;
        const start = draft?.content ?? emptyContent();
        latest.current = start;
        setContentState(start);
        loaded = true;
        setReady(true);
      },
      () => {
        // The stored draft could not be read. Writing must still work, so start empty.
        if (cancelled) return;
        loaded = true;
        setSaveState('error');
        setReady(true);
      },
    );

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') writeNow();
    });

    return () => {
      cancelled = true;
      subscription.remove();
      schedule.current = null;
      writeNow();
    };
  }, [uid, dayId, storage, delayMs]);

  const setContent = useCallback((next: DayContent) => {
    latest.current = next;
    setContentState(next);
    schedule.current?.();
  }, []);

  return { content, setContent, ready, saveState };
}
