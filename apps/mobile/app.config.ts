// Dynamic Expo config so we can read env vars at config-evaluation time.
// Firebase config flows through `GoogleService-Info.plist` (iOS) and
// `google-services.json` (Android) — drop those files alongside this config
// and the @react-native-firebase/app plugin auto-wires them at prebuild.
// Only EXPO_PUBLIC_* env vars belong below.
import type { ExpoConfig } from '@expo/config-types';

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

// Google OAuth Web client id (NOT the iOS one). Native Google Sign-In on
// Firebase needs the web client id to mint the idToken that
// `auth.GoogleAuthProvider.credential` accepts. Find it at:
//   Firebase Console → Project Settings → General → Your apps → Web app
// or Google Cloud Console → APIs & Services → Credentials.
const googleWebClientId =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

const config: ExpoConfig = {
  name: 'Runstamp',
  slug: 'runstamp',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'runstamp',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash-icon.png',
    backgroundColor: '#f3ede2',
    resizeMode: 'contain'
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'fun.gilla.runstamp',
    usesAppleSignIn: true,
    // Drop GoogleService-Info.plist into apps/mobile/ next to this config.
    // Keep it out of git (see .gitignore); developers / CI obtain it from the
    // Firebase console or EAS Secrets.
    googleServicesFile:
      process.env.GOOGLE_SERVICES_INFOPLIST ?? './GoogleService-Info.plist',
    // HealthKit entitlement (statically declared so EAS's capability syncer
    // enables HealthKit on the App ID and the provisioning profile carries
    // the matching entitlement). Background delivery is what lets new runs
    // sync without the user opening the app.
    entitlements: {
      'com.apple.developer.healthkit': true,
      'com.apple.developer.healthkit.access': [],
      'com.apple.developer.healthkit.background-delivery': true
    },
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        'Runstamp reads from your Photos so you can pin a real run photo to your share card. We never upload them.',
      NSPhotoLibraryAddUsageDescription:
        'Runstamp saves your finished share card to your camera roll so you can post it to Instagram, WhatsApp, or X.',
      NSHealthShareUsageDescription:
        'Runstamp reads your running workouts, heart rate, and routes so it can show your runs and stamps. We never write back to Health.',
      NSHealthUpdateUsageDescription:
        'Runstamp does not write to Health. This permission is requested by the system but never used.',
      UIBackgroundModes: ['fetch', 'processing', 'remote-notification']
    }
  },
  android: {
    package: 'fun.gilla.runstamp',
    edgeToEdgeEnabled: true,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#f3ede2'
    },
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? './google-services.json'
  },
  web: {
    bundler: 'metro',
    favicon: './assets/favicon.png'
  },
  // `eas init` writes the real project id into this file after you run it
  // once. For now we set EXPO_PUBLIC_EAS_PROJECT_ID via env so CI builds work
  // before the local checkout is `eas init`-ed.
  ...(process.env.EXPO_PUBLIC_EAS_PROJECT_ID
    ? { extra: { eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID } } }
    : {}),
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
    ['expo-apple-authentication', {}],
    '@kingstinct/react-native-healthkit',
    // Native Firebase + auth plugins (per @react-native-firebase docs).
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    // Required for "use_frameworks: 'static'" + Firebase pods on iOS.
    [
      'expo-build-properties',
      {
        ios: { useFrameworks: 'static' }
      }
    ]
  ],
  // ONLY public values. Firebase no longer lives here — the plist is the
  // source of truth. The web client id is public per Google's OAuth model.
  extra: {
    apiBaseUrl,
    googleWebClientId
  }
};

export default config;
