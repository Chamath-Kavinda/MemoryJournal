import { DEFAULT_SETTINGS, type UserSettings } from '@memory-journal/core';
import { useEffect, useState } from 'react';

import { useAuthStore } from '@/features/auth/authStore';

import { subscribeSettings } from './settingsService';

export type SettingsStatus = 'loading' | 'ready' | 'error';

export interface SettingsState {
  status: SettingsStatus;
  settings: UserSettings;
}

const LOADING: SettingsState = { status: 'loading', settings: DEFAULT_SETTINGS };

/**
 * Whether the daily reminder should be scheduled right now. Until the stored setting has been
 * read it is off, so a person who turned the reminder off is not reminded for a moment at start
 * up. If the setting cannot be read at all it falls back to the default (on), as section 5.8
 * asks for a reminder unless the person turned it off.
 */
export function reminderWanted(state: SettingsState): boolean {
  if (state.status === 'loading') return false;
  return state.settings.reminderEnabled;
}

/** The signed-in user's settings, kept up to date. Signed out, it stays on the defaults. */
export function useSettings(): SettingsState {
  const uid = useAuthStore((s) => (s.status === 'signed-in' ? (s.user?.uid ?? null) : null));
  const [state, setState] = useState<SettingsState>(LOADING);

  useEffect(() => {
    setState(LOADING);
    if (!uid) return;
    return subscribeSettings(
      uid,
      (settings) => setState({ status: 'ready', settings }),
      () => setState({ status: 'error', settings: DEFAULT_SETTINGS }),
    );
  }, [uid]);

  return state;
}
