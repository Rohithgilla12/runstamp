# Analytics v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship PRD §6.4 analytics — heatmap calendar, monthly/weekly bars, calendar dots, cumulative distance, distance histogram, streaks, training load (Banister TRIMP w/ distance fallback), filters (distance range + HR zone, shoe disabled), and compare-mode.

**Architecture:** All analytics math is client-side pure TS in `apps/mobile/src/analytics/*` (vitest-tested). Charts are `react-native-svg` in `apps/mobile/src/design/charts/*` (visual only — vitest config excludes `.tsx`). `AnalyticsScreen` composes per scope. Backend adds `hr_max`/`hr_resting` columns to `users` and a `PATCH /v1/me` handler.

**Tech Stack:** TypeScript, React Native, `react-native-svg`, vitest, Go 1.24, Chi, pgx/v5, golang-migrate.

**Spec:** `docs/superpowers/specs/2026-05-16-analytics-v1-design.md`

**Working directory:** `/Users/rohithgilla/github.com/Rohithgilla12/runstamp`

**Test gate after each task:** Run the appropriate subset — vitest for mobile (`pnpm mobile:test`), go test for backend (`pnpm api:test`), and a typecheck pass (`pnpm -F @runstamp/mobile typecheck`) for anything touching TS.

---

## Task numbering and commits

15 tasks, one commit per task. The original spec mentioned 8 commits; finer granularity is intentional for subagent-driven review. Pre-commit hooks (claudekit) may fire on save — only the *final* state of each task matters.

## Conventions

- All file paths absolute under repo root unless noted as relative test paths.
- TDD where there are tests: red → minimal green → commit. Chart components have no unit tests (vitest excludes `.tsx`); the "test" for them is a typecheck pass and visual reasonability.
- Commit message style matches the repo (`feat(scope): one-line`, lowercase, no period).
- Never run the dev server. The user always has one running.

---

## Task 1: Backend HR profile (migration + PATCH /v1/me)

**Files:**
- Create: `apps/api/migrations/0009_user_hr_profile.up.sql`
- Create: `apps/api/migrations/0009_user_hr_profile.down.sql`
- Modify: `apps/api/internal/users/repo.go` (extend `User`, queries, add `Update`)
- Modify: `apps/api/internal/handlers/me.go` (extend response, add `Patch`)
- Modify: `apps/api/cmd/server/main.go` (register PATCH route)
- Create: `apps/api/internal/handlers/me_test.go`

- [ ] **Step 1: Write the migration up file**

Create `apps/api/migrations/0009_user_hr_profile.up.sql`:

```sql
ALTER TABLE users
  ADD COLUMN hr_max     int NULL,
  ADD COLUMN hr_resting int NULL;
```

- [ ] **Step 2: Write the migration down file**

Create `apps/api/migrations/0009_user_hr_profile.down.sql`:

```sql
ALTER TABLE users
  DROP COLUMN hr_resting,
  DROP COLUMN hr_max;
```

- [ ] **Step 3: Write the failing handler test**

Create `apps/api/internal/handlers/me_test.go`:

```go
package handlers

import (
	"testing"
)

// TestPatchMeValidation covers the four validation rules for PATCH /v1/me's
// HR fields. The full handler is exercised through main_test; here we pin the
// validation helper in isolation so changes to constraints can't slip in.
func TestPatchMeValidation(t *testing.T) {
	cases := []struct {
		name      string
		hrMax     *int
		hrResting *int
		wantErr   bool
	}{
		{"both nil ok", nil, nil, false},
		{"valid pair", ptr(190), ptr(60), false},
		{"hr_max too low", ptr(119), nil, true},
		{"hr_max too high", ptr(231), nil, true},
		{"hr_resting too low", nil, ptr(29), true},
		{"hr_resting too high", nil, ptr(101), true},
		{"hr_max == hr_resting (resting must be < max)", ptr(160), ptr(160), true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := validateHRProfile(tc.hrMax, tc.hrResting)
			if (err != nil) != tc.wantErr {
				t.Fatalf("validateHRProfile(%v, %v) err=%v, wantErr=%v", tc.hrMax, tc.hrResting, err, tc.wantErr)
			}
		})
	}
}

func ptr[T any](v T) *T { return &v }
```

- [ ] **Step 4: Run test, verify it fails**

```bash
cd apps/api && go test ./internal/handlers/...
```

Expected: FAIL — `validateHRProfile` undefined.

- [ ] **Step 5: Extend the `User` struct + repo with `Update`**

Modify `apps/api/internal/users/repo.go`:

Find the `User` struct and add `HRMax` + `HRResting` (both `*int`). Update both existing `UpsertByFirebaseUID` and `FindByFirebaseUID` to SELECT/RETURNING the new columns.

Add a new method:

```go
// UpdateProfile applies a partial update to the user's profile fields.
// Each *string / *int pointer is "set if non-nil", "unset if nil" — using
// COALESCE in SQL would prevent clearing to NULL, so we build the SET list
// dynamically. Callers must pass at least one non-nil field; this is a
// programmer error if violated.
type ProfilePatch struct {
	DisplayName *string
	HomeCity    *string
	Units       *string
	HRMax       *int
	HRResting   *int
}

func (r *Repo) UpdateProfile(ctx context.Context, userID string, p ProfilePatch) (*User, error) {
	sets := []string{"updated_at = now()"}
	args := []any{userID}
	if p.DisplayName != nil {
		args = append(args, *p.DisplayName)
		sets = append(sets, fmt.Sprintf("display_name = $%d", len(args)))
	}
	if p.HomeCity != nil {
		args = append(args, *p.HomeCity)
		sets = append(sets, fmt.Sprintf("home_city = $%d", len(args)))
	}
	if p.Units != nil {
		args = append(args, *p.Units)
		sets = append(sets, fmt.Sprintf("units = $%d", len(args)))
	}
	if p.HRMax != nil {
		args = append(args, *p.HRMax)
		sets = append(sets, fmt.Sprintf("hr_max = $%d", len(args)))
	}
	if p.HRResting != nil {
		args = append(args, *p.HRResting)
		sets = append(sets, fmt.Sprintf("hr_resting = $%d", len(args)))
	}
	q := fmt.Sprintf(`
		UPDATE users SET %s
		WHERE id = $1
		RETURNING id, firebase_uid, email, display_name, home_city, units, hr_max, hr_resting, created_at, updated_at
	`, strings.Join(sets, ", "))
	var u User
	err := r.pool.QueryRow(ctx, q, args...).Scan(
		&u.ID, &u.FirebaseUID, &u.Email, &u.DisplayName, &u.HomeCity, &u.Units,
		&u.HRMax, &u.HRResting, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("users: update profile: %w", err)
	}
	return &u, nil
}
```

Add `"strings"` to the imports if not present. Also update the existing SELECTs/RETURNINGs in `UpsertByFirebaseUID` and `FindByFirebaseUID` to include `hr_max, hr_resting` in column lists and corresponding `&u.HRMax, &u.HRResting` in Scan.

- [ ] **Step 6: Add the handler validation helper + PATCH handler**

Modify `apps/api/internal/handlers/me.go`. Replace the `meResponse` struct with a richer one and add a `Patch` handler:

```go
package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/auth"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/users"
)

type meResponse struct {
	UserID      string  `json:"userId"`
	Email       string  `json:"email"`
	FirebaseUID string  `json:"firebaseUid"`
	DisplayName *string `json:"displayName,omitempty"`
	HomeCity    *string `json:"homeCity,omitempty"`
	Units       string  `json:"units"`
	HRMax       *int    `json:"hrMax,omitempty"`
	HRResting   *int    `json:"hrResting,omitempty"`
	HasStrava   bool    `json:"hasStrava"`
}

func toMeResponse(u *users.User, hasStrava bool) meResponse {
	email := ""
	if u.Email != nil {
		email = *u.Email
	}
	firebaseUID := ""
	if u.FirebaseUID != nil {
		firebaseUID = *u.FirebaseUID
	}
	return meResponse{
		UserID:      u.ID,
		Email:       email,
		FirebaseUID: firebaseUID,
		DisplayName: u.DisplayName,
		HomeCity:    u.HomeCity,
		Units:       u.Units,
		HRMax:       u.HRMax,
		HRResting:   u.HRResting,
		HasStrava:   hasStrava,
	}
}

// Me handles GET /v1/me. It requires a valid Firebase ID token (injected into
// context by RequireFirebaseAuth middleware).
func Me(repo *users.Repo) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vt, ok := auth.FromContext(r.Context())
		if !ok {
			writeError(w, http.StatusUnauthorized, "missing authentication")
			return
		}
		user, err := repo.FindByFirebaseUID(r.Context(), vt.UID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to load user")
			return
		}
		if user == nil {
			writeError(w, http.StatusNotFound, "user not provisioned")
			return
		}
		hasStrava, err := repo.HasStravaConnection(r.Context(), user.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to check strava account")
			return
		}
		writeJSON(w, http.StatusOK, toMeResponse(user, hasStrava))
	}
}

type patchMeRequest struct {
	DisplayName *string `json:"displayName"`
	HomeCity    *string `json:"homeCity"`
	Units       *string `json:"units"`
	HRMax       *int    `json:"hrMax"`
	HRResting   *int    `json:"hrResting"`
}

var errInvalidUnits = errors.New("units must be 'metric' or 'imperial'")

func validateHRProfile(hrMax, hrResting *int) error {
	if hrMax != nil {
		if *hrMax < 120 || *hrMax > 230 {
			return errors.New("hr_max must be between 120 and 230")
		}
	}
	if hrResting != nil {
		if *hrResting < 30 || *hrResting > 100 {
			return errors.New("hr_resting must be between 30 and 100")
		}
	}
	if hrMax != nil && hrResting != nil && *hrResting >= *hrMax {
		return errors.New("hr_resting must be less than hr_max")
	}
	return nil
}

// PatchMe handles PATCH /v1/me. All fields are optional; only the keys present
// in the body are updated. Returns the full updated profile.
func PatchMe(repo *users.Repo) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vt, ok := auth.FromContext(r.Context())
		if !ok {
			writeError(w, http.StatusUnauthorized, "missing authentication")
			return
		}
		var req patchMeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json")
			return
		}
		if req.Units != nil && *req.Units != "metric" && *req.Units != "imperial" {
			writeError(w, http.StatusBadRequest, errInvalidUnits.Error())
			return
		}
		if err := validateHRProfile(req.HRMax, req.HRResting); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		user, err := repo.FindByFirebaseUID(r.Context(), vt.UID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to load user")
			return
		}
		if user == nil {
			writeError(w, http.StatusNotFound, "user not provisioned")
			return
		}
		updated, err := repo.UpdateProfile(r.Context(), user.ID, users.ProfilePatch{
			DisplayName: req.DisplayName,
			HomeCity:    req.HomeCity,
			Units:       req.Units,
			HRMax:       req.HRMax,
			HRResting:   req.HRResting,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to update profile")
			return
		}
		hasStrava, err := repo.HasStravaConnection(r.Context(), updated.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to check strava account")
			return
		}
		writeJSON(w, http.StatusOK, toMeResponse(updated, hasStrava))
	}
}
```

- [ ] **Step 7: Wire the route**

Modify `apps/api/cmd/server/main.go` around line 239 (the protected group). Add the PATCH route right under the existing `r.Get("/me", ...)`:

```go
r.Get("/me", handlers.Me(usersRepo))
r.Patch("/me", handlers.PatchMe(usersRepo))
r.Delete("/me", accountHandler.Delete)
```

- [ ] **Step 8: Run test, verify it passes**

```bash
cd apps/api && go test ./internal/handlers/...
```

Expected: PASS — all `TestPatchMeValidation` cases.

- [ ] **Step 9: Run go vet + go build**

```bash
cd apps/api && go vet ./... && go build ./...
```

Expected: clean exit.

- [ ] **Step 10: Commit**

```bash
git add apps/api/migrations/0009_user_hr_profile.up.sql apps/api/migrations/0009_user_hr_profile.down.sql apps/api/internal/users/repo.go apps/api/internal/handlers/me.go apps/api/internal/handlers/me_test.go apps/api/cmd/server/main.go
git commit -m "feat(api): hr profile columns + PATCH /v1/me"
```

---

## Task 2: Analytics helper — `sortByDate`

**Files:**
- Create: `apps/mobile/src/analytics/sortByDate.ts`
- Create: `apps/mobile/src/analytics/__tests__/sortByDate.test.ts`

Canonical ascending sort. Trivial but used by every other helper, so it gets its own commit.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/analytics/__tests__/sortByDate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { sortByDateAsc } from '../sortByDate';

interface Dated { id: string; date: string }

describe('sortByDateAsc', () => {
  it('returns ascending by ISO date', () => {
    const input: Dated[] = [
      { id: 'c', date: '2026-03-01' },
      { id: 'a', date: '2026-01-01' },
      { id: 'b', date: '2026-02-01' },
    ];
    const out = sortByDateAsc(input);
    expect(out.map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate input', () => {
    const input: Dated[] = [
      { id: 'b', date: '2026-02-01' },
      { id: 'a', date: '2026-01-01' },
    ];
    const copy = [...input];
    sortByDateAsc(input);
    expect(input).toEqual(copy);
  });

  it('handles empty array', () => {
    expect(sortByDateAsc<Dated>([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

```bash
pnpm -F @runstamp/mobile test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/mobile/src/analytics/sortByDate.ts`:

```ts
export function sortByDateAsc<T extends { date: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
```

- [ ] **Step 4: Run, verify PASS**

```bash
pnpm -F @runstamp/mobile test
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/analytics/sortByDate.ts apps/mobile/src/analytics/__tests__/sortByDate.test.ts
git commit -m "feat(analytics): sortByDateAsc helper"
```

---

## Task 3: Analytics helper — `heatmap`

**Files:**
- Create: `apps/mobile/src/analytics/heatmap.ts`
- Create: `apps/mobile/src/analytics/__tests__/heatmap.test.ts`

Produces a trailing-53-week grid keyed by ISO date string → total km.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/analytics/__tests__/heatmap.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildHeatmap, kmBucket, type HeatmapDay } from '../heatmap';

const ref = new Date('2026-05-16T12:00:00Z');

describe('buildHeatmap', () => {
  it('produces 53 weeks × 7 days = 371 cells', () => {
    const grid = buildHeatmap([], ref);
    expect(grid.weeks.length).toBe(53);
    for (const w of grid.weeks) expect(w.length).toBe(7);
  });

  it('sums multiple runs on the same day', () => {
    const grid = buildHeatmap(
      [
        { id: '1', date: '2026-05-15', distance: 5 },
        { id: '2', date: '2026-05-15', distance: 3.5 },
      ],
      ref,
    );
    const day = findDay(grid.weeks, '2026-05-15');
    expect(day?.km).toBeCloseTo(8.5, 5);
  });

  it('ignores runs before the trailing window', () => {
    const grid = buildHeatmap(
      [{ id: '1', date: '2025-01-01', distance: 10 }],
      ref,
    );
    const totalKm = grid.weeks.flat().reduce((a, d) => a + d.km, 0);
    expect(totalKm).toBe(0);
  });

  it('handles leap day Feb 29', () => {
    const leapRef = new Date('2024-03-15T12:00:00Z');
    const grid = buildHeatmap(
      [{ id: '1', date: '2024-02-29', distance: 5 }],
      leapRef,
    );
    expect(findDay(grid.weeks, '2024-02-29')?.km).toBe(5);
  });
});

describe('kmBucket', () => {
  it('buckets by the documented thresholds', () => {
    expect(kmBucket(0)).toBe(0);
    expect(kmBucket(2.9)).toBe(1);
    expect(kmBucket(5)).toBe(2);
    expect(kmBucket(7.5)).toBe(2);
    expect(kmBucket(10)).toBe(3);
    expect(kmBucket(19.9)).toBe(3);
    expect(kmBucket(20)).toBe(4);
    expect(kmBucket(42.2)).toBe(4);
  });
});

function findDay(weeks: HeatmapDay[][], date: string): HeatmapDay | undefined {
  for (const w of weeks) for (const d of w) if (d.date === date) return d;
  return undefined;
}
```

- [ ] **Step 2: Run, verify FAIL**

```bash
pnpm -F @runstamp/mobile test
```

- [ ] **Step 3: Implement**

Create `apps/mobile/src/analytics/heatmap.ts`:

```ts
// Heatmap = 53 columns × 7 rows trailing-year window ending at `ref`.
// Column 0 is the week containing (ref - 52 weeks), col 52 is the week
// containing `ref`. Each cell's `date` is the local ISO date (YYYY-MM-DD).
// km buckets: 0 → 0, <5 → 1, 5–10 → 2, 10–20 → 3, 20+ → 4.

export interface HeatmapDay {
  date: string;   // YYYY-MM-DD
  km: number;
  bucket: 0 | 1 | 2 | 3 | 4;
  inFuture: boolean;
}

export interface HeatmapGrid {
  weeks: HeatmapDay[][];   // [53][7]
  start: string;           // date of weeks[0][0]
  end: string;             // date of weeks[52][6]
}

interface DistRow { date: string; distance: number }

const MS_PER_DAY = 86_400_000;

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfWeekSunday(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() - out.getDay()); // Sunday=0
  return out;
}

export function kmBucket(km: number): 0 | 1 | 2 | 3 | 4 {
  if (km <= 0) return 0;
  if (km < 5) return 1;
  if (km < 10) return 2;
  if (km < 20) return 3;
  return 4;
}

export function buildHeatmap(rows: readonly DistRow[], ref: Date = new Date()): HeatmapGrid {
  const todayLocal = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const endWeek = startOfWeekSunday(todayLocal);                              // Sunday of current week
  const startWeek = new Date(endWeek.getTime() - 52 * 7 * MS_PER_DAY);        // 53 weeks total

  // Index rows by date.
  const byDate = new Map<string, number>();
  for (const r of rows) {
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.distance);
  }

  const weeks: HeatmapDay[][] = [];
  for (let w = 0; w < 53; w++) {
    const week: HeatmapDay[] = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(startWeek.getTime() + (w * 7 + d) * MS_PER_DAY);
      const date = isoDate(cell);
      const km = byDate.get(date) ?? 0;
      week.push({
        date,
        km,
        bucket: kmBucket(km),
        inFuture: cell.getTime() > todayLocal.getTime(),
      });
    }
    weeks.push(week);
  }
  return { weeks, start: isoDate(startWeek), end: isoDate(new Date(endWeek.getTime() + 6 * MS_PER_DAY)) };
}
```

- [ ] **Step 4: Run, verify PASS**

```bash
pnpm -F @runstamp/mobile test
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/analytics/heatmap.ts apps/mobile/src/analytics/__tests__/heatmap.test.ts
git commit -m "feat(analytics): heatmap grid builder"
```

---

## Task 4: Analytics helper — `streaks`

**Files:**
- Create: `apps/mobile/src/analytics/streaks.ts`
- Create: `apps/mobile/src/analytics/__tests__/streaks.test.ts`

Current + longest consecutive-day run streak.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/analytics/__tests__/streaks.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeStreaks } from '../streaks';

const ref = new Date('2026-05-16T12:00:00Z');

describe('computeStreaks', () => {
  it('returns zeros for empty input', () => {
    expect(computeStreaks([], ref)).toEqual({ current: 0, longest: 0 });
  });

  it('counts a single run today as current=1 longest=1', () => {
    expect(computeStreaks([{ date: '2026-05-16' }], ref)).toEqual({ current: 1, longest: 1 });
  });

  it('current streak extends back through consecutive days', () => {
    const rows = [
      { date: '2026-05-14' },
      { date: '2026-05-15' },
      { date: '2026-05-16' },
    ];
    expect(computeStreaks(rows, ref)).toEqual({ current: 3, longest: 3 });
  });

  it('treats yesterday as the anchor when no run today', () => {
    const rows = [
      { date: '2026-05-14' },
      { date: '2026-05-15' },
    ];
    expect(computeStreaks(rows, ref)).toEqual({ current: 2, longest: 2 });
  });

  it('current is 0 if last run is more than 1 day ago', () => {
    const rows = [
      { date: '2026-05-13' },
      { date: '2026-05-14' },
    ];
    expect(computeStreaks(rows, ref)).toEqual({ current: 0, longest: 2 });
  });

  it('longest is the max of all runs', () => {
    const rows = [
      { date: '2026-01-01' }, { date: '2026-01-02' }, { date: '2026-01-03' }, { date: '2026-01-04' },
      { date: '2026-05-15' }, { date: '2026-05-16' },
    ];
    expect(computeStreaks(rows, ref)).toEqual({ current: 2, longest: 4 });
  });

  it('deduplicates multiple runs on the same day', () => {
    const rows = [
      { date: '2026-05-15' },
      { date: '2026-05-15' },
      { date: '2026-05-16' },
    ];
    expect(computeStreaks(rows, ref)).toEqual({ current: 2, longest: 2 });
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

```bash
pnpm -F @runstamp/mobile test
```

- [ ] **Step 3: Implement**

Create `apps/mobile/src/analytics/streaks.ts`:

```ts
// Returns the user's current consecutive-day run streak (anchored to today
// or yesterday) and their longest-ever streak. Multiple runs on the same day
// count as one day for streak purposes.

interface Dated { date: string }

const MS_PER_DAY = 86_400_000;

function toLocalMidnight(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function computeStreaks(rows: readonly Dated[], ref: Date = new Date()): {
  current: number; longest: number;
} {
  if (rows.length === 0) return { current: 0, longest: 0 };

  // Unique sorted local-midnight timestamps, ascending.
  const days = Array.from(new Set(rows.map((r) => toLocalMidnight(r.date)))).sort((a, b) => a - b);

  // Longest streak — walk forward.
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i] === days[i - 1] + MS_PER_DAY) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // Current streak — walk backward from today/yesterday.
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime();
  const yesterday = today - MS_PER_DAY;
  const last = days[days.length - 1];
  let current = 0;
  if (last === today || last === yesterday) {
    current = 1;
    for (let i = days.length - 2; i >= 0; i--) {
      if (days[i] === days[i + 1] - MS_PER_DAY) current += 1;
      else break;
    }
  }

  return { current, longest };
}
```

- [ ] **Step 4: Run, verify PASS + commit**

```bash
pnpm -F @runstamp/mobile test
git add apps/mobile/src/analytics/streaks.ts apps/mobile/src/analytics/__tests__/streaks.test.ts
git commit -m "feat(analytics): current + longest streak helper"
```

---

## Task 5: Analytics helper — `hrZones`

**Files:**
- Create: `apps/mobile/src/analytics/hrZones.ts`
- Create: `apps/mobile/src/analytics/__tests__/hrZones.test.ts`

Karvonen zones Z1–Z5 from `(hrMax, hrResting)`, plus `classifyAvgHr` for the run-level filter.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/analytics/__tests__/hrZones.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { zoneBounds, classifyAvgHr, DEFAULT_HR_MAX, DEFAULT_HR_RESTING } from '../hrZones';

describe('zoneBounds', () => {
  it('returns 5 zones with low<high in each', () => {
    const z = zoneBounds(190, 60);
    expect(z.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      expect(z[i].low).toBeLessThan(z[i].high);
      if (i > 0) expect(z[i].low).toBeGreaterThanOrEqual(z[i - 1].high - 1);
    }
  });

  it('Z1 starts at resting + 50% reserve, Z5 tops at max', () => {
    const z = zoneBounds(190, 60);
    expect(z[0].low).toBeCloseTo(60 + 0.5 * 130, 0);
    expect(z[4].high).toBe(190);
  });
});

describe('classifyAvgHr', () => {
  it('returns null when avg_hr is 0 or missing', () => {
    expect(classifyAvgHr(0, 190, 60)).toBeNull();
    expect(classifyAvgHr(undefined, 190, 60)).toBeNull();
  });

  it('clamps low values to Z1', () => {
    expect(classifyAvgHr(50, 190, 60)).toBe(1);
  });

  it('clamps high values to Z5', () => {
    expect(classifyAvgHr(220, 190, 60)).toBe(5);
  });

  it('classifies mid values', () => {
    // 50% HRr = 125, 60% = 138, 70% = 151, 80% = 164, 90% = 177
    expect(classifyAvgHr(125, 190, 60)).toBe(1);
    expect(classifyAvgHr(140, 190, 60)).toBe(2);
    expect(classifyAvgHr(155, 190, 60)).toBe(3);
    expect(classifyAvgHr(170, 190, 60)).toBe(4);
    expect(classifyAvgHr(180, 190, 60)).toBe(5);
  });

  it('uses defaults when callers pass undefined', () => {
    expect(classifyAvgHr(155)).toBe(3);
    expect(DEFAULT_HR_MAX).toBe(190);
    expect(DEFAULT_HR_RESTING).toBe(60);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

```bash
pnpm -F @runstamp/mobile test
```

- [ ] **Step 3: Implement**

Create `apps/mobile/src/analytics/hrZones.ts`:

```ts
// Karvonen heart-rate zones. Reserve % thresholds: 50/60/70/80/90.
// Z1 = recovery, Z2 = aerobic, Z3 = tempo, Z4 = threshold, Z5 = VO2/anaerobic.

export const DEFAULT_HR_MAX = 190;
export const DEFAULT_HR_RESTING = 60;

const RESERVE_PCTS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0] as const;

export interface Zone { zone: 1 | 2 | 3 | 4 | 5; low: number; high: number }

export function zoneBounds(hrMax: number = DEFAULT_HR_MAX, hrResting: number = DEFAULT_HR_RESTING): Zone[] {
  const reserve = Math.max(1, hrMax - hrResting);
  const bpm = (pct: number) => Math.round(hrResting + pct * reserve);
  return [1, 2, 3, 4, 5].map((z, i) => ({
    zone: z as Zone['zone'],
    low: bpm(RESERVE_PCTS[i]),
    high: bpm(RESERVE_PCTS[i + 1]),
  }));
}

export function classifyAvgHr(
  avgHr: number | undefined,
  hrMax: number = DEFAULT_HR_MAX,
  hrResting: number = DEFAULT_HR_RESTING,
): 1 | 2 | 3 | 4 | 5 | null {
  if (!avgHr || avgHr <= 0) return null;
  const bounds = zoneBounds(hrMax, hrResting);
  if (avgHr < bounds[0].high) return 1;
  if (avgHr < bounds[1].high) return 2;
  if (avgHr < bounds[2].high) return 3;
  if (avgHr < bounds[3].high) return 4;
  return 5;
}
```

- [ ] **Step 4: Run, verify PASS + commit**

```bash
pnpm -F @runstamp/mobile test
git add apps/mobile/src/analytics/hrZones.ts apps/mobile/src/analytics/__tests__/hrZones.test.ts
git commit -m "feat(analytics): Karvonen HR zone helper"
```

---

## Task 6: Analytics helper — `trainingLoad`

**Files:**
- Create: `apps/mobile/src/analytics/trainingLoad.ts`
- Create: `apps/mobile/src/analytics/__tests__/trainingLoad.test.ts`

Banister TRIMP per activity, daily ATL/CTL/TSB series, and a `hasAnyHr` detector for the fallback UI.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/analytics/__tests__/trainingLoad.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeTRIMP, buildLoadSeries, hasAnyHr } from '../trainingLoad';

const ref = new Date('2026-05-16T12:00:00Z');

describe('computeTRIMP', () => {
  it('returns distance fallback when avg_hr is missing', () => {
    const t = computeTRIMP({ date: '2026-05-15', distance: 10, seconds: 3600, avgHr: 0 }, 190, 60);
    expect(t).toBeCloseTo(60, 1); // 10km × 6
  });

  it('returns Banister TRIMP when avg_hr is present', () => {
    // HRr = (150-60)/(190-60) = 0.6923; duration_min = 60
    // TRIMP = 60 * 0.6923 * 0.64 * exp(1.92 * 0.6923) ≈ 100.5
    const t = computeTRIMP({ date: '2026-05-15', distance: 10, seconds: 3600, avgHr: 150 }, 190, 60);
    expect(t).toBeGreaterThan(95);
    expect(t).toBeLessThan(110);
  });

  it('clamps HRr to [0, 1]', () => {
    // avg_hr below resting should produce 0
    const low = computeTRIMP({ date: 'x', distance: 5, seconds: 1800, avgHr: 50 }, 190, 60);
    expect(low).toBe(0);
    // avg_hr above max should saturate to max formula
    const high = computeTRIMP({ date: 'x', distance: 5, seconds: 1800, avgHr: 220 }, 190, 60);
    const cap = computeTRIMP({ date: 'x', distance: 5, seconds: 1800, avgHr: 190 }, 190, 60);
    expect(high).toBeCloseTo(cap, 5);
  });
});

describe('buildLoadSeries', () => {
  it('returns a series ending on the ref day', () => {
    const out = buildLoadSeries([], ref);
    expect(out[out.length - 1].date).toBe('2026-05-16');
  });

  it('converges to load on steady-state input', () => {
    const rows = [];
    for (let i = 0; i < 180; i++) {
      const d = new Date(ref.getTime() - (180 - i) * 86_400_000);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      rows.push({ date: iso, distance: 10, seconds: 3600, avgHr: 0 });
    }
    const out = buildLoadSeries(rows, ref);
    const last = out[out.length - 1];
    expect(last.atl).toBeGreaterThan(55); // steady load = 60
    expect(last.atl).toBeLessThan(65);
    expect(last.ctl).toBeGreaterThan(55);
    expect(last.ctl).toBeLessThan(65);
    expect(Math.abs(last.tsb)).toBeLessThan(2);
  });

  it('produces ATL > CTL after a hard week from rest', () => {
    const rows = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(ref.getTime() - i * 86_400_000);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      rows.push({ date: iso, distance: 15, seconds: 5400, avgHr: 0 });
    }
    const out = buildLoadSeries(rows, ref);
    const last = out[out.length - 1];
    expect(last.atl).toBeGreaterThan(last.ctl);
    expect(last.tsb).toBeLessThan(0);
  });
});

describe('hasAnyHr', () => {
  it('false for empty', () => {
    expect(hasAnyHr([])).toBe(false);
  });
  it('false when all avgHr missing or 0', () => {
    expect(hasAnyHr([{ avgHr: 0 }, { avgHr: undefined }])).toBe(false);
  });
  it('true when any avgHr > 0', () => {
    expect(hasAnyHr([{ avgHr: 0 }, { avgHr: 145 }])).toBe(true);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

```bash
pnpm -F @runstamp/mobile test
```

- [ ] **Step 3: Implement**

Create `apps/mobile/src/analytics/trainingLoad.ts`:

```ts
// Banister TRIMP per activity, daily ATL/CTL/TSB exponential rolling series.
//
// TRIMP (HR-based, male coefficients):
//   HRr   = clamp((avg_hr - hr_resting) / (hr_max - hr_resting), 0, 1)
//   TRIMP = duration_min * HRr * 0.64 * exp(1.92 * HRr)
//
// Distance fallback when avg_hr is missing or 0:
//   TRIMP_d = distance_km * 6   (loose alignment with HR scale)
//
// Daily series:
//   ATL[d] = ATL[d-1] + (load[d] - ATL[d-1]) / 7
//   CTL[d] = CTL[d-1] + (load[d] - CTL[d-1]) / 42
//   TSB[d] = CTL[d] - ATL[d]

const MS_PER_DAY = 86_400_000;
const TAU_ATL = 7;
const TAU_CTL = 42;

export interface LoadActivity {
  date: string;
  distance: number;     // km
  seconds: number;
  avgHr?: number;
}

export interface LoadPoint {
  date: string;
  load: number;
  atl: number;
  ctl: number;
  tsb: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function pad(n: number): string { return n < 10 ? '0' + n : String(n); }

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toMidnight(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function computeTRIMP(a: LoadActivity, hrMax: number, hrResting: number): number {
  if (a.avgHr && a.avgHr > 0) {
    const reserve = Math.max(1, hrMax - hrResting);
    const HRr = clamp((a.avgHr - hrResting) / reserve, 0, 1);
    const durMin = a.seconds / 60;
    return durMin * HRr * 0.64 * Math.exp(1.92 * HRr);
  }
  return a.distance * 6;
}

export function hasAnyHr(rows: readonly { avgHr?: number }[]): boolean {
  for (const r of rows) if (r.avgHr && r.avgHr > 0) return true;
  return false;
}

export function buildLoadSeries(
  rows: readonly LoadActivity[],
  ref: Date = new Date(),
  hrMax: number = 190,
  hrResting: number = 60,
): LoadPoint[] {
  // Group activities by day, summing TRIMP across runs on the same day.
  const byDay = new Map<string, number>();
  let minTs = Number.POSITIVE_INFINITY;
  for (const r of rows) {
    const t = computeTRIMP(r, hrMax, hrResting);
    byDay.set(r.date, (byDay.get(r.date) ?? 0) + t);
    const ts = toMidnight(r.date);
    if (ts < minTs) minTs = ts;
  }

  const todayLocal = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const todayTs = todayLocal.getTime();
  if (!isFinite(minTs)) minTs = todayTs;

  const out: LoadPoint[] = [];
  let atl = 0;
  let ctl = 0;
  for (let ts = minTs; ts <= todayTs; ts += MS_PER_DAY) {
    const date = isoLocal(new Date(ts));
    const load = byDay.get(date) ?? 0;
    atl += (load - atl) / TAU_ATL;
    ctl += (load - ctl) / TAU_CTL;
    out.push({ date, load, atl, ctl, tsb: ctl - atl });
  }
  // Ensure we always end exactly on ref's local date.
  if (out.length === 0 || out[out.length - 1].date !== isoLocal(todayLocal)) {
    out.push({ date: isoLocal(todayLocal), load: 0, atl, ctl, tsb: ctl - atl });
  }
  return out;
}
```

- [ ] **Step 4: Run, verify PASS + commit**

```bash
pnpm -F @runstamp/mobile test
git add apps/mobile/src/analytics/trainingLoad.ts apps/mobile/src/analytics/__tests__/trainingLoad.test.ts
git commit -m "feat(analytics): Banister TRIMP + ATL/CTL/TSB series"
```

---

## Task 7: Analytics helper — `histogram`

**Files:**
- Create: `apps/mobile/src/analytics/histogram.ts`
- Create: `apps/mobile/src/analytics/__tests__/histogram.test.ts`

Fixed distance bins → run counts.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/analytics/__tests__/histogram.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { distanceHistogram, HISTOGRAM_BINS } from '../histogram';

describe('distanceHistogram', () => {
  it('exposes the documented 6 bins', () => {
    expect(HISTOGRAM_BINS.length).toBe(6);
    expect(HISTOGRAM_BINS[0]).toEqual({ label: '0–3', min: 0, max: 3 });
    expect(HISTOGRAM_BINS[5]).toEqual({ label: '30+', min: 30, max: Infinity });
  });

  it('returns zero counts for empty input', () => {
    const out = distanceHistogram([]);
    expect(out.map((b) => b.count)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('places runs into the correct bin (lower-inclusive, upper-exclusive)', () => {
    const out = distanceHistogram([
      { distance: 2.9 },
      { distance: 3 },        // edge → bin 1 (3–7)
      { distance: 5 },
      { distance: 7 },        // edge → bin 2 (7–12)
      { distance: 12 },       // edge → bin 3
      { distance: 18 },       // edge → bin 4
      { distance: 30 },       // edge → bin 5 (30+)
      { distance: 50 },
    ]);
    expect(out.map((b) => b.count)).toEqual([1, 2, 1, 1, 1, 2]);
  });

  it('ignores zero / negative distances', () => {
    const out = distanceHistogram([{ distance: 0 }, { distance: -5 }]);
    expect(out.map((b) => b.count)).toEqual([0, 0, 0, 0, 0, 0]);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

```bash
pnpm -F @runstamp/mobile test
```

- [ ] **Step 3: Implement**

Create `apps/mobile/src/analytics/histogram.ts`:

```ts
export interface HistogramBin { label: string; min: number; max: number }

export const HISTOGRAM_BINS: HistogramBin[] = [
  { label: '0–3',  min: 0,  max: 3 },
  { label: '3–7',  min: 3,  max: 7 },
  { label: '7–12', min: 7,  max: 12 },
  { label: '12–18', min: 12, max: 18 },
  { label: '18–30', min: 18, max: 30 },
  { label: '30+',  min: 30, max: Infinity },
];

export interface HistogramCell extends HistogramBin { count: number }

export function distanceHistogram(rows: readonly { distance: number }[]): HistogramCell[] {
  const cells: HistogramCell[] = HISTOGRAM_BINS.map((b) => ({ ...b, count: 0 }));
  for (const r of rows) {
    if (r.distance <= 0) continue;
    for (let i = 0; i < cells.length; i++) {
      if (r.distance >= cells[i].min && r.distance < cells[i].max) {
        cells[i].count += 1;
        break;
      }
    }
  }
  return cells;
}
```

- [ ] **Step 4: Run, verify PASS + commit**

```bash
pnpm -F @runstamp/mobile test
git add apps/mobile/src/analytics/histogram.ts apps/mobile/src/analytics/__tests__/histogram.test.ts
git commit -m "feat(analytics): distance histogram bins"
```

---

## Task 8: Analytics helper — `cumulative`

**Files:**
- Create: `apps/mobile/src/analytics/cumulative.ts`
- Create: `apps/mobile/src/analytics/__tests__/cumulative.test.ts`

Monthly cumulative distance from first run → ref.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/analytics/__tests__/cumulative.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { monthlyCumulative } from '../cumulative';

const ref = new Date('2026-05-16T12:00:00Z');

describe('monthlyCumulative', () => {
  it('returns empty for empty input', () => {
    expect(monthlyCumulative([], ref)).toEqual([]);
  });

  it('cumulates a single month', () => {
    const out = monthlyCumulative(
      [
        { date: '2026-05-01', distance: 5 },
        { date: '2026-05-10', distance: 10 },
      ],
      ref,
    );
    expect(out).toEqual([
      { ym: '2026-05', monthlyKm: 15, cumulativeKm: 15 },
    ]);
  });

  it('fills gap months with 0 monthlyKm but carries cumulative', () => {
    const out = monthlyCumulative(
      [
        { date: '2026-01-15', distance: 100 },
        { date: '2026-04-05', distance: 50 },
      ],
      ref,
    );
    expect(out.length).toBe(5); // Jan, Feb, Mar, Apr, May
    expect(out[0]).toEqual({ ym: '2026-01', monthlyKm: 100, cumulativeKm: 100 });
    expect(out[1]).toEqual({ ym: '2026-02', monthlyKm: 0, cumulativeKm: 100 });
    expect(out[2]).toEqual({ ym: '2026-03', monthlyKm: 0, cumulativeKm: 100 });
    expect(out[3]).toEqual({ ym: '2026-04', monthlyKm: 50, cumulativeKm: 150 });
    expect(out[4]).toEqual({ ym: '2026-05', monthlyKm: 0, cumulativeKm: 150 });
  });

  it('spans multiple years', () => {
    const out = monthlyCumulative(
      [
        { date: '2024-11-15', distance: 50 },
        { date: '2026-01-10', distance: 25 },
      ],
      ref,
    );
    // Nov 2024 → May 2026 = 19 months
    expect(out.length).toBe(19);
    expect(out[0].ym).toBe('2024-11');
    expect(out[out.length - 1].ym).toBe('2026-05');
    expect(out[out.length - 1].cumulativeKm).toBe(75);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

```bash
pnpm -F @runstamp/mobile test
```

- [ ] **Step 3: Implement**

Create `apps/mobile/src/analytics/cumulative.ts`:

```ts
export interface MonthlyPoint { ym: string; monthlyKm: number; cumulativeKm: number }

interface Row { date: string; distance: number }

function ymOf(iso: string): string { return iso.slice(0, 7); }

function nextYm(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  return next;
}

export function monthlyCumulative(rows: readonly Row[], ref: Date = new Date()): MonthlyPoint[] {
  if (rows.length === 0) return [];
  const byMonth = new Map<string, number>();
  let firstYm = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
  for (const r of rows) {
    const ym = ymOf(r.date);
    byMonth.set(ym, (byMonth.get(ym) ?? 0) + r.distance);
    if (ym < firstYm) firstYm = ym;
  }
  const lastYm = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
  const out: MonthlyPoint[] = [];
  let cum = 0;
  for (let ym = firstYm; ; ym = nextYm(ym)) {
    const m = byMonth.get(ym) ?? 0;
    cum += m;
    out.push({ ym, monthlyKm: m, cumulativeKm: cum });
    if (ym === lastYm) break;
  }
  return out;
}
```

- [ ] **Step 4: Run, verify PASS + commit**

```bash
pnpm -F @runstamp/mobile test
git add apps/mobile/src/analytics/cumulative.ts apps/mobile/src/analytics/__tests__/cumulative.test.ts
git commit -m "feat(analytics): monthly cumulative distance series"
```

---

## Task 9: Analytics helper — `compare`

**Files:**
- Create: `apps/mobile/src/analytics/compare.ts`
- Create: `apps/mobile/src/analytics/__tests__/compare.test.ts`

Period filtering + delta helpers used by compare-mode.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/analytics/__tests__/compare.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { filterByPeriod, delta, type Period } from '../compare';

const rows = [
  { date: '2025-05-10', distance: 5 },
  { date: '2026-01-15', distance: 10 },
  { date: '2026-05-10', distance: 20 },
  { date: '2026-05-20', distance: 7 },
];

describe('filterByPeriod', () => {
  it('returns runs in the year', () => {
    const p: Period = { kind: 'year', year: 2026 };
    expect(filterByPeriod(rows, p).length).toBe(3);
  });

  it('returns runs in the month', () => {
    const p: Period = { kind: 'month', year: 2026, month: 5 };
    expect(filterByPeriod(rows, p).length).toBe(2);
  });

  it('empty array for empty period', () => {
    const p: Period = { kind: 'year', year: 2023 };
    expect(filterByPeriod(rows, p)).toEqual([]);
  });
});

describe('delta', () => {
  it('signed pct + abs', () => {
    expect(delta(120, 100)).toEqual({ abs: 20, pct: 20 });
    expect(delta(80, 100)).toEqual({ abs: -20, pct: -20 });
  });

  it('handles zero baseline by returning null pct', () => {
    expect(delta(5, 0)).toEqual({ abs: 5, pct: null });
  });

  it('zero / zero', () => {
    expect(delta(0, 0)).toEqual({ abs: 0, pct: null });
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

```bash
pnpm -F @runstamp/mobile test
```

- [ ] **Step 3: Implement**

Create `apps/mobile/src/analytics/compare.ts`:

```ts
export type Period =
  | { kind: 'year'; year: number }
  | { kind: 'month'; year: number; month: number /* 1..12 */ };

interface Dated { date: string }

export function filterByPeriod<T extends Dated>(rows: readonly T[], p: Period): T[] {
  if (p.kind === 'year') {
    const prefix = String(p.year) + '-';
    return rows.filter((r) => r.date.startsWith(prefix));
  }
  const prefix = `${p.year}-${String(p.month).padStart(2, '0')}-`;
  return rows.filter((r) => r.date.startsWith(prefix));
}

export interface Delta { abs: number; pct: number | null }

export function delta(current: number, baseline: number): Delta {
  const abs = current - baseline;
  if (baseline === 0) return { abs, pct: null };
  return { abs, pct: Math.round((abs / baseline) * 100) };
}
```

- [ ] **Step 4: Run, verify PASS + commit**

```bash
pnpm -F @runstamp/mobile test
git add apps/mobile/src/analytics/compare.ts apps/mobile/src/analytics/__tests__/compare.test.ts
git commit -m "feat(analytics): period filter + delta helpers"
```

---

## Task 10: Chart components (visual; no tests)

**Files:**
- Delete: `apps/mobile/src/screens/_AnalyticsCharts.tsx`
- Create: `apps/mobile/src/design/charts/HeatmapCalendar.tsx`
- Create: `apps/mobile/src/design/charts/MonthlyBars.tsx`
- Create: `apps/mobile/src/design/charts/WeeklyBars.tsx`
- Create: `apps/mobile/src/design/charts/MonthCalendarDots.tsx`
- Create: `apps/mobile/src/design/charts/CumulativeChart.tsx`
- Create: `apps/mobile/src/design/charts/DistanceHistogram.tsx`
- Create: `apps/mobile/src/design/charts/TrainingLoadCard.tsx`

Each chart takes typed data props and renders SVG. Use `useColors()` for paper/ink/accent. No `Math.random()` in render — anything pseudo-random is keyed off props.

Visual aesthetic guardrails from `.impeccable.md`: quiet over loud, restrained color, one warm pop. Charts default to `c.ink2` lines on `c.paper2` cards, accent only on the active series / final-point dot.

- [ ] **Step 1: Create `HeatmapCalendar.tsx`**

Create `apps/mobile/src/design/charts/HeatmapCalendar.tsx`:

```tsx
import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Rect, G, Text as SvgText } from 'react-native-svg';
import type { HeatmapGrid, HeatmapDay } from '../../analytics/heatmap';
import { useColors } from '../theme';
import { TText } from '../typography';

interface Props {
  grid: HeatmapGrid;
  ghost?: HeatmapGrid;          // compare-mode period B
  onSelectDay?: (day: HeatmapDay) => void;
}

const CELL = 11;
const GAP = 2;
const LEFT = 22;
const TOP = 14;
const WEEKDAY_LABELS = ['', 'M', '', 'W', '', 'F', ''];

export function HeatmapCalendar({ grid, ghost, onSelectDay }: Props) {
  const c = useColors();
  const W = LEFT + grid.weeks.length * (CELL + GAP);
  const H = TOP + 7 * (CELL + GAP);

  const monthTicks = useMemo(() => {
    const ticks: { x: number; label: string }[] = [];
    let lastMonth = -1;
    for (let i = 0; i < grid.weeks.length; i++) {
      const month = Number(grid.weeks[i][0].date.slice(5, 7));
      if (month !== lastMonth) {
        ticks.push({ x: LEFT + i * (CELL + GAP), label: monthAbbr(month) });
        lastMonth = month;
      }
    }
    return ticks;
  }, [grid]);

  const fillFor = (bucket: HeatmapDay['bucket']) => {
    if (bucket === 0) return c.paper2;
    if (bucket === 1) return withAlpha(c.accent, 0.18);
    if (bucket === 2) return withAlpha(c.accent, 0.36);
    if (bucket === 3) return withAlpha(c.accent, 0.66);
    return c.accent;
  };

  return (
    <View>
      <Svg width={W} height={H} onPress={onSelectDay ? (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const wi = Math.floor((locationX - LEFT) / (CELL + GAP));
        const di = Math.floor((locationY - TOP) / (CELL + GAP));
        const day = grid.weeks[wi]?.[di];
        if (day && !day.inFuture) onSelectDay(day);
      } : undefined}>
        {monthTicks.map((t, i) => (
          <SvgText key={i} x={t.x} y={10} fontSize={8} fill={c.ink3} fontFamily="JetBrainsMono-Regular">
            {t.label}
          </SvgText>
        ))}
        {WEEKDAY_LABELS.map((l, i) => l ? (
          <SvgText key={i} x={0} y={TOP + i * (CELL + GAP) + 9} fontSize={8} fill={c.ink3} fontFamily="JetBrainsMono-Regular">
            {l}
          </SvgText>
        ) : null)}
        {grid.weeks.map((week, wi) => (
          <G key={wi}>
            {week.map((day, di) => (
              <Rect
                key={di}
                x={LEFT + wi * (CELL + GAP)}
                y={TOP + di * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx={2}
                fill={day.inFuture ? 'transparent' : fillFor(day.bucket)}
                stroke={day.inFuture ? c.line2 : 'transparent'}
                strokeDasharray={day.inFuture ? '1 1' : undefined}
              />
            ))}
          </G>
        ))}
        {ghost?.weeks.map((week, wi) => (
          <G key={`g${wi}`} opacity={0.35}>
            {week.map((day, di) => day.bucket > 0 ? (
              <Rect
                key={di}
                x={LEFT + wi * (CELL + GAP)}
                y={TOP + di * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx={2}
                fill="none"
                stroke={c.ink2}
                strokeWidth={1}
              />
            ) : null)}
          </G>
        ))}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <TText variant="mono" style={{ fontSize: 9, color: c.ink3 }}>Less</TText>
        {[0, 1, 2, 3, 4].map((b) => (
          <View key={b} style={{ width: 9, height: 9, borderRadius: 1.5, backgroundColor: fillFor(b as HeatmapDay['bucket']) }} />
        ))}
        <TText variant="mono" style={{ fontSize: 9, color: c.ink3 }}>More</TText>
      </View>
    </View>
  );
}

function monthAbbr(m: number): string {
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1] ?? '';
}

function withAlpha(hexOrRgb: string, alpha: number): string {
  // Accept #rrggbb or rgb(...); return rgba(...) with the supplied alpha.
  if (hexOrRgb.startsWith('#')) {
    const r = parseInt(hexOrRgb.slice(1, 3), 16);
    const g = parseInt(hexOrRgb.slice(3, 5), 16);
    const b = parseInt(hexOrRgb.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return hexOrRgb;
}
```

- [ ] **Step 2: Create `MonthlyBars.tsx`**

Create `apps/mobile/src/design/charts/MonthlyBars.tsx`:

```tsx
import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { useColors } from '../theme';

interface Props {
  /** length 12, in calendar order Jan..Dec */
  values: number[];
  /** optional comparison series (same shape) for compare-mode */
  compare?: number[];
}

const W = 320;
const H = 130;
const LEFT = 16;
const RIGHT = 8;
const TOP = 8;
const BOTTOM = 22;

const MONTHS = ['J','F','M','A','M','J','J','A','S','O','N','D'];

export function MonthlyBars({ values, compare }: Props) {
  const c = useColors();
  const max = Math.max(1, ...values, ...(compare ?? []));
  const slot = (W - LEFT - RIGHT) / 12;
  const barW = compare ? slot * 0.35 : slot * 0.55;
  const innerH = H - TOP - BOTTOM;

  return (
    <Svg width={W} height={H}>
      {values.map((v, i) => {
        const h = (v / max) * innerH;
        const x = LEFT + i * slot + slot / 2 - (compare ? barW + 1 : barW / 2);
        return (
          <Rect key={`a${i}`} x={x} y={TOP + (innerH - h)} width={barW} height={h} rx={1.5} fill={c.accent} />
        );
      })}
      {compare?.map((v, i) => {
        const h = (v / max) * innerH;
        const x = LEFT + i * slot + slot / 2 + 1;
        return (
          <Rect key={`b${i}`} x={x} y={TOP + (innerH - h)} width={barW} height={h} rx={1.5} fill="none" stroke={c.ink2} strokeWidth={1} />
        );
      })}
      {MONTHS.map((m, i) => (
        <SvgText key={`l${i}`} x={LEFT + i * slot + slot / 2} y={H - 6} fontSize={9} fill={c.ink3} textAnchor="middle" fontFamily="JetBrainsMono-Regular">
          {m}
        </SvgText>
      ))}
    </Svg>
  );
}
```

- [ ] **Step 3: Create `WeeklyBars.tsx`**

Create `apps/mobile/src/design/charts/WeeklyBars.tsx`:

```tsx
import React from 'react';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { useColors } from '../theme';

interface Props {
  /** weeks of the month, oldest first; 4–6 entries */
  values: number[];
  compare?: number[];
}

const W = 320;
const H = 110;
const LEFT = 16;
const RIGHT = 8;
const TOP = 8;
const BOTTOM = 22;

export function WeeklyBars({ values, compare }: Props) {
  const c = useColors();
  const max = Math.max(1, ...values, ...(compare ?? []));
  const slot = (W - LEFT - RIGHT) / values.length;
  const barW = compare ? slot * 0.34 : slot * 0.55;
  const innerH = H - TOP - BOTTOM;

  return (
    <Svg width={W} height={H}>
      {values.map((v, i) => {
        const h = (v / max) * innerH;
        const x = LEFT + i * slot + slot / 2 - (compare ? barW + 1 : barW / 2);
        return <Rect key={`a${i}`} x={x} y={TOP + (innerH - h)} width={barW} height={h} rx={1.5} fill={c.accent} />;
      })}
      {compare?.map((v, i) => {
        const h = (v / max) * innerH;
        const x = LEFT + i * slot + slot / 2 + 1;
        return <Rect key={`b${i}`} x={x} y={TOP + (innerH - h)} width={barW} height={h} rx={1.5} fill="none" stroke={c.ink2} strokeWidth={1} />;
      })}
      {values.map((_, i) => (
        <SvgText key={`l${i}`} x={LEFT + i * slot + slot / 2} y={H - 6} fontSize={9} fill={c.ink3} textAnchor="middle" fontFamily="JetBrainsMono-Regular">
          W{i + 1}
        </SvgText>
      ))}
    </Svg>
  );
}
```

- [ ] **Step 4: Create `MonthCalendarDots.tsx`**

Create `apps/mobile/src/design/charts/MonthCalendarDots.tsx`:

```tsx
import React, { useMemo } from 'react';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { useColors } from '../theme';

interface Props {
  year: number;       // e.g. 2026
  month: number;      // 1..12
  /** per-day km totals keyed by 'YYYY-MM-DD' */
  kmByDate: Record<string, number>;
}

const W = 320;
const ROWS = 6;
const CELL = W / 7;
const TOP = 20;

export function MonthCalendarDots({ year, month, kmByDate }: Props) {
  const c = useColors();
  const H = TOP + ROWS * CELL;
  const cells = useMemo(() => buildCells(year, month, kmByDate), [year, month, kmByDate]);

  return (
    <Svg width={W} height={H}>
      {['S','M','T','W','T','F','S'].map((d, i) => (
        <SvgText key={i} x={i * CELL + CELL / 2} y={12} fontSize={9} fill={c.ink3} textAnchor="middle" fontFamily="JetBrainsMono-Regular">
          {d}
        </SvgText>
      ))}
      {cells.map((cell, idx) => {
        const col = idx % 7;
        const row = Math.floor(idx / 7);
        const cx = col * CELL + CELL / 2;
        const cy = TOP + row * CELL + CELL / 2;
        if (!cell) return null;
        const r = cell.km <= 0 ? 1.4 : cell.km < 7 ? 3 : cell.km < 15 ? 4.5 : 6;
        const fill = cell.km <= 0 ? c.line2 : c.accent;
        return (
          <React.Fragment key={idx}>
            <Circle cx={cx} cy={cy - 3} r={r} fill={fill} />
            <SvgText x={cx} y={cy + 10} fontSize={8} fill={c.ink3} textAnchor="middle" fontFamily="JetBrainsMono-Regular">
              {cell.day}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

function buildCells(year: number, month: number, kmByDate: Record<string, number>) {
  const first = new Date(year, month - 1, 1);
  const startCol = first.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: Array<{ day: number; km: number } | null> = [];
  for (let i = 0; i < startCol; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ day, km: kmByDate[key] ?? 0 });
  }
  while (cells.length < 42) cells.push(null);
  return cells;
}
```

- [ ] **Step 5: Create `CumulativeChart.tsx`**

Create `apps/mobile/src/design/charts/CumulativeChart.tsx`:

```tsx
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import type { MonthlyPoint } from '../../analytics/cumulative';
import { useColors } from '../theme';
import { TText } from '../typography';

interface Props {
  series: MonthlyPoint[];
  compare?: MonthlyPoint[];
}

const W = 320;
const H = 150;
const PAD = 14;

export function CumulativeChart({ series, compare }: Props) {
  const c = useColors();

  if (series.length === 0) {
    return (
      <View style={{ height: H, alignItems: 'center', justifyContent: 'center' }}>
        <TText style={{ fontSize: 12, color: c.ink3 }}>No runs yet.</TText>
      </View>
    );
  }

  const all = compare ? [...series, ...compare] : series;
  const max = Math.max(1, ...all.map((p) => p.cumulativeKm));
  const n = Math.max(series.length, compare?.length ?? 0);
  const step = n === 1 ? 0 : (W - PAD * 2) / (n - 1);
  const y = (v: number) => PAD + (H - PAD * 2) - (v / max) * (H - PAD * 2);

  const buildPath = (pts: MonthlyPoint[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${(PAD + i * step).toFixed(1)} ${y(p.cumulativeKm).toFixed(1)}`).join(' ');

  const da = buildPath(series);
  const db = compare ? buildPath(compare) : null;
  const last = series[series.length - 1];

  return (
    <View>
      <Svg width={W} height={H}>
        {[0.25, 0.5, 0.75].map((p, i) => (
          <Line key={i} x1={PAD} y1={PAD + (H - PAD * 2) * p} x2={W - PAD} y2={PAD + (H - PAD * 2) * p} stroke={c.line2} />
        ))}
        {compare && db ? <Path d={db} fill="none" stroke={c.ink2} strokeWidth={1.5} strokeDasharray="3 3" /> : null}
        <Path d={`${da} L${PAD + (series.length - 1) * step} ${H - PAD} L${PAD} ${H - PAD}Z`} fill={c.accent} opacity={0.10} />
        <Path d={da} fill="none" stroke={c.accent} strokeWidth={2} strokeLinecap="round" />
        <Circle cx={PAD + (series.length - 1) * step} cy={y(last.cumulativeKm)} r={4} fill={c.accent} />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <TText variant="mono" style={{ fontSize: 10, color: c.ink3 }}>{series[0].ym}</TText>
        <TText variant="mono" style={{ fontSize: 10, color: c.ink3 }}>{last.ym}</TText>
      </View>
    </View>
  );
}
```

- [ ] **Step 6: Create `DistanceHistogram.tsx`**

Create `apps/mobile/src/design/charts/DistanceHistogram.tsx`:

```tsx
import React from 'react';
import { View } from 'react-native';
import type { HistogramCell } from '../../analytics/histogram';
import { useColors } from '../theme';
import { TText } from '../typography';

interface Props { cells: HistogramCell[] }

export function DistanceHistogram({ cells }: Props) {
  const c = useColors();
  const max = Math.max(1, ...cells.map((b) => b.count));
  return (
    <View style={{ gap: 6 }}>
      {cells.map((b) => {
        const w = (b.count / max) * 100;
        return (
          <View key={b.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TText variant="mono" style={{ width: 48, fontSize: 10, color: c.ink3 }}>{b.label}</TText>
            <View style={{ flex: 1, height: 12, backgroundColor: c.paper2, borderRadius: 6, overflow: 'hidden' }}>
              <View style={{ width: `${w}%`, height: '100%', backgroundColor: c.accent }} />
            </View>
            <TText variant="mono" style={{ width: 26, textAlign: 'right', fontSize: 11, color: c.ink }}>{b.count}</TText>
          </View>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 7: Create `TrainingLoadCard.tsx`**

Create `apps/mobile/src/design/charts/TrainingLoadCard.tsx`:

```tsx
import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { LoadPoint } from '../../analytics/trainingLoad';
import { Card } from '../atoms';
import { useColors } from '../theme';
import { Eyebrow, TText } from '../typography';

interface Props {
  series: LoadPoint[];
  isHrBased: boolean;
  needsHrProfile: boolean;
  onTapProfile?: () => void;
}

const W = 280;
const H = 56;
const PAD = 4;

export function TrainingLoadCard({ series, isHrBased, needsHrProfile, onTapProfile }: Props) {
  const c = useColors();
  const last = series[series.length - 1];
  if (!last) return null;

  const tail = series.slice(-28);
  const max = Math.max(1, ...tail.map((p) => p.ctl));
  const step = tail.length === 1 ? 0 : (W - PAD * 2) / (tail.length - 1);
  const y = (v: number) => PAD + (H - PAD * 2) - (v / max) * (H - PAD * 2);
  const d = tail.map((p, i) => `${i === 0 ? 'M' : 'L'}${(PAD + i * step).toFixed(1)} ${y(p.ctl).toFixed(1)}`).join(' ');

  const tsbColor = last.tsb >= 5 ? c.moss : last.tsb <= -10 ? c.accent : c.ink2;
  const tsbLabel = last.tsb >= 5 ? 'Fresh' : last.tsb <= -10 ? 'Loaded' : 'Steady';

  return (
    <Card style={{ backgroundColor: c.paper2 }}>
      <Eyebrow>{isHrBased ? 'TRAINING LOAD' : 'LOAD (DISTANCE-BASED)'}</Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
        <View>
          <TText variant="monoMedium" style={{ fontSize: 36, lineHeight: 36, letterSpacing: -1, color: c.ink }}>
            {Math.round(last.ctl)}
          </TText>
          <Eyebrow style={{ color: c.ink3 }}>FITNESS · CTL</Eyebrow>
        </View>
        <Svg width={W * 0.55} height={H}>
          <Path d={d} fill="none" stroke={c.accent} strokeWidth={1.6} strokeLinecap="round" />
          <Circle cx={PAD + (tail.length - 1) * step} cy={y(last.ctl)} r={3} fill={c.accent} />
        </Svg>
      </View>
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.line }}>
        <View style={{ flex: 1 }}>
          <Eyebrow style={{ color: c.ink3 }}>FATIGUE · ATL</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 16, color: c.ink }}>{Math.round(last.atl)}</TText>
        </View>
        <View style={{ flex: 1 }}>
          <Eyebrow style={{ color: c.ink3 }}>FORM · TSB</Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TText variant="monoMedium" style={{ fontSize: 16, color: c.ink }}>{last.tsb >= 0 ? '+' : ''}{Math.round(last.tsb)}</TText>
            <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: tsbColor + '22' }}>
              <TText style={{ fontSize: 9, color: tsbColor, fontWeight: '500' }}>{tsbLabel}</TText>
            </View>
          </View>
        </View>
      </View>
      {needsHrProfile && isHrBased ? (
        <Pressable onPress={onTapProfile} style={{ marginTop: 10 }}>
          <TText style={{ fontSize: 11, color: c.accent, textDecorationLine: 'underline' }}>
            Using defaults — tap to set your HR profile
          </TText>
        </Pressable>
      ) : null}
    </Card>
  );
}
```

- [ ] **Step 8: Delete the placeholder cumulative file**

```bash
rm apps/mobile/src/screens/_AnalyticsCharts.tsx
```

Note: `AnalyticsScreen.tsx` does NOT import `_AnalyticsCharts.tsx` (verified). Safe to delete.

- [ ] **Step 9: Check theme tokens (`c.moss`)**

`TrainingLoadCard` references `c.moss`. Open `apps/mobile/src/design/theme.tsx` and verify `useColors()` returns a `moss` key. If not, find any place that already uses `moss` (the brand palette: paper, ink, accent=solar, moss). If `moss` is missing from `useColors`, add it.

Open the file:

```bash
grep -n "moss\|accent\|ink2\|line2" apps/mobile/src/design/theme.tsx | head
```

If `moss` is missing, add it to the returned token object with the brand value (`#4a6b3a` from CLAUDE.md §brand). If it's named differently (e.g. `c.success`), change `TrainingLoadCard` to use that name instead.

- [ ] **Step 10: Typecheck**

```bash
pnpm -F @runstamp/mobile typecheck
```

Expected: clean.

- [ ] **Step 11: Run mobile tests (charts have none, but the helpers should still be green)**

```bash
pnpm -F @runstamp/mobile test
```

- [ ] **Step 12: Commit**

```bash
git add apps/mobile/src/design/charts apps/mobile/src/design/theme.tsx
git rm apps/mobile/src/screens/_AnalyticsCharts.tsx
git commit -m "feat(charts): heatmap, monthly/weekly bars, calendar dots, cumulative, histogram, training load"
```

(If theme.tsx wasn't modified, omit it from the `git add`.)

---

## Task 11: AnalyticsScreen — year view refactor

**Files:**
- Modify: `apps/mobile/src/screens/AnalyticsScreen.tsx`

Replace the `'year'` branch of `StatsView` to compose Hero + Heatmap + MonthlyBars + Histogram + Streaks + TrainingLoad. Keep month/all-time pointing at the old hero+rows for now (next task). Use the new analytics helpers.

Note: this task assumes `useAccount` hook does not yet exist; the training-load card is rendered with `hrMax`/`hrResting` defaulted from `DEFAULT_HR_MAX`/`DEFAULT_HR_RESTING`. Task 15 wires the real HR profile in.

- [ ] **Step 1: Read the current AnalyticsScreen.tsx**

```bash
cat apps/mobile/src/screens/AnalyticsScreen.tsx
```

Note the existing imports, the `StatsView`, `ScopedHero`, `LifetimeHero` etc.

- [ ] **Step 2: Replace AnalyticsScreen.tsx with the year-view-extended version**

Open `apps/mobile/src/screens/AnalyticsScreen.tsx` and apply these changes:

1. Add imports at the top:

```ts
import { sortByDateAsc } from '../analytics/sortByDate';
import { buildHeatmap } from '../analytics/heatmap';
import { computeStreaks } from '../analytics/streaks';
import { buildLoadSeries, hasAnyHr } from '../analytics/trainingLoad';
import { distanceHistogram } from '../analytics/histogram';
import { HeatmapCalendar } from '../design/charts/HeatmapCalendar';
import { MonthlyBars } from '../design/charts/MonthlyBars';
import { DistanceHistogram } from '../design/charts/DistanceHistogram';
import { TrainingLoadCard } from '../design/charts/TrainingLoadCard';
import { DEFAULT_HR_MAX, DEFAULT_HR_RESTING } from '../analytics/hrZones';
```

2. Inside `StatsView`, after the existing `useMemo` lines, add:

```ts
const ascending = useMemo(() => sortByDateAsc(activities), [activities]);
const hrMax = DEFAULT_HR_MAX;
const hrResting = DEFAULT_HR_RESTING;
const heatmap = useMemo(() => buildHeatmap(
  ascending.map((a) => ({ date: a.date, distance: a.distance })),
), [ascending]);
const streaks = useMemo(() => computeStreaks(ascending), [ascending]);
const load = useMemo(() => buildLoadSeries(
  ascending.map((a) => ({ date: a.date, distance: a.distance, seconds: a.seconds, avgHr: a.avgHr })),
  new Date(),
  hrMax,
  hrResting,
), [ascending, hrMax, hrResting]);
const hrBased = useMemo(() => hasAnyHr(ascending.map((a) => ({ avgHr: a.avgHr }))), [ascending]);
const monthlyKm = useMemo(() => {
  const y = new Date().getFullYear();
  const out = Array(12).fill(0);
  for (const a of ascending) {
    const d = new Date(a.date);
    if (d.getFullYear() === y) out[d.getMonth()] += a.distance;
  }
  return out;
}, [ascending]);
const histogramCells = useMemo(() => distanceHistogram(filtered), [filtered]);
```

3. Below the `scope !== 'all' ? <ScopedHero ...` line, when `scope === 'year'`, render the new sections (the existing PersonalBests + Recent activity sections stay):

```tsx
{scope === 'year' && (
  <>
    <SectionHeader title="Activity heatmap" />
    <Card style={{ backgroundColor: c.paper2 }}>
      <HeatmapCalendar grid={heatmap} />
    </Card>
    <SectionHeader title="By month" />
    <Card style={{ backgroundColor: c.paper2 }}>
      <MonthlyBars values={monthlyKm} />
    </Card>
    <SectionHeader title="By distance" />
    <Card style={{ backgroundColor: c.paper2 }}>
      <DistanceHistogram cells={histogramCells} />
    </Card>
    <SectionHeader title="Streaks" />
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <StatTile label="CURRENT" value={`${streaks.current}d`} />
      <StatTile label="LONGEST" value={`${streaks.longest}d`} />
    </View>
    <View style={{ marginTop: 12 }}>
      <TrainingLoadCard
        series={load}
        isHrBased={hrBased}
        needsHrProfile={hrBased && hrMax === DEFAULT_HR_MAX && hrResting === DEFAULT_HR_RESTING}
      />
    </View>
  </>
)}
```

4. Add the `StatTile` helper at the bottom of the file:

```tsx
function StatTile({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line, borderRadius: 10, padding: 12 }}>
      <Eyebrow style={{ color: c.ink3 }}>{label}</Eyebrow>
      <TText variant="monoMedium" style={{ fontSize: 22, color: c.ink, marginTop: 4 }}>{value}</TText>
    </View>
  );
}
```

5. Import `Card` at the top if not already imported (it is — verify).

6. Inside `StatsView`, `c` is already destructured. If not, add `const c = useColors();` at the top.

- [ ] **Step 3: Typecheck + tests + visual smoke**

```bash
pnpm -F @runstamp/mobile typecheck && pnpm -F @runstamp/mobile test
```

Expected: clean. (Visual smoke happens manually in TestFlight; not blocking.)

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/screens/AnalyticsScreen.tsx
git commit -m "feat(analytics): year view — heatmap, monthly bars, histogram, streaks, training load"
```

---

## Task 12: AnalyticsScreen — month + all-time views

**Files:**
- Modify: `apps/mobile/src/screens/AnalyticsScreen.tsx`

Add the month view (calendar dots + weekly bars + training load) and the all-time view (cumulative chart + longest streak + training load). Personal bests + recent activity stay.

- [ ] **Step 1: Add imports**

In `apps/mobile/src/screens/AnalyticsScreen.tsx`:

```ts
import { monthlyCumulative } from '../analytics/cumulative';
import { CumulativeChart } from '../design/charts/CumulativeChart';
import { MonthCalendarDots } from '../design/charts/MonthCalendarDots';
import { WeeklyBars } from '../design/charts/WeeklyBars';
```

- [ ] **Step 2: Add per-scope memos inside `StatsView`**

```ts
const kmByDate = useMemo(() => {
  const out: Record<string, number> = {};
  for (const a of ascending) out[a.date] = (out[a.date] ?? 0) + a.distance;
  return out;
}, [ascending]);
const now = new Date();
const weeklyKm = useMemo(() => {
  if (scope !== 'month') return [];
  const y = now.getFullYear();
  const m = now.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const weeks: number[] = [];
  for (let day = 1; day <= daysInMonth; day += 7) {
    let sum = 0;
    for (let i = day; i < day + 7 && i <= daysInMonth; i++) {
      const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      sum += kmByDate[key] ?? 0;
    }
    weeks.push(sum);
  }
  return weeks;
}, [scope, kmByDate]);
const cumulative = useMemo(() =>
  monthlyCumulative(ascending.map((a) => ({ date: a.date, distance: a.distance })))
, [ascending]);
```

- [ ] **Step 3: Render the month branch**

After the year branch, before the PersonalBests section:

```tsx
{scope === 'month' && (
  <>
    <SectionHeader title="This month" />
    <Card style={{ backgroundColor: c.paper2 }}>
      <MonthCalendarDots year={now.getFullYear()} month={now.getMonth() + 1} kmByDate={kmByDate} />
    </Card>
    <SectionHeader title="By week" />
    <Card style={{ backgroundColor: c.paper2 }}>
      <WeeklyBars values={weeklyKm} />
    </Card>
    <View style={{ marginTop: 12 }}>
      <TrainingLoadCard
        series={load}
        isHrBased={hrBased}
        needsHrProfile={hrBased && hrMax === DEFAULT_HR_MAX && hrResting === DEFAULT_HR_RESTING}
      />
    </View>
  </>
)}
```

- [ ] **Step 4: Render the all-time branch**

```tsx
{scope === 'all' && (
  <>
    <SectionHeader title="Cumulative distance" />
    <Card style={{ backgroundColor: c.paper2 }}>
      <CumulativeChart series={cumulative} />
    </Card>
    <SectionHeader title="Longest streak" />
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <StatTile label="EVER" value={`${streaks.longest} days`} />
    </View>
    <View style={{ marginTop: 12 }}>
      <TrainingLoadCard
        series={load}
        isHrBased={hrBased}
        needsHrProfile={hrBased && hrMax === DEFAULT_HR_MAX && hrResting === DEFAULT_HR_RESTING}
      />
    </View>
  </>
)}
```

- [ ] **Step 5: Typecheck + tests**

```bash
pnpm -F @runstamp/mobile typecheck && pnpm -F @runstamp/mobile test
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/screens/AnalyticsScreen.tsx
git commit -m "feat(analytics): month + all-time views (calendar dots, weekly bars, cumulative)"
```

---

## Task 13: Filters bar (distance range + HR zone + disabled shoe)

**Files:**
- Create: `apps/mobile/src/design/atoms/FilterChip.tsx`
- Create: `apps/mobile/src/screens/_AnalyticsFilters.tsx`
- Modify: `apps/mobile/src/screens/AnalyticsScreen.tsx`

Filter state is local `useState` in `AnalyticsScreen`. Filter applies to everything below the hero (i.e. heatmap/bars/histogram/streaks/load/PBs/recent), NOT the hero stat block.

- [ ] **Step 1: Create `FilterChip.tsx`**

Create `apps/mobile/src/design/atoms/FilterChip.tsx`:

```tsx
import React from 'react';
import { Pressable, View } from 'react-native';
import { useColors } from '../theme';
import { TText } from '../typography';

interface Props {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}

export function FilterChip({ label, selected, disabled, onPress }: Props) {
  const c = useColors();
  const bg = disabled ? c.paper2 : selected ? c.ink : c.paper2;
  const fg = disabled ? c.ink3 : selected ? c.paper : c.ink;
  return (
    <Pressable disabled={disabled} onPress={onPress} style={{
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
      backgroundColor: bg, borderWidth: 1, borderColor: selected ? c.ink : c.line,
      opacity: disabled ? 0.5 : 1,
    }}>
      <TText style={{ fontSize: 12, color: fg, fontWeight: selected ? '500' : '400' }}>{label}</TText>
    </Pressable>
  );
}
```

- [ ] **Step 2: Create `_AnalyticsFilters.tsx`**

Create `apps/mobile/src/screens/_AnalyticsFilters.tsx`:

```tsx
import React from 'react';
import { ScrollView, View } from 'react-native';
import { FilterChip } from '../design/atoms/FilterChip';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';

export interface Filters {
  minKm: number;
  maxKm: number;
  zones: Set<1 | 2 | 3 | 4 | 5>;  // empty = all
}

export const DEFAULT_FILTERS: Filters = { minKm: 0, maxKm: 100, zones: new Set() };

export function filtersAreActive(f: Filters): boolean {
  return f.minKm > 0 || f.maxKm < 100 || f.zones.size > 0;
}

interface Props {
  value: Filters;
  onChange: (next: Filters) => void;
}

const RANGE_OPTIONS: Array<{ label: string; min: number; max: number }> = [
  { label: 'All', min: 0, max: 100 },
  { label: '< 5 km', min: 0, max: 5 },
  { label: '5–10', min: 5, max: 10 },
  { label: '10–20', min: 10, max: 20 },
  { label: '20–30', min: 20, max: 30 },
  { label: '30+', min: 30, max: 100 },
];

export function AnalyticsFilters({ value, onChange }: Props) {
  const c = useColors();
  const toggleZone = (z: 1 | 2 | 3 | 4 | 5) => {
    const next = new Set(value.zones);
    if (next.has(z)) next.delete(z); else next.add(z);
    onChange({ ...value, zones: next });
  };
  const matchesRange = (opt: typeof RANGE_OPTIONS[number]) =>
    value.minKm === opt.min && value.maxKm === opt.max;

  return (
    <View style={{ gap: 10, paddingTop: 14 }}>
      <View>
        <Eyebrow style={{ color: c.ink3, marginBottom: 6 }}>DISTANCE</Eyebrow>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {RANGE_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.label}
              label={opt.label}
              selected={matchesRange(opt)}
              onPress={() => onChange({ ...value, minKm: opt.min, maxKm: opt.max })}
            />
          ))}
        </ScrollView>
      </View>
      <View>
        <Eyebrow style={{ color: c.ink3, marginBottom: 6 }}>HR ZONE</Eyebrow>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {([1, 2, 3, 4, 5] as const).map((z) => (
            <FilterChip key={z} label={`Z${z}`} selected={value.zones.has(z)} onPress={() => toggleZone(z)} />
          ))}
          <FilterChip label="Shoe" disabled />
        </ScrollView>
      </View>
      {value.zones.size === 0 ? null : (
        <TText style={{ fontSize: 10, color: c.ink3 }}>Filtering by avg HR zone.</TText>
      )}
    </View>
  );
}
```

- [ ] **Step 3: Wire filters into `AnalyticsScreen`**

In `AnalyticsScreen.tsx`:

1. Add imports:

```ts
import { AnalyticsFilters, DEFAULT_FILTERS, filtersAreActive, type Filters } from './_AnalyticsFilters';
import { classifyAvgHr } from '../analytics/hrZones';
```

2. Add filter state inside `AnalyticsScreen` (not `StatsView`):

```ts
const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
const [filtersOpen, setFiltersOpen] = useState(false);
```

3. Below the scope toggle in the screen JSX, add a "Filters" toggle row and the optional filters panel:

```tsx
<View style={{ paddingHorizontal: 14, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
  <Pressable onPress={() => setFiltersOpen((v) => !v)} style={{
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
    backgroundColor: filtersAreActive(filters) ? c.ink : c.paper2,
    borderWidth: 1, borderColor: filtersAreActive(filters) ? c.ink : c.line,
  }}>
    <TText style={{ fontSize: 12, color: filtersAreActive(filters) ? c.paper : c.ink }}>
      {filtersAreActive(filters) ? 'Filters active' : 'Filters'}
    </TText>
  </Pressable>
  {filtersAreActive(filters) && (
    <Pressable onPress={() => setFilters(DEFAULT_FILTERS)}>
      <TText style={{ fontSize: 12, color: c.ink3, textDecorationLine: 'underline' }}>Clear</TText>
    </Pressable>
  )}
</View>
{filtersOpen && (
  <View style={{ paddingHorizontal: 14 }}>
    <AnalyticsFilters value={filters} onChange={setFilters} />
  </View>
)}
```

4. Pass `filters` down to `StatsView`:

```tsx
<StatsView scope={scope} activities={activities} filters={filters} />
```

5. In `StatsView`, accept and apply the filter:

```ts
function StatsView({ scope, activities, filters }: { scope: Scope; activities: Activity[]; filters: Filters }) {
  // ...existing code...
  const filteredByLens = useMemo(() => {
    const inRange = (km: number) => km >= filters.minKm && (filters.maxKm >= 100 ? true : km <= filters.maxKm);
    return ascending.filter((a) => {
      if (!inRange(a.distance)) return false;
      if (filters.zones.size > 0) {
        const z = classifyAvgHr(a.avgHr || undefined);
        if (z === null || !filters.zones.has(z)) return false;
      }
      return true;
    });
  }, [ascending, filters]);
```

6. Everything below the hero uses `filteredByLens` instead of `ascending`:
   - `heatmap = useMemo(() => buildHeatmap(filteredByLens.map(...))`
   - `streaks = useMemo(() => computeStreaks(filteredByLens))`
   - `load = useMemo(() => buildLoadSeries(filteredByLens.map(...)))`
   - `kmByDate` uses `filteredByLens`
   - `monthlyKm` uses `filteredByLens`
   - `weeklyKm` uses `filteredByLens` (via kmByDate)
   - `cumulative` uses `filteredByLens`
   - `histogramCells = useMemo(() => distanceHistogram(filteredByLens))`
   - The existing `filtered` (scope-filtered) for Recent activity becomes `filterByScope(filteredByLens, scope)`

Keep `ascending` only for `hrBased` detection (whether the user has *any* HR data globally — filtering shouldn't suppress the HR-based label).

- [ ] **Step 4: Typecheck + tests**

```bash
pnpm -F @runstamp/mobile typecheck && pnpm -F @runstamp/mobile test
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/design/atoms/FilterChip.tsx apps/mobile/src/screens/_AnalyticsFilters.tsx apps/mobile/src/screens/AnalyticsScreen.tsx
git commit -m "feat(analytics): filters bar (distance range + HR zone; shoe disabled)"
```

---

## Task 14: Compare-mode

**Files:**
- Modify: `apps/mobile/src/screens/AnalyticsScreen.tsx`

Compare toggle in the top-right of the scope row, second-period picker, dual hero, paired charts. Disabled when scope is `all`.

- [ ] **Step 1: Add compare state to `AnalyticsScreen`**

```ts
import { filterByPeriod, delta, type Period } from '../analytics/compare';
// ...
const [compareOn, setCompareOn] = useState(false);
const [comparePeriod, setComparePeriod] = useState<Period | null>(null);
```

When `scope` changes, reset compareOn off if scope is `all`:

```ts
useEffect(() => {
  if (scope === 'all') { setCompareOn(false); setComparePeriod(null); }
}, [scope]);
```

- [ ] **Step 2: Add the compare toggle next to the scope segment**

Wrap the scope segmented control in a row, and add a "Compare" pressable on the right:

```tsx
<View style={{ paddingHorizontal: 14, paddingTop: 18, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
  <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.paper2, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: c.line }}>
    {/* existing scope buttons */}
  </View>
  {scope !== 'all' && (
    <Pressable
      onPress={() => {
        const next = !compareOn;
        setCompareOn(next);
        if (next && !comparePeriod) setComparePeriod(defaultComparePeriod(scope));
      }}
      style={{
        paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
        backgroundColor: compareOn ? c.ink : c.paper2,
        borderWidth: 1, borderColor: compareOn ? c.ink : c.line,
      }}
    >
      <TText style={{ fontSize: 12, color: compareOn ? c.paper : c.ink }}>Compare</TText>
    </Pressable>
  )}
</View>
```

Add the helper at the bottom of the file:

```ts
function defaultComparePeriod(scope: Scope): Period {
  const now = new Date();
  if (scope === 'year') return { kind: 'year', year: now.getFullYear() - 1 };
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { kind: 'month', year: prev.getFullYear(), month: prev.getMonth() + 1 };
}
```

- [ ] **Step 3: Render a compact period picker when compareOn**

Below the toggle row, render only when `compareOn && comparePeriod && scope !== 'all'`:

```tsx
{compareOn && comparePeriod && scope !== 'all' && (
  <View style={{ paddingHorizontal: 14, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <TText style={{ fontSize: 12, color: c.ink3 }}>vs</TText>
    <Pressable onPress={() => setComparePeriod(stepComparePeriod(comparePeriod, -1))}>
      <TText style={{ fontSize: 16, color: c.ink }}>‹</TText>
    </Pressable>
    <TText variant="monoMedium" style={{ fontSize: 13, color: c.ink, minWidth: 80, textAlign: 'center' }}>
      {labelPeriod(comparePeriod)}
    </TText>
    <Pressable onPress={() => setComparePeriod(stepComparePeriod(comparePeriod, 1))}>
      <TText style={{ fontSize: 16, color: c.ink }}>›</TText>
    </Pressable>
  </View>
)}
```

Helpers:

```ts
function stepComparePeriod(p: Period, dir: 1 | -1): Period {
  if (p.kind === 'year') return { kind: 'year', year: p.year + dir };
  let m = p.month + dir;
  let y = p.year;
  if (m < 1) { m = 12; y -= 1; }
  else if (m > 12) { m = 1; y += 1; }
  return { kind: 'month', year: y, month: m };
}

function labelPeriod(p: Period): string {
  if (p.kind === 'year') return String(p.year);
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][p.month - 1]} ${p.year}`;
}
```

- [ ] **Step 4: Compute B-period series inside `StatsView`**

Pass `comparePeriod` (or null) into `StatsView`. Then:

```ts
const periodB = useMemo(() => {
  if (!comparePeriod) return null;
  return filterByPeriod(filteredByLens, comparePeriod);
}, [filteredByLens, comparePeriod]);

const aggB = useMemo(() => periodB ? aggregate(periodB) : null, [periodB]);

const heatmapB = useMemo(() => periodB ? buildHeatmap(
  periodB.map((a) => ({ date: a.date, distance: a.distance })),
  comparePeriod?.kind === 'year' ? new Date(comparePeriod.year, 11, 31) :
  comparePeriod?.kind === 'month' ? new Date(comparePeriod.year, comparePeriod.month - 1 + 1, 0) :
  new Date(),
) : null, [periodB, comparePeriod]);

const monthlyKmB = useMemo(() => {
  if (!periodB || comparePeriod?.kind !== 'year') return undefined;
  const out = Array(12).fill(0);
  for (const a of periodB) {
    const d = new Date(a.date);
    if (d.getFullYear() === comparePeriod.year) out[d.getMonth()] += a.distance;
  }
  return out;
}, [periodB, comparePeriod]);

const weeklyKmB = useMemo(() => {
  if (!periodB || comparePeriod?.kind !== 'month') return undefined;
  const daysInMonth = new Date(comparePeriod.year, comparePeriod.month, 0).getDate();
  const weeks: number[] = [];
  const kmByDateB: Record<string, number> = {};
  for (const a of periodB) kmByDateB[a.date] = (kmByDateB[a.date] ?? 0) + a.distance;
  for (let day = 1; day <= daysInMonth; day += 7) {
    let sum = 0;
    for (let i = day; i < day + 7 && i <= daysInMonth; i++) {
      const key = `${comparePeriod.year}-${String(comparePeriod.month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      sum += kmByDateB[key] ?? 0;
    }
    weeks.push(sum);
  }
  return weeks;
}, [periodB, comparePeriod]);
```

- [ ] **Step 5: Render the dual hero when comparing**

Replace the hero render branch:

```tsx
{compareOn && aggB && comparePeriod ? (
  <View style={{ flexDirection: 'row', gap: 8 }}>
    <View style={{ flex: 1 }}>
      <Eyebrow style={{ color: c.ink3 }}>{scope === 'year' ? String(new Date().getFullYear()) : new Date().toLocaleDateString('en-US', { month: 'long' }).toUpperCase()}</Eyebrow>
      <TText variant="monoMedium" style={{ fontSize: 30, lineHeight: 32, color: c.ink, letterSpacing: -0.8 }}>{fmtDist(scoped.totalKm, units)}</TText>
      <TText style={{ fontSize: 10, color: c.ink3 }}>{scoped.runs} runs · {fmtTime(scoped.totalSec)}</TText>
    </View>
    <View style={{ flex: 1 }}>
      <Eyebrow style={{ color: c.ink3 }}>{labelPeriod(comparePeriod).toUpperCase()}</Eyebrow>
      <TText variant="monoMedium" style={{ fontSize: 30, lineHeight: 32, color: c.ink2, letterSpacing: -0.8 }}>{fmtDist(aggB.totalKm, units)}</TText>
      <TText style={{ fontSize: 10, color: c.ink3 }}>{aggB.runs} runs · {fmtTime(aggB.totalSec)}</TText>
      {(() => {
        const d = delta(scoped.totalKm, aggB.totalKm);
        const sign = d.abs >= 0 ? '+' : '';
        const tone = d.abs >= 0 ? c.moss : c.accent;
        return (
          <TText variant="mono" style={{ fontSize: 10, color: tone, marginTop: 2 }}>
            {sign}{Math.round(d.abs)} km{d.pct === null ? '' : ` · ${sign}${d.pct}%`}
          </TText>
        );
      })()}
    </View>
  </View>
) : scope !== 'all' ? <ScopedHero scope={scope} agg={scoped} /> : <LifetimeHero agg={all} />}
```

- [ ] **Step 6: Pipe ghost/compare into charts**

In the year branch:

```tsx
<HeatmapCalendar grid={heatmap} ghost={compareOn ? (heatmapB ?? undefined) : undefined} />
<MonthlyBars values={monthlyKm} compare={compareOn ? monthlyKmB : undefined} />
```

In the month branch:

```tsx
<WeeklyBars values={weeklyKm} compare={compareOn ? weeklyKmB : undefined} />
```

(Calendar dots stay single — no overlay mode.)

- [ ] **Step 7: Typecheck + tests**

```bash
pnpm -F @runstamp/mobile typecheck && pnpm -F @runstamp/mobile test
```

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/screens/AnalyticsScreen.tsx
git commit -m "feat(analytics): compare-mode — dual hero + paired bars + ghost heatmap"
```

---

## Task 15: HR profile in Settings + wire training-load card

**Files:**
- Modify: `apps/mobile/src/services/api.ts` (add `apiPatch`)
- Modify: `apps/mobile/src/services/account.ts` (add `getMe`, `patchMe`)
- Create: `apps/mobile/src/state/useAccount.ts`
- Modify: `apps/mobile/src/screens/SettingsScreen.tsx` (HR profile inputs)
- Modify: `apps/mobile/src/screens/AnalyticsScreen.tsx` (use real HR profile + onTapProfile)

- [ ] **Step 1: Add `apiPatch` to api.ts**

In `apps/mobile/src/services/api.ts`, after `apiPost`:

```ts
export async function apiPatch<T>(
  path: string,
  body: unknown,
  options: Omit<ApiFetchOptions, 'method' | 'body'> = {}
): Promise<T> {
  const response = await apiFetch(path, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return response.json() as Promise<T>;
}
```

- [ ] **Step 2: Extend `services/account.ts`**

Replace the file contents with:

```ts
import { apiDelete, apiGet, apiPatch } from './api';

export interface MeResponse {
  userId: string;
  email: string;
  firebaseUid: string;
  displayName?: string;
  homeCity?: string;
  units: string;
  hrMax?: number;
  hrResting?: number;
  hasStrava: boolean;
}

export interface ProfilePatch {
  displayName?: string;
  homeCity?: string;
  units?: 'metric' | 'imperial';
  hrMax?: number | null;
  hrResting?: number | null;
}

export function getMe(idToken: string | null): Promise<MeResponse> {
  return apiGet<MeResponse>('/v1/me', { idToken });
}

export function patchMe(idToken: string | null, patch: ProfilePatch): Promise<MeResponse> {
  return apiPatch<MeResponse>('/v1/me', patch, { idToken });
}

/** Hard-deletes the caller's Runstamp account. Cascades to every owned row. */
export function deleteAccount(idToken: string | null): Promise<void> {
  return apiDelete('/v1/me', { idToken });
}
```

- [ ] **Step 3: Create `state/useAccount.ts`**

```ts
import { useCallback, useEffect, useState } from 'react';
import { getMe, patchMe, type MeResponse, type ProfilePatch } from '../services/account';
import { useAuth } from './AuthContext';

interface UseAccountState {
  me: MeResponse | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  save: (patch: ProfilePatch) => Promise<void>;
}

export function useAccount(): UseAccountState {
  const { user, getIdToken } = useAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!user) { setMe(null); return; }
    setLoading(true); setError(null);
    try {
      const token = await getIdToken();
      setMe(await getMe(token));
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [user, getIdToken]);

  const save = useCallback(async (patch: ProfilePatch) => {
    const token = await getIdToken();
    const updated = await patchMe(token, patch);
    setMe(updated);
  }, [getIdToken]);

  useEffect(() => { refresh(); }, [refresh]);

  return { me, loading, error, refresh, save };
}
```

- [ ] **Step 4: Add HR profile UI in `SettingsScreen.tsx`**

Open `apps/mobile/src/screens/SettingsScreen.tsx`. Find the Profile section (or the place where displayName / homeCity / units already live). Add two numeric inputs for `hrMax` and `hrResting` with placeholders `190` and `60`.

The pattern (adapt to the existing one in the file):

```tsx
import { useAccount } from '../state/useAccount';
// ...
const { me, save } = useAccount();
const [hrMax, setHrMax] = useState<string>('');
const [hrResting, setHrResting] = useState<string>('');
useEffect(() => {
  if (me) {
    setHrMax(me.hrMax ? String(me.hrMax) : '');
    setHrResting(me.hrResting ? String(me.hrResting) : '');
  }
}, [me]);

async function saveHr() {
  const hr = hrMax === '' ? null : Number(hrMax);
  const re = hrResting === '' ? null : Number(hrResting);
  if (hr !== null && (Number.isNaN(hr) || hr < 120 || hr > 230)) { Alert.alert('HR max must be 120–230'); return; }
  if (re !== null && (Number.isNaN(re) || re < 30 || re > 100)) { Alert.alert('Resting HR must be 30–100'); return; }
  try { await save({ hrMax: hr, hrResting: re }); }
  catch (e) { Alert.alert('Could not save', String(e)); }
}
```

Render (place inside the Profile / Personalisation card area):

```tsx
<SectionHeader title="Heart rate profile" />
<View style={{ gap: 10 }}>
  <LabeledInput
    label="MAX HR (BPM)"
    placeholder="190"
    value={hrMax}
    keyboardType="number-pad"
    onChangeText={setHrMax}
    onBlur={saveHr}
  />
  <LabeledInput
    label="RESTING HR (BPM)"
    placeholder="60"
    value={hrResting}
    keyboardType="number-pad"
    onChangeText={setHrResting}
    onBlur={saveHr}
  />
  <TText style={{ fontSize: 11, color: c.ink3 }}>
    Used to compute training load. Defaults to 190 / 60 if unset.
  </TText>
</View>
```

If `LabeledInput` doesn't already exist in this screen, inline a simple input atom:

```tsx
function LabeledInput({ label, ...rest }: { label: string } & TextInputProps) {
  const c = useColors();
  return (
    <View style={{ gap: 4 }}>
      <Eyebrow style={{ color: c.ink3 }}>{label}</Eyebrow>
      <TextInput
        {...rest}
        style={{
          backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line,
          borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
          fontSize: 16, color: c.ink, fontFamily: 'JetBrainsMono-Regular',
        }}
        placeholderTextColor={c.ink3}
      />
    </View>
  );
}
```

Add imports: `TextInput`, `TextInputProps` from `react-native`, `Alert` from `react-native`, `useEffect`/`useState` from `react`.

- [ ] **Step 5: Wire AnalyticsScreen to real HR profile**

In `apps/mobile/src/screens/AnalyticsScreen.tsx`:

```ts
import { useAccount } from '../state/useAccount';
import { useNavigation } from '@react-navigation/native';
// ...
const { me } = useAccount();
const nav = useNavigation();
const hrMax = me?.hrMax ?? DEFAULT_HR_MAX;
const hrResting = me?.hrResting ?? DEFAULT_HR_RESTING;
const needsHrProfile = !me?.hrMax && !me?.hrResting;
```

Replace `hrMax = DEFAULT_HR_MAX` and `hrResting = DEFAULT_HR_RESTING` (set in Task 11) with the live values. Pass `needsHrProfile` straight to TrainingLoadCard:

```tsx
<TrainingLoadCard
  series={load}
  isHrBased={hrBased}
  needsHrProfile={hrBased && needsHrProfile}
  onTapProfile={() => nav.navigate('Profile' as never)}
/>
```

The `'Profile' as never` cast keeps the existing nav typing happy. If the Settings route is named differently in `nav/types.ts`, use that name instead.

- [ ] **Step 6: Typecheck + tests**

```bash
pnpm -F @runstamp/mobile typecheck && pnpm -F @runstamp/mobile test
```

- [ ] **Step 7: Verify backend gate**

```bash
cd apps/api && go vet ./... && go test ./... && go build ./...
```

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/services/api.ts apps/mobile/src/services/account.ts apps/mobile/src/state/useAccount.ts apps/mobile/src/screens/SettingsScreen.tsx apps/mobile/src/screens/AnalyticsScreen.tsx
git commit -m "feat(analytics): HR profile settings + wire training-load card"
```

---

## Final verification

Once Task 15 is done, run the full gate:

```bash
pnpm api:test && pnpm mobile:test && pnpm -F @runstamp/mobile typecheck && (cd apps/api && go vet ./... && go build ./...)
```

All four must pass before declaring the feature done.

---

## Self-review notes (engineer reference)

- **Spec coverage:** Heatmap (T3,T10,T11), monthly bars (T10,T11), histogram (T7,T10,T11), streaks (T4,T11), training load (T5,T6,T10,T11,T15), month calendar dots (T10,T12), weekly bars (T10,T12), cumulative (T8,T10,T12), filters (T13), compare-mode (T9,T14), HR profile backend (T1) + UX (T15).
- **Out of scope explicitly omitted:** shoe filter (disabled chip in T13), time-in-zone per activity, year-in-review auto card.
- **Type consistency:** `LoadPoint`, `MonthlyPoint`, `HistogramCell`, `HeatmapDay`, `HeatmapGrid`, `Period`, `Filters`, `Zone` exported from their respective helper files. No renames mid-plan.
- **Theme assumption:** `useColors()` returns at least `paper`, `paper2`, `ink`, `ink2`, `ink3`, `line`, `line2`, `accent`. `moss` is added in T10/Step 9 if missing.
- **Nav target name:** `'Profile'` in T15 is a guess; if `nav/types.ts` calls the Settings route `'Settings'`, use that.
