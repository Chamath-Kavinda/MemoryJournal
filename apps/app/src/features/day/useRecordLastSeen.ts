import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useJournalRepository } from '@/lib/journal';

import { recordSeen } from './guestClock';

/**
 * Records the latest time seen when the app launches and each time it comes back to the front,
 * so the guest backwards-clock guard has a recent time to compare with (section 15.6). Only the
 * on-device guest journal keeps this time; for a signed-in account the write does nothing,
 * because the server enforces the lock.
 */
export function useRecordLastSeen(): void {
  const repository = useJournalRepository();

  useEffect(() => {
    if (repository === null) return;
    void recordSeen(repository, Date.now());
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void recordSeen(repository, Date.now());
    });
    return () => subscription.remove();
  }, [repository]);
}
