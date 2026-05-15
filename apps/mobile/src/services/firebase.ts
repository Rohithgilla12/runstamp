/**
 * Firebase wiring for Runstamp.
 *
 * Uses `@react-native-firebase/*` — the native SDKs — not the firebase JS
 * package. Config flows from `GoogleService-Info.plist` (iOS) and
 * `google-services.json` (Android), wired by the `@react-native-firebase/app`
 * config plugin in app.config.ts. There are no Firebase env vars; you drop
 * the plist + json files into `apps/mobile/` and run `expo prebuild`.
 *
 * See https://docs.expo.dev/guides/using-firebase/ and the project memory
 * note "Firebase = native modules" for the rationale.
 */

import auth, { type FirebaseAuthTypes } from '@react-native-firebase/auth';

export const firebaseAuth = auth();

export type FirebaseUser = FirebaseAuthTypes.User;

// Re-exported credential providers so callers don't need a second import.
export const AppleAuthProvider = auth.AppleAuthProvider;
export const GoogleAuthProvider = auth.GoogleAuthProvider;
