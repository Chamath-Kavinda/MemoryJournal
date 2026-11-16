export type SignInResult =
  { status: 'signed-in' } | { status: 'cancelled' } | { status: 'error'; message: string };

/**
 * The first half of signing in: the person chose a Google account and Google returned an ID token.
 * Nothing has changed in Firebase yet, so the app can still ask about the guest journal before
 * `completeGoogleSignIn` is called (docs section 15.6, point 8).
 */
export type PickResult =
  { status: 'ok'; idToken: string } | Exclude<SignInResult, { status: 'signed-in' }>;
