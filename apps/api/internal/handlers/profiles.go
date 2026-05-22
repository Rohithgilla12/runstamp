package handlers

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/stamps"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/users"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ProfilesHandler serves the unauthenticated public profile endpoint at
// GET /v1/profiles/{handle}. The mobile app + the runstamp.app/u/<handle>
// landing page both consume this. Only profiles where profile_public =
// true are visible; anything else returns 404 so we never leak the
// existence of a private profile through a status code difference.
type ProfilesHandler struct {
	Pool   *pgxpool.Pool
	Users  *users.Repo
	Stamps *stamps.Repository
	Log    *slog.Logger
}

type publicProfileResponse struct {
	Handle        string            `json:"handle"`
	DisplayName   string            `json:"displayName,omitempty"`
	Totals        profileTotals     `json:"totals"`
	Stamps        []publicStamp     `json:"stamps"`
	Cities        []publicCity      `json:"cities"`
	YearToDate    *yearToDate       `json:"yearToDate,omitempty"`
	PersonalBests *personalBests    `json:"personalBests,omitempty"`
	Weekly        []weeklyBucket    `json:"weekly,omitempty"`
	Calendar      []calendarDay     `json:"calendar,omitempty"`
	Highlights    *highlights       `json:"highlights,omitempty"`
	Countries     []countryBucket   `json:"countries,omitempty"`
}

type profileTotals struct {
	Runs       int     `json:"runs"`
	DistanceKm float64 `json:"distanceKm"`
	Countries  int     `json:"countries"`
	Cities     int     `json:"cities"`
}

type publicStamp struct {
	StampID  string `json:"stampId"`
	EarnedAt string `json:"earnedAt"`
}

type publicCity struct {
	City    string `json:"city"`
	Country string `json:"country,omitempty"`
	Runs    int    `json:"runs"`
}

type yearToDate struct {
	Year       int     `json:"year"`
	Runs       int     `json:"runs"`
	DistanceKm float64 `json:"distanceKm"`
	ElevationM float64 `json:"elevationM"`
	Cities     int     `json:"cities"`
}

type personalBests struct {
	FiveK    *personalBest `json:"5k"`
	TenK     *personalBest `json:"10k"`
	Half     *personalBest `json:"half"`
	Marathon *personalBest `json:"marathon"`
}

type personalBest struct {
	TimeSeconds int     `json:"timeSeconds"`
	DistanceKm  float64 `json:"distanceKm"`
	Date        string  `json:"date"`
	City        string  `json:"city,omitempty"`
}

type weeklyBucket struct {
	WeekStart  string  `json:"weekStart"`
	DistanceKm float64 `json:"distanceKm"`
	Runs       int     `json:"runs"`
}

type calendarDay struct {
	Date       string  `json:"date"`
	DistanceKm float64 `json:"distanceKm"`
	Runs       int     `json:"runs"`
}

type highlights struct {
	LongestRun   *highlightRun  `json:"longestRun"`
	FastestPace  *highlightPace `json:"fastestPace"`
	BiggestWeek  *highlightWeek `json:"biggestWeek"`
	HighestClimb *highlightRun  `json:"highestClimb"`
}

type highlightRun struct {
	DistanceKm float64 `json:"distanceKm,omitempty"`
	ElevationM float64 `json:"elevationM,omitempty"`
	Date       string  `json:"date"`
	City       string  `json:"city,omitempty"`
}

type highlightPace struct {
	PaceSecondsPerKm int     `json:"paceSecondsPerKm"`
	DistanceKm       float64 `json:"distanceKm"`
	Date             string  `json:"date"`
	City             string  `json:"city,omitempty"`
}

type highlightWeek struct {
	WeekStart  string  `json:"weekStart"`
	DistanceKm float64 `json:"distanceKm"`
	Runs       int     `json:"runs"`
}

type countryBucket struct {
	Country    string  `json:"country"`
	DistanceKm float64 `json:"distanceKm"`
	Runs       int     `json:"runs"`
}

// Get serves /v1/profiles/{handle}. No auth; the gate is profile_public.
// Permissive CORS — this endpoint serves data the user has explicitly
// opted to publish, so any origin can fetch it (runstamp.app/u/<handle>,
// embeds, third-party tools). Other endpoints stay restricted to the
// AllowedOrigins config.
func (h *ProfilesHandler) Get(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Cache-Control", "public, max-age=60, s-maxage=300")
	handle := chi.URLParam(r, "handle")
	if handle == "" {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	user, err := h.Users.FindPublicByHandle(r.Context(), handle)
	if err != nil {
		h.Log.Error("profiles get: lookup", "err", err, "handle", handle)
		writeError(w, http.StatusInternalServerError, "lookup failed")
		return
	}
	if user == nil {
		// 404 covers both "no such handle" and "handle exists but private."
		// Don't leak the difference.
		writeError(w, http.StatusNotFound, "not found")
		return
	}

	ctx := r.Context()

	earned, err := h.Stamps.ListEarnedForUser(ctx, user.ID)
	if err != nil {
		h.Log.Warn("profiles get: stamps", "err", err)
		earned = nil
	}
	totals, cities, err := loadPublicAggregates(ctx, h.Pool, user.ID)
	if err != nil {
		h.Log.Warn("profiles get: aggregates", "err", err)
	}

	resp := publicProfileResponse{
		Handle: *user.Handle,
		Totals: totals,
		Cities: cities,
	}
	if user.DisplayName != nil {
		resp.DisplayName = *user.DisplayName
	}
	resp.Stamps = make([]publicStamp, 0, len(earned))
	for _, e := range earned {
		resp.Stamps = append(resp.Stamps, publicStamp{
			StampID:  e.StampID,
			EarnedAt: e.EarnedAt.UTC().Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	// New analytics sections. Each loads independently; a failure logs and
	// leaves its field empty so the rest of the response still ships.
	year := time.Now().UTC().Year()
	if ytd, err := loadYearToDate(ctx, h.Pool, user.ID, year); err != nil {
		h.Log.Warn("profiles get: ytd", "err", err)
	} else {
		resp.YearToDate = ytd
	}
	if pbs, err := loadPersonalBests(ctx, h.Pool, user.ID); err != nil {
		h.Log.Warn("profiles get: pbs", "err", err)
	} else {
		resp.PersonalBests = pbs
	}
	if weekly, err := loadWeekly(ctx, h.Pool, user.ID); err != nil {
		h.Log.Warn("profiles get: weekly", "err", err)
	} else {
		resp.Weekly = weekly
	}
	if cal, err := loadCalendarDays(ctx, h.Pool, user.ID); err != nil {
		h.Log.Warn("profiles get: calendar", "err", err)
	} else {
		resp.Calendar = cal
	}
	if hl, err := loadHighlights(ctx, h.Pool, user.ID); err != nil {
		h.Log.Warn("profiles get: highlights", "err", err)
	} else {
		resp.Highlights = hl
	}
	if countries, err := loadCountries(ctx, h.Pool, user.ID); err != nil {
		h.Log.Warn("profiles get: countries", "err", err)
	} else {
		resp.Countries = countries
	}

	writeJSON(w, http.StatusOK, resp)
}

// loadPublicAggregates pulls the cheap roll-ups that drive the headline
// metrics. Single query that does totals + city counts; SQL handles the
// dupe_of filter so we never double-count cross-source duplicates.
func loadPublicAggregates(ctx context.Context, pool *pgxpool.Pool, userID string) (profileTotals, []publicCity, error) {
	var t profileTotals
	err := pool.QueryRow(ctx, `
		SELECT
			COUNT(*),
			COALESCE(SUM(distance_m), 0) / 1000.0,
			COUNT(DISTINCT NULLIF(location_country, '')),
			COUNT(DISTINCT NULLIF(location_city, ''))
		FROM activities
		WHERE user_id = $1 AND dupe_of IS NULL
	`, userID).Scan(&t.Runs, &t.DistanceKm, &t.Countries, &t.Cities)
	if err != nil {
		return t, nil, err
	}

	rows, err := pool.Query(ctx, `
		SELECT location_city, COALESCE(MAX(location_country), ''), COUNT(*) AS runs
		FROM activities
		WHERE user_id = $1 AND dupe_of IS NULL AND location_city IS NOT NULL AND location_city <> ''
		GROUP BY location_city
		ORDER BY runs DESC, location_city ASC
		LIMIT 200
	`, userID)
	if err != nil {
		return t, nil, err
	}
	defer rows.Close()
	cities := make([]publicCity, 0)
	for rows.Next() {
		var c publicCity
		if err := rows.Scan(&c.City, &c.Country, &c.Runs); err != nil {
			return t, nil, err
		}
		cities = append(cities, c)
	}
	return t, cities, rows.Err()
}

// loadYearToDate sums everything since Jan 1 of the given year.
func loadYearToDate(ctx context.Context, pool *pgxpool.Pool, userID string, year int) (*yearToDate, error) {
	ytd := &yearToDate{Year: year}
	err := pool.QueryRow(ctx, `
		SELECT
			COUNT(*),
			COALESCE(SUM(distance_m), 0) / 1000.0,
			COALESCE(SUM(elevation_gain_m), 0),
			COUNT(DISTINCT NULLIF(location_city, ''))
		FROM activities
		WHERE user_id = $1 AND dupe_of IS NULL
		  AND started_at >= make_date($2::int, 1, 1)
	`, userID, year).Scan(&ytd.Runs, &ytd.DistanceKm, &ytd.ElevationM, &ytd.Cities)
	if err != nil {
		return nil, err
	}
	return ytd, nil
}

// pbDistanceWindow defines what counts as a 5K / 10K / HM / Marathon PB.
// ±5% of the canonical distance; pace bucketing by raw distance_m, not
// the noisier avg_pace_s_per_km.
var pbDistanceWindow = []struct {
	key     string
	lowerM  float64
	upperM  float64
}{
	{"5k", 4750, 5250},
	{"10k", 9500, 10500},
	{"half", 20543.05, 22706.05},  // 21097 m ± 5%
	{"marathon", 40087.6, 44307.6}, // 42195 m ± 5%
}

// loadPersonalBests picks the fastest full run in each distance window.
// Returns the struct with nil entries where no qualifying run exists.
func loadPersonalBests(ctx context.Context, pool *pgxpool.Pool, userID string) (*personalBests, error) {
	pbs := &personalBests{}
	for _, w := range pbDistanceWindow {
		pb, err := loadOnePB(ctx, pool, userID, w.lowerM, w.upperM)
		if err != nil {
			return nil, err
		}
		switch w.key {
		case "5k":
			pbs.FiveK = pb
		case "10k":
			pbs.TenK = pb
		case "half":
			pbs.Half = pb
		case "marathon":
			pbs.Marathon = pb
		}
	}
	return pbs, nil
}

func loadOnePB(ctx context.Context, pool *pgxpool.Pool, userID string, lowerM, upperM float64) (*personalBest, error) {
	var (
		elapsed  int
		distance float64
		started  time.Time
		city     *string
	)
	err := pool.QueryRow(ctx, `
		SELECT elapsed_seconds, distance_m, started_at, location_city
		FROM activities
		WHERE user_id = $1 AND dupe_of IS NULL
		  AND distance_m BETWEEN $2 AND $3
		  AND elapsed_seconds > 0
		ORDER BY elapsed_seconds ASC
		LIMIT 1
	`, userID, lowerM, upperM).Scan(&elapsed, &distance, &started, &city)
	if err != nil {
		// pgx returns ErrNoRows when there's no qualifying run; that's not
		// an error condition — it's "no PB at this distance yet."
		if isNoRows(err) {
			return nil, nil
		}
		return nil, err
	}
	pb := &personalBest{
		TimeSeconds: elapsed,
		DistanceKm:  distance / 1000.0,
		Date:        started.UTC().Format("2006-01-02"),
	}
	if city != nil {
		pb.City = *city
	}
	return pb, nil
}

// loadWeekly returns the most recent 26 ISO weeks (oldest first), padded
// with zero-km entries for weeks where the user didn't run.
func loadWeekly(ctx context.Context, pool *pgxpool.Pool, userID string) ([]weeklyBucket, error) {
	rows, err := pool.Query(ctx, `
		SELECT
			date_trunc('week', started_at AT TIME ZONE 'UTC')::date AS week_start,
			COALESCE(SUM(distance_m), 0) / 1000.0 AS km,
			COUNT(*) AS runs
		FROM activities
		WHERE user_id = $1 AND dupe_of IS NULL
		  AND started_at >= (date_trunc('week', now() AT TIME ZONE 'UTC') - interval '25 weeks')
		GROUP BY week_start
		ORDER BY week_start ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	sparse := make([]weeklyBucket, 0, 26)
	for rows.Next() {
		var (
			ws  time.Time
			km  float64
			run int
		)
		if err := rows.Scan(&ws, &km, &run); err != nil {
			return nil, err
		}
		sparse = append(sparse, weeklyBucket{
			WeekStart:  ws.UTC().Format("2006-01-02"),
			DistanceKm: km,
			Runs:       run,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return fillZeroWeeks(sparse, time.Now().UTC(), 26), nil
}

// fillZeroWeeks expands a sparse list of weekly buckets into a dense
// window of `count` weeks ending with the ISO week containing `now`.
// Pure function — extracted so it's unit-testable without a database.
func fillZeroWeeks(sparse []weeklyBucket, now time.Time, count int) []weeklyBucket {
	end := isoWeekStart(now)
	out := make([]weeklyBucket, count)
	byKey := make(map[string]weeklyBucket, len(sparse))
	for _, w := range sparse {
		byKey[w.WeekStart] = w
	}
	for i := range count {
		// i = 0 → oldest week; i = count-1 → current week.
		offset := count - 1 - i
		week := end.AddDate(0, 0, -7*offset)
		key := week.Format("2006-01-02")
		if existing, ok := byKey[key]; ok {
			out[i] = existing
		} else {
			out[i] = weeklyBucket{WeekStart: key}
		}
	}
	return out
}

// isoWeekStart returns the Monday 00:00 UTC of the ISO week containing t.
func isoWeekStart(t time.Time) time.Time {
	t = t.UTC()
	// time.Weekday: Sunday=0, Monday=1, ..., Saturday=6.
	// ISO weeks start Monday; shift Sunday (0) to be 7 so subtraction works.
	wd := int(t.Weekday())
	if wd == 0 {
		wd = 7
	}
	start := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
	return start.AddDate(0, 0, -(wd - 1))
}

// loadCalendarDays returns one row per day the user ran in the last 365
// days. Sparse — empty days are filled in client-side.
func loadCalendarDays(ctx context.Context, pool *pgxpool.Pool, userID string) ([]calendarDay, error) {
	rows, err := pool.Query(ctx, `
		SELECT
			date_trunc('day', started_at AT TIME ZONE 'UTC')::date AS d,
			COALESCE(SUM(distance_m), 0) / 1000.0 AS km,
			COUNT(*) AS runs
		FROM activities
		WHERE user_id = $1 AND dupe_of IS NULL
		  AND started_at >= now() - interval '365 days'
		GROUP BY d
		ORDER BY d ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]calendarDay, 0)
	for rows.Next() {
		var (
			d   time.Time
			km  float64
			run int
		)
		if err := rows.Scan(&d, &km, &run); err != nil {
			return nil, err
		}
		out = append(out, calendarDay{
			Date:       d.UTC().Format("2006-01-02"),
			DistanceKm: km,
			Runs:       run,
		})
	}
	return out, rows.Err()
}

// loadHighlights surfaces the runner's "from the album" lines: longest
// run, fastest pace (with 4 km minimum to exclude sprint outliers),
// biggest week, highest single-run climb.
func loadHighlights(ctx context.Context, pool *pgxpool.Pool, userID string) (*highlights, error) {
	h := &highlights{}

	// Longest run.
	{
		var (
			dm      float64
			started time.Time
			city    *string
		)
		err := pool.QueryRow(ctx, `
			SELECT distance_m, started_at, location_city
			FROM activities
			WHERE user_id = $1 AND dupe_of IS NULL
			ORDER BY distance_m DESC
			LIMIT 1
		`, userID).Scan(&dm, &started, &city)
		if err == nil {
			r := &highlightRun{
				DistanceKm: dm / 1000.0,
				Date:       started.UTC().Format("2006-01-02"),
			}
			if city != nil {
				r.City = *city
			}
			h.LongestRun = r
		} else if !isNoRows(err) {
			return nil, err
		}
	}

	// Fastest pace — only runs >= 4 km qualify, so a 500m all-out doesn't win.
	{
		var (
			pace    float64
			dm      float64
			started time.Time
			city    *string
		)
		err := pool.QueryRow(ctx, `
			SELECT
				CASE WHEN moving_seconds > 0 THEN moving_seconds::float / (distance_m / 1000.0)
				     ELSE elapsed_seconds::float / (distance_m / 1000.0) END AS pace_s_per_km,
				distance_m, started_at, location_city
			FROM activities
			WHERE user_id = $1 AND dupe_of IS NULL
			  AND distance_m >= 4000
			  AND elapsed_seconds > 0
			ORDER BY pace_s_per_km ASC
			LIMIT 1
		`, userID).Scan(&pace, &dm, &started, &city)
		if err == nil {
			p := &highlightPace{
				PaceSecondsPerKm: int(pace + 0.5),
				DistanceKm:       dm / 1000.0,
				Date:             started.UTC().Format("2006-01-02"),
			}
			if city != nil {
				p.City = *city
			}
			h.FastestPace = p
		} else if !isNoRows(err) {
			return nil, err
		}
	}

	// Biggest week — by total distance summed over an ISO week.
	{
		var (
			ws  time.Time
			km  float64
			run int
		)
		err := pool.QueryRow(ctx, `
			SELECT
				date_trunc('week', started_at AT TIME ZONE 'UTC')::date AS week_start,
				COALESCE(SUM(distance_m), 0) / 1000.0 AS km,
				COUNT(*) AS runs
			FROM activities
			WHERE user_id = $1 AND dupe_of IS NULL
			GROUP BY week_start
			ORDER BY km DESC
			LIMIT 1
		`, userID).Scan(&ws, &km, &run)
		if err == nil && run > 0 {
			h.BiggestWeek = &highlightWeek{
				WeekStart:  ws.UTC().Format("2006-01-02"),
				DistanceKm: km,
				Runs:       run,
			}
		} else if err != nil && !isNoRows(err) {
			return nil, err
		}
	}

	// Highest climb in a single run.
	{
		var (
			elev    float64
			started time.Time
			city    *string
		)
		err := pool.QueryRow(ctx, `
			SELECT elevation_gain_m, started_at, location_city
			FROM activities
			WHERE user_id = $1 AND dupe_of IS NULL
			  AND elevation_gain_m IS NOT NULL
			  AND elevation_gain_m > 0
			ORDER BY elevation_gain_m DESC
			LIMIT 1
		`, userID).Scan(&elev, &started, &city)
		if err == nil {
			r := &highlightRun{
				ElevationM: elev,
				Date:       started.UTC().Format("2006-01-02"),
			}
			if city != nil {
				r.City = *city
			}
			h.HighestClimb = r
		} else if !isNoRows(err) {
			return nil, err
		}
	}

	return h, nil
}

// loadCountries returns the top 10 countries by total distance.
func loadCountries(ctx context.Context, pool *pgxpool.Pool, userID string) ([]countryBucket, error) {
	rows, err := pool.Query(ctx, `
		SELECT
			location_country,
			COALESCE(SUM(distance_m), 0) / 1000.0 AS km,
			COUNT(*) AS runs
		FROM activities
		WHERE user_id = $1 AND dupe_of IS NULL
		  AND location_country IS NOT NULL AND location_country <> ''
		GROUP BY location_country
		ORDER BY km DESC
		LIMIT 10
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]countryBucket, 0)
	for rows.Next() {
		var c countryBucket
		if err := rows.Scan(&c.Country, &c.DistanceKm, &c.Runs); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func isNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}
