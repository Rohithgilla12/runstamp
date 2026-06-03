// Dynamic Expo config so we can read env vars at config-evaluation time.
// Firebase config flows through `GoogleService-Info.plist` (iOS) and
// `google-services.json` (Android) — drop those files alongside this config
// and the @react-native-firebase/app plugin auto-wires them at prebuild.
// Only EXPO_PUBLIC_* env vars belong below.
import type { ExpoConfig } from '@expo/config-types';

// IMPORTANT: every `eas update` MUST be run with `--environment production`
// (or `--environment preview`) so this var actually resolves at build time.
// Without it the bundle falls back to localhost and every API call dies
// silently on a real device. We keep the localhost default for `expo start`
// so the dev workflow still works.
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
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'runstamp',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  // EAS Update channel. The url ties to the EAS projectId (b9335526-…) so
  // OTA updates published with `eas update --branch production` reach
  // installed builds. The `appVersion` policy means a new native build is
  // required only when the `version` field above bumps — patch JS over the
  // air without resubmission. Auto-added by `eas-cli build` for static
  // app.json projects; on dynamic app.config.ts we add it by hand.
  updates: {
    url: 'https://u.expo.dev/b9335526-0c71-4dc2-957a-17967b4958f9'
  },
  runtimeVersion: {
    policy: 'appVersion'
  },
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
    // GoogleService-Info.plist sits next to this config. The file is
    // committed to the repo per Google's own guidance (the API key inside
    // is the *public* Firebase Web key, restricted by bundle id + Firebase
    // Security Rules). For CI / EAS, GOOGLE_SERVICES_INFOPLIST overrides
    // the path so an EAS file secret can be mounted at build time.
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
      // `fetch` is what HKObserverQuery's background delivery needs. We dropped
      // `remote-notification` for the Apple-Health-only launch: it only existed
      // for the Strava webhook → APNs silent push, which is deferred with
      // Strava (stamp-earned pushes are normal alerts and don't need it).
      // Restore it alongside STRAVA_ENABLED. `processing` stays out — without
      // BGTaskSchedulerPermittedIdentifiers it's an App Store Connect 409
      // (validator error 8d004b9a).
      UIBackgroundModes: ['fetch'],
      // Only standard crypto (HTTPS / Apple Sign-In) — skips the App Store Connect
      // export-compliance prompt on every TestFlight upload.
      ITSAppUsesNonExemptEncryption: false,
      // Needed so `react-native-share` can canOpenURL the instagram-stories
      // and instagram schemes for the IG Stories direct-share flow.
      LSApplicationQueriesSchemes: ['instagram-stories', 'instagram']
    },
    // Apple required-reason API manifest (PrivacyInfo.xcprivacy). These four
    // categories cover the restricted APIs that React Native, Expo, and the
    // native modules reach for. Declaring the reasons keeps App Store uploads
    // free of the ITMS-91053 "missing API declaration" notices.
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
          NSPrivacyAccessedAPITypeReasons: ['C617.1']
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1']
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
          NSPrivacyAccessedAPITypeReasons: ['35F9.1']
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
          NSPrivacyAccessedAPITypeReasons: ['E174.1']
        }
      ]
    }
  },
  android: {
    package: 'fun.gilla.runstamp',
    // Android 16 makes edge-to-edge mandatory; the legacy `edgeToEdgeEnabled`
    // toggle is gone in Expo SDK 53+. No-op removal.
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
    [
      '@kingstinct/react-native-healthkit',
      {
        NSHealthShareUsageDescription:
          'Runstamp reads your running workouts, heart rate, and routes so it can show your runs and stamps. We never write back to Health.',
        NSHealthUpdateUsageDescription:
          'Runstamp does not write to Health. This permission is requested by the system but never used.'
      }
    ],
    // Native Firebase + auth plugins (per @react-native-firebase docs).
    // Messaging is intentionally NOT here — RNFB messaging is incompatible
    // with `useFrameworks: 'static'` below. Push runs via expo-notifications
    // + Expo Push Service instead (see services/push.ts).
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    // Required for "use_frameworks: 'static'" + Firebase pods on iOS.
    [
      'expo-build-properties',
      {
        ios: { useFrameworks: 'static' }
      }
    ],
    // Patches the Podfile to set CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES=YES
    // on RNFB* targets. Required because @react-native-firebase modules
    // include <React/...> headers non-modularly, which clang rejects
    // under static framework linkage.
    './plugins/withFirebaseStaticFrameworks',
    // Native bottom tabs — wraps UITabBarController on iOS (gets iOS 26
    // Liquid Glass automatically) and BottomNavigationView on Android.
    // Required plugin entry so the autolinking picks up the iOS pod and
    // the Android module.
    'react-native-bottom-tabs',
    // Adds <queries><package android:name="com.instagram.android" /></queries>
    // to AndroidManifest so the IG Stories share intent resolves on Android 11+.
    './plugins/withInstagramQueries'
  ],
  // ONLY public values. Firebase no longer lives here — the plist is the
  // source of truth. The web client id is public per Google's OAuth model.
  extra: {
    apiBaseUrl,
    googleWebClientId,
    eas: {
      projectId: 'b9335526-0c71-4dc2-957a-17967b4958f9'
    }
  }
};

export default config;
