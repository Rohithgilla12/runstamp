# Strava Athlete Quota Increase — How to Apply

## TL;DR

Every new Strava API client starts with a hard limit of **1 connected
athlete** (just you). To let others connect, you have to request a quota
increase via a browser form on the Strava developer site. There is no
API/CLI for this.

Once approved (Strava usually responds within hours for personal-use apps
with a privacy policy and a real landing page — we have both), the limit
is bumped from 1 to either 99 (personal tier) or higher.

## Step-by-step

1. Open https://www.strava.com/settings/api in a browser, logged in as
   the same Strava account that owns the Runstamp API app
   (client_id `245838`).
2. You should see the **Runstamp** app card. Scroll to the bottom.
3. Look for either:
   - A **"Request rate limit increase"** button, or
   - A link in the "Athlete Limit / Connected Athletes" row.

   (Strava has changed the exact wording a couple of times in 2024–25.
   It's the only button that mentions limits.)
4. Click it. A form opens.

## What to put in the form

Fill exactly these. They're tuned for the "personal / single-developer
side project" tier — that's the fastest approval path.

| Field | Value |
| --- | --- |
| **Application name** | Runstamp |
| **Application website** | https://runstamp.gilla.fun |
| **Privacy policy URL** | https://runstamp.gilla.fun/privacy |
| **Terms URL** | https://runstamp.gilla.fun/terms |
| **Description / use case** | (see paste-block below) |
| **Requested athlete limit** | 99 |
| **Read-only?** | Yes (we never write back to Strava) |
| **Expected daily API call volume** | <5,000 |
| **Country** | India |
| **Open source?** | Yes — github.com/Rohithgilla12/runstamp (AGPL-3.0) |

### Description / Use case (paste this verbatim)

```
Runstamp is an open-source iOS + Android companion for runners that turns
each completed run into a shareable, designed "stamp" — a stylised post-run
artifact a runner can save to camera roll or share to Instagram Stories.
It also surfaces a "passport" view of every city the runner has run in.

Runstamp is strictly read-only against Strava. We never write activities,
comments, kudos, or photos. The integration is:
  1. User connects their Strava account from the mobile app via OAuth.
  2. Backend pulls their existing activity history once (typically a few
     hundred activities per athlete) and listens for new activities via
     Strava webhooks.
  3. Activities + downsampled streams (≤500 points) are stored in the
     user's private record for share-card rendering and personal analytics.

This is a personal side project run by a single developer. Expected daily
API call volume is well under 5,000 (one webhook per activity per athlete,
plus an initial backfill at signup). We cache and rate-limit aggressively
on our side and respect Strava's per-app and per-athlete limits.

Privacy policy: https://runstamp.gilla.fun/privacy
Terms: https://runstamp.gilla.fun/terms
Source code (AGPL-3.0): https://github.com/Rohithgilla12/runstamp

Requested athlete limit: 99 (personal tier).
```

## After submitting

- Strava typically responds within a few hours to a day for personal apps.
- They'll email the account owner with either an approval (limit bumped
  immediately) or a follow-up question.
- Once approved, your existing API credentials work unchanged — no need
  to redeploy. Anyone can now connect Strava from Runstamp.

## If the button isn't visible

Strava sometimes hides the increase request behind a Zendesk form when the
app is brand new. Fallback URL:
https://www.strava.com/api/api_application_request

That form asks the same questions. Use the same answers as above.

## What this fixes

Right now anyone other than the app owner who taps "Connect Strava" in
Runstamp will get a 403 from Strava itself — *not* from our backend —
saying "Limit of connected athletes exceeded." Increasing the limit
clears that error for everyone.
