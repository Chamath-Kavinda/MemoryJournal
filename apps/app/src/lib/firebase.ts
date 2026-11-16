import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteApp, getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import {
  clearIndexedDbPersistence,
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  terminate,
  type Firestore,
} from 'firebase/firestore';
import { Platform } from 'react-native';

import { readEnv } from './env';

let cachedApp: { app: FirebaseApp; existedBefore: boolean } | undefined;
let cachedAuth: Auth | undefined;
let cachedDb: Firestore | undefined;

/** The Firebase app, created on first use. `existedBefore` is true after a hot reload. */
function getFirebaseApp(): { app: FirebaseApp; existedBefore: boolean } {
  if (cachedApp) return cachedApp;
  const env = readEnv();
  const existedBefore = getApps().length > 0;
  const app = existedBefore
    ? getApp()
    : initializeApp({
        apiKey: env.firebaseApiKey,
        authDomain: env.firebaseAuthDomain,
        projectId: env.firebaseProjectId,
        appId: env.firebaseAppId,
      });
  cachedApp = { app, existedBefore };
  return cachedApp;
}

/**
 * Firebase Authentication only. This is all the app starts at launch, so a guest never opens
 * Firestore or its offline cache (docs section 15.6, point 2). Setting up Auth makes no request
 * when nobody was signed in.
 */
export function getFirebaseAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  const env = readEnv();
  const { app, existedBefore } = getFirebaseApp();

  // Native keeps the signed-in user in AsyncStorage; web uses the default persistence.
  const auth =
    existedBefore || Platform.OS === 'web'
      ? getAuth(app)
      : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });

  if (env.useEmulators && !existedBefore) {
    connectAuthEmulator(auth, `http://${env.emulatorHost}:9099`, { disableWarnings: true });
  }

  cachedAuth = auth;
  return auth;
}

/** Cloud Firestore with its offline cache (documentation section 6). Only a signed-in user needs it. */
export function getFirebaseDb(): Firestore {
  if (cachedDb) return cachedDb;
  const env = readEnv();
  const { app } = getFirebaseApp();

  let db: Firestore;
  let created = true;
  try {
    db = initializeFirestore(app, { localCache: persistentLocalCache() });
  } catch {
    // Already set up by an earlier copy of this module (hot reload): reuse it as it is.
    db = getFirestore(app);
    created = false;
  }

  if (env.useEmulators && created) {
    connectFirestoreEmulator(db, env.emulatorHost, 8080);
  }

  cachedDb = db;
  return db;
}

/** Both services, for code that only runs for a signed-in user. */
export function getFirebase(): { auth: Auth; db: Firestore } {
  return { auth: getFirebaseAuth(), db: getFirebaseDb() };
}

/**
 * Stops Firestore, clears its offline cache and deletes the Firebase app, so nothing of the
 * signed-out account stays on the device (docs section 15.6, point 9). A terminated Firestore
 * cannot be started again on the same app, so the next call to `getFirebaseAuth` or
 * `getFirebaseDb` builds a fresh app. The caller restarts the auth listener afterwards.
 */
export async function shutDownFirebase(): Promise<void> {
  const db = cachedDb;
  const app = cachedApp?.app;
  cachedDb = undefined;
  cachedAuth = undefined;
  cachedApp = undefined;
  if (db) {
    try {
      await terminate(db);
      // Only the web build has an on-disk cache to clear; elsewhere this fails harmlessly.
      await clearIndexedDbPersistence(db);
    } catch {
      // Nothing more to clear.
    }
  }
  if (app) await deleteApp(app).catch(() => undefined);
}
