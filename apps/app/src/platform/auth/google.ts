import {
  GoogleAuthProvider,
  reauthenticateWithCredential,
  signInWithCredential,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { readEnv } from '@/lib/env';
import { getFirebase } from '@/lib/firebase';

import type { SignInResult } from './types';

let configured = false;

function configure(): void {
  if (configured) return;
  GoogleSignin.configure({ webClientId: readEnv().googleWebClientId });
  configured = true;
}

type IdTokenResult =
  { status: 'ok'; idToken: string } | Exclude<SignInResult, { status: 'signed-in' }>;

/** Shows the native Google account picker and returns the ID token it produces. */
async function getGoogleIdToken(): Promise<IdTokenResult> {
  try {
    configure();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return { status: 'cancelled' };

    const idToken = response.data.idToken;
    if (!idToken) return { status: 'error', message: 'Google did not return an ID token.' };
    return { status: 'ok', idToken };
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return { status: 'cancelled' };
      if (error.code === statusCodes.IN_PROGRESS) return { status: 'cancelled' };
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { status: 'error', message: 'Google Play services are not available.' };
      }
    }
    return { status: 'error', message: error instanceof Error ? error.message : 'Sign-in failed.' };
  }
}

/** Android and iOS: native Google sign-in, then hand the ID token to Firebase. */
export async function signInWithGoogle(): Promise<SignInResult> {
  const token = await getGoogleIdToken();
  if (token.status !== 'ok') return token;
  try {
    const credential = GoogleAuthProvider.credential(token.idToken);
    await signInWithCredential(getFirebase().auth, credential);
    return { status: 'signed-in' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Sign-in failed.' };
  }
}

/**
 * Asks the person to sign in with Google again and confirms it to Firebase. Firebase wants a
 * recent sign-in before it deletes an account. Choosing a different Google account fails, so
 * one account cannot delete another's data.
 */
export async function reauthenticateWithGoogle(): Promise<SignInResult> {
  const user = getFirebase().auth.currentUser;
  if (!user) return { status: 'error', message: 'You are not signed in.' };
  const token = await getGoogleIdToken();
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
  configure();
  try {
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google on this device; Firebase sign-out below still runs.
  }
  await firebaseSignOut(getFirebase().auth);
}
