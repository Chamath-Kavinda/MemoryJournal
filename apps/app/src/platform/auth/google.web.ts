import { signOut as firebaseSignOut } from 'firebase/auth';

import { getFirebase } from '@/lib/firebase';

import type { SignInResult } from './types';

/**
 * Web build (also the Windows app inside Electron). The browser-based Google OAuth
 * flow is added in the Electron commit; until then the web build cannot sign in.
 */
export async function signInWithGoogle(): Promise<SignInResult> {
  return {
    status: 'error',
    message: 'Google sign-in on desktop is added in the Electron shell step.',
  };
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getFirebase().auth);
}
