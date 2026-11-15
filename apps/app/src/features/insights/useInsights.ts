import { buildInsights, type DayId, type Insights } from '@memory-journal/core';
import { useCallback, useEffect, useState } from 'react';

import { useAuthStore } from '@/features/auth/authStore';
import { deviceZone } from '@/features/profile/profileService';

import { loadInsightsInput } from './insightsService';

export type InsightsStatus = 'loading' | 'ready' | 'error';

interface State {
  insights: Insights | null;
  status: InsightsStatus;
}

/**
 * The recall score, streak, trend and message context for the signed-in user, worked out on this
 * device. It is read again when the day changes or `reload` is called; the numbers from the last
 * successful read stay on screen while a new read is running or after it failed.
 */
export function useInsights(today: DayId): State & { reload: () => void } {
  const uid = useAuthStore((s) => s.user?.uid);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ insights: null, status: 'loading' });

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    setState((current) => ({ insights: current.insights, status: 'loading' }));
    loadInsightsInput(uid, today, deviceZone(Date.now()).utcOffsetMinutes)
      .then((input) => {
        if (!cancelled) setState({ insights: buildInsights(input), status: 'ready' });
      })
      .catch(() => {
        if (!cancelled) setState((current) => ({ insights: current.insights, status: 'error' }));
      });
    return () => {
      cancelled = true;
    };
  }, [uid, today, attempt]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);
  return { ...state, reload };
}
