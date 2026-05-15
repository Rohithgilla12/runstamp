# Tonight's work — autonomous run

The chat-session log has every commit. This file just makes the headline easy to skim while drinking coffee.

## What shipped (every line is live: backend deployed on each push, mobile OTA pushed at each step)

### CI/CD — `.github/workflows/deploy-api.yml`
- Pushed to main with `apps/api/**` change → SSH to VPS, git fetch, `docker compose up -d --build api`, poll healthz, smoke public URL.
- All four secrets configured via `gh secret set`. Deploy workflow ran green on every push tonight.

### Mock data — gone
- Every screen that imported `ACT`/`SHOES`/`STAMPS`/`PLACES`/`ALLTIME` constants now reads from live hooks or shows a clean empty state. No more "Cubbon Park 24.02km" fakes when the user has no runs yet.
- `apps/mobile/src/data/sample.ts` still exports the *types and formatters* (those are real utility code) but the constants are no longer rendered anywhere user-facing.

### M5 Stamps engine (PRD §6.6)
- Migration `0006_stamps` — `stamp_definitions` catalog + `stamps_earned` join table with `UNIQUE(user_id, stamp_id)`.
- `internal/stamps.Catalog` — 16 stamps spanning common/rare/mythic (First 5K/10K/Half/Marathon, sub-50 10K / sub-2h half / sub-4/3:45/3:00 marathon, ultra 50K, 100/500/1000km lifetime, 5 cities, 3 countries, Boston qualifier).
- `internal/stamps.Evaluator` — rule kinds: `single_activity`, `cumulative_distance`, `cities_count`, `countries_count`. Runs against canonical (non-dupe) rows only. Idempotent via `ON CONFLICT DO NOTHING`.
- Wired into `activities.Service` via the post-ingest hook so every Strava webhook / HealthKit sync triggers re-eval synchronously (handful of indexed queries, fast).
- `GET /v1/stamps` returns both catalog + earned in one call.
- `POST /v1/stamps/reevaluate` for manual re-runs (used by users whose history pre-dates the engine going live).

### M4 Places reverse geocoding (PRD §6.5)
- Migration `0007_geocode_cache` — quantizes coords to ~1km grid cells per PRD §5.
- `internal/places.Geocoder` — Nominatim with a 1.1s serialized rate limit and a real User-Agent.
- `Backfiller.BackfillUser` (up to 50 per tap) and `Backfiller.GeocodeActivity` (single).
- Auto-geocode on activity ingest: the post-ingest hook spawns a goroutine with `context.Background()` + 30s timeout, geocodes the new row, then re-runs stamps so place stamps fire as cities accumulate.
- `POST /v1/places/backfill` for manual catch-up.

### Best efforts (PRs)
- `GET /v1/best-efforts` returns one row per standard distance (1K, mile, 5K, 10K, HM, M) with the fastest qualifying run.
- Approximation only — true split-from-stream PRs land when stream-based analysis is wired. Matches what Strava's free tier surfaces.

### Activity streams + real polylines
- `Repository.ListStreams` / `OwnerOf` on the activities repo.
- `GET /v1/activities/:id/streams` (auth-gated, 404 on non-owner to avoid existence leak).
- Mobile `useActivityStreams` hook + a normalizer that converts the raw Strava `[[lat, lng]]` to the existing `Point[]` shape — auto-bounds, 5% inset, north-up flip. So the existing `RouteMap` renders real GPS without a single signature change.
- Wired into ActivityScreen hero + HomeScreen post-run card.
- HR + Pace chart tabs on ActivityScreen now plot live data (Strava velocity m/s → seconds-per-km for pace).

### Account deletion (PRD §6.9)
- `DELETE /v1/me` — hard-deletes user; cascades through every owned row via FKs. Idempotent (already-gone returns 204).
- Settings → Privacy → "Danger zone" card with a two-step destructive Alert flow.

### Run rename
- `PATCH /v1/activities/:id` with `{title}`.
- Long-press the title on Activity detail → native Alert.prompt prefilled with current title.

### UX polish
- Pull-to-refresh on Home / Activity / Analytics / Places / Stamps.
- Maintenance card in Connections with "Re-eval stamps" + "Geocode places" buttons.
- Empty Places screen has an inline "Geocode my runs" CTA so users don't have to dig into settings.

### Bug fixes
- **Strava bulk importer routed through `activities.Service.Ingest`** instead of `Repo.Insert`. Previously bypassed dedup + post-ingest hook, which meant 500 reconnected activities imported with zero stamps awarded. Fixed.
- ASC validator 409 (UIBackgroundModes `processing` without BGTaskSchedulerPermittedIdentifiers) — dropped `processing` from app.config since we use HKObserverQuery + APNs silent push, not BGTaskScheduler.

## How to verify in the morning

1. **Open TestFlight**, force-quit and relaunch (OTA fetches on cold launch).
2. **Settings → Connections** should show:
   - Strava: pressable when not connected, full server-driven OAuth on tap.
   - Apple Health: pressable when status is unknown; tap requests perms + 90-day backfill.
3. **After Strava connects + import runs**:
   - Home shows real post-run hero with real GPS polyline.
   - Stamps chip appears at top once any stamp earns.
   - "Recently earned" carousel above "Recent runs".
   - Recent runs list is real, taps into Activity detail.
4. **Activity detail**:
   - Hero map uses the real GPS trace (falls back to a stylized curve if no GPS).
   - HR and Pace tabs plot from live streams.
   - Long-press the title to rename.
5. **Analytics**:
   - Year/Month/All-time tabs with computed stats.
   - "Personal bests" section once any 5K-or-longer runs exist.
   - "Recent activity" rows.
6. **Places**:
   - Empty until you tap "Geocode my runs" in the empty state (or it backfills automatically as new activities flow in via webhook).
   - City list with km + run count once populated.
7. **Stamps**:
   - All locked initially; earned via the evaluator on ingest.
   - If you've imported activities BEFORE this code went live (i.e. you had a pre-existing reconnect that ran without the importer fix), hit Connections → "Re-eval stamps" once.

## What didn't ship

- **Push notifications** on stamp earn — PRD calls for this, but APNs setup is its own evening.
- **Privacy zone enforcement** on map renders — the UI toggle exists but doesn't actually mask the polyline start. Real implementation needs a `RouteMap` change to fade points within N meters of `home_city` coordinates (which we don't yet store on `users`).
- **Stamp share card** — PRD §6.6's virality moment ("Each stamp is itself a small designed artifact, can be shared individually"). Could reuse the existing template engine; deferred.
- **Year-in-Stamps full carousel** — currently a clean "coming in M7" modal. Implementing the 9-card stack is a December launch piece anyway.
- **Shoes CRUD** — Settings → Shoes is now a roadmap placeholder. PRD §6.2 says M5+.
- **Data export** (GPX / JSON zip) — PRD §6.9 settings item.
- **World map on Places** — the list view works, but no Maplibre yet. Once that lands the geocoded points become visual.

## Files added / changed (highlights)

```
apps/api/migrations/0006_stamps.{up,down}.sql
apps/api/migrations/0007_geocode_cache.{up,down}.sql
apps/api/internal/stamps/{catalog,repo,evaluator}.go
apps/api/internal/places/{geocoder,backfill}.go
apps/api/internal/handlers/{activities,stamps,best_efforts,places,streams,account}.go
apps/api/internal/activities/service.go         # PostIngestHook signature
apps/api/internal/activities/repo.go            # ListStreams, OwnerOf, UpdateTitle
apps/api/internal/strava/import.go              # routes through Service.Ingest
apps/api/cmd/server/main.go                     # wires everything

apps/mobile/src/services/{activities,stamps,bestEfforts,streams,places,account,activityEdit}.ts
apps/mobile/src/state/{useActivities,useStamps,useBestEfforts,useActivityStreams}.ts
apps/mobile/src/screens/{HomeScreen,ActivityScreen,AnalyticsScreen,PlacesScreen,StampsScreen,SettingsScreen,EditorScreen,YearInStampsScreen}.tsx
apps/mobile/app.config.ts                       # ITSAppUsesNonExemptEncryption, drop processing mode
apps/mobile/plugins/withFirebaseStaticFrameworks.js
apps/mobile/babel.config.js                     # reanimated v4 worklets plugin
apps/mobile/package.json                        # SDK 53 → 54
.github/workflows/deploy-api.yml
```
