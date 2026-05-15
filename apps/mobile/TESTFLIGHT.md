# Runstamp → TestFlight

The exact sequence to take Runstamp from this repo to a TestFlight build you can install on your phone. ~45 min of clicking the first time, ~5 min on subsequent builds.

Companion checklist (Notion): https://www.notion.so/Runstamp-TestFlight-v0-Services-Checklist-361cb86cbab981aea1b6dbcd43fc89b5

## 0. One-time prerequisites

- Apple Developer Program — paid ✓
- Apple Developer team → **App IDs** → register `fun.gilla.runstamp` with capabilities:
  - Sign in with Apple
  - HealthKit
  - Push Notifications (optional for v0)
- Apple Developer team → **Services → Sign In with Apple** → create a Service ID `fun.gilla.runstamp.signin` and a private key (`.p8`).
- **App Store Connect** → My Apps → "+" → New App with bundle id `fun.gilla.runstamp`. SKU `runstamp-ios`. Note the **Apple App ID** (numeric, e.g. `6471234567`) — that's the `ascAppId` for `eas.json`.

## 1. Firebase project (Spark plan)

1. Create project at https://console.firebase.google.com (name: `runstamp`).
2. **Authentication → Sign-in method** — enable Email/Password, Google, Apple. For Apple, paste the Service ID + .p8 key from the prerequisites step.
3. **Project Settings → Your apps**:
   - Register an **iOS app** with bundle id `fun.gilla.runstamp`. Download `GoogleService-Info.plist` → put it at `apps/mobile/GoogleService-Info.plist`.
   - Register an **Android app** with package `fun.gilla.runstamp`. Download `google-services.json` → put it at `apps/mobile/google-services.json`.
   - Register a **Web app** (any name). Copy the **Web client ID** (looks like `<chars>.apps.googleusercontent.com`).
4. **Project Settings → Service accounts** → "Generate new private key" → save the JSON somewhere safe; you'll mount this on the VPS for the API's Firebase Admin SDK.

## 2. Strava API app

1. Go to https://www.strava.com/settings/api → create app.
2. **Authorization Callback Domain**: `runstamp-api.gilla.fun` (or whatever public HTTPS host the API will live at).
3. Copy `Client ID` + `Client Secret` — these go in `apps/api/.env`, **not** in the mobile bundle.
4. Pick a random opaque `STRAVA_WEBHOOK_VERIFY_TOKEN` (`openssl rand -hex 16`). After the API is reachable on HTTPS, register the webhook subscription:
   ```
   curl -X POST https://www.strava.com/api/v3/push_subscriptions \
     -F client_id=$STRAVA_CLIENT_ID \
     -F client_secret=$STRAVA_CLIENT_SECRET \
     -F callback_url=https://runstamp-api.gilla.fun/v1/strava/webhook \
     -F verify_token=$STRAVA_WEBHOOK_VERIFY_TOKEN
   ```

## 3. Backend deployment

```bash
# VPS: drop these in /etc/runstamp.env or your compose .env
RUNSTAMP_ENV=production
DATABASE_URL=postgres://runstamp:<pw>@postgres:5432/runstamp?sslmode=disable
REDIS_URL=redis://redis:6379/0
RUNSTAMP_TOKEN_ENC_KEY=$(openssl rand -hex 32)
RUNSTAMP_PUBLIC_BASE_URL=https://runstamp-api.gilla.fun
RUNSTAMP_ALLOWED_ORIGINS=runstamp://*,https://runstamp.gilla.fun
STRAVA_CLIENT_ID=...
STRAVA_CLIENT_SECRET=...
STRAVA_WEBHOOK_VERIFY_TOKEN=...
FIREBASE_PROJECT_ID=runstamp-<your-id>
FIREBASE_CREDENTIALS_PATH=/etc/runstamp/firebase-service-account.json
STRAVA_SUCCESS_DEEPLINK=runstamp://strava/connected
STRAVA_FAILURE_DEEPLINK=runstamp://strava/error
```

Then:
```bash
# On the VPS:
docker compose up -d
curl https://runstamp-api.gilla.fun/healthz   # should return { "status": "ok" }
```

## 4. EAS Secrets (one-time, run locally)

```bash
cd apps/mobile
pnpm dlx eas login                     # log in with your Expo account
pnpm dlx eas init                      # creates the EAS project; writes projectId

pnpm dlx eas secret:create --scope project --name GOOGLE_SERVICES_INFOPLIST --type file --value ./GoogleService-Info.plist --visibility secret
pnpm dlx eas secret:create --scope project --name GOOGLE_SERVICES_JSON     --type file --value ./google-services.json     --visibility secret
pnpm dlx eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "<your-web-client-id>.apps.googleusercontent.com" --visibility plaintext
pnpm dlx eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value "https://runstamp-api.gilla.fun" --visibility plaintext
```

`eas init` updates `app.config.ts` indirectly via env — the file is already wired to read `EXPO_PUBLIC_EAS_PROJECT_ID` if you want to control it explicitly. Either approach works.

Edit `eas.json`'s `submit.production.ios` block — replace `REPLACE_WITH_APP_STORE_CONNECT_APP_ID` (numeric, from App Store Connect) and `REPLACE_WITH_APPLE_TEAM_ID` (10-char alphanumeric, from developer.apple.com → Membership).

## 5. First build

```bash
# from repo root
pnpm icons                    # regenerate if you tweak the logo
pnpm mobile:prebuild          # generates ios/ + android/ from app.config.ts

# Iteration: dev client first (works on your real phone for fast reloads)
pnpm mobile:build:dev         # ~10–15 min on EAS, sends a push when done
# install via the link EAS posts, scan the QR with the dev client, iterate

# When you're happy, ship to TestFlight:
pnpm mobile:build:prod        # ~10–15 min
pnpm mobile:submit            # uploads the latest production build to TestFlight
```

The first time you submit, EAS will ask you to manage credentials. Let it generate everything — it handles the dist cert + provisioning profile + APNs key. Choose "Let EAS manage" at every prompt.

## 6. After it's on TestFlight

- Open App Store Connect → TestFlight → invite yourself + a few testers
- Apple's TestFlight build review takes 10 minutes to 24 hours the first time. Subsequent builds skip review entirely.
- New runs you log on Strava will sync via the webhook within seconds of arriving on Strava's side. The 500-activity history backfill runs in the background — open the app and you'll see "Pulling your activities" → "Enriching 247 of 487" → "Welcome".

## Common issues

- **`expo prebuild` fails on Firebase plugin** — you don't have `GoogleService-Info.plist` next to `app.config.ts`. The plist is gitignored; download it from Firebase Console.
- **EAS build fails on `use_frameworks: 'static'`** — `expo-build-properties` plugin is the source. It's already wired correctly; this error usually means a transitive pod hasn't been updated. Run `pnpm mobile:prebuild` again with `--clean`.
- **Strava callback returns to the browser instead of the app** — your `STRAVA_SUCCESS_DEEPLINK` env var on the backend doesn't match the iOS scheme. The scheme is `runstamp` (set in `app.config.ts`); the deep link must be `runstamp://strava/connected`.
- **Apple Sign-In silently fails** — check Firebase Auth → Apple provider has the Service ID + .p8 uploaded. Without those, Firebase rejects the identity token with a generic "operation not allowed" you'll only see in the logs.

## What v0 does NOT have (intentional)

- Push notifications on stamp-earn — needs APNs auth key wired into Firebase Cloud Messaging (defer)
- Live activity ingest UI on Home — sample data still shows; we'll wire `/v1/activities` reads in v0.2
- Android Health Connect — iOS HealthKit only in v0 (PRD §6.8 ships iOS first)
- `/v1/strava/import/pause` + `/resume` — the worker handles rate-limit pauses internally; manual pause is a v0.2 nicety
