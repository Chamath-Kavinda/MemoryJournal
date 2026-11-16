import { useEffect } from 'react';

import { draftStorage } from '@/features/day/draftStorage';
import { useJournalRepository } from '@/lib/journal';

import type { SettingsState } from './useSettings';
import { applyThemeDefaultV2 } from './themeUpgrade';

/**
 * Runs the one-time Dark reset once the settings of whoever is using the app have been read.
 * It does nothing while loading or after a read error, and the device flag stops it from ever
 * running a second time (section 15.7).
 */
export function useThemeDefaultV2(state: SettingsState): void {
  const repository = useJournalRepository();
  const ready = state.status === 'ready';
  const settings = state.settings;

  useEffect(() => {
    if (!ready || !repository) return;
    void applyThemeDefaultV2(draftStorage, repository, settings);
    // Only the moment the settings become ready matters; the flag covers every later run.
  }, [ready, repository]);
}
