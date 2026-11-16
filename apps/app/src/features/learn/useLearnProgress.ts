import { useCallback, useEffect, useState } from 'react';

import { useJournalRepository } from '@/lib/journal';

import { setLessonDone, subscribeProgress } from './learnService';

export type LearnProgressStatus = 'loading' | 'ready' | 'error';

/**
 * Live list of the lessons the user has finished, for a guest on this device or a signed-in
 * account. Lessons are bundled, so the screens draw them straight away; only the ticks wait for
 * this. `setDone` does not wait for the write. A refused write is reported through `failed` until
 * `dismissError` is called.
 */
export function useLearnProgress(): {
  completed: string[];
  status: LearnProgressStatus;
  failed: boolean;
  setDone: (lessonId: string, done: boolean) => void;
  dismissError: () => void;
} {
  const repository = useJournalRepository();
  const [completed, setCompleted] = useState<string[] | null>(null);
  const [subscriptionFailed, setSubscriptionFailed] = useState(false);
  const [writeFailed, setWriteFailed] = useState(false);

  useEffect(() => {
    // A different journal (sign-in or sign-out) starts from nothing.
    setCompleted(null);
    setSubscriptionFailed(false);
    if (!repository) return;
    return subscribeProgress(repository, setCompleted, () => setSubscriptionFailed(true));
  }, [repository]);

  const setDone = useCallback(
    (lessonId: string, done: boolean) => {
      if (!repository) return;
      setLessonDone(repository, lessonId, done).catch(() => setWriteFailed(true));
    },
    [repository],
  );
  const dismissError = useCallback(() => setWriteFailed(false), []);

  let status: LearnProgressStatus = 'ready';
  if (subscriptionFailed) status = 'error';
  else if (completed === null) status = 'loading';

  return {
    completed: completed ?? [],
    status,
    failed: writeFailed,
    setDone,
    dismissError,
  };
}
