/**
 * Firebase initialisation for Runstamp.
 *
 * Reads config from `Constants.expoConfig?.extra.firebase` (plumbed via
 * EXPO_PUBLIC_FIREBASE_* env vars in app.config.ts).
 *
 * We use `initializeAuth` with `getReactNativePersistence` so the user
 * session survives cold starts via AsyncStorage.
 *
 * If any required config field is missing we emit a single console.warn at
 * module evaluation time and allow auth to fail naturally on the first call —
 * no throw, no crash.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { initializeAuth, getAuth, type Persistence } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

/**
 * `getReactNativePersistence` lives in the react-native conditional export of
 * `@firebase/auth` (`dist/rn/index.rn.d.ts`) but TypeScript resolves that
 * package's types from the unconditional `types` key in its exports map, which
 * points at `dist/auth-public.d.ts` and does not re-export this function.
 *
 * We require the module at runtime (Metro will resolve the react-native bundle
 * correctly) and cast to the known signature so the rest of the file stays
 * fully typed without reaching for `any`.
 */
type GetReactNativePersistence = (storage: typeof AsyncStorage) => Persistence;

const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: GetReactNativePersistence;
};

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket: string;
  messagingSenderId: string;
}

interface ExtraConfig {
  firebase?: Partial<FirebaseConfig>;
}

function resolveFirebaseConfig(): Partial<FirebaseConfig> {
  const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;
  return extra.firebase ?? {};
}

function isCompleteConfig(cfg: Partial<FirebaseConfig>): cfg is FirebaseConfig {
  return Boolean(
    cfg.apiKey &&
    cfg.authDomain &&
    cfg.projectId &&
    cfg.appId &&
    cfg.storageBucket &&
    cfg.messagingSenderId
  );
}

const rawConfig = resolveFirebaseConfig();

if (!isCompleteConfig(rawConfig)) {
  console.warn(
    '[Runstamp] Firebase config is incomplete. ' +
    'Set EXPO_PUBLIC_FIREBASE_API_KEY, EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN, ' +
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID, EXPO_PUBLIC_FIREBASE_APP_ID, ' +
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET, and EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ' +
    'in apps/mobile/.env. Auth will fail on the first call.'
  );
}

let firebaseApp: FirebaseApp;
let firebaseAuth: Auth;

if (getApps().length > 0) {
  firebaseApp = getApps()[0]!;
  firebaseAuth = getAuth(firebaseApp);
} else {
  firebaseApp = initializeApp(
    isCompleteConfig(rawConfig)
      ? rawConfig
      : { apiKey: '', authDomain: '', projectId: '', appId: '', storageBucket: '', messagingSenderId: '' }
  );

  firebaseAuth = initializeAuth(firebaseApp, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

export { firebaseApp, firebaseAuth };
