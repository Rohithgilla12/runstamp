# @runstamp/api

Backend for Runstamp. Go 1.24 + Chi, JSON over HTTP, deployed behind a Cloudflared tunnel to `runstamp-api.gilla.fun` per PRD §4.

## Routes (v0)

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/healthz` | Liveness check |
| `POST` | `/v1/auth/strava/exchange` | Trade a PKCE auth code for tokens (server holds the client secret) |
| `GET`  | `/v1/strava/webhook` | Subscription verification handshake |
| `POST` | `/v1/strava/webhook` | Activity create/update/delete events |

Everything past Strava ingestion (PostGIS reverse geocoding, stamp evaluator, share-card storage on R2) lands in M1.

## Local dev

```bash
cp .env.example .env       # fill in STRAVA_CLIENT_ID / _SECRET
go run ./cmd/server        # boots on :8080
curl -s localhost:8080/healthz | jq
```

Or the whole stack via Docker:

```bash
docker compose up --build
```

That brings up Postgres + PostGIS, Redis, and the API on `:8080`. Volumes persist across restarts.

## Why a server even for v0

Strava OAuth uses a confidential client model — the **client secret** must never ship in the mobile binary. The mobile app does the PKCE authorization, receives an `authorization_code`, and POSTs it here; this service completes the exchange with the client_secret it holds and returns normalised tokens (and eventually a session JWT in place of raw Strava tokens). See PRD §6.8 + §7.

## Layout

```
cmd/server/      entrypoint, router wiring, graceful shutdown
internal/
  config/        env loader (fail-fast on missing prod secrets)
  middleware/    structured slog logger
  handlers/      health, strava exchange, strava webhook
  strava/        server-side Strava API client
```
