# Runstamp

> Collect a stamp for every run.

Open-source tools for athletic expression — make your runs look as good as they felt, see the bigger picture across cities and years, all from one cross-platform mobile app.

See [`runstamp-prd.md`](./runstamp-prd.md) for the full vision.

## Repo layout

```
apps/
  mobile/         React Native + Expo (SDK 54). iOS + Android.
packages/
  shared-types/   Schemas shared between mobile + (future) api.
  templates/      Share-card template definitions (OSS-contributable).
design/
  helios-run/     Claude Design handoff — HTML/JSX prototype (reference only).
```

## Quickstart

```bash
pnpm install
pnpm mobile:start          # Expo dev server
pnpm mobile:ios            # boot iOS simulator
pnpm mobile:android        # boot Android emulator
pnpm mobile:test           # vitest unit tests

# Backend
cp apps/api/.env.example apps/api/.env
pnpm api:run               # `go run` the API on :8080
pnpm api:up                # full stack (postgres+postgis, redis, api) via docker compose
```

## CI

GitHub Actions runs on every push and pull request:

- **Mobile** (`.github/workflows/mobile.yml`) — installs deps with pnpm, runs `tsc --noEmit` and `vitest` for `apps/mobile`, plus a non-blocking `expo-doctor` check.
- **API** (`.github/workflows/api.yml`) — `go build`, `go vet`, and `go test ./... -race` against `apps/api` on Go 1.24.
- **Docker API Build** (`.github/workflows/docker.yml`) — on push to `main` (when `apps/api/**` changes), builds the API Dockerfile locally on the runner to catch breakage; nothing is pushed to a registry.

## Secrets

The Strava client SECRET (and any other server-side credential) lives **only in `apps/api/.env`** — never in the mobile bundle. The mobile app's public values (client ID, API base URL) come in via `EXPO_PUBLIC_*` env vars; see `apps/mobile/.env.example`.

## License

AGPL-3.0 for app + backend. MIT for `packages/templates` and `packages/shared-types`.
