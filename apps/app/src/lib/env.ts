import { z } from 'zod';

const schema = z.object({
  firebaseApiKey: z.string().min(1),
  firebaseAuthDomain: z.string().min(1),
  firebaseProjectId: z.string().min(1),
  firebaseAppId: z.string().min(1),
  googleWebClientId: z.string().min(1),
  useEmulators: z.boolean(),
  emulatorHost: z.string().min(1),
});

export type AppEnv = z.infer<typeof schema>;

// Expo only inlines EXPO_PUBLIC_* variables when they are read as literal
// `process.env.NAME` expressions, so each one is spelled out here.
export function readEnv(): AppEnv {
  return schema.parse({
    firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    useEmulators: process.env.EXPO_PUBLIC_USE_EMULATORS === 'true',
    emulatorHost: process.env.EXPO_PUBLIC_EMULATOR_HOST ?? '127.0.0.1',
  });
}
