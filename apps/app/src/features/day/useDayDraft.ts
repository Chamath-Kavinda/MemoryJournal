import { contentEquals, emptyContent, isValidDayId, type DayContent } from '@memory-journal/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { clearDraft, loadDraft, saveDraft, type KeyValueStorage } from './draftStore';

/** How long typing may go on before the draft is written to the device (section 5.3). */
export const DRAFT_SAVE_DELAY_MS = 3000;

export type DraftSaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface DayDraft {
  content: DayContent;
  /** Replaces the draft text and schedules a local save. */
  setContent: (next: DayContent) => void;
  /**
   * Starts the draft from text that is already saved (the latest revision), but only when the
   * device has no stored draft and nothing has been typed yet. It is not written as a draft.
   */
  seed: (initial: DayContent) => void;
  /**
   * Called after `saved` has been saved as a revision: the stored draft is removed, unless
   * typing has gone on since, in which case the newer text stays as the draft.
   */
  discard: (saved: DayContent) => void;
  /** False until the stored draft has been read, so a stored draft is never overwritten. */
  ready: boolean;
  saveState: DraftSaveState;
}

interface Options {
  uid: string | undefined;
  dayId: string;
  storage: KeyValueStorage;
  delayMs?: number;
  /** Tells a usable id from a bad one. Days use real dates; other pages bring their own check. */
  isValidId?: (id: string) => boolean;
}

interface Actions {
  seed: (initial: DayContent) => void;
  discard: (saved: DayContent) => void;
}

/**
 * The text being written for a day, kept on the device. It is read when the day opens and
 * written at most every `delayMs` while typing, and also when the app goes to the background
 * or the screen closes, so nothing typed is lost. A day with no text has no stored draft.
 * Saving the draft as a revision happens in the Day screen, which then calls `discard`.
 */
export function useDayDraft({
  uid,
  dayId,
  storage,
  delayMs = DRAFT_SAVE_DELAY_MS,
  isValidId = isValidDayId,
}: Options): DayDraft {
  const [content, setContentState] = useState<DayContent>(emptyContent);
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<DraftSaveState>('idle');
  // Edits arrive faster than saves, so the newest text lives in a ref.
  const latest = useRef<DayContent>(content);
  const schedule = useRef<(() => void) | null>(null);
  const actions = useRef<Actions | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let dirty = false;
    let loaded = false;
    let touched = false;
    let hadStoredDraft = false;
    // Writes go one after another, so an older write can never land after a newer one.
    let queue: Promise<void> = Promise.resolve();

    const reset = emptyContent();
    latest.current = reset;
    setContentState(reset);
    setSaveState('idle');
    setReady(false);
    schedule.current = null;
    actions.current = null;

    if (!uid || !isValidId(dayId)) return;

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
      touched = true;
      dirty = true;
      timer ??= setTimeout(writeNow, delayMs);
    };

    actions.current = {
      seed: (initial) => {
        if (!loaded || touched || hadStoredDraft) return;
        latest.current = initial;
        setContentState(initial);
      },
      discard: (saved) => {
        // Typing went on while the revision was being saved: that newer text is still a draft.
        if (!contentEquals(latest.current, saved)) return;
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
        dirty = false;
        queue = queue
          .then(() => clearDraft(storage, uid, dayId))
          .then(
            () => {
              if (!cancelled) setSaveState('idle');
            },
            // A draft that could not be removed equals the saved text, so it does no harm.
            () => {},
          );
      },
    };

    loadDraft(storage, uid, dayId).then(
      (draft) => {
        if (cancelled) return;
        hadStoredDraft = draft !== null;
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
      actions.current = null;
      writeNow();
    };
  }, [uid, dayId, storage, delayMs, isValidId]);

  const setContent = useCallback((next: DayContent) => {
    latest.current = next;
    setContentState(next);
    schedule.current?.();
  }, []);

  const seed = useCallback((initial: DayContent) => actions.current?.seed(initial), []);
  const discard = useCallback((saved: DayContent) => actions.current?.discard(saved), []);

  return { content, setContent, seed, discard, ready, saveState };
}
