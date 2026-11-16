import {
  DEFAULT_SETTINGS,
  readSettings,
  type JournalRepository,
  type ThemePreference,
  type UserSettings,
} from '@memory-journal/core';

import { watchJournal } from '@/lib/watchJournal';

const readCurrent = async (repository: JournalRepository): Promise<UserSettings> =>
  readSettings((await repository.getSettings()) ?? DEFAULT_SETTINGS);

/**
 * Live settings (section 6: `users/{uid}.settings` for an account, the device for a guest).
 * Missing or invalid values read as the defaults, so a journal with nothing stored yet reads as
 * reminder on and the dark theme.
 */
export function subscribeSettings(
  repository: JournalRepository,
  onChange: (settings: UserSettings) => void,
  onError: (error: Error) => void,
): () => void {
  return watchJournal(repository, () => readCurrent(repository), onChange, onError);
}

/**
 * Each setter reads the current settings, changes just one field and saves them. For an account
 * the user document is created at sign-in; if it is missing the write is refused and the caller
 * can tell the user.
 */
export async function setReminderEnabled(
  repository: JournalRepository,
  enabled: boolean,
): Promise<void> {
  await repository.putSettings({ ...(await readCurrent(repository)), reminderEnabled: enabled });
}

export async function setTheme(
  repository: JournalRepository,
  theme: ThemePreference,
): Promise<void> {
  await repository.putSettings({ ...(await readCurrent(repository)), theme });
}
