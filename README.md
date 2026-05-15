# Runstamp

> Collect a stamp for every run.

Open-source tools for athletic expression — make your runs look as good as they felt, see the bigger picture across cities and years, all from one cross-platform mobile app.

See [`runstamp-prd.md`](./runstamp-prd.md) for the full vision.

## Repo layout

```
apps/
  mobile/         React Native + Expo (SDK 54). iOS + Android.
packages/
  shared-types/   Schemas shared between mobile + (future) api.
  templates/      Share-card template definitions (OSS-contributable).
design/
  helios-run/     Claude Design handoff — HTML/JSX prototype (reference only).
```

## Quickstart

```bash
pnpm install
pnpm mobile:start          # Expo dev server
pnpm mobile:ios            # boot iOS simulator
pnpm mobile:android        # boot Android emulator
```

## License

AGPL-3.0 for app + backend. MIT for `packages/templates` and `packages/shared-types`.
