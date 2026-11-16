import {
  countGuestJournal,
  mergeGuestJournal,
  type JournalRepository,
  type MergeResult,
} from '@memory-journal/core';

import type { PickResult, SignInResult } from '@/platform/auth/types';

/** The three steps of the progress card (docs section 15.16). */
export type SignInStep = 'signing-in' | 'adding' | 'cleaning';

/** What the person chose in the merge dialog. */
export type MergeDecision = 'merge' | 'export' | 'cancel';

export interface GuestCounts {
  days: number;
  tags: number;
  libraryItems: number;
}

export interface SignInFlowDeps {
  guest: JournalRepository;
  pickAccount: () => Promise<PickResult>;
  completeSignIn: (idToken: string) => Promise<SignInResult>;
  /** Shows the merge dialog (section 15.6, point 8). Called again after an export. */
  decide: (counts: GuestCounts) => Promise<MergeDecision>;
  /** Saves the guest journal as JSON. A failure is reported to the person by the caller. */
  exportGuest: () => Promise<void>;
  /**
   * Waits until the account is signed in as `uid` with its profile created, and returns the
   * account's journal and its UTC offset. Merge writes need the offset the rules will use.
   */
  openAccount: () => Promise<{ repository: JournalRepository; utcOffsetMinutes: number } | null>;
  onStep: (step: SignInStep) => void;
  now: () => number;
}

export type SignInFlowResult =
  /** The person did not finish. Nothing changed. */
  | { status: 'cancelled' }
  | { status: 'error'; message: string; step: SignInStep | 'picking' }
  /** Signed in with an empty guest journal, so there was nothing to merge. */
  | { status: 'signed-in' }
  /** Everything was added and the guest copy was removed from the device. */
  | { status: 'merged'; result: MergeResult }
  /** Signed in, but some entries were not added. The guest journal is still on the device. */
  | { status: 'partial'; result: MergeResult };

/**
 * Signs in from guest mode (docs section 15.6, points 7 and 8). The guest journal is only deleted
 * after the merge reports `complete` and every guest day can be read back from the account. If
 * anything is rejected or fails, it stays on the device and the caller offers Retry and Export.
 */
export async function runGuestSignIn(deps: SignInFlowDeps): Promise<SignInFlowResult> {
  const picked = await deps.pickAccount();
  if (picked.status === 'cancelled') return { status: 'cancelled' };
  if (picked.status === 'error')
    return { status: 'error', message: picked.message, step: 'picking' };

  const counts = await countGuestJournal(deps.guest);

  if (!counts.isEmpty) {
    // The dialog comes before anything changes. Exporting keeps the dialog open for the next choice.
    for (;;) {
      const decision = await deps.decide({
        days: counts.days,
        tags: counts.tags,
        libraryItems: counts.libraryItems,
      });
      if (decision === 'cancel') return { status: 'cancelled' };
      if (decision === 'merge') break;
      await deps.exportGuest();
    }
  }

  deps.onStep('signing-in');
  const signedIn = await deps.completeSignIn(picked.idToken);
  if (signedIn.status === 'cancelled') return { status: 'cancelled' };
  if (signedIn.status === 'error') {
    return { status: 'error', message: signedIn.message, step: 'signing-in' };
  }
  if (counts.isEmpty) return { status: 'signed-in' };

  deps.onStep('adding');
  const account = await deps.openAccount();
  if (account === null) {
    return {
      status: 'error',
      message: 'Your account could not be opened. Your guest journal is still on this device.',
      step: 'adding',
    };
  }

  let result: MergeResult;
  try {
    result = await mergeGuestJournal(deps.guest, account.repository, {
      now: deps.now(),
      utcOffsetMinutes: account.utcOffsetMinutes,
    });
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'The merge failed.',
      step: 'adding',
    };
  }
  if (!result.complete) return { status: 'partial', result };

  // Verify before deleting: every guest day must be readable from the account.
  const guestDays = await deps.guest.listDays();
  const present = await Promise.all(guestDays.map((day) => account.repository.getDay(day.date)));
  if (present.some((day) => day === null)) return { status: 'partial', result };

  deps.onStep('cleaning');
  await deps.guest.clearAll();
  return { status: 'merged', result };
}
