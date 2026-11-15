import { useCallback, useEffect, useState } from 'react';

import { useAuthStore } from '@/features/auth/authStore';

import { setLessonDone, subscribeProgress } from './learnService';

export type LearnProgressStatus = 'loading' | 'ready' | 'error';

/**
 * Live list of the lessons the signed-in user has finished. Lessons are bundled, so the screens
 * draw them straight away; only the ticks wait for this. `setDone` does not wait for the write:
 * Firestore shows the change at once and confirms it later, so it works offline. A refused write
 * is reported through `failed` until `dismissError` is called.
 */
export function useLearnProgress(): {
  completed: string[];
  status: LearnProgressStatus;
  failed: boolean;
  setDone: (lessonId: string, done: boolean) => void;
  dismissError: () => void;
} {
  const uid = useAuthStore((s) => s.user?.uid);
  const [completed, setCompleted] = useState<string[] | null>(null);
  const [subscriptionFailed, setSubscriptionFailed] = useState(false);
  const [writeFailed, setWriteFailed] = useState(false);

  useEffect(() => {
    if (!uid) return;
    setCompleted(null);
    setSubscriptionFailed(false);
    return subscribeProgress(uid, setCompleted, () => setSubscriptionFailed(true));
  }, [uid]);

  const setDone = useCallback(
    (lessonId: string, done: boolean) => {
      if (!uid) return;
      setLessonDone(uid, lessonId, done).catch(() => setWriteFailed(true));
    },
    [uid],
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
