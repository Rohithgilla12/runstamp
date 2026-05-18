# AGENTS.md

## Project overview
- `runstamp` is a pnpm + Turborepo monorepo for the Runstamp product.
- Primary product surface is `apps/mobile` (React Native + Expo SDK 54).
- `apps/api` is a Go 1.25 backend.
- `apps/landing` is an Astro static site.
- `apps/marketing` contains Remotion marketing assets.
- Shared TS packages live in `packages/shared-types` and `packages/templates`.

## Working style
- Make focused, minimal changes that match the existing style.
- Fix root causes instead of layering quick patches.
- Avoid unrelated refactors unless the user asks for them.
- Keep secrets out of client code and out of source control.

## Repo layout
- `apps/mobile`: Expo / React Native app, Vitest-based unit tests.
- `apps/api`: Go service with `cmd/server` and `internal/...` packages.
- `apps/landing`: Astro marketing site.
- `apps/marketing`: Remotion video assets.
- `packages/shared-types`: shared TypeScript schemas.
- `packages/templates`: share-card template definitions.
- `design/helios-run`: design reference only; do not treat as production code unless asked.

## Common commands
- Install deps: `pnpm install`
- Mobile dev: `pnpm mobile:start`
- Mobile tests: `pnpm mobile:test`
- Mobile typecheck: `pnpm -F @runstamp/mobile typecheck`
- Landing dev: `pnpm -F @runstamp/landing dev`
- Landing build: `pnpm -F @runstamp/landing build`
- API run: `pnpm api:run`
- API tests: `pnpm api:test`
- API vet: `pnpm api:vet`
- Monorepo lint: `pnpm lint`
- Monorepo typecheck: `pnpm typecheck`

## Validation expectations
- After each logical code change, run `vet` if available.
- Validate the smallest relevant scope first:
  - `apps/mobile`: run targeted tests or `pnpm mobile:test`, then typecheck if needed.
  - `apps/api`: run `go test`/`pnpm api:test` and `pnpm api:vet` for touched Go code.
  - `apps/landing`: prefer `pnpm -F @runstamp/landing build` or `typecheck` for touched pages/components.
- Do not try to fix unrelated failing tests; mention them instead.

## Product constraints
- Never put Strava or other server-side secrets into the mobile app.
- Server-side secrets belong only in `apps/api/.env`.
- Public mobile configuration should use `EXPO_PUBLIC_*` env vars.

## Implementation notes
- Prefer `rg` / `rg --files` for search.
- Check for more specific `AGENTS.md` files before editing deeper directories.
- Update docs when behavior or developer workflow changes materially.
