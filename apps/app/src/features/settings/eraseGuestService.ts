import type { JournalRepository } from '@memory-journal/core';

import { clearUserDrafts } from '@/features/day/draftStorage';
import { GUEST_DRAFT_OWNER } from '@/features/day/draftStore';
import { remindersSupported, syncReminder } from '@/features/reminder/reminderService';

export type EraseResult = { status: 'erased' } | { status: 'error'; message: string };

/**
 * Erases the guest journal from this device (docs section 15.6, point 11): every day, revision,
 * tag, library page, lesson, setting and stat the repository holds, the unsaved drafts, and the
 * daily reminder. A guest has no account and nothing in the cloud, so nothing else is touched and
 * no network is needed. Running it again after a failure is safe.
 */
export async function eraseGuestData(repository: JournalRepository): Promise<EraseResult> {
  try {
    await repository.clearAll();
    await clearUserDrafts(GUEST_DRAFT_OWNER);
    if (remindersSupported) await syncReminder(false).catch(() => undefined);
    return { status: 'erased' };
  } catch (error) {
    return {
      status: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'Something went wrong while erasing. Try again; it is safe to repeat.',
    };
  }
}
