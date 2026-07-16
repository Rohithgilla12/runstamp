package handlers

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"sort"
	"strconv"
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
	Handle          string            `json:"handle"`
	DisplayName     string            `json:"displayName,omitempty"`
	Totals          profileTotals     `json:"totals"`
	Stamps          []publicStamp     `json:"stamps"`
	Cities          []publicCity      `json:"cities"`
	YearToDate      *yearToDate       `json:"yearToDate,omitempty"`
	PersonalBests   *personalBests    `json:"personalBests,omitempty"`
	Weekly          []weeklyBucket    `json:"weekly,omitempty"`
	Calendar        []calendarDay     `json:"calendar,omitempty"`
	Highlights      *highlights       `json:"highlights,omitempty"`
	Countries       []countryBucket   `json:"countries,omitempty"`
	HeartRateZones  []int             `json:"heartRateZones,omitempty"`
	MaxHR           int               `json:"maxHR,omitempty"`
	RunLocations    [][2]float64      `json:"runLocations,omitempty"`
	YearlyHR        []yearlyHRBucket  `json:"yearlyHR,omitempty"`
	RecentRuns      []publicActivity  `json:"recentRuns,omitempty"`
	LongestRuns     []longestRun      `json:"longestRuns,omitempty"`
	AvailableYears  []int             `json:"availableYears"`
	TimeOfDay       []int             `json:"timeOfDay,omitempty"`
	DistanceBuckets []int             `json:"distanceBuckets,omitempty"`
	PaceBuckets     []int             `json:"paceBuckets,omitempty"`
	Dynamics        *advancedDynamics `json:"dynamics,omitempty"`
	DebugError      string            `json:"debugError,omitempty"`
}

type advancedDynamics struct {
	CadenceSPM            float64 `json:"cadenceSpm,omitempty"`
	RunningPowerW         float64 `json:"runningPowerW,omitempty"`
	VO2Max                float64 `json:"vo2Max,omitempty"`
	StrideLengthM         float64 `json:"strideLengthM,omitempty"`
	VerticalOscillationCm float64 `json:"verticalOscillationCm,omitempty"`
	GroundContactMs       float64 `json:"groundContactMs,omitempty"`
}

type yearlyHRBucket struct {
	Year  int `json:"year"`
	AvgHR int `json:"avgHR"`
	Runs  int `json:"runs"`
}

type publicActivity struct {
	Title      string  `json:"title"`
	DistanceKm float64 `json:"distanceKm"`
	Pace       int     `json:"pace"`
	Date       string  `json:"date"`
}

type longestRun struct {
	Title      string  `json:"title"`
	DistanceKm float64 `json:"distanceKm"`
	City       string  `json:"city,omitempty"`
	Date       string  `json:"date"`
}

type profileTotals struct {
	Runs          int     `json:"runs"`
	DistanceKm    float64 `json:"distanceKm"`
	Countries     int     `json:"countries"`
	Cities        int     `json:"cities"`
	ElevationM    float64 `json:"elevationM"`
	DurationHours int     `json:"durationHours"`
	Calories      int     `json:"calories"`
}

type publicStamp struct {
	StampID  string `json:"stampId"`
	EarnedAt string `json:"earnedAt"`
	Name     string `json:"name,omitempty"`
	Tier     string `json:"tier,omitempty"`
}

// toPublicStamps maps earned rows to the API shape, enriching each with the
// catalogue name + tier. Unknown ids keep their id with blank name/tier.
func toPublicStamps(earned []stamps.Earned) []publicStamp {
	out := make([]publicStamp, 0, len(earned))
	for _, e := range earned {
		ps := publicStamp{
			StampID:  e.StampID,
			EarnedAt: e.EarnedAt.UTC().Format("2006-01-02T15:04:05Z07:00"),
		}
		if def, ok := stamps.Lookup(e.StampID); ok {
			ps.Name = def.Name
			ps.Tier = def.Tier
		}
		out = append(out, ps)
	}
	return out
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

	reqYear := 0
	if yStr := r.URL.Query().Get("year"); yStr != "" {
		reqYear, _ = strconv.Atoi(yStr)
	}

	earned, err := h.Stamps.ListEarnedForUser(ctx, user.ID)
	if err != nil {
		h.Log.Warn("profiles get: stamps", "err", err)
		earned = nil
	}
	totals, cities, err := loadPublicAggregates(ctx, h.Pool, user.ID, reqYear)
	if err != nil {
		h.Log.Error("profiles get: aggregates", "err", err, "handle", handle, "userID", user.ID)
		writeError(w, http.StatusInternalServerError, "lookup failed")
		return
	}

	var debugErrStr string
	availableYears, err := loadAvailableYears(ctx, h.Pool, user.ID)
	if err != nil {
		h.Log.Error("profiles get: loadAvailableYears failed", "err", err, "userID", user.ID)
		debugErrStr = err.Error()
	}

	resp := publicProfileResponse{
		Handle:         *user.Handle,
		Totals:         totals,
		Cities:         cities,
		AvailableYears: availableYears,
		DebugError:     debugErrStr,
	}

	maxHR := 190
	if user.HRMax != nil {
		maxHR = *user.HRMax
	} else if user.BirthYear != nil {
		age := time.Now().Year() - *user.BirthYear
		maxHR = 220 - age
	}

	hrZones, runLocs, err := loadHRAndLocations(ctx, h.Pool, user.ID, maxHR, reqYear)
	if err != nil {
		h.Log.Warn("profiles get: hr/locations failed", "err", err)
	} else {
		// Only include hrZones if they actually have HR data
		hasHR := false
		for _, v := range hrZones {
			if v > 0 {
				hasHR = true
				break
			}
		}
		if hasHR {
			resp.HeartRateZones = hrZones
			resp.MaxHR = maxHR
		}
		if len(runLocs) > 0 {
			resp.RunLocations = runLocs
		}
	}
	if user.DisplayName != nil {
		resp.DisplayName = *user.DisplayName
	}
	resp.Stamps = toPublicStamps(earned)
	for _, e := range earned {
		if _, ok := stamps.Lookup(e.StampID); !ok {
			h.Log.Warn("profiles get: earned stamp not in catalog", "stampId", e.StampID, "userID", user.ID)
		}
	}

	// New analytics sections. Each loads independently; a failure logs and
	// leaves its field empty so the rest of the response still ships.
	year := time.Now().UTC().Year()
	if ytd, err := loadYearToDate(ctx, h.Pool, user.ID, year); err != nil {
		h.Log.Warn("profiles get: ytd", "err", err)
	} else {
		resp.YearToDate = ytd
	}
	if pbs, err := loadPersonalBests(ctx, h.Pool, user.ID, reqYear); err != nil {
		h.Log.Warn("profiles get: pbs", "err", err)
	} else {
		resp.PersonalBests = pbs
	}
	if weekly, err := loadWeekly(ctx, h.Pool, user.ID, reqYear); err != nil {
		h.Log.Warn("profiles get: weekly", "err", err)
	} else {
		resp.Weekly = weekly
	}
	if cal, err := loadCalendarDays(ctx, h.Pool, user.ID, reqYear); err != nil {
		h.Log.Warn("profiles get: calendar", "err", err)
	} else {
		resp.Calendar = cal
	}
	if hl, err := loadHighlights(ctx, h.Pool, user.ID, reqYear); err != nil {
		h.Log.Warn("profiles get: highlights", "err", err)
	} else {
		resp.Highlights = hl
	}
	if countries, err := loadCountries(ctx, h.Pool, user.ID, reqYear); err != nil {
		h.Log.Warn("profiles get: countries", "err", err)
	} else {
		resp.Countries = countries
	}
	if yearlyHR, err := loadYearlyHR(ctx, h.Pool, user.ID, reqYear); err != nil {
		h.Log.Warn("profiles get: yearlyHR", "err", err)
	} else {
		resp.YearlyHR = yearlyHR
	}
	if recentRuns, err := loadRecentActivities(ctx, h.Pool, user.ID, reqYear); err != nil {
		h.Log.Warn("profiles get: recentRuns", "err", err)
	} else {
		resp.RecentRuns = recentRuns
	}
	if longest, err := loadLongestRuns(ctx, h.Pool, user.ID, reqYear); err != nil {
		h.Log.Warn("profiles get: longestRuns", "err", err)
	} else {
		if len(longest) > 0 {
			resp.LongestRuns = longest
		}
	}

	if tod, err := loadTimeOfDay(ctx, h.Pool, user.ID, reqYear); err != nil {
		h.Log.Warn("profiles get: tod", "err", err)
	} else if len(tod) == 4 {
		resp.TimeOfDay = tod
	}

	if distanceBuckets, err := loadDistanceBuckets(ctx, h.Pool, user.ID, reqYear); err == nil && len(distanceBuckets) == 5 {
		resp.DistanceBuckets = distanceBuckets
	}

	paceBuckets, err := loadPaceBuckets(ctx, h.Pool, user.ID, reqYear)
	if err == nil && len(paceBuckets) == 4 {
		resp.PaceBuckets = paceBuckets
	}

	dynamics, err := loadAdvancedDynamics(ctx, h.Pool, user.ID, reqYear)
	if err == nil && dynamics != nil {
		resp.Dynamics = dynamics
	}

	writeJSON(w, http.StatusOK, resp)
}

// loadPublicAggregates pulls the cheap roll-ups that drive the headline
// metrics. Single query that does totals + city counts; SQL handles the
// dupe_of filter so we never double-count cross-source duplicates.
func loadAvailableYears(ctx context.Context, pool *pgxpool.Pool, userID string) ([]int, error) {
	rows, err := pool.Query(ctx, `
		SELECT DISTINCT EXTRACT(YEAR FROM started_at)::int AS y
		FROM activities
		WHERE user_id = $1 AND dupe_of IS NULL AND started_at IS NOT NULL
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var years []int
	for rows.Next() {
		var y int
		if err := rows.Scan(&y); err != nil {
			return nil, err
		}
		years = append(years, y)
	}

	// Sort descending in Go to avoid SQL dialect issues with DISTINCT and aliases
	sort.Slice(years, func(i, j int) bool {
		return years[i] > years[j]
	})

	return years, nil
}

func yearClause(year int) string {
	if year > 0 {
		return fmt.Sprintf(" AND EXTRACT(YEAR FROM started_at AT TIME ZONE 'UTC') = %d", year)
	}
	return ""
}

func loadPublicAggregates(ctx context.Context, pool *pgxpool.Pool, userID string, year int) (profileTotals, []publicCity, error) {
	var t profileTotals
	var totalSeconds float64
	err := pool.QueryRow(ctx, `
		SELECT
			COUNT(*),
			COALESCE(SUM(distance_m), 0) / 1000.0,
			COUNT(DISTINCT NULLIF(location_country, '')),
			COUNT(DISTINCT NULLIF(location_city, '')),
			COALESCE(SUM(elevation_gain_m), 0),
			COALESCE(SUM(CASE WHEN moving_seconds > 0 THEN moving_seconds ELSE elapsed_seconds END), 0),
			COALESCE(SUM(calories), 0)
		FROM activities
		WHERE user_id = $1 AND dupe_of IS NULL`+yearClause(year)+`
	`, userID).Scan(&t.Runs, &t.DistanceKm, &t.Countries, &t.Cities, &t.ElevationM, &totalSeconds, &t.Calories)
	if err != nil {
		return t, nil, err
	}
	t.DurationHours = int(totalSeconds / 3600)

	rows, err := pool.Query(ctx, `
		SELECT location_city, COALESCE(MAX(location_country), ''), COUNT(*) AS runs
		FROM activities
		WHERE user_id = $1 AND dupe_of IS NULL`+yearClause(year)+` AND location_city IS NOT NULL AND location_city <> ''
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
		WHERE user_id = $1 AND dupe_of IS NULL`+yearClause(year)+`
		  AND started_at >= make_date($2::int, 1, 1)
	`, userID, year).Scan(&ytd.Runs, &ytd.DistanceKm, &ytd.ElevationM, &ytd.Cities)
	if err != nil {
		return nil, err
	}
	return ytd, nil
}

// profilePBDistances maps each public-profile PB slot to its target
// distance in metres. Half = 21097 m, Marathon = 42195 m.
var profilePBDistances = []struct {
	key      string
	distance int
}{
	{"5k", 5000},
	{"10k", 10000},
	{"half", 21097},
	{"marathon", 42195},
}

// loadPersonalBests picks the fastest full run near each distance.
// Returns the struct with nil entries where no qualifying run exists.
func loadPersonalBests(ctx context.Context, pool *pgxpool.Pool, userID string, year int) (*personalBests, error) {
	pbs := &personalBests{}
	for _, d := range profilePBDistances {
		pb, err := loadOnePB(ctx, pool, userID, d.distance, year)
		if err != nil {
			return nil, err
		}
		switch d.key {
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

// loadOnePB finds the fastest full run within ±5% of the target distance.
// Apple Health runs carry no segment efforts, so the PB is a whole-run
// best — the run with the smallest moving time (falling back to elapsed)
// in the band. Matches the "best full run · ±5% of distance" card copy.
func loadOnePB(ctx context.Context, pool *pgxpool.Pool, userID string, distanceM int, year int) (*personalBest, error) {
	var (
		seconds int
		actualM float64
		started time.Time
		city    *string
	)
	err := pool.QueryRow(ctx, `
SELECT
	CASE WHEN moving_seconds > 0 THEN moving_seconds ELSE elapsed_seconds END AS t,
	distance_m, started_at, location_city
FROM activities
WHERE user_id = $1 AND dupe_of IS NULL`+yearClause(year)+`
  AND distance_m BETWEEN $2 * 0.95 AND $2 * 1.05
  AND (moving_seconds > 0 OR elapsed_seconds > 0)
ORDER BY t ASC
LIMIT 1`, userID, distanceM).Scan(&seconds, &actualM, &started, &city)
	if err != nil {
		if isNoRows(err) {
			return nil, nil
		}
		return nil, err
	}
	pb := &personalBest{
		TimeSeconds: seconds,
		DistanceKm:  actualM / 1000.0,
		Date:        started.UTC().Format("2006-01-02"),
	}
	if city != nil {
		pb.City = *city
	}
	return pb, nil
}

// loadWeekly returns the most recent 26 ISO weeks (oldest first), padded
// with zero-km entries for weeks where the user didn't run.
func loadWeekly(ctx context.Context, pool *pgxpool.Pool, userID string, year int) ([]weeklyBucket, error) {
	rows, err := pool.Query(ctx, `
		SELECT
			date_trunc('week', started_at AT TIME ZONE 'UTC')::date AS week_start,
			COALESCE(SUM(distance_m), 0) / 1000.0 AS km,
			COUNT(*) AS runs
		FROM activities
		WHERE user_id = $1 AND dupe_of IS NULL`+yearClause(year)+`
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
func loadCalendarDays(ctx context.Context, pool *pgxpool.Pool, userID string, year int) ([]calendarDay, error) {
	rows, err := pool.Query(ctx, `
		SELECT
			date_trunc('day', started_at AT TIME ZONE 'UTC')::date AS d,
			COALESCE(SUM(distance_m), 0) / 1000.0 AS km,
			COUNT(*) AS runs
		FROM activities
		WHERE user_id = $1 AND dupe_of IS NULL`+yearClause(year)+`
		  `+func() string {
		if year > 0 {
			return ""
		} else {
			return "AND started_at >= now() - interval '365 days'"
		}
	}()+`
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
func loadHighlights(ctx context.Context, pool *pgxpool.Pool, userID string, year int) (*highlights, error) {
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
			WHERE user_id = $1 AND dupe_of IS NULL`+yearClause(year)+`
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
			WHERE user_id = $1 AND dupe_of IS NULL`+yearClause(year)+`
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
			WHERE user_id = $1 AND dupe_of IS NULL`+yearClause(year)+`
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
			WHERE user_id = $1 AND dupe_of IS NULL`+yearClause(year)+`
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
func loadCountries(ctx context.Context, pool *pgxpool.Pool, userID string, year int) ([]countryBucket, error) {
	rows, err := pool.Query(ctx, `
		SELECT
			location_country,
			COALESCE(SUM(distance_m), 0) / 1000.0 AS km,
			COUNT(*) AS runs
		FROM activities
		WHERE user_id = $1 AND dupe_of IS NULL`+yearClause(year)+`
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

func loadHRAndLocations(ctx context.Context, pool *pgxpool.Pool, userID string, maxHR int, year int) ([]int, [][2]float64, error) {
	hrZones := make([]int, 5)

	rows, err := pool.Query(ctx, `
		SELECT avg_hr
		FROM activities
		WHERE user_id = $1 AND dupe_of IS NULL`+yearClause(year)+` AND avg_hr > 0
	`, userID)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var avg int
		if err := rows.Scan(&avg); err != nil {
			return nil, nil, err
		}
		pct := float64(avg) / float64(maxHR)
		if pct < 0.6 {
			hrZones[0]++
		} else if pct < 0.7 {
			hrZones[1]++
		} else if pct < 0.8 {
			hrZones[2]++
		} else if pct < 0.9 {
			hrZones[3]++
		} else {
			hrZones[4]++
		}
	}
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}

	var locs [][2]float64
	locRows, err := pool.Query(ctx, `
		SELECT ST_X(location_start::geometry), ST_Y(location_start::geometry)
		FROM activities
		WHERE user_id = $1 AND dupe_of IS NULL`+yearClause(year)+` AND location_start IS NOT NULL
	`, userID)
	if err != nil {
		return nil, nil, err
	}
	defer locRows.Close()

	for locRows.Next() {
		var lng, lat float64
		if err := locRows.Scan(&lng, &lat); err != nil {
			return nil, nil, err
		}
		locs = append(locs, [2]float64{lng, lat})
	}
	if err := locRows.Err(); err != nil {
		return nil, nil, err
	}

	return hrZones, locs, nil
}

// loadYearlyHR groups runs by year and calculates the average HR.
func loadYearlyHR(ctx context.Context, pool *pgxpool.Pool, userID string, year int) ([]yearlyHRBucket, error) {
	rows, err := pool.Query(ctx, `
		SELECT
			EXTRACT(YEAR FROM started_at)::int AS year,
			ROUND(AVG(avg_hr))::int AS avg_hr,
			COUNT(*) AS runs
		FROM activities
		WHERE user_id = $1 AND dupe_of IS NULL`+yearClause(year)+` AND avg_hr > 0
		GROUP BY year
		ORDER BY year ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []yearlyHRBucket
	for rows.Next() {
		var b yearlyHRBucket
		if err := rows.Scan(&b.Year, &b.AvgHR, &b.Runs); err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, rows.Err()
}

// loadRecentActivities fetches the 5 most recent runs.
func loadRecentActivities(ctx context.Context, pool *pgxpool.Pool, userID string, year int) ([]publicActivity, error) {
	rows, err := pool.Query(ctx, `
		SELECT
			COALESCE(title, 'Run'),
			distance_m / 1000.0 AS distance_km,
			COALESCE(avg_pace_s_per_km, 0) AS pace,
			started_at
		FROM activities
		WHERE user_id = $1 AND dupe_of IS NULL`+yearClause(year)+`
		ORDER BY started_at DESC
		LIMIT 5
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []publicActivity
	for rows.Next() {
		var a publicActivity
		var started time.Time
		var pace float64
		if err := rows.Scan(&a.Title, &a.DistanceKm, &pace, &started); err != nil {
			return nil, err
		}
		a.Pace = int(pace)
		a.Date = started.UTC().Format("2006-01-02")
		out = append(out, a)
	}
	return out, rows.Err()
}

// loadLongestRuns fetches the top 5 longest runs.
func loadLongestRuns(ctx context.Context, pool *pgxpool.Pool, userID string, year int) ([]longestRun, error) {
	q := `
		SELECT distance_m, avg_pace_s_per_km, started_at, title, location_city
		FROM activities
		WHERE user_id = $1 AND dupe_of IS NULL` + yearClause(year) + ` AND distance_m > 0
		ORDER BY distance_m DESC
		LIMIT 5
	`
	rows, err := pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []longestRun
	for rows.Next() {
		var r longestRun
		var dist float64
		var pace *float64
		var title, city *string
		var started time.Time
		if err := rows.Scan(&dist, &pace, &started, &title, &city); err != nil {
			continue
		}
		r.DistanceKm = dist / 1000.0
		r.Date = started.UTC().Format("2006-01-02")
		if title != nil {
			r.Title = *title
		} else {
			r.Title = "Run"
		}
		if city != nil {
			r.City = *city
		}
		out = append(out, r)
	}
	return out, nil
}

func loadTimeOfDay(ctx context.Context, pool *pgxpool.Pool, userID string, year int) ([]int, error) {
	q := `
		SELECT
			COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM started_at) >= 5 AND EXTRACT(HOUR FROM started_at) < 12),
			COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM started_at) >= 12 AND EXTRACT(HOUR FROM started_at) < 17),
			COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM started_at) >= 17 AND EXTRACT(HOUR FROM started_at) < 21),
			COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM started_at) >= 21 OR EXTRACT(HOUR FROM started_at) < 5)
		FROM activities
		WHERE user_id = $1 AND dupe_of IS NULL` + yearClause(year) + `
	`
	var m, a, e, n int
	err := pool.QueryRow(ctx, q, userID).Scan(&m, &a, &e, &n)
	if err != nil {
		return nil, err
	}
	// Return only if there is data
	if m+a+e+n == 0 {
		return nil, nil
	}
	return []int{m, a, e, n}, nil
}

func loadDistanceBuckets(ctx context.Context, pool *pgxpool.Pool, userID string, year int) ([]int, error) {
	q := `
		SELECT
			COUNT(*) FILTER (WHERE distance_m < 5000),
			COUNT(*) FILTER (WHERE distance_m >= 5000 AND distance_m < 10000),
			COUNT(*) FILTER (WHERE distance_m >= 10000 AND distance_m < 21000),
			COUNT(*) FILTER (WHERE distance_m >= 21000)
		FROM activities
		WHERE user_id = $1 AND dupe_of IS NULL` + yearClause(year) + ` AND distance_m > 0
	`
	var s, m, l, e int
	err := pool.QueryRow(ctx, q, userID).Scan(&s, &m, &l, &e)
	if err != nil {
		return nil, err
	}
	if s+m+l+e == 0 {
		return nil, nil
	}
	return []int{s, m, l, e}, nil
}

func loadPaceBuckets(ctx context.Context, pool *pgxpool.Pool, userID string, year int) ([]int, error) {
	q := `
		SELECT
			COUNT(*) FILTER (WHERE avg_pace_s_per_km < 270),
			COUNT(*) FILTER (WHERE avg_pace_s_per_km >= 270 AND avg_pace_s_per_km < 330),
			COUNT(*) FILTER (WHERE avg_pace_s_per_km >= 330 AND avg_pace_s_per_km < 390),
			COUNT(*) FILTER (WHERE avg_pace_s_per_km >= 390)
		FROM activities
		WHERE user_id = $1 AND dupe_of IS NULL` + yearClause(year) + ` AND distance_m > 0 AND avg_pace_s_per_km > 0
	`
	var b1, b2, b3, b4 int
	err := pool.QueryRow(ctx, q, userID).Scan(&b1, &b2, &b3, &b4)
	if err != nil {
		return nil, err
	}
	if b1+b2+b3+b4 == 0 {
		return nil, nil
	}
	return []int{b1, b2, b3, b4}, nil
}

func loadAdvancedDynamics(ctx context.Context, pool *pgxpool.Pool, userID string, year int) (*advancedDynamics, error) {
	q := `
		SELECT
			COALESCE(AVG(cadence_spm), 0),
			COALESCE(AVG(running_power_w), 0),
			COALESCE(AVG(vo2max_ml_kg_min), 0),
			COALESCE(AVG(stride_length_m), 0),
			COALESCE(AVG(vertical_oscillation_cm), 0),
			COALESCE(AVG(ground_contact_ms), 0)
		FROM activities
		WHERE user_id = $1 AND dupe_of IS NULL` + yearClause(year) + `
	`
	var d advancedDynamics
	err := pool.QueryRow(ctx, q, userID).Scan(
		&d.CadenceSPM,
		&d.RunningPowerW,
		&d.VO2Max,
		&d.StrideLengthM,
		&d.VerticalOscillationCm,
		&d.GroundContactMs,
	)
	if err != nil {
		return nil, err
	}
	if d.CadenceSPM == 0 && d.RunningPowerW == 0 && d.VO2Max == 0 &&
		d.StrideLengthM == 0 && d.VerticalOscillationCm == 0 && d.GroundContactMs == 0 {
		return nil, nil
	}
	return &d, nil
}
