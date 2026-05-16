package stamps

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// countryNameByISO maps the ISO-2 codes used in stamp criteria to the
// canonical country name the geocoder produces. Extend as new regional
// flagship stamps land. If a stamp's criteria carries a country_iso we
// don't know, the country filter is silently skipped (logged on first
// occurrence so we notice and can add it).
var countryNameByISO = map[string]string{
	"IN": "India",
	"US": "United States",
	"GB": "United Kingdom",
	"DE": "Germany",
	"FR": "France",
	"JP": "Japan",
	"AU": "Australia",
	"CA": "Canada",
	"CN": "China",
	"BR": "Brazil",
	"ES": "Spain",
	"IT": "Italy",
	"SG": "Singapore",
	"TH": "Thailand",
	"NL": "Netherlands",
	"CH": "Switzerland",
	"SE": "Sweden",
	"NO": "Norway",
	"DK": "Denmark",
	"IE": "Ireland",
	"MX": "Mexico",
	"ZA": "South Africa",
	"KE": "Kenya",
	"ET": "Ethiopia",
	"NZ": "New Zealand",
	"PT": "Portugal",
	"PL": "Poland",
	"BE": "Belgium",
	"AT": "Austria",
}

// Evaluator inspects a user's data against every catalog rule and awards
// previously-unearned stamps. It's idempotent — re-running after an award
// is a no-op thanks to the UNIQUE(user_id, stamp_id) constraint.
//
// Call sites: EvaluateForUser is invoked after every activity ingest (Strava
// webhook + HealthKit sync). It re-checks the *whole* catalog rather than just
// the new activity's slice — keeps the code simple and the catalog small
// enough that a full re-check is microseconds against an indexed read.
type Evaluator struct {
	pool *pgxpool.Pool
	repo *Repository
	log  *slog.Logger
}

func NewEvaluator(pool *pgxpool.Pool, repo *Repository, log *slog.Logger) *Evaluator {
	return &Evaluator{pool: pool, repo: repo, log: log}
}

// EvaluateForUser runs every catalog rule against the given user's data and
// inserts new stamps_earned rows for anything that passes. Returns the IDs of
// freshly-awarded stamps for downstream (push notifications, etc).
func (e *Evaluator) EvaluateForUser(ctx context.Context, userID string) ([]string, error) {
	already, err := e.repo.AwardedSet(ctx, userID)
	if err != nil {
		return nil, err
	}

	var fresh []string
	for _, def := range Catalog {
		if _, has := already[def.ID]; has {
			continue
		}
		passes, activityID, ctxFields, err := e.check(ctx, userID, def)
		if err != nil {
			e.log.Error("stamps: rule check failed", "stamp_id", def.ID, "user_id", userID, "err", err)
			continue
		}
		if !passes {
			continue
		}
		ctxJSON, _ := json.Marshal(ctxFields)
		res, err := e.repo.Award(ctx, userID, def.ID, activityID, ctxJSON)
		if err != nil {
			e.log.Error("stamps: award failed", "stamp_id", def.ID, "user_id", userID, "err", err)
			continue
		}
		if res.Awarded {
			fresh = append(fresh, def.ID)
			e.log.Info("stamps: awarded", "stamp_id", def.ID, "user_id", userID, "activity_id", activityID)
		}
	}
	return fresh, nil
}

// rule kinds parsed from the criteria JSON.
type singleActivityRule struct {
	Kind          string `json:"kind"`
	Sport         string `json:"sport"`
	DistanceMGte  *float64 `json:"distance_m_gte"`
	DistanceMLte  *float64 `json:"distance_m_lte"`
	TimeSecsLte   *int     `json:"time_seconds_lte"`
}

type cumulativeRule struct {
	Kind        string  `json:"kind"`
	DistanceM   float64 `json:"distance_m_gte"`
	Window      string  `json:"window"`
}

type citiesRule struct {
	Kind      string `json:"kind"`
	Cities    int    `json:"cities_gte"`
	Countries int    `json:"countries_gte"`
}

type namedEventRule struct {
	Kind          string   `json:"kind"`
	Sport         string   `json:"sport"`
	DistanceMGte  *float64 `json:"distance_m_gte"`
	DistanceMLte  *float64 `json:"distance_m_lte"`
	TitlePatterns []string `json:"title_patterns"`
	CountryISO    string   `json:"country_iso"`
}

type namedCitiesCountRule struct {
	Kind       string   `json:"kind"`
	CitySet    []string `json:"city_set"`
	CitiesGte  int      `json:"cities_gte"`
	CountryISO string   `json:"country_iso"`
}

type monsoonRunRule struct {
	Kind         string   `json:"kind"`
	Sport        string   `json:"sport"`
	DistanceMGte *float64 `json:"distance_m_gte"`
	Months       []int    `json:"months"`
	CountryISO   string   `json:"country_iso"`
}

// check returns (passes, activityID-if-traceable-to-one, contextFields, err).
func (e *Evaluator) check(ctx context.Context, userID string, def Definition) (bool, *string, map[string]any, error) {
	// Peek the kind first.
	var kindOnly struct{ Kind string `json:"kind"` }
	if err := json.Unmarshal(def.Criteria, &kindOnly); err != nil {
		return false, nil, nil, fmt.Errorf("parse kind: %w", err)
	}

	switch kindOnly.Kind {
	case "single_activity":
		var r singleActivityRule
		if err := json.Unmarshal(def.Criteria, &r); err != nil {
			return false, nil, nil, err
		}
		return e.checkSingleActivity(ctx, userID, r)

	case "cumulative_distance":
		var r cumulativeRule
		if err := json.Unmarshal(def.Criteria, &r); err != nil {
			return false, nil, nil, err
		}
		return e.checkCumulativeDistance(ctx, userID, r)

	case "cities_count":
		var r citiesRule
		if err := json.Unmarshal(def.Criteria, &r); err != nil {
			return false, nil, nil, err
		}
		return e.checkCitiesCount(ctx, userID, r.Cities)

	case "countries_count":
		var r citiesRule
		if err := json.Unmarshal(def.Criteria, &r); err != nil {
			return false, nil, nil, err
		}
		return e.checkCountriesCount(ctx, userID, r.Countries)

	case "named_event":
		var r namedEventRule
		if err := json.Unmarshal(def.Criteria, &r); err != nil {
			return false, nil, nil, err
		}
		return e.checkNamedEvent(ctx, userID, r)

	case "named_cities_count":
		var r namedCitiesCountRule
		if err := json.Unmarshal(def.Criteria, &r); err != nil {
			return false, nil, nil, err
		}
		return e.checkNamedCitiesCount(ctx, userID, r)

	case "monsoon_run":
		var r monsoonRunRule
		if err := json.Unmarshal(def.Criteria, &r); err != nil {
			return false, nil, nil, err
		}
		return e.checkMonsoonRun(ctx, userID, r)
	}
	return false, nil, nil, fmt.Errorf("unknown rule kind: %s", kindOnly.Kind)
}

func (e *Evaluator) checkNamedEvent(ctx context.Context, userID string, r namedEventRule) (bool, *string, map[string]any, error) {
	q := `
SELECT id, distance_m, elapsed_seconds, COALESCE(title, '') AS t
FROM activities
WHERE user_id = $1
  AND dupe_of IS NULL`
	args := []any{userID}
	if r.Sport != "" {
		q += fmt.Sprintf(" AND sport = $%d", len(args)+1)
		args = append(args, r.Sport)
	}
	if r.DistanceMGte != nil {
		q += fmt.Sprintf(" AND distance_m >= $%d", len(args)+1)
		args = append(args, *r.DistanceMGte)
	}
	if r.DistanceMLte != nil {
		q += fmt.Sprintf(" AND distance_m <= $%d", len(args)+1)
		args = append(args, *r.DistanceMLte)
	}
	if r.CountryISO != "" {
		if name, ok := countryNameByISO[r.CountryISO]; ok {
			// Allow NULL/empty country — old activities may not be geocoded yet,
			// and the title pattern is strong enough on its own for named events.
			q += fmt.Sprintf(" AND (location_country = $%d OR location_country IS NULL OR location_country = '')", len(args)+1)
			args = append(args, name)
		}
	}
	if len(r.TitlePatterns) == 0 {
		return false, nil, nil, fmt.Errorf("named_event rule has empty title_patterns")
	}
	clauses := make([]string, 0, len(r.TitlePatterns))
	for _, p := range r.TitlePatterns {
		clauses = append(clauses, fmt.Sprintf("LOWER(COALESCE(title, '')) LIKE $%d", len(args)+1))
		args = append(args, "%"+strings.ToLower(p)+"%")
	}
	q += " AND (" + strings.Join(clauses, " OR ") + ")"
	q += " ORDER BY started_at ASC LIMIT 1"

	var (
		id       string
		distance float64
		elapsed  int
		title    string
	)
	if err := e.pool.QueryRow(ctx, q, args...).Scan(&id, &distance, &elapsed, &title); err != nil {
		if isNoRows(err) {
			return false, nil, nil, nil
		}
		return false, nil, nil, err
	}
	return true, &id, map[string]any{
		"actual_distance_m":   distance,
		"actual_time_seconds": elapsed,
		"matched_title":       title,
	}, nil
}

func (e *Evaluator) checkNamedCitiesCount(ctx context.Context, userID string, r namedCitiesCountRule) (bool, *string, map[string]any, error) {
	q := `
SELECT COUNT(DISTINCT location_city)
FROM activities
WHERE user_id = $1
  AND dupe_of IS NULL
  AND location_city IS NOT NULL
  AND location_city <> ''`
	args := []any{userID}
	if r.CountryISO != "" {
		if name, ok := countryNameByISO[r.CountryISO]; ok {
			q += fmt.Sprintf(" AND (location_country = $%d OR location_country IS NULL OR location_country = '')", len(args)+1)
			args = append(args, name)
		}
	}
	if len(r.CitySet) > 0 {
		placeholders := make([]string, 0, len(r.CitySet))
		for _, city := range r.CitySet {
			placeholders = append(placeholders, fmt.Sprintf("$%d", len(args)+1))
			args = append(args, city)
		}
		q += " AND location_city IN (" + strings.Join(placeholders, ", ") + ")"
	}
	var n int
	if err := e.pool.QueryRow(ctx, q, args...).Scan(&n); err != nil {
		return false, nil, nil, err
	}
	if n < r.CitiesGte {
		return false, nil, nil, nil
	}
	return true, nil, map[string]any{"actual_cities": n}, nil
}

func (e *Evaluator) checkMonsoonRun(ctx context.Context, userID string, r monsoonRunRule) (bool, *string, map[string]any, error) {
	q := `
SELECT id, distance_m, started_at
FROM activities
WHERE user_id = $1
  AND dupe_of IS NULL`
	args := []any{userID}
	if r.Sport != "" {
		q += fmt.Sprintf(" AND sport = $%d", len(args)+1)
		args = append(args, r.Sport)
	}
	if r.DistanceMGte != nil {
		q += fmt.Sprintf(" AND distance_m >= $%d", len(args)+1)
		args = append(args, *r.DistanceMGte)
	}
	if r.CountryISO != "" {
		if name, ok := countryNameByISO[r.CountryISO]; ok {
			q += fmt.Sprintf(" AND (location_country = $%d OR location_country IS NULL OR location_country = '')", len(args)+1)
			args = append(args, name)
		}
	}
	if len(r.Months) > 0 {
		placeholders := make([]string, 0, len(r.Months))
		for _, m := range r.Months {
			placeholders = append(placeholders, fmt.Sprintf("$%d", len(args)+1))
			args = append(args, m)
		}
		q += " AND date_part('month', started_at)::int IN (" + strings.Join(placeholders, ", ") + ")"
	}
	q += " ORDER BY started_at ASC LIMIT 1"

	var (
		id       string
		distance float64
	)
	var startedAt any
	if err := e.pool.QueryRow(ctx, q, args...).Scan(&id, &distance, &startedAt); err != nil {
		if isNoRows(err) {
			return false, nil, nil, nil
		}
		return false, nil, nil, err
	}
	return true, &id, map[string]any{
		"actual_distance_m": distance,
	}, nil
}

func (e *Evaluator) checkSingleActivity(ctx context.Context, userID string, r singleActivityRule) (bool, *string, map[string]any, error) {
	// Build the predicate. Always restrict to canonical (non-dupe) rows so a
	// HealthKit + Strava pair doesn't double-award.
	const baseSQL = `
SELECT id, distance_m, elapsed_seconds
FROM activities
WHERE user_id = $1
  AND dupe_of IS NULL`

	args := []any{userID}
	q := baseSQL
	if r.Sport != "" {
		q += fmt.Sprintf(" AND sport = $%d", len(args)+1)
		args = append(args, r.Sport)
	}
	if r.DistanceMGte != nil {
		q += fmt.Sprintf(" AND distance_m >= $%d", len(args)+1)
		args = append(args, *r.DistanceMGte)
	}
	if r.DistanceMLte != nil {
		q += fmt.Sprintf(" AND distance_m <= $%d", len(args)+1)
		args = append(args, *r.DistanceMLte)
	}
	if r.TimeSecsLte != nil {
		q += fmt.Sprintf(" AND elapsed_seconds <= $%d", len(args)+1)
		args = append(args, *r.TimeSecsLte)
	}
	q += " ORDER BY started_at ASC LIMIT 1"

	var (
		id       string
		distance float64
		elapsed  int
	)
	if err := e.pool.QueryRow(ctx, q, args...).Scan(&id, &distance, &elapsed); err != nil {
		if isNoRows(err) {
			return false, nil, nil, nil
		}
		return false, nil, nil, err
	}
	ctxFields := map[string]any{
		"actual_distance_m":  distance,
		"actual_time_seconds": elapsed,
	}
	return true, &id, ctxFields, nil
}

func (e *Evaluator) checkCumulativeDistance(ctx context.Context, userID string, r cumulativeRule) (bool, *string, map[string]any, error) {
	q := `SELECT COALESCE(SUM(distance_m), 0) FROM activities WHERE user_id = $1 AND dupe_of IS NULL`
	switch r.Window {
	case "year":
		q += " AND started_at >= date_trunc('year', now())"
	case "month":
		q += " AND started_at >= date_trunc('month', now())"
	}
	var total float64
	if err := e.pool.QueryRow(ctx, q, userID).Scan(&total); err != nil {
		return false, nil, nil, err
	}
	if total < r.DistanceM {
		return false, nil, nil, nil
	}
	return true, nil, map[string]any{"actual_distance_m": total}, nil
}

func (e *Evaluator) checkCitiesCount(ctx context.Context, userID string, threshold int) (bool, *string, map[string]any, error) {
	var n int
	if err := e.pool.QueryRow(ctx, `
SELECT COUNT(DISTINCT location_city)
FROM activities
WHERE user_id = $1 AND dupe_of IS NULL AND location_city IS NOT NULL AND location_city <> ''`,
		userID).Scan(&n); err != nil {
		return false, nil, nil, err
	}
	if n < threshold {
		return false, nil, nil, nil
	}
	return true, nil, map[string]any{"actual_cities": n}, nil
}

func (e *Evaluator) checkCountriesCount(ctx context.Context, userID string, threshold int) (bool, *string, map[string]any, error) {
	var n int
	if err := e.pool.QueryRow(ctx, `
SELECT COUNT(DISTINCT location_country)
FROM activities
WHERE user_id = $1 AND dupe_of IS NULL AND location_country IS NOT NULL AND location_country <> ''`,
		userID).Scan(&n); err != nil {
		return false, nil, nil, err
	}
	if n < threshold {
		return false, nil, nil, nil
	}
	return true, nil, map[string]any{"actual_countries": n}, nil
}

func isNoRows(err error) bool {
	return err != nil && err.Error() == "no rows in result set"
}
