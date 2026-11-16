import { buildInsights, type DayId, type Insights } from '@memory-journal/core';
import { useCallback, useEffect, useState } from 'react';

import { useJournalRepository } from '@/lib/journal';
import { deviceZone } from '@/features/profile/profileService';

import { loadInsightsInput } from './insightsService';

export type InsightsStatus = 'loading' | 'ready' | 'error';

interface State {
  insights: Insights | null;
  status: InsightsStatus;
}

/**
 * The recall score, streak, trend and message context for whoever is using the app (a guest on
 * this device or a signed-in account), worked out on this device. It is read again when the
 * journal in use or the day changes, or when `reload` is called; the numbers from the last
 * successful read stay on screen while a new read is running or after it failed. The numbers of
 * a previous journal are dropped when the journal changes, so one person's score is never shown
 * to another.
 */
export function useInsights(today: DayId): State & { reload: () => void } {
  const repository = useJournalRepository();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ insights: null, status: 'loading' });

  // A different journal (sign-in or sign-out) starts from nothing.
  useEffect(() => {
    setState({ insights: null, status: 'loading' });
  }, [repository]);

  useEffect(() => {
    if (!repository) return;
    let cancelled = false;
    setState((current) => ({ insights: current.insights, status: 'loading' }));
    loadInsightsInput(repository, today, deviceZone(Date.now()).utcOffsetMinutes)
      .then((input) => {
        if (!cancelled) setState({ insights: buildInsights(input), status: 'ready' });
      })
      .catch(() => {
        if (!cancelled) setState((current) => ({ insights: current.insights, status: 'error' }));
      });
    return () => {
      cancelled = true;
    };
  }, [repository, today, attempt]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);
  return { ...state, reload };
}
