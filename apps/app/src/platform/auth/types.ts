export type SignInResult =
  { status: 'signed-in' } | { status: 'cancelled' } | { status: 'error'; message: string };
