import { createHash } from 'node:crypto';

import { buildAuthUrl, buildTokenBody, createPkce, createState, parseCallback } from './oauth';

describe('createPkce', () => {
  it('derives the challenge from the verifier with S256', () => {
    const { verifier, challenge } = createPkce();
    const expected = createHash('sha256')
      .update(verifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(challenge).toBe(expected);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('creates different values each time', () => {
    expect(createPkce().verifier).not.toBe(createPkce().verifier);
    expect(createState()).not.toBe(createState());
  });
});

describe('buildAuthUrl', () => {
  it('includes PKCE, state and the loopback redirect', () => {
    const url = new URL(
      buildAuthUrl({
        clientId: 'client',
        redirectUri: 'http://127.0.0.1:5555',
        state: 's1',
        challenge: 'c1',
      }),
    );
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('client');
    expect(url.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:5555');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('code_challenge')).toBe('c1');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe('s1');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
  });
});

describe('parseCallback', () => {
  it('returns the code when the state matches', () => {
    expect(parseCallback('/?code=abc&state=s1', 's1')).toEqual({ kind: 'code', code: 'abc' });
  });

  it('rejects a wrong state', () => {
    expect(parseCallback('/?code=abc&state=other', 's1')).toEqual({ kind: 'invalid' });
  });

  it('rejects other paths such as favicon requests', () => {
    expect(parseCallback('/favicon.ico', 's1')).toEqual({ kind: 'invalid' });
  });

  it('reports a denied sign-in', () => {
    expect(parseCallback('/?error=access_denied&state=s1', 's1')).toEqual({ kind: 'denied' });
  });

  it('rejects a callback without a code', () => {
    expect(parseCallback('/?state=s1', 's1')).toEqual({ kind: 'invalid' });
  });
});

describe('buildTokenBody', () => {
  it('builds an authorization_code exchange with the verifier', () => {
    const body = buildTokenBody({
      clientId: 'client',
      clientSecret: 'secret',
      code: 'abc',
      redirectUri: 'http://127.0.0.1:5555',
      verifier: 'v1',
    });
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code_verifier')).toBe('v1');
    expect(body.get('code')).toBe('abc');
  });
});
