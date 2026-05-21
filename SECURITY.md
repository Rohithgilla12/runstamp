# Security Policy

Runstamp is an open-source post-run companion that touches sensitive personal data — GPS tracks, heart-rate streams, calendar of activity. We take that seriously.

## Reporting a vulnerability

**Do not file a public GitHub issue for security reports.** Email instead:

> **security@runstamp.app**

(Until that mailbox lands, send to **gillarohith1@gmail.com** with `[runstamp-security]` in the subject.)

Include enough detail to reproduce — a minimal proof-of-concept or steps. We'll acknowledge within **3 business days** and aim to land a fix or mitigation within **30 days** for high-severity issues.

If you'd like to coordinate disclosure timing or want a CVE assigned, say so in your first email.

## In scope

- The mobile app (`apps/mobile/`).
- The Go API (`apps/api/`).
- The landing site (`apps/landing/`), including the public profile pages.
- The deployment configuration (`docker-compose.yml`, `apps/api/docker-compose.yml`).

Categories we particularly want to hear about:

- Authentication bypasses (Firebase verification, session handling).
- Authorization issues (one user accessing another user's activities, streams, stamps, or profile data).
- Privacy bypasses (privacy zones not masking a route they should mask, public-profile data leaking when `profile_public = false`).
- OAuth flow vulnerabilities (Strava connection hijacking, token leakage).
- Token-encryption-at-rest issues (`internal/crypto`).
- Webhook signature / state-binding issues (`internal/strava/webhook`).
- Injection (SQL, command, header) — though we use parameterised queries throughout and don't shell out from request handlers.

## Out of scope

- Issues affecting third-party services we depend on (Firebase, Strava, CartoCDN, Cloudflare). Report those to the respective vendors.
- Theoretical attacks requiring physical access to an unlocked device.
- Self-XSS or social engineering of the operator.
- Missing security headers on documentation/marketing pages where no auth flow exists.
- Rate limiting on individual endpoints — yes, we know; please don't pen-test prod (DM us, we'll set up an isolated env).

## What about secrets?

The repo intentionally **does not commit**:

- The Strava client secret.
- The Firebase Admin service-account JSON.
- The `RUNSTAMP_TOKEN_ENC_KEY` used to encrypt OAuth tokens at rest.

It **does** commit:

- `GoogleService-Info.plist` + `google-services.json` — per Google's own guidance, these contain the *public* Firebase Web API key, restricted by bundle ID. They are not secrets. If this changes (e.g. you find a way to use them outside the configured bundle), that's an issue worth reporting.

## What you get

A thank-you in the release notes, optional credit in `THANKS.md`, and a meaningful contribution to the open-source running ecosystem.

No bug bounty program yet — this is a side project with no commercial backing. If that changes, we'll update this file.
