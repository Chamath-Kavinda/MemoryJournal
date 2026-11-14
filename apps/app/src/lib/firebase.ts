import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  type Firestore,
} from 'firebase/firestore';
import { Platform } from 'react-native';

import { readEnv } from './env';

let cached: { auth: Auth; db: Firestore } | undefined;

export function getFirebase(): { auth: Auth; db: Firestore } {
  if (cached) return cached;
  const env = readEnv();

  const alreadyInitialised = getApps().length > 0;
  const app = alreadyInitialised
    ? getApp()
    : initializeApp({
        apiKey: env.firebaseApiKey,
        authDomain: env.firebaseAuthDomain,
        projectId: env.firebaseProjectId,
        appId: env.firebaseAppId,
      });

  // Native keeps the signed-in user in AsyncStorage; web uses the default persistence.
  const auth = alreadyInitialised
    ? getAuth(app)
    : Platform.OS === 'web'
      ? getAuth(app)
      : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });

  // Offline persistence (documentation section 6). On native this is the built-in cache.
  const db = alreadyInitialised
    ? getFirestore(app)
    : initializeFirestore(app, { localCache: persistentLocalCache() });

  if (env.useEmulators && !alreadyInitialised) {
    connectAuthEmulator(auth, `http://${env.emulatorHost}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, env.emulatorHost, 8080);
  }

  cached = { auth, db };
  return cached;
}
