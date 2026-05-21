# CLAUDE.md

Project guide for Claude sessions on Runstamp. Read this before touching anything — it captures the patterns the codebase already commits to, the calls I've already gotten wrong, and the conventions to keep.

## What Runstamp is

> Collect a stamp for every run.

Open-source mobile app (iOS + Android via Expo) for runners. Post-run share-card editor + analytics + a "passport for cities you've run in" + an achievement / stamp catalogue. **Not a tracker** — reads runs from Strava / Apple Health (M6) and turns them into shareable artifacts. Full vision in the local-only `runstamp-prd.md` (gitignored; lives only on the maintainer's machine, not in the public repo).

## Repo layout

```
apps/
  mobile/                  Expo SDK 53 + React Native 0.79 + TypeScript 5.8
    src/
      App.tsx              auth-gated shell + nav theme
      data/sample.ts       sample dataset; formatters; stamp catalogue
      design/              theme tokens, atoms, charts, templates
      design/templates/    Postage, Postmark, Passport, Customs, etc.
      nav/                 react-navigation stack + tabs
      screens/             Home, Activity, Editor, Analytics, Places,
                           Settings, Stamps, YearInStamps, Onboarding
      services/            firebase, strava, api (typed fetch helper)
      state/AppState.tsx   units, theme, hasOnboarded
      state/AuthContext.tsx  Firebase auth provider
  api/                     Go 1.24 + Chi + pgx + slog
    cmd/server/            entrypoint (graceful shutdown, route wiring)
    internal/
      auth/                Firebase Admin SDK verifier + middleware
      config/              env-var loader; fail-fast in production
      crypto/              AES-256-GCM Sealer for tokens at rest
      db/                  pgxpool boot + golang-migrate runner
      handlers/            health, me, strava (connect/callback/status/...)
      middleware/          slog request logger
      strava/              client + service + repository
      users/               users repo (firebase_uid keyed)
    migrations/            golang-migrate file source (0001_init, 0002_strava_connections)
packages/
  shared-types/            placeholder for shared zod schemas (M1)
  templates/               placeholder for OSS-contributable template defs
design/                    Claude Design handoff — REFERENCE ONLY (HTML/JSX prototype)
```

## Conventions that are already baked in

### Mobile (apps/mobile)

- **React Navigation** (not expo-router). Stack + bottom tabs. Routes typed in `src/nav/types.ts`.
- **Firebase via `@react-native-firebase/*` + native plist**. Not the JS SDK. See `FIREBASE_SETUP.md`.
- **`expo-apple-authentication` + `@react-native-google-signin/google-signin`** for Apple / Google → `auth.AppleAuthProvider.credential` / `auth.GoogleAuthProvider.credential` → `firebaseAuth.signInWithCredential`. Apple uses a SHA-256 hashed nonce paired with the raw nonce (Firebase's recommended secure flow).
- **`expo-image-picker`** for photo uploads in the editor. **`react-native-view-shot` + `expo-media-library`** for capturing share cards to PNG and saving to camera roll.
- **`react-native-svg`** everywhere for icons, charts, route maps, stamp badges, and the share templates. **No `Math.random()` in render paths** — use a seeded LCG (e.g. mulberry32 keyed from `run.id`).
- **`expo-linear-gradient`** for gradients. No JS gradient libs.
- **`useSafeAreaInsets()`** on every screen — never hard-code `paddingTop: 54`.
- **Inline `style={{}}` objects** are the norm, not StyleSheet.create. Match the existing screens; don't reach for `nativewind` unless we do a whole-app migration.
- **TypeScript `strict: true`. No `any`.** Claudekit hooks block `any` on save.
- **`pnpm` workspaces.** Workspace root has `pnpm-workspace.yaml`; root scripts are in `package.json`. Use `pnpm -F @runstamp/mobile <cmd>` to target the app.
- **Vitest for unit tests** (`vitest.config.ts`, environment: node). Tests live in `src/**/__tests__/*.test.ts` and may NOT import anything that pulls in `react-native` — keep them pure-TS against `src/data/sample.ts` and helpers.

### Backend (apps/api)

- **Go 1.25, Chi router, pgx/v5, slog (JSON output).** Stdlib + four deps; no ORM.
- **AES-256-GCM** for tokens at rest via `internal/crypto.Sealer`. Key from `RUNSTAMP_TOKEN_ENC_KEY` (64 hex). In dev a zero-key falls back with a `slog.Warn`; in prod the server refuses to start without a real key.
- **Firebase Admin** for ID-token verification via `internal/auth.Verifier`. Three modes: real (project + creds), creds-less (project only, will fail at verify-time), null (no project — every protected route 401s).
- **Strava OAuth is server-driven, cadence-style.** Mobile POSTs `/v1/strava/connect` for an authorize URL (state→user binding lives in-memory on the server), browser hits `/v1/strava/callback`, server exchanges with the client secret, redirects to `runstamp://strava/connected`. **Never put the Strava client secret in the mobile bundle.**
- **`golang-migrate`** with the file source. Migrations are SQL pairs in `apps/api/migrations/`. The server runs pending migrations at boot. Migration `0001` provisions `users` + extensions (pgcrypto, postgis); `0002` adds `strava_connections`. Future activity / stamps tables get their own migrations.
- **Routes share one `chi.Route("/strava", ...)` block** with public legs (callback, webhook) and an inner `r.Group` carrying `RequireFirebaseAuth` for protected legs (connect, status, disconnect). **Don't define `r.Route("/strava", ...)` AND `r.Post("/strava/...")` at the same level — chi gives 404.**

### Secrets

- **Mobile `EXPO_PUBLIC_*` env vars are PUBLIC.** They inline into the JS bundle. Use for `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Never for an OAuth client secret.
- **Backend `.env`** is where the Strava client secret + Firebase service-account path + DB URL + token encryption key live. Never commit `.env`. The repo has `.gitignore` for `.env*` (with `.env.example` allowlisted).
- **`GoogleService-Info.plist` / `google-services.json`** are gitignored. Drop them into `apps/mobile/` locally; for CI use **EAS Secrets** with `GOOGLE_SERVICES_INFOPLIST` / `GOOGLE_SERVICES_JSON` env vars overriding the path in `app.config.ts`.
- **EAS Secrets** for production Firebase Admin service-account JSON, signing certs, etc.

## Calls I've already gotten wrong (don't repeat)

1. ❌ Put OAuth client secret in `app.json`'s `extra`. **The mobile bundle is public; the secret stays on the backend.** Fixed in `47a1f33`.
2. ❌ Reached for the **Firebase JS SDK** when the Expo guide and the cadence project use **`@react-native-firebase/*`** with the plist. The JS SDK only matters for Expo Go; once you prebuild, the native path is strictly better (keychain persistence, native Apple Sign-In, FCM/Crashlytics reuse the same plist). Fixed in `cdad5b3`.
3. ❌ Built **mobile-side PKCE OAuth** for Strava with the code POSTed to the backend. The cadence pattern is **server-driven**: mobile asks `/v1/strava/connect` for the URL, browser hits `/v1/strava/callback`, server redirects to a `runstamp://` deep link. State binding is the security win. Fixed in `50bb6ab`.
4. ❌ Used a **polymorphic `connected_accounts` table** for all providers. Apple Health and Health Connect aren't OAuth; mixing them with Strava forces awkward NULLs. Split: `strava_connections` (this migration), future `apple_health_devices` / `health_connect_devices` as needed. Fixed in `50bb6ab`.
5. ❌ Used `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`. Native Firebase Google Sign-In needs the **web** client id to produce an `idToken` that `auth.GoogleAuthProvider.credential` accepts. Fixed in `cdad5b3`.
6. ❌ Left `@react-native-async-storage/async-storage` + `expo-auth-session` in deps after the migrations made them unused. Both removed.

## Things to actively prefer

- **Look at cadence (`/Users/rohithgilla/github.com/Rohithgilla12/cadence`) before inventing a pattern.** Strava OAuth, encryption, deep links, the whole shape — cadence figured it out. When in doubt, mirror.
- **Use multiple parallel agents when work is genuinely independent.** See `superpowers:dispatching-parallel-agents`. Pre-install shared deps yourself so agents don't fight over `package.json`. File scopes must be disjoint or you'll get integration grief.
- **Run `pnpm typecheck` + `pnpm test` + `go build ./... && go vet ./...` before committing.** Claudekit hooks fire on save and emit transient errors during multi-file edits — the *final* state is what matters.
- **`expo-doctor` is part of CI** (`.github/workflows/mobile.yml`). Keep deps at the Expo-recommended versions — run `pnpm dlx expo install --check` after `pnpm add`.
- **Always ask the user before starting the dev server** (`expo start`, `pnpm mobile:ios`). They typically have one running.

## Things to actively avoid

- **Don't write multi-paragraph docstrings.** One short line max. Don't reference "the current task" or "added for X flow" — that belongs in PR descriptions.
- **Don't add abstractions on speculation.** Three similar lines beats a premature helper.
- **Don't add error handling for "can't happen" cases.** Validate at boundaries (user input, Strava response, DB), trust internal code.
- **Don't run risky git operations without asking** — `reset --hard`, force push, branch deletion.
- **Don't commit `GoogleService-Info.plist` / `google-services.json` / `.env*`** (except `.env.example`).

## Common scripts

```bash
# Mobile
pnpm install
pnpm mobile:start                  # Expo dev server (ASK FIRST — usually already running)
pnpm mobile:ios                    # boot iOS sim
pnpm mobile:test                   # vitest unit tests
pnpm -F @runstamp/mobile typecheck

# Backend
cp apps/api/.env.example apps/api/.env  # fill in secrets
pnpm api:up                        # docker compose: postgres + redis + api
pnpm api:run                       # bare go run (needs postgres up)
pnpm api:test                      # go test ./...
pnpm api:vet                       # go vet ./...

# Health
curl -s localhost:8080/healthz | jq

# Database
docker exec api-postgres-1 psql -U runstamp -d runstamp -c '\dt'
docker exec api-postgres-1 psql -U runstamp -d runstamp -c 'SELECT version, dirty FROM schema_migrations;'
```

## Deploys are automatic — don't race them

The backend auto-deploys to the Oracle Cloud VPS on every push to `main` that touches `apps/api/**`. The workflow is `.github/workflows/deploy-api.yml`: GitHub Actions SSHes to the VPS, `git pull`s, and runs `docker compose up -d --build api`. Migrations run at API boot via golang-migrate. **Just push — CI handles the rest.**

If you need to manually intervene (verify migration applied, inspect a container), SSH to `ubuntu@150.230.131.66`:

```bash
# Container + image state
ssh ubuntu@150.230.131.66 "docker ps --filter name=runstamp"
# Migration version
ssh ubuntu@150.230.131.66 "docker exec runstamp-postgres psql -U runstamp -d runstamp -c 'SELECT version, dirty FROM schema_migrations;'"
# API logs
ssh ubuntu@150.230.131.66 "docker logs --tail=50 runstamp-api"
# Healthcheck (host port is 8090 → container 8080)
ssh ubuntu@150.230.131.66 "curl -s localhost:8090/healthz"
```

**Never** run `docker compose up -d --build api` on the VPS yourself while a CI deploy might be in flight — Compose's swap dance races and the second invocation kills the temp container the first one's mid-renaming, leaving the workflow red even though the image is correct. Wait for `gh run list --workflow=deploy-api.yml -L 1` to settle, or use `gh run watch`.

## Where the design came from

`design/helios-run/` is the **Claude Design** handoff bundle — HTML/JSX prototype from before this project was renamed Runstamp (was: Helios → Runcard → Runstamp). It's **reference only**. The mobile app is React Native, ported by hand from this prototype with the same visual vocabulary: cream paper, ink charcoal, solar-orange accent, Instrument Serif italic for display moments, JetBrains Mono for numerals.

## Brand vocabulary (PRD §8)

- Type: **Instrument Serif** (italic display), **Geist** (UI), **JetBrains Mono** (numerals)
- Palette: paper `#f3ede2`, ink `#14110d`, solar `#e85d2f`, moss `#4a6b3a`
- Motifs: perforated edges, postmark circles, halftone, air-mail stripes, holographic foil for Mythic stamps
- Voice: plain, runner-coded, slightly dry. **Not Duolingo. Not Nike.** "Sub-3:45 marathon. Stamped." — not "AMAZING WORK!! 🔥🔥"

## Design context — see `.impeccable.md`

**Before any UI change, read `.impeccable.md` at the repo root.** It's the single source of truth for visual + interaction design — users, brand personality (quiet · earned · collectible), aesthetic direction, the reference triangle (Things 3/Bear/Linear · Apple Wallet/Mail passes · Polaroid/Field Notes/Riso), the five design principles (quiet over loud · real-world materials · type carries the load · one warm pop per surface · honest empty states), and the accessibility bar (WCAG AA). Update it whenever a design decision evolves the rules.

## Memory references

Project memory (`~/.claude/projects/.../memory/`):
- `runstamp-target-mobile.md` — Runstamp is RN + Expo, not a web app
- `runstamp-secrets-handling.md` — secrets handling rules
- `runstamp-firebase-native.md` — use `@react-native-firebase/*`, not JS SDK
