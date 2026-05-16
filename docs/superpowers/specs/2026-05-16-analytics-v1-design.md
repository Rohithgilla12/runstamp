# Analytics v1 — design

**Date:** 2026-05-16
**PRD reference:** §6.4 Analytics
**Status:** Approved (pending user sign-off on this doc)

## Goal

Ship the full PRD §6.4 analytics surface: visualizations for year / month / all-time, training load (HR-based with distance fallback), filters (distance range, HR zone), and compare-mode. One push, staged into eight reviewable commits.

Shoe filter is wired but disabled — shoes CRUD is not yet built (PRD §6.2, deferred).

## Architecture

### Charting

Raw `react-native-svg` for every chart. Already a dependency, already used (`_AnalyticsCharts.tsx`, RouteMap). No Victory Native, no Skia — keeps bundle slim, matches the hand-drawn aesthetic in `.impeccable.md`.

### Computation

All analytics math is client-side and pure. `useActivities` already pulls the full history into memory (limit 10k). Pure functions in `apps/mobile/src/analytics/` derive every metric. Tests are vitest, pure TS, zero RN imports — same pattern as existing `src/data/sample.ts` tests.

### Backend additions

Minimal:

- **Migration `0009_user_hr_profile`** — `ALTER TABLE users ADD COLUMN hr_max int, ADD COLUMN hr_resting int` (both nullable; null = unset). Down drops both.
- **`PATCH /v1/me`** — extends the existing read-only handler. Accepts `{displayName?, homeCity?, units?, hrMax?, hrResting?}`. Validates `hr_max ∈ [120, 230]` and `hr_resting ∈ [30, 100]` when present. Uses pointer types so the client can clear values to null. Response shape matches `GET /v1/me`.

No new tables, no new external services.

## File layout

```
apps/mobile/src/analytics/
  heatmap.ts                   year grid: date → km
  streaks.ts                   current + longest run streak
  trainingLoad.ts              TRIMP, ATL, CTL, TSB
  hrZones.ts                   Karvonen zone bounds, classify avg_hr
  histogram.ts                 distance bins
  cumulative.ts                running-total monthly series
  compare.ts                   two-period diff helper
  sortByDate.ts                canonical ascending sort
  __tests__/
    heatmap.test.ts
    streaks.test.ts
    trainingLoad.test.ts
    hrZones.test.ts
    histogram.test.ts
    cumulative.test.ts
    compare.test.ts

apps/mobile/src/design/charts/
  HeatmapCalendar.tsx
  MonthlyBars.tsx
  WeeklyBars.tsx
  MonthCalendarDots.tsx
  CumulativeChart.tsx          replaces _AnalyticsCharts.tsx
  DistanceHistogram.tsx
  TrainingLoadCard.tsx

apps/mobile/src/screens/
  AnalyticsScreen.tsx          refactored; composes per scope
  SettingsScreen.tsx           Profile section gains HR fields

apps/mobile/src/services/account.ts    patchMe(idToken, patch)
apps/mobile/src/state/useAccount.ts    profile + save(patch) — new or extend

apps/api/migrations/0009_user_hr_profile.up.sql
apps/api/migrations/0009_user_hr_profile.down.sql
apps/api/internal/users/repo.go        struct + selects + Update method
apps/api/internal/handlers/me.go       PATCH handler
apps/api/internal/handlers/me_test.go  validation tests
```

`apps/mobile/src/screens/_AnalyticsCharts.tsx` is deleted — `CumulativeChart` takes its place with real data.

## Scope contents

### Year view (`scope === 'year'`)

1. Hero stat block (existing — keep)
2. **HeatmapCalendar** — 53 cols × 7 rows trailing-year window. Cell fill bucketed by km/day: 0, <5, 5–10, 10–20, 20+. Paper2 base, accent-tinted by bucket. Month labels top, weekday labels left. Tap cell → show that day's runs in a small inline card below the heatmap (not a separate screen).
3. **MonthlyBars** — 12 bars, total km per month of the current year
4. **DistanceHistogram** — fixed bins (0–3, 3–7, 7–12, 12–18, 18–30, 30+) km, horizontal bars showing run counts
5. **StreaksCard** — current streak + longest streak (in the current year)
6. **TrainingLoadCard** — current ATL/CTL/TSB + 28-day CTL sparkline. Always uses lifetime history for the rolling computation; the card itself surfaces "today" values.
7. Personal bests (existing — keep)
8. Recent activity (existing — keep, moves below the new sections)

### Month view (`scope === 'month'`)

1. Hero stat block (existing)
2. **MonthCalendarDots** — 6×7 grid; days with runs get accent dots sized by distance (3 sizes for 0–7 / 7–15 / 15+ km)
3. **WeeklyBars** — up to 5 weeks for the current month
4. **TrainingLoadCard** — scoped to month
5. Personal bests this month
6. Recent activity

### All-time (`scope === 'all'`)

1. Lifetime hero (existing)
2. **CumulativeChart** — every month from first run → now, real cumulative km
3. **StreaksCard** — longest ever streak
4. **TrainingLoadCard** — current ATL/CTL/TSB (lifetime is the only definition that makes sense)
5. Personal bests (lifetime, existing)
6. Recent activity

## Filters

Filter bar sits below the scope toggle. Collapses to a single "Filters" chip when none active; expands to a sheet on tap.

- **Distance range** — dual-thumb slider, 0–50+ km. Applies to everything below the hero (hero still shows unfiltered scope totals).
- **HR zone** — 6 chips (All, Z1, Z2, Z3, Z4, Z5). Multi-select. Classifies each activity by `avg_hr` against Karvonen-derived bounds. "All" deselects others.
- **Shoe** — chip rendered disabled with tooltip "Coming with shoe tracking."

Active filters appear as small dismissable chips inline. State is `useState` in `AnalyticsScreen` — not persisted (filters are a viewing lens, not a setting).

## Compare-mode

Toggle in the top-right of the scope-toggle row.

- A second period selector appears (Year `2026` vs `2025`, or Month `May 2026` vs `April 2026`).
- Hero stat block splits into two columns; small delta chip (e.g. `+12%`, `-3 runs`) under each metric.
- Charts:
  - Heatmap → ghost-fill from period B behind period A in the same cells.
  - MonthlyBars / WeeklyBars → paired bars (A solid accent, B outlined ink2).
  - CumulativeChart → two lines (A accent, B ink2).
  - DistanceHistogram + TrainingLoadCard → two cards stacked rather than overlaid (overlay would be too noisy).
- All-time scope has compare disabled (no second period).
- Filters compose: the same filter applies to both periods.

## Training load math

### Per-activity TRIMP (Banister, male coefficients)

```
HRr   = clamp((avg_hr - hr_resting) / (hr_max - hr_resting), 0, 1)
TRIMP = duration_min × HRr × 0.64 × exp(1.92 × HRr)
```

If `avg_hr` is missing or 0:

```
TRIMP_d = distance_km × 6           // distance fallback, scaled to align with HR TRIMP
```

If the user has zero HR data across all runs, the card label changes to `LOAD (distance-based)` and HR profile prompts are suppressed.

### Acute / Chronic / Form

Daily series; days with no runs contribute `load = 0`.

```
ATL[d] = ATL[d-1] + (load[d] - ATL[d-1]) / 7    // 7-day time constant (fatigue)
CTL[d] = CTL[d-1] + (load[d] - CTL[d-1]) / 42   // 42-day time constant (fitness)
TSB[d] = CTL[d] - ATL[d]                        // form
```

### Display

- Big number: today's CTL (rounded). Eyebrow `FITNESS`.
- Secondary: ATL (`FATIGUE`), TSB (`FORM`).
- 28-day CTL sparkline (line + final dot).
- TSB chip color: TSB ≥ +5 → muted moss, between → ink3, TSB ≤ -10 → faded accent. Quiet, not alarming.

### HR profile UX

- Settings → Profile gains two new optional integer fields: `Max heart rate` and `Resting heart rate`. Placeholder defaults `190` / `60`.
- TrainingLoadCard shows a one-line `Using defaults — tap to set` link until either field is set. Tap → opens Settings/Profile.
- If user has zero HR-bearing activities, both the prompt and the HR-based label are hidden; card uses distance fallback silently.

## Sorting & data shape

`useActivities` returns rows in the order the API gave them (currently descending by `started_at`). All analytics fns assume ascending. `AnalyticsScreen` canonicalises once at the top:

```ts
const ascending = useMemo(() => sortByDateAsc(activities), [activities]);
```

Passed down to all analytics helpers + charts. Existing list views in the screen keep using descending — they re-sort cheaply.

## Tests

### Mobile (vitest, pure TS, no RN imports)

- `heatmap.test.ts` — fixture activities map to expected day-keyed km totals. Cover: DST boundary, leap year Feb 29, two runs on the same day summed.
- `streaks.test.ts` — single day, multi-day, broken-by-one-day, current streak when last run is today vs yesterday, no runs.
- `trainingLoad.test.ts` — TRIMP within 0.5 absolute tolerance for known inputs; ATL/CTL convergence on steady-state load; distance fallback when avg_hr is 0; zero-HR-history detection.
- `hrZones.test.ts` — boundary values per Karvonen, clamping below resting and above max.
- `histogram.test.ts` — bin counts, empty bins, edge values exactly on bin boundary.
- `cumulative.test.ts` — empty input, single month, multi-year spans, gap months filled.
- `compare.test.ts` — delta signs, percent vs absolute formatting.

### Backend (Go)

- `internal/handlers/me_test.go` — PATCH validation: out-of-range HR rejected with 400, null clears, partial update preserves untouched fields, GET still returns the row.

### Pre-commit gate

`pnpm api:test && pnpm mobile:test && pnpm -F @runstamp/mobile typecheck && (cd apps/api && go vet ./... && go build ./...)` clean.

## Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Heatmap on long histories is many cells (~1825 over 5y) | Cap to trailing 53 weeks for year view. Plain `<Rect>` only, no gradients. Single onPress on the SVG with coordinate-math hit testing — no per-cell handlers. |
| `useActivities` returns descending; analytics assume ascending | Single canonicalising sort at the top of `StatsView`, pass down. |
| TSB on partial history ramps from zero | Acceptable. Show the number, don't disclaim. After 42 days it stabilises. |
| Adding PATCH /v1/me at same path as GET | Safe — Chi routes by method. Response shape unchanged. |
| Compare-mode visual overload | Histogram and TrainingLoadCard stack two cards rather than overlay. |

## Staging plan (commits)

Eight commits, each shippable + reviewable. Order matters because later commits depend on earlier helpers, but each one leaves `main` green.

1. **Backend HR profile** — migration `0009`, repo extension, PATCH /v1/me handler + tests.
2. **Pure analytics helpers** — `apps/mobile/src/analytics/*` with full vitest coverage. No UI wiring yet.
3. **Chart components** — `apps/mobile/src/design/charts/*` as standalone components with prop-driven data. Not yet placed on a screen.
4. **AnalyticsScreen year view** — refactor to compose hero + heatmap + monthly bars + histogram + streaks + training load.
5. **AnalyticsScreen month + all-time** — calendar dots + weekly bars; cumulative chart + lifetime streaks/load.
6. **Filters bar** — distance range slider + HR zone chips; disabled shoe chip.
7. **Compare-mode** — toggle, period selector, dual hero, paired-bar / two-line / ghost-heatmap rendering.
8. **HR profile settings** — Settings/Profile fields, `patchMe` wiring, training-load card prompt.

## Out of scope

- Shoe filter (depends on shoes CRUD)
- Time-in-zone per activity from HR stream (lazy compute on Activity detail later)
- Year-in-review auto card (overlaps with §6.7, separate effort)
- Persisting filter state across navigations
- Compare across non-aligned periods (e.g. "this year so far" vs "all of last year") — both periods are full periods of the same kind
