# Runstamp API — VPS deployment

The Runstamp backend lives on the same Oracle Cloud VPS as cadence + the rest
of the self-hosted stack. Containers are namespaced `runstamp-*` so they
coexist cleanly. Cloudflared in front of `runstamp-api:8080` handles the
public `runstamp-api.gilla.fun` endpoint.

## Box

- Host: `150.230.131.66`
- User: `ubuntu`
- OS: Ubuntu 24.04, kernel 6.17 (Oracle Ampere ARM, `aarch64`)
- Docker 28 + Compose v2.36
- Portainer at the usual URL for visual ops

## Service shape (mirrors cadence's)

| Container | Image | Host port (lo) | Network | Restart |
|---|---|---|---|---|
| `runstamp-postgres` | `imresamu/postgis:16-3.4-alpine` | `127.0.0.1:5433` | `runstamp-internal` | unless-stopped |
| `runstamp-redis` | `redis:7-alpine` | `127.0.0.1:6380` | `runstamp-internal` | unless-stopped |
| `runstamp-api` | built locally from `apps/api/Dockerfile` | `127.0.0.1:8090` | `runstamp-internal` | unless-stopped |

All ports bound to `127.0.0.1` only — public traffic comes in through
Cloudflared, which routes to `runstamp-api:8080` over the `runstamp-internal`
docker network. Nothing on the VPS is reachable on the public interface
directly.

> Why `imresamu/postgis` instead of `postgis/postgis`?
> The upstream `postgis/postgis:16-3.4` image only ships `linux/amd64` layers
> and crashes with `exec format error` under arm64 emulation on the Oracle
> Ampere box. `imresamu/postgis` is the canonical multi-arch fork with native
> arm64 builds, same Debian base, same PostGIS 3.4 / PG 16.

> Why port 8090?
> `:8080` is squatted by qbittorrent, `:8088` by filebrowser. `:8090` was the
> first free 80x port. The container still listens on 8080 internally; the
> host port mapping is only for ops curls.

## First-time deployment

Already done on `150.230.131.66`. Repeating the steps for reference:

```bash
# As ubuntu@150.230.131.66 — repo cloned via a read-only deploy key.
cd ~
git clone git@github.com-runstamp:Rohithgilla12/runstamp.git
cd runstamp/apps/api

# Generate .env with a real 32-byte token-encryption key + placeholders.
TOK=$(openssl rand -hex 32)
cat > .env <<EOF
RUNSTAMP_ENV=staging      # flip to production once Strava + Firebase are set
RUNSTAMP_PORT=8080
RUNSTAMP_PUBLIC_BASE_URL=https://runstamp-api.gilla.fun
RUNSTAMP_ALLOWED_ORIGINS=runstamp://*
RUNSTAMP_TOKEN_ENC_KEY=$TOK
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_WEBHOOK_VERIFY_TOKEN=
FIREBASE_PROJECT_ID=
FIREBASE_CREDENTIALS_PATH=/run/secrets/firebase-service-account.json
FIREBASE_AUTH_OPTIONAL=1
FIREBASE_CREDENTIALS_HOST_PATH=./secrets/firebase-service-account.json
EOF

# Placeholder JSON so the bind-mount doesn't fail. Replace with the real
# service account JSON before flipping FIREBASE_AUTH_OPTIONAL off.
mkdir -p secrets
echo "{}" > secrets/firebase-service-account.json
chmod 600 .env secrets/firebase-service-account.json

docker compose up -d --build
```

## Filling in real secrets

Once Firebase + Strava are set up:

```bash
ssh ubuntu@150.230.131.66
cd ~/runstamp/apps/api

# Drop the real service-account JSON into place (Firebase console →
# Project Settings → Service accounts → Generate new private key).
nano secrets/firebase-service-account.json    # paste contents
chmod 600 secrets/firebase-service-account.json

# Edit .env and fill:
#   STRAVA_CLIENT_ID=<from https://www.strava.com/settings/api>
#   STRAVA_CLIENT_SECRET=<from same page>
#   STRAVA_WEBHOOK_VERIFY_TOKEN=$(openssl rand -hex 16)
#   FIREBASE_PROJECT_ID=runstamp-<your-id>
#   FIREBASE_AUTH_OPTIONAL=     # blank line = production-strict
#   RUNSTAMP_ENV=production
nano .env

docker compose up -d            # picks up the new env
docker logs runstamp-api --tail 30   # verify clean boot
```

## Cloudflared route

The user already runs two Cloudflared tunnels (`cloudflared` and
`cadence-cloudflared`). To add a route for runstamp, either:

- **Add an ingress rule to the existing `cloudflared` container**: edit its
  config, add a route from `runstamp-api.gilla.fun` to
  `http://runstamp-api:8080`, ensure the container is connected to the
  `runstamp-internal` network (`docker network connect runstamp-internal cloudflared`).
- **OR spin up a new `runstamp-cloudflared` container** with its own
  dedicated tunnel — mirrors how cadence got its own sidecar. Cleaner
  isolation; easier to teardown later if needed.

Either path: register `runstamp-api.gilla.fun` as a DNS record in Cloudflare
pointing at the tunnel, then run the Strava webhook subscription registration
(see `TESTFLIGHT.md`).

## Update flow

```bash
ssh ubuntu@150.230.131.66
cd ~/runstamp
git pull
cd apps/api
docker compose up -d --build      # rebuilds the api container if Dockerfile or src/ changed
```

`postgres` and `redis` don't rebuild unless the image tag changes.

## Smoke checks

```bash
curl -s http://localhost:8090/healthz | jq
# { "status": "ok", "service": "runstamp-api", "version": "dev", "timestamp": "..." }

docker exec runstamp-postgres psql -U runstamp -d runstamp -c \
  'SELECT version, dirty FROM schema_migrations;'
# Should be the latest migration number, dirty=false.

docker logs runstamp-api --tail 20
# Look for "strava importer: worker started" near the top.
```

## Last-known-good state

- Commit: `2026-05-15` — first deploy, migrations through `0005` applied,
  importer worker running on boot, staging mode (Firebase optional).
- Container `runstamp-api` rebuilt from source on the VPS itself (no GHCR
  push yet — that's a follow-up to add to `.github/workflows/docker.yml`).
