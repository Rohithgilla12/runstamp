# Runstamp

> Collect a stamp for every run.

[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-e85d2f)](./LICENSE) [![Mobile CI](https://img.shields.io/badge/mobile-vitest%20%2B%20tsc-14110d)](./.github/workflows/mobile.yml) [![API CI](https://img.shields.io/badge/api-go%20vet%20%2B%20race-14110d)](./.github/workflows/api.yml)

An open-source, post-run companion for runners — turn every Strava and Apple Health activity into a beautiful share card, a passport of cities you've run in, and a catalogue of earned stamps. iOS + Android via React Native. Self-hostable backend in Go.

```
┌──────────────────────────────────────────────────────────────────┐
│  • Read-only ingest from Strava + Apple Health                   │
│  • 12+ stamp-themed share-card templates (postage, postmark,     │
│    boarding pass, customs form, wax seal, cyanotype, riso, …)    │
│  • A world map "passport" of cities — every place you've run in  │
│  • A catalogue of earned stamps (sub-3:45 marathon, Boston Q,    │
│    every continent stamped, …) — common / rare / mythic tiers    │
│  • A public web profile at runstamp.gilla.fun/u/<handle>         │
│  • Street coverage — % of your city's streets you've run         │
│  • Year-in-Stamps scrollytelling recap every December            │
│  • Strength routines for runners + launch-video export           │
│  • Privacy zones, full-account export, canonical-source override │
└──────────────────────────────────────────────────────────────────┘
```

The runner I know wants two things on the same Sunday morning: a beautiful post about the run that just happened, and the bigger picture (cities, PBs, streaks) without paying Strava Premium. Runstamp does both, on both platforms, with your data living wherever you want.

Design language is documented in [`.impeccable.md`](./.impeccable.md) — paper, ink, solar accent, postal vocabulary, "quiet · earned · collectible."

## Repo layout

```
apps/
  mobile/                  Expo SDK 54 + React Native 0.81 + TypeScript strict.
  api/                     Go 1.25 + Chi + pgx + slog. Stateless, Postgres + PostGIS.
  landing/                 Astro static site at runstamp.gilla.fun. Public profile
                           data is served by the Go API (GET /v1/profiles/{handle}).
  marketing/               Remotion launch-video pipeline (renders to video/).
packages/
  templates/               OSS-contributable stamp template definitions (MIT).
  shared-types/            Zod schemas shared between mobile + api (MIT).
docker-compose.yml         Self-host bundle — Postgres + PostGIS + Redis + API.
.impeccable.md             Design system + brand vocabulary.
CONTRIBUTING.md            How to ship a template, stamp, or bug fix.
SECURITY.md                Responsible disclosure.
```

## Quickstart

```bash
# Get everything installed
pnpm install

# Mobile
pnpm mobile:start          # Expo dev server (ASK BEFORE — usually one's already running)
pnpm mobile:ios            # boot iOS simulator
pnpm -F @runstamp/mobile typecheck
pnpm mobile:test           # vitest unit tests (pure-TS, no react-native)

# Backend (Postgres + Redis + API in containers)
cp .env.example .env       # fill in RUNSTAMP_TOKEN_ENC_KEY, Firebase project id, etc.
docker compose up -d --build
curl http://localhost:8090/healthz

# Or bare-metal Go (still need postgres running)
pnpm api:run

# Landing site
pnpm -F @runstamp/landing dev
```

Pre-PR sanity: `pnpm -F @runstamp/mobile typecheck && pnpm mobile:test && pnpm api:vet && pnpm api:test`.

## Self-hosting

The repo-root [`docker-compose.yml`](./docker-compose.yml) brings up the full backend in one command. You provide:

- A Firebase project (auth) — drop the service-account JSON at `./secrets/firebase-service-account.json`.
- A Strava developer app (optional) — fill `STRAVA_CLIENT_ID` + `STRAVA_CLIENT_SECRET` in `.env`.
- A 64-hex token encryption key (`openssl rand -hex 32` → `RUNSTAMP_TOKEN_ENC_KEY`).
- A 32-hex waitlist IP salt (`openssl rand -hex 16` → `RUNSTAMP_WAITLIST_IP_SALT`).

Put a reverse proxy (Caddy / nginx / Traefik / Cloudflare Tunnel) in front of the API on port `8090`. The production deploy at `runstamp-api.gilla.fun` uses Cloudflared as a sidecar — see [`apps/api/docker-compose.yml`](./apps/api/docker-compose.yml) for that variant.

Migrations run automatically at API boot via golang-migrate. Mobile points at the API via `EXPO_PUBLIC_API_BASE_URL` (see `apps/mobile/.env.example`).

## Architecture

```
┌──────────────┐      OAuth      ┌──────────────────┐
│  RN App      │◀───────────────▶│  Firebase Auth   │
│ (iOS/Andr)   │                 └──────────────────┘
│              │     HTTPS         ┌──────────────────────────────────┐
│              │◀─────────────────▶│  runstamp-api.gilla.fun          │
│              │     JWT           │  (Cloudflared tunnel → VPS)      │
└──────┬───────┘                   │                                  │
       │                           │  ┌────────────┐  ┌────────────┐  │
       │ direct upload             │  │  Go API    │  │  Stamps    │  │
       │ (presigned URL)           │  │  (Chi)     │  │  evaluator │  │
       ▼                           │  └─────┬──────┘  └─────┬──────┘  │
┌──────────────┐                   │        │               │          │
│  R2 bucket   │                   │  ┌─────▼───────────────▼──────┐   │
│  user-media  │                   │  │  Postgres + PostGIS         │   │
└──────────────┘                   │  │  Redis (queues, cache)      │   │
                                   │  └─────────────────────────────┘   │
                                   └──────────────┬───────────────────┘
                                                  │
                                           ┌──────▼──────┐
                                           │ Strava API  │
                                           │ webhooks +  │
                                           │ activity    │
                                           │ stream      │
                                           └─────────────┘
```

## CI / CD

- **Mobile** ([`.github/workflows/mobile.yml`](./.github/workflows/mobile.yml)) — pnpm install, `tsc --noEmit`, `vitest`, non-blocking `expo-doctor`.
- **API** ([`.github/workflows/api.yml`](./.github/workflows/api.yml)) — `go build`, `go vet`, `go test ./... -race` on Go 1.25.
- **Docker API Build** ([`.github/workflows/docker.yml`](./.github/workflows/docker.yml)) — verifies the API Dockerfile still builds.
- **Deploy API** ([`.github/workflows/deploy-api.yml`](./.github/workflows/deploy-api.yml)) — on push to `main` (when `apps/api/**` changes), SSHes to the VPS and runs `docker compose up -d --build api`. Migrations apply at boot.
- **Landing** auto-deploys to Cloudflare via the Pages dashboard's GitHub integration — no `.github/workflows/*.yml` needed.
- **Mobile OTA** ships via `eas update --branch production --environment production`. New native modules require a fresh `eas build` first.

## Contributing

The single highest-impact contribution is a **new stamp template** or **stamp definition** — see [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the patterns. Bug fixes and small UX polish are equally welcome.

Read [`CLAUDE.md`](./CLAUDE.md) for the conventions the codebase already commits to (TypeScript strict, no `any`, Reanimated 4 for animations, no JS Firebase SDK, etc.). [`.impeccable.md`](./.impeccable.md) is the design system source of truth.

## Security

If you find a security issue, please follow the disclosure process in [`SECURITY.md`](./SECURITY.md). Do not file a public issue.

## License

Split license so the OSS sharing model works cleanly:

- **App + backend: AGPL-3.0** — `apps/mobile/`, `apps/api/`, `apps/landing/`. See [`LICENSE`](./LICENSE). The AGPL keeps hosted clones honest: if you run Runstamp as a service, your changes go back to the community.
- **Templates + shared types: MIT** — `packages/templates/`, `packages/shared-types/`. Designers can lift these anywhere without friction.

## Inspirations

- **Share Aura** — proved runners want beautiful post-run art. Runstamp's editor is the OSS, cross-platform answer.
- **Strava** — the irreplaceable activity ingestion layer. Runstamp is a *companion* to Strava, not a replacement.
- **Things 3 / Bear / Linear · Apple Wallet / Mail passes · Polaroid / Field Notes / Riso prints** — the design reference triangle (`.impeccable.md`).

---

Built by [@Rohithgilla12](https://github.com/Rohithgilla12) — runner, side-project pace, no commercial backing. If Runstamp earns a place on your home screen, a GitHub star is the best thank-you.
