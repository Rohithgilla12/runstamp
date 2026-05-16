# Runstamp — Marketing Plan (open beta → launch)

> Source of truth for how Runstamp talks about itself. Anchored to the brand
> rules in `.impeccable.md` (quiet · earned · collectible) and the audience
> defined in the PRD §3 (vegetarian / serious runners, 60–80 km/week).
>
> _Last updated 2026-05-16. Mirrored to Notion under Launch Playbooks._

## 1. Strategic frame

### Who we're talking to

Serious / committed runners who already track on Strava or Apple Watch and
post selectively to Instagram Stories after long runs. They're skeptical of
gamification, allergic to mascots, and have opinions about MAF, shoe rotations
and pace discipline. Two pockets to reach first:

- **The Instagram-Story runner** — posts a finish-line picture and a Strava
  screenshot after marathons and long runs. Our share-card editor is the most
  obvious upgrade for them, and Stories is where they already share.
- **The data-curious runner** — opens Strava's analytics page, reads
  Smashrun, has subscribed to one of the watch brand's analytics tier at
  some point. Our analytics dashboard + stamps catalogue is the differentiator.

### Who we're NOT talking to

- Couch-to-5K beginners (not the audience; we'd have to compromise voice).
- Casual joggers tracking calories (not our problem space).
- "Run influencer" content creators (we'll get them in v2 if they self-discover).

### Positioning (one sentence)

> Runstamp turns the runs you already record into beautifully designed share
> cards, a passport of every city you've run in, and a collection of stamps
> you've earned by running — not by using the app.

### Voice (locked, copied from `.impeccable.md`)

- Plain, runner-coded, slightly dry.
- No exclamation marks, no emoji in product copy, no "AMAZING" adjectives.
- Numbers and serifs do the talking.
- **Good** — _"Sub-3:45 marathon. Stamped." / "47 cities. 6 countries."_
- **Bad** — _"AMAZING WORK!! 🔥🔥 You CRUSHED IT!!"_

## 2. Channels (in priority order)

### Tier 1 — own the surface

1. **Instagram Stories** — vertical 9:16 share cards are the product. Every
   shipped feature gets a Story-native demo. The product itself is the ad.
2. **X / Twitter** — long-form launch threads, weekly artifact posts ("a stamp
   per week"), Strava-runner replies, milestone moments.
3. **Marketing site** ([runstamp.gilla.fun](https://runstamp.gilla.fun)) —
   waitlist, gallery, FAQ. Already shipped, iterates with each release.

### Tier 2 — earned distribution

1. **r/running, r/AdvancedRunning, r/marathon_training** — only on big
   milestone launches (public beta, App Store, Year-in-Stamps). Linkbait
   doesn't survive there; "I built this and here's why" does.
2. **Hacker News (Show HN)** — when the repo goes public. Frame as "open-
   source post-run companion built without a real-time tracker" — that's the
   interesting story for HN, not the running.
3. **Product Hunt** — App Store launch day. Coordinated push.
4. **Newsletters / blogs** — Pace News, RunRepeat, BetterRunning's Strava
   tips column. Pitch as "the share-card layer Strava never built."

### Tier 3 — slow-burn

1. **YouTube** — one well-produced product walkthrough at launch. Don't
   chase a content schedule.
2. **Running club partnerships** — a few clubs get an early preview + a
   custom club stamp.
3. **Race partnerships** — Boston / Berlin / Tokyo + Indian races (Mumbai
   Marathon, Vedanta Delhi Half, Bengaluru, Hyderabad, Ladakh) for race-day
   card packs in 2027.

## 3. Asset inventory

What we've already built that doubles as marketing material:

- **Hero pass-stack** on the landing site — six fanned share cards. Already
  doing the heavy lifting visually.
- **12 share-card templates** — Postage, Postmark, Boarding Pass, Passport,
  Customs, Engraved, Wax Seal, Minimal, Date Stamp, Halftone, Cyanotype, Riso.
- **23 stamps** with bespoke SVG illustrations.
- **Year-in-Stamps recap** — a multi-page carousel that's its own share moment.
- **Gallery page** (`/gallery`) — 12 sample cards in production-quality SVG.

What we need:

- **Two launch videos** — 9:16 Instagram Story (30s) + 16:9 Twitter/X (30s).
  Both built in Remotion; same compositions, different aspect ratios. Mock
  app screens scroll through the editor → analytics → passport → stamps story.
- **Five "feature in 15 seconds" clips** — one per feature pillar
  (Editor, Analytics, Passport, Stamps, Year-in-Stamps). Vertical only.
- **One "how to make a stamp" tutorial GIF** — silent, 8–12 seconds,
  captioned. Goes in the App Store listing and as the first reply on launch.
- **Email sequence** for the waitlist (4 emails — see §5).

## 4. The launch arc

### Phase 0 — Open beta (now → late June 2026)

Goal: get 100+ runners into TestFlight, collect the visual quotes ("look at
this 21k I just ran") that make the public launch work.

- TestFlight invite is the only CTA. Don't spend on paid acquisition.
- Hard goal: a stamp per week shipped + a share-card teardown thread per
  week. Show the work; that's the audience-build move.
- Soft-launch posting on personal X + IG (no big push). The signal we want
  is "is anyone actually printing share cards or is this a vanity feature?"

### Phase 1 — Public-beta exit (early July 2026)

Goal: open the App Store + Play Store. Frame as a "v1.0" without a v1 launch.

- One marketing video (30s) — primary cut for Twitter, vertical cut for IG.
- A "Show HN: Runstamp" post linking the OSS repo.
- A Hacker News-friendly blog post on the OSS site: _"What it's like to
  build a runner's app without writing a tracker."_
- r/running megathread reply on the next Wednesday "Weekly thread."

### Phase 2 — Drumbeat (July → November 2026)

Goal: a stamp earned by a real runner becomes the marketing asset.

- **Sunday share-card post** — every Sunday, one runner's stamp (with
  permission) gets posted to IG + X with the share card as the artifact.
  Find these by querying the API for "stamp earned in the last 7 days"
  + DM-asking for permission.
- **Monthly "month in stamps" recap** — top stamps earned across the user
  base that month. Aggregate, no individual data without consent.
- **One technical deep-dive per quarter** — "How we did reverse-geocoding
  on a free tier" / "Distance-band stamps and why we rejected XP systems"
  / "The Wax Seal Mythic stamp shader."

### Phase 3 — Year in Stamps (Dec 15 2026)

The single biggest marketing moment of the year. Every active runner gets
their personalized recap; the recap itself is the share asset; permission
to post the aggregate is in the ToS at this point.

- Coordinated drop at 9am IST / 12am EST on Dec 15.
- Pre-warm email Dec 13 + push Dec 14.
- IG Story takeover (mine — paid post zero).
- "Best stamps of 2026" recap blog post Dec 28.
- Run the "what did you stamp in 2026?" reply thread on X.

### Phase 4 — Race-day card packs (2027)

Out of scope for now, but the line item is in the roadmap so the marketing
plan budgets capacity for it.

## 5. Email sequence (waitlist → product)

| # | Trigger | Subject | Body shape |
|---|---------|---------|------------|
| 1 | Signup confirmation (instant) | "You're on the Runstamp list." | One line of plain-spoken welcome; what to expect; a single sample share card inlined. No CTA. |
| 2 | T+3d | "Twelve share-card templates, six on this page." | Show the gallery. No "join us!" copy. Just artifacts. |
| 3 | TestFlight invite (manual) | "Your TestFlight invite — Runstamp v0.x." | The link. A 90-second tour video embedded. Permission to feedback by replying. |
| 4 | App Store launch | "Runstamp is in the App Store." | One sentence. One link. A goodbye to the waitlist itself. |

## 6. Anti-patterns (things we won't do)

- ❌ "Day 1 streak! 🔥" notifications.
- ❌ Influencer giveaways or "tag 3 friends" mechanics.
- ❌ "Compare yourself to other Runstamp users" charts (that's Strava's job).
- ❌ Faux-scarcity ("only 100 invites left!").
- ❌ Stock photos of generic runners on the landing.
- ❌ Press release distribution services.
- ❌ Cross-promotion with apps we wouldn't recommend ourselves.

## 7. Measurement

What we count:

- **TestFlight installs → 7-day-active.** If a user doesn't open it within
  a week of installing, they won't.
- **Share-cards generated per active runner per month.** Headline product
  metric. Anything < 1 means the editor isn't sticky.
- **Stamps earned per active runner per month.** A proxy for catalogue
  breadth. If most active users have one stamp, the catalogue is too narrow.
- **Cards-shared-externally rate.** Of cards generated, what fraction get
  the system Share Sheet invoked? This is the virality dial.
- **OSS metrics — stars / clones / open PRs** as a vanity-but-useful signal
  that the technical-runner audience is showing up.

What we don't count:

- DAU/MAU as a primary metric. Runstamp is a post-run app — opening it 3×
  a week is the right pattern; daily-actives would mean we've drifted toward
  engagement bait.
- Time-in-app. Less time is better; the user came in to do something
  specific.

---

See [`CALENDAR.md`](./CALENDAR.md) for the week-by-week content schedule.
