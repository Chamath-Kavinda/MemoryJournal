export const PENDING_WAIT_MS = 5000;
const POLL_MS = 100;

/** The part of the account repository that sign-out needs. */
export interface PendingWrites {
  pendingWriteCount(): number;
}

/**
 * Waits up to `maxMs` for writes that the server has not confirmed yet, then returns how many are
 * still waiting (docs section 15.6, point 9). Zero means everything is uploaded.
 */
export async function waitForPendingWrites(
  repository: PendingWrites,
  maxMs: number = PENDING_WAIT_MS,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<number> {
  let waited = 0;
  while (repository.pendingWriteCount() > 0 && waited < maxMs) {
    await sleep(POLL_MS);
    waited += POLL_MS;
  }
  return repository.pendingWriteCount();
}

/** The sign-out confirmation text from section 15.9, with the extra sentence when writes are stuck. */
export function signOutDialog(
  email: string | null,
  pending: number,
): { title: string; message: string; confirmLabel: string } {
  const who = email ?? 'this account';
  const base = `Sign out of ${who}? This removes the journal from this device. It stays safe in your Google account, and signing in again brings it back.`;
  if (pending === 0) return { title: 'Sign out?', message: base, confirmLabel: 'Sign out' };
  const changes = pending === 1 ? '1 change is' : `${pending} changes are`;
  return {
    title: 'Sign out?',
    message: `${base} ${changes} not uploaded yet and will be lost if you sign out.`,
    confirmLabel: 'Sign out anyway',
  };
}

export interface SignOutSteps {
  /** Signs out of Firebase and Google. */
  signOut: () => Promise<void>;
  /** Stops Firestore, clears its offline cache and deletes the Firebase app. */
  shutDown: () => Promise<void>;
  /** Deletes the account's unsaved drafts from the device. */
  clearDrafts: () => Promise<void>;
  /** Turns the daily reminder off, because it belongs to the account's settings. */
  clearReminder: () => Promise<void>;
  /** Forgets the in-memory repository of the account. */
  forgetRepository: () => void;
  /** Starts watching sign-in state again on the new Firebase app. */
  restartAuthListener: () => void;
}

export type SignOutResult = { status: 'signed-out' } | { status: 'error'; message: string };

/**
 * Signs out and removes everything of the account from the device, then leaves an empty guest
 * Home. Every step runs even if an earlier one fails, so a half-failed sign-out does not leave the
 * account's data behind; the first failure is reported.
 */
export async function signOutAndWipe(steps: SignOutSteps): Promise<SignOutResult> {
  let failure: unknown = null;
  const attempt = async (work: () => Promise<void> | void) => {
    try {
      await work();
    } catch (error) {
      failure ??= error;
    }
  };

  await attempt(steps.signOut);
  await attempt(steps.shutDown);
  await attempt(steps.clearDrafts);
  await attempt(steps.clearReminder);
  await attempt(steps.forgetRepository);
  await attempt(steps.restartAuthListener);

  if (failure === null) return { status: 'signed-out' };
  return {
    status: 'error',
    message: failure instanceof Error ? failure.message : 'Sign-out did not finish. Try again.',
  };
}
