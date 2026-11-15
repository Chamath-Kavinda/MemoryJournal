import { DELETE_BATCH_SIZE, chunk } from '@memory-journal/core';
import { deleteUser } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore';

import { clearUserDrafts } from '@/features/day/draftStorage';
import { remindersSupported, syncReminder } from '@/features/reminder/reminderService';
import { getFirebase } from '@/lib/firebase';
import { reauthenticateWithGoogle } from '@/platform/auth/google';

import { setDeletionInProgress } from './deletionState';

export type DeleteResult =
  { status: 'deleted' } | { status: 'cancelled' } | { status: 'error'; message: string };

/** Reads at the same time while listing what to delete. */
const PARALLEL_READS = 20;

/** How long to wait for the server to accept the deletion request before giving up. */
const REQUEST_TIMEOUT_MS = 30_000;

const NO_CONNECTION =
  'Could not reach the server. Deleting an account needs an internet connection. Nothing was deleted.';

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(NO_CONNECTION)), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (reason: unknown) => {
        clearTimeout(timer);
        reject(reason instanceof Error ? reason : new Error(String(reason)));
      },
    );
  });
}

const isMissingDocument = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === 'not-found';

async function listRefs(uid: string, name: string): Promise<DocumentReference[]> {
  const { db } = getFirebase();
  const snapshot = await getDocs(collection(db, 'users', uid, name));
  return snapshot.docs.map((entry) => entry.ref);
}

/** The revisions under each parent, read a few lists at a time. */
async function listRevisionRefs(parents: DocumentReference[]): Promise<DocumentReference[]> {
  const refs: DocumentReference[] = [];
  for (const group of chunk(parents, PARALLEL_READS)) {
    const lists = await Promise.all(
      group.map(async (parent) => {
        const snapshot = await getDocs(collection(parent, 'revisions'));
        return snapshot.docs.map((entry) => entry.ref);
      }),
    );
    for (const list of lists) refs.push(...list);
  }
  return refs;
}

async function deleteAll(refs: DocumentReference[]): Promise<void> {
  const { db } = getFirebase();
  for (const group of chunk(refs, DELETE_BATCH_SIZE)) {
    const batch = writeBatch(db);
    for (const ref of group) batch.delete(ref);
    await batch.commit();
  }
}

/**
 * Deletes the signed-in user's account and all of their data (section 5.9, D-009, D-034).
 *
 * There are no Cloud Functions, so this runs on the device, in an order that survives being
 * interrupted and run again:
 *  1. The person signs in with Google again, because Firebase wants a recent sign-in before an
 *     account can be deleted. Nothing is touched if they cancel or pick another account.
 *  2. `deletionRequestedAt` is set on `users/{uid}`. While it exists the rules let the owner
 *     delete closed revisions, which they allow nowhere else. This needs a connection.
 *  3. Revisions go first, then days, library pages, tags, categories and tutorial progress.
 *  4. The user document goes last, because the rules read it to allow step 3. If it were gone
 *     first, leftover revisions could never be deleted.
 *  5. Unsaved drafts on this device are removed and the reminder is cancelled.
 *  6. Finally the Firebase account itself is deleted, which signs the app out.
 * Running it again after a failure continues where it stopped: a user document that is already
 * gone is not an error.
 */
export async function deleteAccount(uid: string): Promise<DeleteResult> {
  const confirmed = await reauthenticateWithGoogle();
  if (confirmed.status === 'cancelled') return { status: 'cancelled' };
  if (confirmed.status === 'error') return confirmed;

  const { db, auth } = getFirebase();
  const userRef = doc(db, 'users', uid);
  setDeletionInProgress(true);
  try {
    try {
      await withTimeout(
        updateDoc(userRef, { deletionRequestedAt: serverTimestamp() }),
        REQUEST_TIMEOUT_MS,
      );
    } catch (error) {
      // A user document that is already gone means an earlier attempt got past this step.
      if (!isMissingDocument(error)) throw error;
    }

    const days = await listRefs(uid, 'days');
    const library = await listRefs(uid, 'library');
    await deleteAll(await listRevisionRefs(days));
    await deleteAll(await listRevisionRefs(library));
    await deleteAll(days);
    await deleteAll(library);
    await deleteAll(await listRefs(uid, 'tags'));
    await deleteAll(await listRefs(uid, 'tagCategories'));
    await deleteAll(await listRefs(uid, 'progress'));
    await deleteDoc(userRef);

    await clearUserDrafts(uid);
    if (remindersSupported) await syncReminder(false).catch(() => undefined);

    const user = auth.currentUser;
    if (user) await deleteUser(user);
    return { status: 'deleted' };
  } catch (error) {
    return {
      status: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'Something went wrong while deleting. Try again; it continues where it stopped.',
    };
  } finally {
    setDeletionInProgress(false);
  }
}
