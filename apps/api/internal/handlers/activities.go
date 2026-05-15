package handlers

import (
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/activities"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/auth"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/users"
)

// ActivitiesHandler serves the GET /v1/activities list endpoint that the
// mobile app reads to render the Home / Activity / Analytics screens.
type ActivitiesHandler struct {
	Activities *activities.Service
	Users      *users.Repo
	Log        *slog.Logger
}

const defaultActivitiesLimit = 50
const maxActivitiesLimit = 200

type activityResponse struct {
	ID             string   `json:"id"`
	Source         string   `json:"source"`
	Sport          string   `json:"sport"`
	StartedAt      string   `json:"startedAt"`
	Title          string   `json:"title"`
	City           string   `json:"city,omitempty"`
	Country        string   `json:"country,omitempty"`
	DistanceM      float64  `json:"distanceM"`
	ElapsedSec     int      `json:"elapsedSec"`
	MovingSec      *int     `json:"movingSec,omitempty"`
	ElevationM     *float64 `json:"elevationM,omitempty"`
	AvgHR          *int     `json:"avgHr,omitempty"`
	MaxHR          *int     `json:"maxHr,omitempty"`
	AvgPaceSPerKm  *float64 `json:"avgPaceSPerKm,omitempty"`
	Calories       *int     `json:"calories,omitempty"`
	CadenceSPM     *float64 `json:"cadenceSpm,omitempty"`
	RunningPowerW  *float64 `json:"runningPowerW,omitempty"`
	VO2maxMlKgMin  *float64 `json:"vo2maxMlKgMin,omitempty"`
	StartLat       *float64 `json:"startLat,omitempty"`
	StartLon       *float64 `json:"startLon,omitempty"`
}

type listActivitiesResponse struct {
	Activities []activityResponse `json:"activities"`
	Total      int                `json:"total"`
}

// List handles GET /v1/activities?limit=50.
// Returns the authenticated user's canonical (non-dupe) activities,
// most-recent-first.
func (h *ActivitiesHandler) List(w http.ResponseWriter, r *http.Request) {
	vt, ok := auth.FromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing authentication")
		return
	}

	user, err := h.Users.FindByFirebaseUID(r.Context(), vt.UID)
	if err != nil {
		h.Log.Error("activities list: load user", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to load user")
		return
	}
	if user == nil {
		writeError(w, http.StatusNotFound, "user not provisioned")
		return
	}

	limit := parseLimit(r.URL.Query().Get("limit"))

	rows, err := h.Activities.Repo().ListForUser(r.Context(), user.ID, limit)
	if err != nil {
		h.Log.Error("activities list: query", "err", err, "user_id", user.ID)
		writeError(w, http.StatusInternalServerError, "failed to list activities")
		return
	}

	resp := listActivitiesResponse{
		Activities: make([]activityResponse, 0, len(rows)),
		Total:      len(rows),
	}
	for i := range rows {
		resp.Activities = append(resp.Activities, toActivityResponse(&rows[i]))
	}
	writeJSON(w, http.StatusOK, resp)
}

func parseLimit(raw string) int {
	if raw == "" {
		return defaultActivitiesLimit
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n <= 0 {
		return defaultActivitiesLimit
	}
	if n > maxActivitiesLimit {
		return maxActivitiesLimit
	}
	return n
}

func toActivityResponse(a *activities.Activity) activityResponse {
	out := activityResponse{
		ID:            a.ID,
		Source:        a.Source,
		Sport:         a.Sport,
		StartedAt:     a.StartedAt.UTC().Format(time.RFC3339),
		DistanceM:     a.DistanceM,
		ElapsedSec:    a.ElapsedSeconds,
		MovingSec:     a.MovingSeconds,
		ElevationM:    a.ElevationGainM,
		AvgHR:         a.AvgHR,
		MaxHR:         a.MaxHR,
		AvgPaceSPerKm: a.AvgPaceSPerKm,
		Calories:      a.Calories,
		CadenceSPM:    a.CadenceSPM,
		RunningPowerW: a.RunningPowerW,
		VO2maxMlKgMin: a.VO2maxMlKgMin,
		StartLat:      a.StartLat,
		StartLon:      a.StartLon,
	}
	if a.Title != nil {
		out.Title = *a.Title
	}
	if a.LocationCity != nil {
		out.City = *a.LocationCity
	}
	if a.LocationCountry != nil {
		out.Country = *a.LocationCountry
	}
	return out
}

