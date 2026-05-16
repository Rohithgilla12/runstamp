# Roadmap

> Public roadmap for Runstamp — the post-run companion app for runners. Open
> source, cross-platform, made by [Gilla](https://gilla.fun).
>
> _Last updated: 2026-05-16_

Runstamp is **not a tracker**. It reads runs you already record on Strava or
Apple Health and turns them into share cards, a passport of cities, and a
collection of stamps you earn by running. The original PRD lives at
[`runstamp-prd.md`](./runstamp-prd.md); this file is the human-readable view
of what's shipped, what's next, and what we won't build.

## Status legend

- ✅ **Shipped** — live in TestFlight today, available to open-beta runners.
- 🟡 **In flight** — partially shipped or actively under construction.
- 🔵 **Next** — committed; landing in the next 4–6 weeks.
- ⚪ **Later** — on the list, not scheduled.
- ⛔ **Not building** — explicit non-goal, documented so you don't have to ask.

---

## ✅ Shipped (open beta)

### Core platform
- Monorepo with Expo (RN 0.81) iOS + Android app and Go API on a VPS,
  Postgres + PostGIS via Docker, Firebase Auth (Apple + Google sign-in),
  AES-256-GCM encryption for OAuth tokens at rest.
- Server-driven Strava OAuth (cadence-style) — client secret stays on the
  backend, never the mobile bundle.
- Apple Health (HealthKit) ingestion via `@kingstinct/react-native-healthkit`
  with full backfill, anchored-object queries for incremental sync, and
  dedupe against Strava workouts when both sources cover the same run.
- Cloudflared tunnel + EAS Build pipeline (iOS + Android) + EAS Update OTA
  pipeline with production env injection. CI/CD via GitHub Actions to a VPS
  with auto-deploy on `main`.

### Editor — every run, a designed artifact
- 12 share-card templates: Postage, Postmark, Boarding Pass, Passport,
  Customs, Engraved, Wax Seal, Minimal, Date Stamp, Halftone, Cyanotype, Riso.
- Photo backgrounds on every template; halftone overlay for editorial feel.
- Stat stickers: distance, pace, time, HR chart, pace chart, route map,
  splits, weather, shoe rotation, source.
- PNG export at 2× via `react-native-view-shot`, save to camera roll or
  share to Instagram Stories / messages.

### Analytics — numbers runners actually want
- Week / month / year / all-time scopes with a period stepper.
- Activity heatmap (a-la GitHub contributions), monthly bars, distance
  histogram, training-load chart, cumulative km, streak counter.
- Personal bests against every standard distance — 1K, mile, 5K, 10K, half,
  marathon — computed server-side.
- VO₂ max trend card when HealthKit/Strava records it; running power chip
  on individual run cards.
- Compare mode (dual hero + paired bars + ghost heatmap for prior period).
- Filters: distance range, HR zone, shoe (disabled until shoe tracking ships).
- HR profile settings (resting + max) feed the zone classifier.

### Places — a passport for cities you've run in
- Reverse geocoding via Nominatim with a rate-limited backfiller; cities
  pinned to a world map (D3 + custom SVG).
- Lifetime / per-year filter pills.
- Headline number: "_47 stamps · 6 countries · 3 continents_".
- "My YYYY Runstamps" share card with a metros frieze illustration.

### Stamps engine — earned by running
- 23 stamps live across three tiers (Common · Rare · Mythic) covering
  global running culture and a starter India batch (Tata Mumbai, Vedanta
  Delhi Half, Bengaluru, Hyderabad, Ladakh, monsoon-run, Indian-metros-3).
- Rule kinds: distance band, sport + distance, named event, named cities
  count, streak length, monthly cumulative, named-event country binding.
- Backend evaluates every synced run against the catalogue and awards on
  the activity-ingest queue. Each stamp gets its own SVG illustration and
  a per-stamp shareable card (per PRD §6.6).
- FCM push notifications on earn — tap the notification to open the share
  modal directly.

### Year-in-Stamps
- Multi-page swipeable recap carousel (PRD §6.7) — total km, top cities,
  longest run, best efforts, full stamp grid. Drops Dec 15 as a launch
  moment.
- Home screen rotating recap card preview during November/December.

### Surfaces
- iOS TestFlight (Apple submission accepted, 1.0 build live).
- Android coming behind the same EAS pipeline — pending Health Connect
  parity in M7.
- Marketing site at [runstamp.gilla.fun](https://runstamp.gilla.fun) with
  waitlist, gallery (12 sample cards), stamps catalogue preview, FAQ.

---

## 🟡 In flight

- **Strava quota** — Strava caps new API apps at 1 connected athlete.
  Quota-increase request in with their developer team; the in-app Strava
  card is "Coming soon" until approved. Apple Health is the primary
  ingestion source meanwhile.
- **Public Play Store track** — Android internal-track builds are stable;
  Play Store submission pending Health Connect parity for the Android
  ingestion story.
- **Shoe tracking** — DB schema in, UI scaffold exists, filter chip is
  disabled until full CRUD + per-shoe distance attribution lands.

---

## 🔵 Next (4–6 weeks)

- **Health Connect (Android)** — equivalent of HealthKit ingestion for the
  Play Store launch. Same dedupe + backfill story; first-class support, not
  a fallback.
- **Shoe rotation CRUD** — add a shoe, retire a shoe, set a max-km warning,
  auto-attribute runs to the active shoe.
- **Privacy zones** — radius around home/work that's stripped from every
  rendered route + map. Default on. Per-zone overrides.
- **Garmin Connect** — direct webhook ingestion for the watch-first runners
  who don't push to Strava. Same OAuth pattern as Strava.
- **Public launch on the App Store + Play Store** — full open beta exit.

---

## ⚪ Later

- **Web profile** — `runstamp.gilla.fun/u/<handle>` for a public stamp album
  view. Strong virality vector ("look at my collection"); not v1.
- **Coros + Polar** — direct integrations after Garmin lands.
- **Race-day card pack** — official partner templates for marathons (Boston,
  Berlin, Tokyo, etc.) released as the race weekend approaches.
- **Shared albums** — running clubs / friend groups stamping the same race.
- **Apple Watch complication** — minimal "next stamp" surface.
- **Localization** — pick a second language (probably Japanese) once core
  product is stable.

---

## ⛔ Not building

These are intentional non-goals — documented so we don't relitigate them.

- **Real-time tracking / a GPS recorder.** Strava and your watch already do
  this well. Runstamp reads, doesn't record.
- **Social feed / followers / kudos / comments.** Strava is the social
  surface; we're the artifact surface. No timeline, no algorithm.
- **Gamification / streak guilt / daily reminders.** No mascot. No "AMAZING
  WORK! 🔥" copy. The run did the work; the app stamps the keepsake.
- **Calorie / weight / nutrition tracking.** Not our problem space.
- **Paid subscription / premium tier.** Free for individuals on the hosted
  version. Pay for hosting if you self-host.
- **Closed source.** The mobile + API + content templates are all OSS. Race
  partner art is the only thing that may be licensed separately.
- **Ads or sponsored stamps.** A stamp earned by clicking through a sponsor
  isn't earned by running. Hard line.

---

## Open questions

These are the calls that are still genuinely open. PRs and Issues welcome.

1. **Mythic stamp foil treatment on Android** — iOS gets a holographic
   reflection via `react-native-svg` gradients; the Android equivalent
   needs RN testing. Considering a static foil texture as fallback.
2. **Garmin push vs poll** — webhook ingestion is faster but requires their
   review; polling is simpler. Leaning webhook.
3. **Race-day partner model** — direct partnerships with marathons, or a
   community-submitted template registry? Probably both, race-org-first.
4. **Year-in-Stamps export** — Currently in-app only. Worth a video export
   (3-5 sec recap reel) or static PNG enough?

If you have thoughts → file an issue at
[github.com/Rohithgilla12/runstamp](https://github.com/Rohithgilla12/runstamp/issues).

---

## How this roadmap is maintained

- Updated whenever a milestone ships or a "Next" item slips.
- Mirrors the PRD's M0–M8 spine but reflects actual ship state, not the
  original plan.
- "Shipped" never lies — if you can't use it in TestFlight today, it's not
  here.
