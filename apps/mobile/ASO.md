# App Store Connect copy — Runstamp v0.1

Drop-in copy for App Store Connect → App Information + Version. Lengths are
within Apple's limits (verified). All copy follows runstamp's brand voice
(plain, runner-coded, slightly dry — never Duolingo / Nike-aspirational).

## App Name (max 30 chars)

```
Runstamp
```

*8/30 — leaves room for a tagline later if Apple ever allows. Some apps use
`Runstamp: Share Your Runs` (24/30) as a search-anchor; v0 keeps it clean.*

## Subtitle (max 30 chars)

```
Collect a stamp for every run
```

*30/30 — the tagline, exact fit. This is the line Apple shows beside the icon
in search results and on the app's storefront page.*

## Primary Category

```
Health & Fitness
```

*Secondary: Sports*

## Keywords (max 100 chars total, comma-separated, no spaces wasted)

```
strava,running,run,share,gpx,map,marathon,training,activity,passport,stamp,health,hrv,pace
```

*100/100. Strava is the highest-intent search term for our audience.
"share,gpx,map,marathon" pull in the post-run companion intent.
"passport,stamp" surface the differentiator. Skip "tracker" — Apple's algorithm
treats it as competitive intent against tracker apps and we don't want to be
classified as one.*

## Promotional Text (max 170 chars, editable without resubmission)

```
Beautiful share cards from your Strava + Apple Health runs. Every city you've run in on a passport. Every PB earned as a stamp. Open source, your data stays yours.
```

*170/170. Editable without a new build review — change this for launches,
seasonal pushes, etc.*

## Description (max 4000 chars)

```
Runstamp turns your runs into things worth keeping.

After every run, Strava and Apple Health hand you a wall of numbers. Runstamp
takes that and gives you back a designed artifact — a postage stamp, a
postmark, a passport entry, a wax seal — with your route, pace, splits, heart
rate, and a photo from the run baked in. Drag-and-drop stat stickers. Twelve
template families that feel like the running magazines that used to come in
the mail.

Beyond the share card, Runstamp slowly fills in two collections.

PLACES — a world map with a stamp on every city you've run in. Tap a stamp to
see the runs there, the total km, the date of your first ever run in that
city. A "Year in Places" share card lands every December.

STAMPS — earned by what you've done, not by app engagement. Common stamps for
first 5K, first half, first marathon. Rare stamps for sub-3:45, sub-50 10K,
30-day streak. Mythic stamps for Boston qualifier, sub-3 marathon, every
continent. Each one is its own designed artifact you can share.

What Runstamp DOES NOT do, on purpose:

· No live tracking. Strava and Garmin already do that better than anyone.
  Runstamp is a post-run companion. Open the app after the run; the run is
  already there.
· No social feed, no kudos, no following. Sharing happens through your own
  Instagram / WhatsApp / X posts.
· No training plans, no coaching, no race predictions.

What Runstamp DOES do that the free alternatives don't:

· Reads everything Apple Watch records — running power, ground contact time,
  vertical oscillation, stride length, VO2 max — and exposes it. Most apps
  show distance + pace + heart rate and stop there.
· Generates real share images, on-device. PNG straight to your camera roll,
  ready to post.
· Free forever for individuals. Open source under AGPL-3.0. Your data lives
  on a server you can self-host if you want — full instructions on GitHub.

iOS-first; Android Health Connect support shortly after.

github.com/Rohithgilla12/runstamp · @gilladude

Privacy: Read-only with Strava and Apple Health. Nothing posts on your
behalf. No analytics, no ads, no third-party data sharing. Account deletion
is a single tap. Full privacy policy at runstamp.gilla.fun/privacy.
```

*~2,180 chars / 4,000. Lots of headroom for v0.2 additions.*

## What's New in This Version (for v0.1)

```
First public TestFlight. Sign in with Apple / Google / email. Connect your
Strava — the app starts pulling your full activity history in the background,
two phases (summary fast, detail slow over ~26h for very large libraries).
Connect Apple Health to layer in running power, vertical oscillation,
ground contact time, stride length, VO2 max, and lap splits per workout.

Share editor with three surface sizes (9:16 / 1:1 / 4:5), three backgrounds
(route / photo / solid), and twelve template families. Save to camera roll,
hand off to Instagram Stories, paste-able stat stickers.

Analytics: year / month / all-time. GitHub-style heatmap. Personal bests at
every standard distance. Cumulative distance chart since you joined.

Places: a world map with a stamp on every city you've run in. Stamps:
twelve common / rare / mythic achievements, more on the way. Year in Stamps
album lands in December.

Things still missing for v0.1 that ship in v0.2: Health Connect (Android),
push notifications when a new stamp is earned, more share-card templates,
shoe rotation auto-tracking.
```

## URLs

- **Support URL**: https://runstamp.gilla.fun/  (the landing page; "Issues" link routes to GitHub Issues)
- **Marketing URL**: https://runstamp.gilla.fun/
- **Privacy Policy URL**: https://runstamp.gilla.fun/privacy

## Age Rating

```
4+
```

No questionable content categories. Apple's questionnaire walks you through
this; the answer to every "does the app contain..." question is **No**.

## App Review — Sign-in credentials

Apple's review team needs test credentials to log in. Create a dedicated
review account in Firebase Auth:

```
Email:    appreview+runstamp@gilla.fun
Password: <generate via 1Password; record in eas dashboard notes>
```

Then in App Store Connect → App Review → Sign-In Information, paste those.
"Notes" field: paste this:

> Sign in with the email/password above. The app gates everything behind
> Firebase Authentication. Email/password is the most reliable for review
> bots; Apple Sign-In and Google Sign-In also work but require the reviewer
> to have a connected Apple/Google account.
>
> After sign-in, tap "Authorize Strava" to connect a Strava account.
> Pre-connected test data is not available for review — Strava OAuth requires
> a real user account. To verify Strava ingestion, the reviewer can use any
> Strava account they control; the test account above has no Strava data
> pre-attached.
>
> Apple Health permissions trigger when the reviewer taps "Authorize Apple
> Health" — declining permission gracefully falls back to Strava-only mode.

## Test phrase for App Review

Append to App Review notes when HealthKit/Strava are both connected and
empty — Apple sometimes flags "app is empty" issues:

> The app's home screen falls back to a sample dataset (Gilla's marathon
> training in Bangalore) when no activities have been ingested yet. This is
> intentional during onboarding — real users see the sample for ~10 seconds
> while the background importer pulls their actual Strava history.

## Screenshots (5–10 required, per device class)

iPhone 6.7" (1290×2796) — required:

1. **Home** — sample post-run card with route map, big numerals, "Create share card" CTA.
2. **Editor — Postage template** — the share canvas with a route + perforated edges + distance as denomination.
3. **Places** — world map with stamps on cities + "6 stamps · 6 countries" headline.
4. **Stamps Collection** — grid of earned + locked stamps showing common / rare / mythic tiers.
5. **Year in Stamps** — one of the swipeable album cards.

iPad 13" (2048×2732) — required for iPad-class:
- Same five, but the iPad layout (PRD notes runstamp is iPhone-first; for v0 we can submit "Not supported on iPad" but Apple recommends at least letterboxed iPad screenshots).

Generate from the live app using `Cmd+S` in the iOS simulator at the right
device class, or via Fastlane's snapshot. Defer to a later commit — you have
TestFlight ready without needing finalized screenshots.

## App Privacy ("Data Used to Track You" / "Data Linked to You" etc.)

Apple's Privacy questionnaire — give these answers:

- **Data Used to Track You**: None.
- **Data Linked to You**:
  - Contact Info → Email Address ✓ (for sign-in)
  - Health & Fitness → Health, Fitness ✓ (Strava + Apple Health)
  - Identifiers → User ID ✓ (Firebase UID)
  - Usage Data → Other ✓ (activities, NOT analytics)
- **Data Not Linked to You**: None.

For every item: "Used for App Functionality" only. Not for analytics, not
for ads, not for third-party tracking.
