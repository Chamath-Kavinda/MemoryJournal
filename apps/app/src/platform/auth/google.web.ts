import {
  GoogleAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
} from 'firebase/auth';

import { getFirebase } from '@/lib/firebase';

import type { SignInResult } from './types';

type DesktopBridgeResult =
  | { status: 'ok'; idToken: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

type DesktopBridge = { signInWithGoogle: () => Promise<DesktopBridgeResult> };

function getBridge(): DesktopBridge | undefined {
  return (globalThis as { memoryJournal?: DesktopBridge }).memoryJournal;
}

/**
 * Web build, used inside the Windows (Electron) app. Google sign-in runs in the
 * system browser through the preload bridge; the ID token then goes to Firebase.
 * A plain browser has no bridge, so sign-in is not offered there.
 */
export async function signInWithGoogle(): Promise<SignInResult> {
  const bridge = getBridge();
  if (!bridge) {
    return { status: 'error', message: 'Google sign-in is only available in the desktop app.' };
  }
  try {
    const result = await bridge.signInWithGoogle();
    if (result.status !== 'ok') return result;
    const credential = GoogleAuthProvider.credential(result.idToken);
    await signInWithCredential(getFirebase().auth, credential);
    return { status: 'signed-in' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Sign-in failed.' };
  }
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getFirebase().auth);
}
