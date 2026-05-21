package handlers

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/stamps"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/users"
	"github.com/go-chi/chi/v5"
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
	Handle      string                  `json:"handle"`
	DisplayName string                  `json:"displayName,omitempty"`
	Totals      profileTotals           `json:"totals"`
	Stamps      []publicStamp           `json:"stamps"`
	Cities      []publicCity            `json:"cities"`
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

	earned, err := h.Stamps.ListEarnedForUser(r.Context(), user.ID)
	if err != nil {
		h.Log.Warn("profiles get: stamps", "err", err)
		earned = nil
	}
	totals, cities, err := loadPublicAggregates(r.Context(), h.Pool, user.ID)
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
