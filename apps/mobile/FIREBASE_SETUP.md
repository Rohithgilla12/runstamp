# Firebase setup

Runstamp uses [`@react-native-firebase/*`](https://rnfirebase.io/) — the native Firebase SDKs — wired by [Expo's Firebase guide](https://docs.expo.dev/guides/using-firebase/). There is no `firebase` JS dependency.

## One-time setup

1. **Create a Firebase project** at <https://console.firebase.google.com>. Bundle / package id is `fun.gilla.runstamp` (matches `app.config.ts`).

2. **Register the iOS + Android apps** under your project. For iOS, set the bundle id to `fun.gilla.runstamp`; for Android, the package name is the same.

3. **Enable auth providers** in *Authentication → Sign-in method*:
   - Email/Password
   - Apple — paste the Apple Service ID + key from <https://developer.apple.com/account/resources>.
   - Google — Firebase auto-creates this when you register the Android app; copy the generated **Web client id** for the next step.

4. **Download the config files** from *Project Settings*:
   - iOS → `GoogleService-Info.plist` → save to `apps/mobile/GoogleService-Info.plist`
   - Android → `google-services.json` → save to `apps/mobile/google-services.json`

   Both paths are read by `app.config.ts` (`ios.googleServicesFile` / `android.googleServicesFile`) and the `@react-native-firebase/app` config plugin auto-wires them at prebuild.

5. **Add the Google web client id** to `apps/mobile/.env`:

   ```
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<your-web-client-id>.apps.googleusercontent.com
   ```

   Native Google Sign-In needs the *web* client id (not the iOS one) to mint the `idToken` that Firebase's `GoogleAuthProvider.credential` accepts.

6. **Generate the native projects**:

   ```bash
   cd apps/mobile
   pnpm dlx expo prebuild --clean
   pnpm ios            # or `eas build -p ios --profile development`
   ```

   The `ios/` and `android/` folders are gitignored — they're regenerable build output. `expo prebuild` writes them based on `app.config.ts` + the plist files.

## Backend

The Go API at `apps/api` verifies Firebase ID tokens with the **Firebase Admin SDK**. Point it at a service account JSON via `FIREBASE_CREDENTIALS_PATH` (or use Google Application Default Credentials):

```
FIREBASE_PROJECT_ID=runstamp-<your-project>
FIREBASE_CREDENTIALS_PATH=/path/to/service-account.json
```

The service account JSON comes from *Project Settings → Service accounts → Generate new private key*. Keep it out of git; mount it as a docker secret or write it from EAS Secrets in CI.

## CI / EAS

For builds without committed plist files, EAS Secrets can inject them at build time:

```bash
eas secret:create --scope project --name GOOGLE_SERVICES_INFOPLIST --type file --value ./local/GoogleService-Info.plist
eas secret:create --scope project --name GOOGLE_SERVICES_JSON     --type file --value ./local/google-services.json
```

`app.config.ts` reads the resolved path from the matching env vars (falls back to `./GoogleService-Info.plist` / `./google-services.json` for local dev).

## Why native instead of the firebase JS SDK?

The Expo guide spells it out: the native modules give you keychain-backed persistence, native Apple Sign-In integration, and the same plist becomes the source of truth for FCM, Crashlytics, and Analytics when you wire them later. The JS SDK only matters if you need Expo Go compatibility — but a real ship-to-stores Expo app already requires prebuild, so the native path is strictly better.
