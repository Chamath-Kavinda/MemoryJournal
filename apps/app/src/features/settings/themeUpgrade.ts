import type { JournalRepository, UserSettings } from '@memory-journal/core';

import type { KeyValueStorage } from '@/features/day/draftStore';

import { setTheme } from './settingsService';

/**
 * Device flag for the one-time theme reset (section 15.7, upgrade rule). v0.1.0 defaulted to
 * System, so someone upgrading may still have that stored; v0.2.0 sets Dark once and after that
 * respects whatever they choose.
 */
export const THEME_DEFAULT_V2_KEY = 'themeDefaultV2';

/**
 * Sets the theme to Dark the first time v0.2.0 runs on this device, then records the flag.
 * Returns true only when the stored theme was actually changed.
 *
 * The theme is written before the flag, so a failed write is retried at the next launch instead
 * of being lost. If the flag cannot be read nothing happens, because resetting again would
 * override a choice the person already made. A fresh install already reads as Dark, so it only
 * records the flag.
 */
export async function applyThemeDefaultV2(
  storage: KeyValueStorage,
  repository: JournalRepository,
  current: UserSettings,
): Promise<boolean> {
  try {
    if ((await storage.getItem(THEME_DEFAULT_V2_KEY)) !== null) return false;
  } catch {
    return false;
  }

  const needsReset = current.theme !== 'dark';
  try {
    if (needsReset) await setTheme(repository, 'dark');
  } catch {
    // The settings could not be saved (for example an account document that is not there yet).
    // Leave the flag unset so the reset is tried again next time.
    return false;
  }

  try {
    await storage.setItem(THEME_DEFAULT_V2_KEY, 'done');
  } catch {
    // Without the flag the reset may repeat once more; that is better than never recording it.
  }
  return needsReset;
}
