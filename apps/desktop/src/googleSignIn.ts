import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { shell } from 'electron';

import {
  GOOGLE_TOKEN_URL,
  buildAuthUrl,
  buildTokenBody,
  createPkce,
  createState,
  parseCallback,
} from './oauth';

export type GoogleSignInResult =
  | { status: 'ok'; idToken: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

const TIMEOUT_MS = 3 * 60 * 1000;

const PAGE = (text: string) =>
  `<!doctype html><meta charset="utf-8"><title>Memory Journal</title>` +
  `<body style="font-family:system-ui;text-align:center;padding:4rem"><h2>${text}</h2>` +
  `<p>You can close this tab and return to Memory Journal.</p></body>`;

function readConfig(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.MJ_GOOGLE_DESKTOP_CLIENT_ID;
  const clientSecret = process.env.MJ_GOOGLE_DESKTOP_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** Opens the system browser, waits for the loopback redirect, returns a Google ID token. */
export async function googleSignIn(): Promise<GoogleSignInResult> {
  const config = readConfig();
  if (!config) {
    return {
      status: 'error',
      message: 'Google desktop client is not configured (MJ_GOOGLE_DESKTOP_CLIENT_ID / _SECRET).',
    };
  }

  const pkce = createPkce();
  const state = createState();
  let server: Server | undefined;

  try {
    const code = await new Promise<string | null>((resolve, reject) => {
      const timer = setTimeout(() => resolve(null), TIMEOUT_MS);
      const srv = createServer((req, res) => {
        const result = parseCallback(req.url ?? '/', state);
        if (result.kind === 'invalid') {
          res.writeHead(404).end();
          return;
        }
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(PAGE(result.kind === 'code' ? 'Signed in' : 'Sign-in cancelled'));
        clearTimeout(timer);
        resolve(result.kind === 'code' ? result.code : null);
      });
      server = srv;
      srv.on('error', reject);
      srv.listen(0, '127.0.0.1', () => {
        const { port } = srv.address() as AddressInfo;
        const redirectUri = `http://127.0.0.1:${port}`;
        (srv as Server & { redirectUri?: string }).redirectUri = redirectUri;
        void shell.openExternal(
          buildAuthUrl({
            clientId: config.clientId,
            redirectUri,
            state,
            challenge: pkce.challenge,
          }),
        );
      });
    });

    if (!code) return { status: 'cancelled' };

    const redirectUri = (server as (Server & { redirectUri?: string }) | undefined)?.redirectUri;
    if (!redirectUri) return { status: 'error', message: 'Sign-in server was not ready.' };

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: buildTokenBody({ ...config, code, redirectUri, verifier: pkce.verifier }),
    });
    if (!response.ok)
      return { status: 'error', message: `Google token request failed (${response.status}).` };

    const json = (await response.json()) as { id_token?: string };
    return json.id_token
      ? { status: 'ok', idToken: json.id_token }
      : { status: 'error', message: 'Google did not return an ID token.' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Sign-in failed.' };
  } finally {
    server?.close();
  }
}
