// Dynamic Expo config so we can read env vars at config-evaluation time.
// All "public" values come through EXPO_PUBLIC_* env vars (loaded from
// apps/mobile/.env by Expo's CLI when running `expo start`). Secrets never
// land in this file — OAuth client secrets live on the backend only.
import type { ExpoConfig } from '@expo/config-types';

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'http://localhost:8080';

const stravaClientId =
  process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID ??
  '';

const googleIosClientId =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ??
  '';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY            ?? '',
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? '',
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID         ?? '',
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID             ?? '',
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? ''
};

const config: ExpoConfig = {
  name: 'Runstamp',
  slug: 'runstamp',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'runstamp',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'fun.gilla.runstamp',
    usesAppleSignIn: true,
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        'Runstamp reads from your Photos so you can pin a real run photo to your share card. We never upload them.',
      NSPhotoLibraryAddUsageDescription:
        'Runstamp saves your finished share card to your camera roll so you can post it to Instagram, WhatsApp, or X.'
    }
  },
  android: {
    package: 'fun.gilla.runstamp',
    edgeToEdgeEnabled: true
  },
  web: {
    bundler: 'metro'
  },
  experiments: {
    typedRoutes: false
  },
  plugins: [
    'expo-font',
    [
      'expo-media-library',
      {
        photosPermission:
          'Runstamp saves finished share cards to your camera roll so you can post them.',
        savePhotosPermission:
          'Runstamp saves finished share cards to your camera roll so you can post them.',
        isAccessMediaLocationEnabled: false
      }
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Runstamp reads from your Photos so you can pin a real run photo to your share card.'
      }
    ],
    'expo-web-browser',
    ['expo-apple-authentication', {}]
  ],
  // Only **public** values belong here. Anything sensitive (Strava client
  // secret, signing keys, etc.) lives in EAS Secrets or on the backend.
  extra: {
    apiBaseUrl,
    stravaClientId,
    googleIosClientId,
    firebase: firebaseConfig
  }
};

export default config;
