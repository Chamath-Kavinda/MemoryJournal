import { useCallback, useRef, useState } from 'react';

import { useChoice } from '@/components/useConfirm';
import { useTodayId } from '@/features/calendar/useTodayId';
import { deviceZone, syncUserProfile } from '@/features/profile/profileService';
import { exportGuestData } from '@/features/settings/exportService';
import { getFirebaseAuth } from '@/lib/firebase';
import { getJournalRepository } from '@/lib/journal';
import { completeGoogleSignIn, pickGoogleAccount } from '@/platform/auth/google';

import {
  runGuestSignIn,
  type GuestCounts,
  type MergeDecision,
  type SignInFlowDeps,
  type SignInStep,
} from './signInFlow';

export type GuestSignInState =
  | { phase: 'idle' }
  | { phase: 'running'; step: SignInStep | null }
  /** Signed in. Everything was added, or there was nothing to add. */
  | { phase: 'finished' }
  /** Something went wrong. The guest journal is still on the device unless `step` says otherwise. */
  | { phase: 'problem'; message: string; notAdded: string[] };

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "12 days, 5 tags and 2 library items" (docs section 15.6, point 8). Zero counts are left out. */
export function describeGuestCounts(counts: GuestCounts): string {
  const parts = [
    counts.days > 0 ? plural(counts.days, 'day', 'days') : null,
    counts.tags > 0 ? plural(counts.tags, 'tag', 'tags') : null,
    counts.libraryItems > 0 ? plural(counts.libraryItems, 'library item', 'library items') : null,
  ].filter((part): part is string => part !== null);
  if (parts.length <= 1) return parts[0] ?? 'Nothing';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** The merge dialog text. It says what will be added before anything changes. */
export function mergeDialogMessage(counts: GuestCounts): string {
  return `${describeGuestCounts(counts)} will be added. Nothing already in the account is overwritten or deleted.`;
}

/**
 * Runs the guest sign-in from the sign-in screen: pick the Google account, ask about the guest
 * journal, sign in, merge, verify, clean up (docs section 15.6, points 7 and 8). The screen shows
 * `state`; on a problem it offers Retry (`start` again, which is safe because the merge uses fixed
 * ids) and Export.
 */
export function useGuestSignIn() {
  const choose = useChoice();
  const todayId = useTodayId();
  const [state, setState] = useState<GuestSignInState>({ phase: 'idle' });
  const running = useRef(false);

  const exportGuest = useCallback(async () => {
    await exportGuestData(getJournalRepository(null), todayId);
  }, [todayId]);

  const start = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setState({ phase: 'running', step: null });

    const deps: SignInFlowDeps = {
      guest: getJournalRepository(null),
      pickAccount: pickGoogleAccount,
      completeSignIn: completeGoogleSignIn,
      decide: async (counts): Promise<MergeDecision> => {
        // The dialog is on screen, so the card waits behind it.
        const choice = await choose({
          title: 'Add your guest journal to this account?',
          message: mergeDialogMessage(counts),
          confirmLabel: 'Merge and sign in',
          alternativeLabel: 'Export guest data (JSON)',
          neutral: true,
        });
        if (choice === 'confirm') return 'merge';
        return choice === 'alternative' ? 'export' : 'cancel';
      },
      exportGuest,
      openAccount: async () => {
        const user = getFirebaseAuth().currentUser;
        if (!user) return null;
        const now = Date.now();
        // The profile has to exist with this device's UTC offset before any merge write, because
        // the Firestore rules read the offset from it.
        if ((await syncUserProfile(user, now)) === 'unavailable') return null;
        return {
          repository: getJournalRepository(user.uid),
          utcOffsetMinutes: deviceZone(now).utcOffsetMinutes,
        };
      },
      onStep: (step) => setState({ phase: 'running', step }),
      now: () => Date.now(),
    };

    try {
      const result = await runGuestSignIn(deps);
      switch (result.status) {
        case 'cancelled':
          setState({ phase: 'idle' });
          break;
        case 'signed-in':
        case 'merged':
          setState({ phase: 'finished' });
          break;
        case 'error':
          setState({ phase: 'problem', message: result.message, notAdded: [] });
          break;
        case 'partial':
          setState({
            phase: 'problem',
            message:
              'Some entries were not added to your account. Your guest journal is still on this device.',
            notAdded: [...result.result.rejected, ...result.result.failed].map(
              (problem) => `${problem.kind} ${problem.id}: ${problem.reason}`,
            ),
          });
          break;
      }
    } catch (error) {
      setState({
        phase: 'problem',
        message: error instanceof Error ? error.message : 'Sign-in failed. Try again.',
        notAdded: [],
      });
    } finally {
      running.current = false;
    }
  }, [choose, exportGuest]);

  return { state, start, exportGuest };
}
