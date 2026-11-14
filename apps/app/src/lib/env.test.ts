import { readEnv } from './env';

const KEYS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  'EXPO_PUBLIC_USE_EMULATORS',
  'EXPO_PUBLIC_EMULATOR_HOST',
] as const;

describe('readEnv', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of KEYS) saved[key] = process.env[key];
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'key';
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = 'example.firebaseapp.com';
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'demo-memory-journal';
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID = 'app-id';
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'client.apps.googleusercontent.com';
    process.env.EXPO_PUBLIC_USE_EMULATORS = 'true';
    delete process.env.EXPO_PUBLIC_EMULATOR_HOST;
  });

  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it('reads all values and defaults the emulator host', () => {
    expect(readEnv()).toEqual({
      firebaseApiKey: 'key',
      firebaseAuthDomain: 'example.firebaseapp.com',
      firebaseProjectId: 'demo-memory-journal',
      firebaseAppId: 'app-id',
      googleWebClientId: 'client.apps.googleusercontent.com',
      useEmulators: true,
      emulatorHost: '127.0.0.1',
    });
  });

  it('treats anything other than "true" as emulators off', () => {
    process.env.EXPO_PUBLIC_USE_EMULATORS = 'false';
    expect(readEnv().useEmulators).toBe(false);
  });

  it('throws when a required value is missing', () => {
    delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    expect(() => readEnv()).toThrow();
  });
});
