import {
  GoogleAuthProvider,
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

/** Android and iOS: native Google sign-in, then hand the ID token to Firebase. */
export async function signInWithGoogle(): Promise<SignInResult> {
  try {
    configure();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return { status: 'cancelled' };

    const idToken = response.data.idToken;
    if (!idToken) return { status: 'error', message: 'Google did not return an ID token.' };

    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(getFirebase().auth, credential);
    return { status: 'signed-in' };
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

export async function signOut(): Promise<void> {
  configure();
  try {
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google on this device; Firebase sign-out below still runs.
  }
  await firebaseSignOut(getFirebase().auth);
}
