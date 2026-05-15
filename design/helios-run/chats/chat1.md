# Helios Running App Design

_Started 2026-05-15 08:06 UTC_

---

## User

<system-info comment="Only acknowledge these if relevant">
Project title is now "Helios Run"
Current date is now May 15, 2026
</system-info>

<default aesthetic>
If no references, art direction or design systems were provided, use this default professional modern, minimal aesthetic as a base. Declare your choice out loud so you stick to it. Guidance:
- Choose a type pairing from web-safe set or Google Fonts. Helvetica is a good choice. Avoid hard-to-read or overly stylized fonts. Use 1-3 fonts only.
- Foreground and background: choose a color tone (warm, cool, neutral, something in-between). Use subtly-toned whites and blacks; avoid saturations above 0.02 for whites.
- Accents: choose 0-2 additional accent colors using oklch. All accents should share same chroma and lightness; vary hue.
- NEVER write out an SVG yourself that's more complicated than a square, circle, diamond, etc.
- For imagery, never hand-draw SVGs; use subtly-striped SVG placeholders instead with monospace explainers for what should be dropped there (e.g. “product shot”)

CRITICAL: ignore default aesthetic entirely if given other aesthetic instructions like reference images, design systems or guidance, or if there are files in the project already.
</default aesthetic>

<pasted_text name="Pasted text (333 lines)">
# Helios — PRD v0.1

> Open-source tools for athletic expression. Make your runs look as good as they felt.

**Author:** Gilla
**Status:** Draft
**Last updated:** 2026-05-15
**Working name:** Helios *(rename candidates: Stride, Mileage, Pacecard, Runprint)*

---

## 1. Why this exists

Share Aura proved runners want to share visually — but it's iOS-only, closed-source, and a sticker tool first, analytics second. The runner I know (and am) wants two things on the same Sunday morning:

1. **Make a beautiful post** about the run that just happened — map, pace, HR, splits, a real photo from the route, all composed without leaving the phone.
2. **See the bigger picture** — "how many cities have I run in?", "what's my Q1 vs Q2 mileage?", "what's my best 10K effort this year?" — without paying Strava Premium or exporting CSVs to a spreadsheet.

Existing tools split these poorly:

- **Strava** owns the social graph but the analytics are gated behind Premium and the post-run share card is generic.
- **Runalyze / Smashrun** nail analytics but produce ugly shares.
- **Share Aura** nails shares but has no analytics, no Android, and isn't yours.

Helios is the open-source alternative that does both, on both platforms, for free, with your data living wherever you want.

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
- Web app. Mobile-first. A read-only web profile (`helios.app/u/gilla`) is a v2 idea.

## 3. Target user

> Vegetarian runner, 60–80 km/week, runs 4–5x/week, has a Garmin or just their phone, posts to Instagram Stories after long runs, tracks shoe mileage in a spreadsheet, has opinions about MAF, runs in different cities when they travel.

i.e. me, and the people who'd star data-peek.

## 4. Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Mobile | **React Native + Expo (SDK 53+), TypeScript** | You're a frontend lead in TS/React. Expo's prebuild + EAS gives same-day iOS + Android. Strong image-editing ecosystem (Skia, view-shot, gesture-handler). |
| Auth | **Firebase Auth** | Per your call. Apple + Google + email. Cheapest path to "both stores, signed in." |
| Backend | **Go 1.23, Fiber or Chi**, on your VPS via Cloudflared tunnel to `api.helios.gilla.fun` | Fits your Kronos arc. Stateless service behind Cloudflare. Easy to containerize. |
| DB | **PostgreSQL 16** on VPS, with PostGIS extension | PostGIS is the unlock for "cities I've ran in" — `ST_Within`, reverse geocoding caches. |
| Cache / queues | **Redis** | Strava webhook fan-out, rate-limit token bucket per user, ephemeral OAuth state. |
| Object storage | **Cloudflare R2** | User-uploaded photos + rendered share images. S3 API, zero egress fees, fronted by Cloudflare CDN. Self-hosting image storage on your VPS is a footgun (disk, bandwidth, backup). |
| Maps | **MapLibre Native** + **OpenFreeMap** or **Protomaps** tiles | OSS map renderer for RN. OpenFreeMap is free, no API key, OSM-based. Protomaps if you want self-hosted `.pmtiles`. |
| Reverse geocoding | **Nominatim** (self-hosted later) or **Photon** | For mapping GPS → city/country. Start with Nominatim public API + heavy caching, self-host once you have >5k users. |
| Image rendering | **react-native-skia** (Shopify) | Canvas-equivalent on RN. Used for the templated overlays. `react-native-view-shot` to export PNG. |
| Charts | **Victory Native XL** (built on Skia) | Skia-native, fast, themeable. |
| Strava | OAuth2 + webhooks → `/strava/webhook` on backend | Per Strava API rules: store athlete_id, hashed access/refresh tokens, fetch activities on `aspect_type=create`. |
| Apple Health (HealthKit) | **react-native-health** (rn-health) via Expo config plugin | iOS only. Read-only scopes: `HKWorkoutTypeIdentifier` (running only, filter `HKWorkoutActivityType.running`), `HKQuantityTypeIdentifierHeartRate`, `HKQuantityTypeIdentifierActiveEnergyBurned`, `HKQuantityTypeIdentifierDistanceWalkingRunning`, `HKSeriesTypeIdentifierWorkoutRoute` (the GPS polyline), `HKQuantityTypeIdentifierStepCount` (optional, for cadence). Never request write scopes — Helios is a reader, not a writer. Use `HKObserverQuery` + background delivery (`enableBackgroundDeliveryForType`) so new Apple Watch / iPhone runs sync without opening the app. |
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
│             │◄─────────────►│  api.helios.gilla.fun            │
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
```

PostGIS earns its keep on `places`: a nightly job (or webhook-triggered upsert) reverse-geocodes `location_start` and clusters runs into city polygons.

## 6. Features

### 6.1 Onboarding (≤90 seconds)

1. Splash → Sign in with Apple / Google / email (Firebase).
2. Permission primer screens (why we want Strava / HealthKit / photos).
3. Connect Strava (OAuth web view → deep-link back). Backfill last 90 days immediately, then last 5 years in the background.
4. *iOS:* request HealthKit read scopes (workouts, HR, route, active energy) in a single prompt. Frame copy: "Helios reads your running workouts from Health. We never write back." *Android:* skip for v0.1, show "Health Connect coming soon."
5. Land on Home with the most recent run pre-loaded into the editor.

### 6.2 Home

A vertical scroll:

- **Latest activity card** with one-tap "Create share."
- **This week**: km, runs, time, elevation, vs last week (delta chip).
- **Best efforts this month**: 1K, 5K, 10K, HM, M tiles with time + sparkline.
- **Recap card**: rotating ("you ran in 3 cities this month", "longest run streak: 12 days").
- **Shoe widget** if shoes are tracked — current mileage on each pair, color-coded by % of expected lifespan. *(Direct ask for you — multi-pair rotation + flat feet → caring about shoe wear.)*

### 6.3 Editor (the headline feature)

Modeled on Aura but better, because it's open:

- **Surface:** 9:16 (Story), 1:1 (Post), 4:5 (Feed) — switchable.
- **Background layer:**
  - Solid color / gradient (from palette).
  - Your photo (camera roll, with editor zoom/crop).
  - Map snapshot of the route (MapLibre static render, 3 styles: light, dark, terrain).
  - "Aura mode" — your photo + stat sticker overlay.
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
- **Templates:** 12–15 at launch, themed (Minimal, Brutalist, Y2K, Newsprint, Magazine, Track-meet, Topo). Templates are JSON in `packages/templates`, OSS-contributable.
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

### 6.5 Places (the differentiator)

A world map on Home tab, MapLibre-rendered, with:

- A dot for each city you've run in.
- Tap a dot → list of runs there + total km in that city.
- Header stats: "**X cities** · **Y countries** · **Z continents**."
- Filter by year.
- Share button → renders a beautiful "Places I've run in 2026" card (this is shareable in its own right; potential virality).

Implementation: every activity's `location_start` is reverse-geocoded once (cached forever per ~1km grid cell using PostGIS), normalized to `(city, country)`, deduped into `places`.

### 6.6 Sync

- **Strava webhooks** for new activities → push to user within seconds. Push notification: "New run synced — tap to create."
- **Apple Health** (iOS) — `HKObserverQuery` + `enableBackgroundDeliveryForType` watch the running workout type. When iOS wakes us up, we read the new `HKWorkout` + its `HKWorkoutRoute` (CLLocation samples) + HR series, normalize into the `activities` schema, and upload. Anchored queries (`HKAnchoredObjectQuery`) so we never re-read the same workout twice. Backfill on first connect: pull last 5 years of running workouts in a paginated background task.
- **Conflict resolution:** if the same run shows up from both Strava and Apple Health (likely — Strava often imports from HealthKit and vice versa), match on `started_at` within ±60 seconds **and** `distance_m` within ±2%. Prefer Strava when both exist (richer streams, splits, segments) and mark the HealthKit row as `dupe_of = strava_activity_id`. User can manually override which source is canonical from the activity detail screen.

### 6.7 Settings

- Units (metric/imperial).
- Connected accounts.
- Shoes (CRUD, mileage cap per pair).
- Default template, default share size.
- Privacy zone (hide map start/end within N meters of home — like Strava). **Critical** for OSS credibility.
- Data export (GPX zip + JSON).
- Account deletion.

## 7. Open-source positioning

This matters; it's half the reason to build it:

- **License:** AGPL-3.0 for the app + backend (prevents proprietary forks running a hosted clone), MIT for `packages/templates` and `packages/shared-types` so designers can contribute templates freely.
- **Self-host story:** docker-compose for backend + Postgres + Redis. Users bring their own Strava API key, Firebase project, R2 bucket. Document this from day one — it's what makes the OSS claim credible vs. "source-available."
- **Hosted version:** `helios.gilla.fun` runs on your VPS. Free for individuals. If it grows, optional Pro tier later (more templates, higher-res exports, premium map styles) — but free tier stays full-featured.
- **Community:** GitHub Discussions, contribution guide for templates (`templates/README.md` with screenshot grid auto-generated by CI).
- **Naming:** `Helios` working title, run a poll on launch.

## 8. Milestones

| Phase | Scope | Rough effort *(side-project pace)* |
| --- | --- | --- |
| **M0 — Foundation** | Monorepo set up, Expo app boots on both stores, Firebase Auth working, Go API on VPS responding to `/healthz` via Cloudflared, Postgres + PostGIS provisioned. | 1–2 weekends |
| **M1 — Strava ingestion** | OAuth, webhook, activity backfill (last 90 days), DB schema, list view of synced runs in app. | 2–3 weekends |
| **M2 — Editor v1** | 3 templates, photo background, 6 stat blocks, PNG export, Instagram Stories share. | 3–4 weekends |
| **M3 — Analytics v1** | Home cards, week/month/year views, best efforts table. | 2 weekends |
| **M4 — Places** | Reverse geocoding pipeline, MapLibre map, places list, share card. | 2 weekends |
| **M5 — Apple Health** | iOS-only HealthKit ingestion via `react-native-health`. Request minimal read scopes at first run (workouts + HR + route + active energy). Background delivery wired up so new runs from Apple Watch / Nike Run Club / any HK-writing tracker land in Helios within minutes. Dedupe against Strava: if a run shares a start time (±60s) and distance (±2%) with a Strava activity, keep Strava (richer streams) and mark the HK row as `dupe_of`. Surface Apple Health as the *fallback* source — useful when Strava is down or for users who don't use Strava at all (a real subset, especially Apple Watch + Nike Run Club crowd). | 1–2 weekends |
| **M6 — Polish + beta** | TestFlight + Play Internal, 12 templates, shoe tracking, privacy zone, data export. | 2 weekends |
| **M7 — Public launch** | App Store + Play Store, OSS repo public, Product Hunt + r/running + Twitter. | 1 weekend |

Total: ~14–18 weekends → **~4 months** at a sustainable side-project pace alongside Fusang, marathon training, and the wedding. Plan around the August wedding & Bangalore move: front-load M0–M3 before August, polish during settling-in.

## 9. Risks & open questions

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

### Open questions for you to decide

1. **Name.** Helios? Or one of: Stride, Mileage, Pacecard, Runprint, Tempo, Splits, Cadence. Worth running an Instagram poll once landing page is up.
2. **Web profile (`helios.gilla.fun/u/gilla`)** — v0 or v2? It would be a strong virality vector ("see all my runs on the web") and you already know Next.js. I left it in v2 but defensible to pull into M6.
3. **Privacy zone defaults** — Strava defaults to *off*. Should Helios default *on* (privacy-first OSS positioning)? My vote: yes, default 200m blur on home.
4. **Monetization stance** — fully free forever? Pay-what-you-want? Pro tier eventually? Decide before public launch so README messaging is honest.

## 10. Success criteria

**v0.1 launch (in ~4 months):**
- 100 GitHub stars in first week.
- 500 installs across iOS + Android in first month.
- 50 share images created per week, sustained.
- 1 community-contributed template merged.
- App Store rating ≥ 4.5 from first 20 reviews.

**v1.0 north star (1 year):**
- 10k installs.
- A meaningful slice of the r/running and r/AdvancedRunning crowd uses it monthly.
- 20+ community templates.
- An Indian or European running newsletter writes about it unprompted.

---

*Filed under: side projects worth doing.*
</pasted_text>

<!-- The user explicitly selected the following skills for this project, as attachments to their message. These are not optional context — they define how you work. Use them. -->
<attached-skill name="Hi-fi design">
Create a high-fidelity, polished design. Follow the instructions about design in your system prompt, particularly the 'How to do design work' section. Use the design_canvas starter component, or make a full-bleed prototype and offer options via Tweaks.
</attached-skill>

<attached-skill name="Interactive prototype">
Create a fully interactive prototype with realistic state management and transitions. Use React useState/useEffect for dynamic behavior. Include hover states, click interactions, form validation, animated transitions, and multi-step navigation flows. It should feel like a real working app, not a static mockup.
</attached-skill>


<system-reminder>Auto-injected reminder (ignore if not relevant): do not recreate copyrighted or branded UI unless the user's email domain matches that company. Create original designs instead.</system-reminder>

## Assistant

_[tool: questions_v2]_

## User

Questions answered:
- scope: Onboarding + Strava connect, Home (latest run + this week), Analytics (year/month/all-time), Editor (the share-card builder), Places (world map of cities), Activity detail, Settings + Shoes
- platform: iPhone only
- aesthetic: Decide for me
- hero_feature: Home + post-run flow
- interactivity: Decide for me
- data: Marathon trainee, 60–80km/wk, runs in Bangalore + travels
- variations: Decide for me
- units: Metric (km)
- naming: Helios

## Assistant

_[tool: update_todos]_

_[tool: copy_starter_component]_

_[tool: copy_starter_component]_

**Design system declared:**
- **Brand:** Helios — sun god, dawn light, marathon culture. Editorial running-magazine meets track-meet functionality.
- **Type:** Instrument Serif (italic display moments), Geist (UI), JetBrains Mono (numerals/data).
- **Palette:** Cream paper `#f3ede2`, deep ink `#14110d`, solar orange `#e85d2f` accent, moss `#4a6b3a` for "on-pace" signal. Subtle warm grain.
- **Motifs:** Track-lane stripes, sun disc, large mono numerals, magazine-style hairline rules and small-caps eyebrows.
- **Data:** Marathon trainee "Gilla" in Bangalore (Cubbon Park, Sankey Tank, Hebbal Lake) + travel runs (Mumbai Marine Drive, Goa beach, London Hampstead Heath, Tokyo Imperial).

_[tool: read_file]_

_[tool: grep]_

_[tool: read_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: read_file]_

_[tool: write_file]_

_[tool: show_html]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: eval_js_user_view]_

Let me inspect what's happening.

_[tool: save_screenshot]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: show_to_user]_

_[tool: sleep]_

_[tool: eval_js_user_view]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: eval_js_user_view]_

_[tool: str_replace_edit]_

Found it — `.rise` animation is stuck at opacity:0. Let me fix the CSS:

_[tool: grep]_

_[tool: grep]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: eval_js_user_view]_

_[tool: eval_js_user_view]_

_[tool: sleep]_

_[tool: eval_js_user_view]_

_[tool: grep]_

_[tool: eval_js_user_view]_

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: eval_js_user_view]_

_[tool: sleep]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: show_html]_

_[tool: show_to_user]_

_[tool: sleep]_

_[tool: eval_js_user_view]_

_[tool: screenshot_user_view]_

_[tool: str_replace_edit]_

The card renders now. Two cosmetic fixes:

_[tool: str_replace_edit]_

_[tool: eval_js_user_view]_

_[tool: sleep]_

_[tool: multi_screenshot]_

_[tool: str_replace_edit]_

_[tool: multi_screenshot]_

_[tool: eval_js_user_view]_

_[tool: str_replace_edit]_

_[tool: multi_screenshot]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: multi_screenshot]_

_[tool: multi_screenshot]_

_[tool: eval_js_user_view]_

_[tool: sleep]_

_[tool: screenshot_user_view]_

_[tool: eval_js_user_view]_

_[tool: eval_js_user_view]_

_[tool: screenshot_user_view]_

_[tool: eval_js_user_view]_

_[tool: grep]_

_[tool: eval_js_user_view]_

_[tool: sleep]_

_[tool: eval_js_user_view]_

_[tool: screenshot_user_view]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: multi_screenshot]_

_[tool: done]_

Looking great. Let me call done.

_[tool: snip]_

_[tool: fork_verifier_agent]_

Built **Helios** as an interactive iPhone prototype.

**System:** Editorial running-magazine meets track-meet — Instrument Serif display, Geist UI, JetBrains Mono numerals, cream/ink/solar-orange palette with track-lane motifs.

**Screens (all reachable via the tab bar + the cards):**
- **Onboarding** — splash → sign-in → permission primer → Strava OAuth with live backfill progress (toggle in Tweaks)
- **Home** (hero) — post-run card with route map + big mono numerals, this-week strip, best efforts row, recap carousel that rotates, shoes with wear bars, places preview with mini world map
- **Activity detail** — full route map, splits table with relative bars, HR/pace streams as tabs, source attribution
- **Share editor** — 9:16/1:1/4:5 toggle, 6 hand-built templates (Minimal, Magazine, Brutalist, Track Meet, Newsprint, Topo), photo/map/solid backgrounds, stat-block picker, export sheet with IG Stories
- **Analytics** — year/month/all-time tabs, GitHub-style heatmap, monthly bars, calendar view, lifetime PR table, cumulative chart
- **Places** — world dot-map of 12 cities/7 countries with filter chips, distance leaderboard, tap-to-detail sheet
- **Settings** — profile, shoes CRUD with mileage bars, connections (Strava canonical / Apple Health fallback), privacy zone, theme switcher

**Tweaks:** dark mode, 4 accent palettes (Solar/Electric/Moss/Ink), units, start screen, jump-to deep links.

## User

overall decent, show how a user uploads there image and drag and drop the charts, pace graphs around them.

btw name udpdated to use Runcard

## Assistant

_[tool: set_project_title]_

_[tool: grep]_

_[tool: run_script]_

_[tool: read_file]_

Now let me build the photo upload + drag-drop sticker mode in the editor.

_[tool: write_file]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: multi_screenshot]_

_[tool: eval_js_user_view]_

_[tool: sleep]_

_[tool: eval_js_user_view]_

_[tool: sleep]_

_[tool: eval_js_user_view]_

_[tool: sleep]_

_[tool: screenshot_user_view]_

_[tool: str_replace_edit]_

Stickers mode is live and drag-able. Let me fix the time sticker truncation and verify drag works.

_[tool: eval_js_user_view]_

_[tool: sleep]_

_[tool: eval_js_user_view]_

_[tool: eval_js_user_view]_

_[tool: screenshot_user_view]_

_[tool: done]_

Brand renamed to **Runcard** throughout. Editor reworked:

- **Stickers template (default)** — free layout where stat blocks float over your photo, dragged with finger.
- **Photo tab** — "Upload from Photos" opens a faux camera-roll sheet (Today / This week / This month, smart-album chips). Picking a photo swaps the background.
- **Stats tab** — taps add a sticker (Distance, Pace, Time, HR, Elev, Calories, Cadence, Splits bars, HR chart, Pace chart, Route map, Date, Shoe, Title, Place). Already-placed stats show a check.
- **Drag** — tap to select (orange ring), drag anywhere on the canvas, "Remove" bar appears at the bottom of the screen for the selected sticker.
- **Six fixed templates** still available (Magazine, Minimal, Brutalist, Track Meet, Newsprint, Topo).

Tweaks panel cleaned up — Solar accent is now hard-coded; just Dark mode + Units + flow controls remain. Settings theme picker simplified to Light/Dark only.

## User

RunCard was taken, we updated to RunStamp

So when they export the photo or something we can add our cute runstamp stamp mark.
Neat marketing trick too

