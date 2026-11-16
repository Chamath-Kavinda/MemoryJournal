import {
  GoogleAuthProvider,
  reauthenticateWithCredential,
  signInWithCredential,
  signOut as firebaseSignOut,
} from 'firebase/auth';

import { getFirebase } from '@/lib/firebase';

import type { PickResult, SignInResult } from './types';

type DesktopBridgeResult =
  | { status: 'ok'; idToken: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

type DesktopBridge = { signInWithGoogle: () => Promise<DesktopBridgeResult> };

function getBridge(): DesktopBridge | undefined {
  return (globalThis as { memoryJournal?: DesktopBridge }).memoryJournal;
}

/**
 * Step one, in the web build used inside the Windows (Electron) app: Google sign-in runs in the
 * system browser through the preload bridge and returns an ID token. Nothing changes in Firebase
 * yet. A plain browser has no bridge, so sign-in is not offered there.
 */
export async function pickGoogleAccount(): Promise<PickResult> {
  const bridge = getBridge();
  if (!bridge) {
    return { status: 'error', message: 'Google sign-in is only available in the desktop app.' };
  }
  try {
    return await bridge.signInWithGoogle();
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Sign-in failed.' };
  }
}

/** Step two: hands the ID token to Firebase, which signs the person in. */
export async function completeGoogleSignIn(idToken: string): Promise<SignInResult> {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(getFirebase().auth, credential);
    return { status: 'signed-in' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Sign-in failed.' };
  }
}

export async function signInWithGoogle(): Promise<SignInResult> {
  const token = await pickGoogleAccount();
  if (token.status !== 'ok') return token;
  return completeGoogleSignIn(token.idToken);
}

/**
 * Asks the person to sign in with Google again in the system browser and confirms it to
 * Firebase. Firebase wants a recent sign-in before it deletes an account. Choosing a different
 * Google account fails, so one account cannot delete another's data.
 */
export async function reauthenticateWithGoogle(): Promise<SignInResult> {
  const user = getFirebase().auth.currentUser;
  if (!user) return { status: 'error', message: 'You are not signed in.' };
  const token = await pickGoogleAccount();
  if (token.status !== 'ok') return token;
  try {
    await reauthenticateWithCredential(user, GoogleAuthProvider.credential(token.idToken));
    return { status: 'signed-in' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Could not confirm your sign-in.',
    };
  }
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getFirebase().auth);
}
