# Contributing to Runstamp

Thanks for being here. Runstamp is open source so people who run can have a tool that respects them — and so designers, runners, and engineers can make it better. This file is the short version of what that looks like in practice.

## What we want

- **Stamp templates.** New ways to render a run as an artifact (Postage, Postmark, Wax Seal, etc. — see `packages/templates/`). Templates are MIT-licensed so you can borrow them anywhere.
- **Stamp definitions.** New achievements with machine-checkable criteria (`apps/api/internal/stamps/`). Distance, place, pace, streak.
- **Bug fixes and small UX polish.** PRs that touch one thing and explain why.
- **Documentation.** README, `.impeccable.md`, this file — anything that lowers the onboarding ramp for the next contributor.

## What we don't want (yet)

- New tracking screens. Runstamp is a **post-run** companion. We don't track live runs and we don't plan to before v2.
- A social graph. No follows, no kudos, no feed. Share via Stories / WhatsApp / X.
- Cycling, swimming, gym workouts. **Runs only** in v0.1.
- Web app pages. Mobile-first.

If you want to do any of these, open an issue first to discuss — we'd rather steer than reject.

## Project shape

```
apps/mobile/     React Native + Expo SDK 54 + TypeScript strict
apps/api/        Go 1.24, Chi, pgx, slog. Stateless. Auto-deploys on push to main.
packages/templates/    Stamp render templates (MIT). The contribution surface.
packages/shared-types/ Reserved for shared zod schemas.
```

See `CLAUDE.md` for the conventions the codebase already commits to — read it before opening a PR.

## Licensing

Runstamp uses a split license so OSS sharing works cleanly:

- **App + backend: AGPL-3.0** — `apps/mobile/`, `apps/api/`. The AGPL keeps hosted clones honest: if you run Runstamp as a service, your changes go back to the community.
- **Templates + shared types: MIT** — `packages/templates/`, `packages/shared-types/`. We want designers to be able to lift these into anything (a t-shirt, another app, an internal tool) without license friction.

By submitting a PR you agree to license your contribution under the license of the directory you're modifying.

## Local development

```bash
# clone + install
git clone https://github.com/Rohithgilla12/runstamp.git
cd runstamp
pnpm install

# backend up (Postgres + Redis + API)
cp apps/api/.env.example apps/api/.env  # fill in secrets
docker compose up -d --build

# mobile (Expo)
pnpm mobile:start          # ask before starting — most contributors keep one running
pnpm mobile:ios            # boot iOS simulator
pnpm -F @runstamp/mobile typecheck
pnpm mobile:test           # vitest unit tests (no react-native imports allowed in tests)

# backend
pnpm api:run
pnpm api:test
pnpm api:vet
```

For Firebase + Strava OAuth setup, see `apps/mobile/FIREBASE_SETUP.md` and `apps/api/README.md`.

## Self-hosting

Runstamp is meant to be self-hostable end-to-end. The repo-root `docker-compose.yml` brings up the full backend (Postgres + PostGIS + Redis + API). You bring your own Firebase project, Strava API key, and R2 bucket (or any S3-compatible object store). See `apps/api/DEPLOY.md` for the production deploy story.

If self-host docs are unclear, that's a documentation bug — open an issue.

## Submitting a template

The single best contribution is a new stamp template.

1. Read `.impeccable.md` for the visual vocabulary (paper, postal, stamp, quiet · earned · collectible).
2. Look at `apps/mobile/src/design/templates/` — pick one (`PostmarkTemplate`, `PassportTemplate`, etc.) and copy its structure.
3. New file in the same directory: `YourTemplate.tsx`. Take `{ run, width, height, rawLatLng }` props at minimum.
4. Register it in `apps/mobile/src/screens/EditorScreen.tsx` next to the existing templates so users can pick it.
5. Pass `animate={false}` to any `<RouteMap>` inside the template so view-shot captures the final frame.
6. Include a screenshot in the PR description — a 9:16 render of the template against a sample run.

## Submitting a stamp

1. Add the definition in `apps/api/internal/stamps/catalog.go` (or the equivalent JSON if we've moved to that). Include `id`, `name`, `tier`, `category`, `criteria` (machine-checkable JSON).
2. Add an illustration in `apps/mobile/src/design/stampIllustrations.tsx` — keep it SVG, in the brand palette, runner-coded.
3. If the criteria involves a new aggregate (e.g. "every continent stamped"), the evaluator may need a new helper. Trace through `apps/api/internal/stamps/evaluator.go` and follow the pattern.
4. Test: with a sample dataset, the stamp should fire when criteria are met and only then.

## PR conventions

- **Commit style**: Conventional Commits-ish. `feat(home): X`, `fix(api): Y`, `chore: Z`. Lowercase scope in parens; one short subject line; details in the body.
- **PR description**: explain *why*, not *what*. The diff explains what. The PR explains the motivation.
- **Tests**: required for criteria evaluators, dedupe behavior, and any pure-TS helper. UI doesn't need a test unless you're shipping a regression-prone interaction.
- **Type-checking + tests**: `pnpm -F @runstamp/mobile typecheck && pnpm mobile:test && pnpm api:vet && pnpm api:test` should be green before requesting review.
- **No commented-out code, no `// removed for X` shims.** If it's dead, delete it.
- **No emojis in code or comments** unless the user-facing string explicitly requires it.

## Reporting bugs

Open an issue with:

- The exact build (`Settings → bottom of screen → RUNSTAMP · v0.1.0 …`)
- What you did
- What you expected
- What happened
- Logs if you can grab them: `ssh ubuntu@150.230.131.66 "docker logs --tail=200 runstamp-api"` (maintainers only; users: paste anything visible)

## Code of conduct

Be a runner about it. Respectful, direct, honest. Disagree on the work, not the person. If you wouldn't say it on a long run with someone, don't put it in a code review.

---

Questions? Open a GitHub Discussion or DM the maintainer.
