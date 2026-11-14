import { createHash, randomBytes } from 'node:crypto';

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export type Pkce = { verifier: string; challenge: string };

function base64Url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function createPkce(): Pkce {
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function createState(): string {
  return base64Url(randomBytes(16));
}

export function buildAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
}): string {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', params.state);
  url.searchParams.set('code_challenge', params.challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

export type CallbackResult =
  { kind: 'code'; code: string } | { kind: 'denied' } | { kind: 'invalid' };

/** Reads the redirect that Google sends to the loopback server. */
export function parseCallback(requestUrl: string, expectedState: string): CallbackResult {
  const url = new URL(requestUrl, 'http://127.0.0.1');
  if (url.pathname !== '/') return { kind: 'invalid' };
  if (url.searchParams.get('state') !== expectedState) return { kind: 'invalid' };
  if (url.searchParams.get('error')) return { kind: 'denied' };
  const code = url.searchParams.get('code');
  return code ? { kind: 'code', code } : { kind: 'invalid' };
}

export function buildTokenBody(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  verifier: string;
}): URLSearchParams {
  return new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    code: params.code,
    redirect_uri: params.redirectUri,
    grant_type: 'authorization_code',
    code_verifier: params.verifier,
  });
}
