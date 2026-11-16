import type { Confirm } from '@/components/useConfirm';

import type { KeyValueStorage } from './draftStore';

/** Set once the guest has been shown the notice. It is not tied to an account or a day. */
export const FIRST_SAVE_NOTICE_KEY = 'guestFirstSaveNotice:v1';

/** The warning is the same note that Settings shows to a guest (section 15.6, points 11 and 12). */
export const FIRST_SAVE_NOTICE = {
  title: 'Saved on this device',
  message:
    'Stored on this device only. Sign in to back it up. Uninstalling the app or clearing its data removes a guest journal.',
  confirmLabel: 'Got it',
  notice: true,
} as const;

/**
 * Shows the one-time dialog the first time a guest saves a revision. The flag is written before
 * the dialog opens, so the notice can never appear twice, even if the app closes while it is up.
 * Any storage failure is swallowed: a notice must never get in the way of a save.
 */
export async function showFirstSaveNoticeOnce(
  storage: KeyValueStorage,
  confirm: Confirm,
): Promise<void> {
  try {
    if ((await storage.getItem(FIRST_SAVE_NOTICE_KEY)) !== null) return;
    await storage.setItem(FIRST_SAVE_NOTICE_KEY, 'shown');
  } catch {
    return;
  }
  await confirm(FIRST_SAVE_NOTICE);
}
