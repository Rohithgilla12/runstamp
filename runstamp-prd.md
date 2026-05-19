# Runstamp — PRD v0.1

> Collect a stamp for every city you run in. Make every PB into a keepsake.
> Open-source tools for athletic expression — for runners, on iOS and Android.

**Author:** Gilla
**Status:** Draft
**Last updated:** 2026-05-19
**Name:** Runstamp *(domain target: `runstamp.app`)*
**Internal codename:** Helios (keep in repo names if desired: `helios-api`, `helios-worker`)

---

## 1. Why this exists

Share Aura proved runners want to share visually — but it's iOS-only, closed-source, and a sticker tool first, analytics second. The runner I know (and am) wants two things on the same Sunday morning:

1. **Make a beautiful post** about the run that just happened — map, pace, HR, splits, a real photo from the route, all composed without leaving the phone.
2. **See the bigger picture** — "how many cities have I run in?", "what's my Q1 vs Q2 mileage?", "what's my best 10K effort this year?" — without paying Strava Premium or exporting CSVs to a spreadsheet.

Existing tools split these poorly:

- **Strava** owns the social graph but the analytics are gated behind Premium and the post-run share card is generic.
- **Runalyze / Smashrun** nail analytics but produce ugly shares.
- **Share Aura** nails shares but has no analytics, no Android, and isn't yours.

Runstamp is the open-source alternative that does both, on both platforms, for free, with your data living wherever you want. The unifying idea: **a run is a stamp**. Every city stamped on your passport. Every PB stamped on your record. Every share is a small, designed artifact — a stamp you can show off.

## 2. Goals & non-goals

### Goals
- Beautiful, customizable post-run share images (single image or Instagram Story).
- Real analytics: lifetime, year, month, week. Top runs, best efforts, streaks, places.
- A **"Places"** view: every city/region you've ever run in, on a world map.
- First-class Strava + Apple Health sync. Eventually Garmin, Coros, Health Connect (Android).
- Cross-platform from day one: iOS **and** Android.
- Open source, self-hostable backend, OSS map tiles.

### Non-goals (for v0.1)
- Live activity tracking. We are a **post-run** companion, not a tracker. Strava/Garmin already do this well. *(May revisit in v2 — see Aura Runcam.)*
- Social graph. No following, no kudos, no feed. Sharing happens through Instagram/WhatsApp/X.
- Training plans, coaching, race predictions.
- Cycling, swimming, generic workouts. **Runs only** in v0.1. Cycling is a fast-follow.
- Web app. Mobile-first. A read-only web profile (`runstamp.app/u/gilla`) is a v2 idea.

## 3. Target user

> Vegetarian runner, 60–80 km/week, runs 4–5x/week, has a Garmin or just their phone, posts to Instagram Stories after long runs, tracks shoe mileage in a spreadsheet, has opinions about MAF, runs in different cities when they travel.

i.e. me, and the people who'd star data-peek.

## 4. Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Mobile | **React Native + Expo (SDK 53+), TypeScript** | You're a frontend lead in TS/React. Expo's prebuild + EAS gives same-day iOS + Android. Strong image-editing ecosystem (Skia, view-shot, gesture-handler). |
| Auth | **Firebase Auth** | Per your call. Apple + Google + email. Cheapest path to "both stores, signed in." |
| Backend | **Go 1.23, Fiber or Chi**, on your VPS via Cloudflared tunnel to `runstamp-api.gilla.fun` | Fits your Kronos arc. Stateless service behind Cloudflare. Easy to containerize. |
| DB | **PostgreSQL 16** on VPS, with PostGIS extension | PostGIS is the unlock for "cities I've ran in" — `ST_Within`, reverse geocoding caches. |
| Cache / queues | **Redis** | Strava webhook fan-out, rate-limit token bucket per user, ephemeral OAuth state. |
| Object storage | **Cloudflare R2** | User-uploaded photos + rendered share images. S3 API, zero egress fees, fronted by Cloudflare CDN. Self-hosting image storage on your VPS is a footgun (disk, bandwidth, backup). |
| Maps | **MapLibre Native** + **OpenFreeMap** or **Protomaps** tiles | OSS map renderer for RN. OpenFreeMap is free, no API key, OSM-based. Protomaps if you want self-hosted `.pmtiles`. |
| Reverse geocoding | **Nominatim** (self-hosted later) or **Photon** | For mapping GPS → city/country. Start with Nominatim public API + heavy caching, self-host once you have >5k users. |
| Image rendering | **react-native-skia** (Shopify) | Canvas-equivalent on RN. Used for the templated overlays. `react-native-view-shot` to export PNG. |
| Charts | **Victory Native XL** (built on Skia) | Skia-native, fast, themeable. |
| Strava | OAuth2 + webhooks → `/strava/webhook` on backend | Per Strava API rules: store athlete_id, hashed access/refresh tokens, fetch activities on `aspect_type=create`. |
| Apple Health (HealthKit) | **react-native-health** (rn-health) via Expo config plugin | iOS only. Read-only scopes: `HKWorkoutTypeIdentifier` (running only, filter `HKWorkoutActivityType.running`), `HKQuantityTypeIdentifierHeartRate`, `HKQuantityTypeIdentifierActiveEnergyBurned`, `HKQuantityTypeIdentifierDistanceWalkingRunning`, `HKSeriesTypeIdentifierWorkoutRoute` (the GPS polyline), `HKQuantityTypeIdentifierStepCount` (optional, for cadence). Never request write scopes — Runstamp is a reader, not a writer. Use `HKObserverQuery` + background delivery (`enableBackgroundDeliveryForType`) so new Apple Watch / iPhone runs sync without opening the app. |
| Health Connect (Android) | **react-native-health-connect** | Android equivalent. Post-v0.1, but plan the schema for it now. |
| Observability | **OpenTelemetry + Pino → Grafana Cloud free tier** (or your existing setup) | Trace Strava sync jobs, log structured. Matches your Chronos pattern. |
| CI/CD | **GitHub Actions → EAS Build → TestFlight / Play Internal** | Standard Expo flow. Backend → Docker image → `docker compose pull && up -d` on VPS via SSH action. |
| Repo | Monorepo via **pnpm workspaces + Turborepo**: `apps/mobile`, `apps/api`, `packages/shared-types`, `packages/templates` | Share zod schemas between RN and Go-via-codegen, or duplicate types in Go (acceptable). |

### Architecture sketch

```
┌─────────────┐    OAuth     ┌──────────────────┐
│  RN App     │◄────────────►│  Firebase Auth   │
│ (iOS/Andr)  │              └──────────────────┘
│             │
│             │   HTTPS       ┌──────────────────────────────────┐
│             │◄─────────────►│  runstamp-api.gilla.fun          │
│             │   JWT          │  (Cloudflared tunnel → VPS)      │
└──────┬──────┘                │                                  │
       │                       │  ┌────────────┐  ┌────────────┐  │
       │   direct upload        │  │  Go API    │  │  Worker    │  │
       │   (presigned URL)      │  │  (Fiber)   │  │  (Asynq)   │  │
       ▼                       │  └─────┬──────┘  └─────┬──────┘  │
┌─────────────┐                │        │               │          │
│  R2 bucket  │                │  ┌─────▼───────────────▼──────┐   │
│  user-media │                │  │  Postgres + PostGIS         │   │
└─────────────┘                │  │  Redis (queues, cache)      │   │
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

## 5. Core data model (rough)

```sql
-- users
id uuid pk
firebase_uid text unique
email text
display_name text
home_city text
units text -- 'metric' | 'imperial'
created_at timestamptz

-- connected accounts
user_id fk
provider text -- 'strava' | 'apple_health' | 'health_connect'
external_id text
access_token_encrypted bytea
refresh_token_encrypted bytea
expires_at timestamptz
scopes text[]

-- activities (one row per run, source-agnostic)
id uuid pk
user_id fk
source text -- 'strava' | 'apple_health' | 'manual'
external_id text -- source-specific id
sport text -- 'run' for now; future: 'ride', 'walk'
started_at timestamptz
elapsed_seconds int
moving_seconds int
distance_m numeric
elevation_gain_m numeric
avg_hr int null
max_hr int null
avg_pace_s_per_km numeric
calories int null
shoe_id fk null
location_start geography(point, 4326) -- PostGIS
location_city text null
location_country text null
title text
notes text
raw jsonb -- original payload
unique(user_id, source, external_id)

-- streams (downsampled, optional; full streams stored as parquet/json blob in R2)
activity_id fk
type text -- 'latlng' | 'heartrate' | 'altitude' | 'velocity'
data jsonb -- downsampled to ~500 points for chart rendering

-- best_efforts (denormalized for fast lookup)
activity_id fk
user_id fk
distance_m int -- 1000, 1609, 5000, 10000, 21097, 42195
time_seconds int
achieved_at timestamptz

-- places (PostGIS-backed)
user_id fk
city text
country text
country_code text
first_run_at timestamptz
run_count int
geom geography(point, 4326)

-- posts (saved share creations)
id uuid pk
user_id fk
activity_id fk null -- can be unlinked
template_id text
config jsonb -- layer positions, colors, copy
photo_r2_key text null
rendered_r2_key text null
created_at timestamptz

-- stamp_definitions (catalogue; seeded from code, not user-editable)
id text pk -- 'first_marathon', 'sub_3_45_marathon', 'boston_qualifier', etc.
name text -- 'Sub-3:45 Marathon'
description text
tier text -- 'common' | 'rare' | 'mythic'
category text -- 'distance' | 'pace' | 'streak' | 'place' | 'milestone'
criteria jsonb -- machine-checkable rule, e.g. {"sport":"run","distance_m_gte":42195,"time_seconds_lte":13500}
artwork_template_id text -- which template renders this stamp
released_at timestamptz -- so we can add new stamps over time

-- stamps_earned
id uuid pk
user_id fk
stamp_id fk → stamp_definitions
earned_at timestamptz
activity_id fk null -- the run that triggered it, if applicable
context jsonb -- e.g. {"actual_time_seconds": 13613} for the share card
unique(user_id, stamp_id) -- each stamp earned once per user
```

PostGIS earns its keep on `places`: a nightly job (or webhook-triggered upsert) reverse-geocodes `location_start` and clusters runs into city polygons. Stamp evaluation runs on a queue after every new activity: enqueue `check_stamps(activity_id)` → worker iterates `stamp_definitions`, runs the criteria check, inserts into `stamps_earned`, pushes a notification if anything new fired.

## 6. Features

### 6.1 Onboarding (≤90 seconds)

1. Splash → Sign in with Apple / Google / email (Firebase).
2. Permission primer screens (why we want Strava / HealthKit / photos).
3. Connect Strava (OAuth web view → deep-link back). Backfill last 90 days immediately, then last 5 years in the background.
4. *iOS:* request HealthKit read scopes (workouts, HR, route, active energy) in a single prompt. Frame copy: "Runstamp reads your running workouts from Health. We never write back." *Android:* skip for v0.1, show "Health Connect coming soon."
5. Land on Home with the most recent run pre-loaded into the editor.

### 6.2 Home

A vertical scroll:

- **Latest activity card** with one-tap "Create share."
- **Stamp count chip** at the top of Home: "**47 stamps · 6 countries**" — the headline number. Tap → Places view.
- **This week**: km, runs, time, elevation, vs last week (delta chip).
- **Best efforts this month**: 1K, 5K, 10K, HM, M tiles with time + sparkline.
- **Recently earned stamps**: horizontal carousel of the last 3–5 stamps with earn dates. Tap → stamp detail + share.
- **Recap card**: rotating ("you ran in 3 cities this month", "longest run streak: 12 days", "2 stamps away from your next mythic").
- ~~Shoe widget~~ — dropped. See §10 for the rationale.

### 6.3 Editor (the headline feature)

The editor takes one run and turns it into a **stamp** — a designed, shareable artifact. Think Aura, but the metaphor is consistent end-to-end: every output is a stamp from a particular template family.

- **Surface:** 9:16 (Story), 1:1 (Post), 4:5 (Feed) — switchable. The 1:1 square is the "canonical stamp" format.
- **Background layer:**
  - Solid color / gradient (from palette).
  - Your photo (camera roll, with editor zoom/crop).
  - Map snapshot of the route (MapLibre static render, 3 styles: light, dark, terrain).
  - Photo + sticker overlay mode — your photo with transparent stat stickers on top.
- **Stat blocks** (drag, snap-to-grid, resize):
  - Distance (auto-formatted km/mi).
  - Pace / speed.
  - Duration.
  - Elevation gain.
  - Avg HR / max HR (if HR data exists; gracefully hide if not).
  - Calories.
  - Splits table (1K splits, color-graded by pace).
  - HR chart (sparkline or full).
  - Pace chart.
  - Map polyline (the GPS trace).
  - Date / time of day.
  - Shoe.
  - Custom text.
- **Template families** — 12–15 at launch, all sharing the stamp metaphor. Templates are JSON in `packages/templates`, OSS-contributable:
  - **Postage** — classic postage stamp shape with perforated edges, country/year marks, distance as denomination ("42.2 KM").
  - **Postmark** — circular cancellation stamp with date, city, and pace around the rim.
  - **Passport** — passport entry page styling; works especially well with the Places features.
  - **Boarding Pass** — airline ticket layout, "ORIGIN → DESTINATION" using start/end locations.
  - **Customs Form** — slightly cheeky form-style template ("declare: 21.1 km, 1820 kcal, one new PB").
  - **Engraved** — letterpress aesthetic, monochrome, all-caps serifs.
  - **Wax Seal** — circular ornate badge, suits achievement/PB stamps best.
  - **Halftone** — newsprint-era dot pattern over your photo.
  - **Riso** — risograph two-color overlay (cyan/red, pink/blue, etc.).
  - **Cyanotype** — blueprint blue, suits trail/long-run aesthetic.
  - **Date Stamp** — minimalist office-stamp typography, dated and dry.
  - **Minimal** — clean, modern, no metaphor — for runners who hate the cute stuff.
- **Export:**
  - PNG to camera roll.
  - Instagram Stories direct share (iOS: `instagram-stories://`; Android: intent).
  - Generic share sheet (WhatsApp, X, etc.).
  - "Copy stat stickers" — exports every stat block as a transparent PNG to clipboard, paste into IG sticker UI. *(Aura's killer move; we match it.)*

### 6.4 Analytics

Three lenses, all built on the same query primitives:

- **Year view** — heatmap calendar (GitHub-style), monthly totals chart, distance histogram, "year in review" auto-generated card at year-end.
- **Month view** — calendar with run dots, weekly bar chart, best efforts this month, training load (TSS-equivalent using HR if available, otherwise distance-based).
- **All-time** — totals (distance, time, elevation, runs), longest run, fastest 5K/10K/HM/M ever, current and longest streak, cumulative distance chart.

Filters: shoe, distance range, HR zone, year. Compare-mode: any two months / years side by side.

### 6.5 Places (the geographic stamp book)

A world map on the Home tab, MapLibre-rendered, framed as your **running passport**:

- A stamp icon (not a generic dot) at each city you've run in.
- Tap a stamp → list of runs there, total km, first-ever-run date in that city, share button.
- Header: "**47 stamps** · **6 countries** · **3 continents**." This single line is the headline metric of the whole app — the number a user will quote when explaining Runstamp to a friend.
- Filter by year (your 2026 stamps).
- Lifetime view vs. current-year view.
- **Share button** → renders a "**My 2026 Runstamps**" card showing the map + the count + the country flags. This is highly shareable in its own right (think: Spotify Wrapped, but for runners) and is the primary virality lever for the app.

Implementation: every activity's `location_start` is reverse-geocoded once (cached forever per ~1km grid cell using PostGIS), normalized to `(city, country)`, deduped into `places`. Run that lookup once per new activity, not on every analytics query.

### 6.6 Stamps Collection (the achievement layer)

Distinct from Places. Where Places stamps come from *where* you ran, Collection stamps come from *what* you did. Three tiers, visually distinct in the UI:

- **Common (silver)** — earned often, build the habit.
  - First run logged. First 5K. First 10K. First half. First marathon. First night run. First sub-zero run. Each new city (this overlaps with Places — same event, two views).
  - Monthly streak (3 / 5 / 7 / 14 days). 100 km / 250 km / 500 km in a month.
- **Rare (gold)** — meaningful milestones.
  - Sub-50 10K. Sub-2:00 half. Sub-4:00 marathon. Sub-3:45 marathon (you've got this one). 1000 km in a year. 30-day streak. First trail run > 20 km.
- **Mythic (holographic)** — serious territory.
  - Boston qualifier. Sub-3 marathon. Ultra finish. 5000 km in a year. 100-day streak. Every continent stamped.

Each stamp is itself a small designed artifact (using the same template engine as the editor), can be shared individually, and is auto-generated the moment it's earned — the app pushes a notification: "🥇 New stamp earned: **Sub-3:45 Marathon**" with a one-tap "Share" CTA.

**Why this matters for retention.** Pure analytics apps lose users after the new-shiny phase. Stamp collection turns the analytics into a low-grade game with real, runner-meaningful rewards — and every earned stamp is a free virality moment. Critically: stamps are **earned by what you've done**, not by app engagement metrics (no "log in 7 days in a row" garbage). This is the difference between Duolingo-energy and Strava-segment-energy.

### 6.7 Year in Stamps (the calendar moment)

A first-class feature, not just a footer. Every December, generate "**Your 2026 Runstamp Album**" — a multi-page swipeable card stack covering:

- Total distance + total runs.
- Stamps earned this year (Common / Rare / Mythic).
- New cities visited.
- Longest run.
- Best efforts at each standard distance.
- Pace evolution chart.
- Most-worn shoe.
- One "moment of the year" — auto-picked: the run with the biggest PB margin.

Designed to be the single most shareable artifact Runstamp produces all year. Drops on December 15 (early enough that runners post about it before they leave for holidays).

### 6.8 Sync

- **Strava webhooks** for new activities → push to user within seconds. Push notification: "New run synced — tap to create."
- **Apple Health** (iOS) — `HKObserverQuery` + `enableBackgroundDeliveryForType` watch the running workout type. When iOS wakes us up, we read the new `HKWorkout` + its `HKWorkoutRoute` (CLLocation samples) + HR series, normalize into the `activities` schema, and upload. Anchored queries (`HKAnchoredObjectQuery`) so we never re-read the same workout twice. Backfill on first connect: pull last 5 years of running workouts in a paginated background task.
- **Conflict resolution:** if the same run shows up from both Strava and Apple Health (likely — Strava often imports from HealthKit and vice versa), match on `started_at` within ±60 seconds **and** `distance_m` within ±2%. Prefer Strava when both exist (richer streams, splits, segments) and mark the HealthKit row as `dupe_of = strava_activity_id`. User can manually override which source is canonical from the activity detail screen.

### 6.9 Settings

- Units (metric/imperial).
- Connected accounts.
- ~~Shoes~~ — dropped (see §10).
- Default template, default share size.
- Privacy zone (hide map start/end within N meters of home — like Strava). **Critical** for OSS credibility.
- Data export (GPX zip + JSON).
- Account deletion.

## 7. Open-source positioning

This matters; it's half the reason to build it:

- **License:** AGPL-3.0 for the app + backend (prevents proprietary forks running a hosted clone), MIT for `packages/templates` and `packages/shared-types` so designers can contribute templates freely.
- **Self-host story:** docker-compose for backend + Postgres + Redis. Users bring their own Strava API key, Firebase project, R2 bucket. Document this from day one — it's what makes the OSS claim credible vs. "source-available."
- **Hosted version:** `runstamp.gilla.fun` runs on your VPS. Free for individuals. If it grows, optional Pro tier later (more templates, higher-res exports, premium map styles) — but free tier stays full-featured.
- **Community:** GitHub Discussions, contribution guide for templates (`templates/README.md` with screenshot grid auto-generated by CI).
- **Naming:** `Runstamp` is locked. Internal codename `Helios` (sun god, every run brought into the light) lives in repo/service names if you want — it's a fun easter egg in the README.

## 8. Brand identity

The name does most of the work; the brand follows from it. Don't overthink this.

### Visual vocabulary

The whole product lives in the **postage / passport / postmark** world. That's the lane no other running app occupies. The aesthetic toolkit:

- **Perforated edges** on stamp-style share cards.
- **Postmark circles** — date, place, distance around a circular rim.
- **Ink textures** — slightly imperfect, hand-stamped feel. Not crisp vector; deliberately a little smudged.
- **Halftone dot patterns** for photo overlays (riso, newsprint).
- **Air-mail stripes** (red/blue diagonal) as accent borders for certain template families.
- **Monospaced typewriter typography** for stats; sturdy serif for big numbers; small all-caps sans for labels.
- **Color** — restrained palette. Postage red, ink blue, parchment cream, charcoal. Holographic foil for Mythic stamps (animated gradient on share cards).

### App icon direction

Two strong options, pick after seeing both at 60×60:

1. **Stylized postage stamp** — perforated square outline, runner silhouette inside, "RS" denomination corner. Recognizable as a stamp at a glance.
2. **Circular postmark** — "RUNSTAMP" curving around the rim, current date in the middle, partial ink-bleed for character. Distinctive against the grid of square fitness icons (Strava, Runkeeper, Nike) — *because* it's the only round one.

My lean: **circular postmark**. Visual differentiation matters more than literal-ness on the home screen, and round icons stand out next to a row of squares.

### Voice

Plain, runner-coded, slightly dry. Not Duolingo. Not Nike-aspirational either. Closer to a quiet competence — a well-designed tool that respects the user.

- Good: "Sub-3:45 marathon. Stamped." / "47 cities. 6 countries. Keep going."
- Bad: "AMAZING WORK!! 🔥🔥 You CRUSHED IT!!" / "You're a running rockstar 🚀"

### Tagline candidates

- "Collect a stamp for every run." *(direct)*
- "A passport for your runs." *(passport-first)*
- "Every run is a stamp." *(short, declarative)*
- "Make your runs collectable." *(achievement-first)*

Decide before the landing page goes up. My pick: **"Collect a stamp for every run."** — explains the place feature, the achievement feature, and the share feature in one sentence.

## 9. Milestones

| Phase | Scope | Rough effort *(side-project pace)* |
| --- | --- | --- |
| **M0 — Foundation** | Monorepo set up, Expo app boots on both stores, Firebase Auth working, Go API on VPS responding to `/healthz` via Cloudflared, Postgres + PostGIS provisioned. | 1–2 weekends |
| **M1 — Strava ingestion** | OAuth, webhook, activity backfill (last 90 days), DB schema, list view of synced runs in app. | 2–3 weekends |
| **M2 — Editor v1** | 3 stamp templates (Postage, Postmark, Minimal), photo background, 6 stat blocks, PNG export, Instagram Stories share. | 3–4 weekends |
| **M3 — Analytics v1** | Home cards, week/month/year views, best efforts table. | 2 weekends |
| **M4 — Places** | Reverse geocoding pipeline, MapLibre map, places list, "Year in Places" share card. | 2 weekends |
| **M5 — Stamps engine** | `stamp_definitions` seeded (20–25 stamps spanning Common/Rare/Mythic), evaluator on activity-create queue, notification on earn, share card per stamp, Collection view. **This is the differentiator from every other running app**; budget time for it. | 3 weekends |
| **M6 — Apple Health** | iOS-only HealthKit ingestion via `react-native-health`. Request minimal read scopes at first run (workouts + HR + route + active energy). Background delivery wired up so new runs from Apple Watch / Nike Run Club / any HK-writing tracker land in Runstamp within minutes. Dedupe against Strava: if a run shares a start time (±60s) and distance (±2%) with a Strava activity, keep Strava (richer streams) and mark the HK row as `dupe_of`. Surface Apple Health as the *fallback* source — useful when Strava is down or for users who don't use Strava at all (a real subset, especially Apple Watch + Nike Run Club crowd). | 1–2 weekends |
| **M7 — Polish + beta** | TestFlight + Play Internal, 12 stamp templates, shoe tracking, privacy zone (default on), data export, app icon finalized. | 2 weekends |
| **M8 — Public launch** | App Store + Play Store, OSS repo public, Product Hunt + r/running + Twitter. Year-in-Stamps feature ready for December if timing aligns. | 1 weekend |

Total: ~17–21 weekends → **~5 months** at a sustainable side-project pace alongside Fusang, marathon training, and the wedding. Plan around the August wedding & Bangalore move: front-load M0–M3 before August (Strava sync + editor + analytics is a usable app on its own), build M4–M6 during the Bangalore settling-in window, polish + launch in Q4. **Aim to hit M8 by mid-November so Year-in-Stamps lands as a launch moment in December.**

## 10. Risks & open questions

| Risk | Mitigation |
| --- | --- |
| Strava API rate limits (200 req/15min, 2000/day per app, lower for individuals) | Cache aggressively; webhook-driven over polling; budget per-user token bucket in Redis. Apply for higher rate limits once we have real users. |
| Strava ToS — they can revoke API access for "competing" apps | We're a **share + analytics companion**, not a tracker. Frame the app explicitly that way in API application + branding. |
| HealthKit on Android doesn't exist — feature parity gap on day one | Be upfront. Ship Android with Strava-only sync; add Health Connect in M8. Don't pretend it's parity. |
| Reverse geocoding cost & ToS (Nominatim usage policy is strict) | Cache per ~1km grid cell forever. Self-host Nominatim on VPS once usage warrants. |
| Image rendering performance on older Android devices (Skia + large photos) | Profile early on a mid-range Android (Redmi Note class). Cap source image to 2048px on the long edge. |
| Firebase Auth lock-in | Acceptable trade-off; Firebase Auth is *just* auth, and migrating is bounded scope. Don't put anything else on Firebase. |
| Expo native module limits for HealthKit / Health Connect | Both libraries support Expo via config plugins. Verified, but version-pin carefully. |
| HealthKit background delivery throttling on iOS | iOS throttles `HKObserverQuery` callbacks aggressively for battery — delivery can lag 15+ minutes. Document this honestly. Pair it with a pull-to-refresh on Home and a "Sync now" button in settings so users have an escape hatch. |
| HealthKit route data is `CLLocation` samples, not a polyline | Need to assemble points client-side, downsample to ~500 for chart/map render, upload as a stream. Same shape as Strava streams so the editor doesn't care which source rendered it. |
| Scope creep into "live tracking" | Hard "no" until v2. The MVP is a post-run companion. Pin this in the README. |

### Decisions made post-draft

- **2026-05-19 — Shoe tracking dropped.** The original PRD §6.2 carried a Home shoe widget and §6.9 had Shoes CRUD; both are cut. Reasoning: (1) it can't be automatic — HealthKit doesn't surface shoes, and Strava's gear-assignment is manual-per-activity and most users skip it; the whole product promise is "we turn automatic data into beautiful artifacts," so manual entry breaks the mental model. (2) Gear management doesn't fit the stamp metaphor — every other surface is a post-run *artifact*, not a thing-you-tend-to. (3) Serious shoe-trackers already have tools (Strava's gear screen, dedicated apps). (4) The "Coming soon" stub had been in Settings since M1 and never got promoted — that's the signal. Revisit only if Strava starts returning shoe-assignment in the activity webhook by default.

### Open questions for you to decide

1. **Web profile (`runstamp.app/u/gilla` or `runstamp.gilla.fun/u/gilla`)** — v0 or v2? It would be a strong virality vector ("see all my stamps on the web") and you already know Next.js. I left it in v2 but defensible to pull into M6 — a public stamp album reads beautifully on the web and is shareable on its own.
2. **Privacy zone defaults** — Strava defaults to *off*. Should Runstamp default *on* (privacy-first OSS positioning)? My vote: yes, default 200m blur on home.
3. **Monetization stance** — fully free forever? Pay-what-you-want? Pro tier eventually (premium stamp templates, custom map styles)? Decide before public launch so README messaging is honest.
4. **Stamp scarcity** — should some achievement stamps be hard to earn (Boston qualifier, sub-3 marathon, 1000km year) or should every milestone get one? Trade-off: scarcity makes stamps feel earned and collectible; abundance makes the app feel rewarding from day one. My lean: tiered — common stamps for milestones, "rare" stamps for serious achievements, displayed differently.

## 11. Success criteria

**v0.1 launch (in ~5 months):**
- 100 GitHub stars in first week.
- 500 installs across iOS + Android in first month.
- 50 share images created per week, sustained.
- 200+ stamps earned across all users in first month (the engagement metric that matters more than installs).
- 1 community-contributed template merged.
- App Store rating ≥ 4.5 from first 20 reviews.

**v1.0 north star (1 year):**
- 10k installs.
- A meaningful slice of the r/running and r/AdvancedRunning crowd uses it monthly.
- 20+ community-contributed stamp templates.
- "Year-in-Stamps" trends on running Twitter / Strava feeds in December.
- An Indian or European running newsletter writes about it unprompted.

---

*Filed under: side projects worth doing.*
