package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/activities"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/auth"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/users"
	"github.com/go-chi/chi/v5"
)

// ActivitiesHandler serves the GET /v1/activities list endpoint that the
// mobile app reads to render the Home / Activity / Analytics screens.
type ActivitiesHandler struct {
	Activities *activities.Service
	Users      *users.Repo
	Log        *slog.Logger
}

// Analytics, places aggregation, and best-efforts all run client-side, so the
// mobile app pulls the whole list once and computes off it. 10k cap is the
// hard ceiling — a runner with that many lifetime runs is still <5MB of JSON
// at our ~500-byte-per-row payload.
const defaultActivitiesLimit = 2000
const maxActivitiesLimit = 10000

type activityResponse struct {
	ID             string   `json:"id"`
	Source         string   `json:"source"`
	// ExternalID is the source's native id — Strava activity id, or the
	// HealthKit workout UUID. The mobile "Browse HealthKit runs" screen uses
	// it to correlate the live HK list against what's already imported.
	ExternalID     string   `json:"externalId"`
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
	GapSecPerKm    *float64 `json:"gapSecPerKm,omitempty"`
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

// activityDetailResponse is the shape returned by GET /v1/activities/{id}.
// Embeds every field activityResponse already returns plus the heavy fields
// the list endpoint deliberately omits — splits (per-km breakdown) and
// notes. Splits is JSON RawMessage so we don't re-decode it server-side
// just to re-encode it (it landed as JSON from the ingest path and stays
// JSON to the wire).
type activityDetailResponse struct {
	activityResponse
	Splits *json.RawMessage `json:"splits,omitempty"`
	Notes  *string          `json:"notes,omitempty"`
	// RelatedDupes — other-source rows that the dedupe matcher marked as
	// dupes of this canonical run. Mobile uses these to offer "switch
	// which version is canonical" (PRD §6.8). Usually 0 or 1 entry since
	// we only ingest from two sources today.
	RelatedDupes []dupeRefResponse `json:"relatedDupes,omitempty"`
}

type dupeRefResponse struct {
	ID         string  `json:"id"`
	Source     string  `json:"source"`
	StartedAt  string  `json:"startedAt"`
	DistanceM  float64 `json:"distanceMeters"`
	ElapsedSec int     `json:"elapsedSeconds"`
}

// Get handles GET /v1/activities/{id}. Returns the full detail row scoped
// to the owning user (404 on cross-user IDs to avoid existence leak). This
// is the on-demand companion to the lean list endpoint — mobile fetches
// detail when the user opens the Activity / Editor screen, so the list
// payload stays small.
func (h *ActivitiesHandler) Get(w http.ResponseWriter, r *http.Request) {
	vt, ok := auth.FromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing authentication")
		return
	}
	user, err := h.Users.FindByFirebaseUID(r.Context(), vt.UID)
	if err != nil {
		h.Log.Error("activities get: load user", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to load user")
		return
	}
	if user == nil {
		writeError(w, http.StatusNotFound, "user not provisioned")
		return
	}
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "missing activity id")
		return
	}

	a, err := h.Activities.Repo().FindByID(r.Context(), user.ID, id)
	if err != nil {
		if errors.Is(err, activities.ErrNotFound) {
			writeError(w, http.StatusNotFound, "activity not found")
			return
		}
		h.Log.Error("activities get: find", "err", err, "activity_id", id)
		writeError(w, http.StatusInternalServerError, "lookup failed")
		return
	}

	out := activityDetailResponse{
		activityResponse: toActivityResponse(a),
		Splits:           a.Splits,
		Notes:            a.Notes,
	}
	// Surface sibling dupes so mobile can offer the "switch source" UX.
	// Failures here aren't fatal — log + ship the rest of the response.
	dupes, dErr := h.Activities.Repo().ListDupesOfCanonical(r.Context(), user.ID, a.ID)
	if dErr != nil {
		h.Log.Warn("activities get: list dupes", "err", dErr, "activity_id", a.ID)
	} else {
		for _, d := range dupes {
			out.RelatedDupes = append(out.RelatedDupes, dupeRefResponse{
				ID:         d.ID,
				Source:     d.Source,
				StartedAt:  d.StartedAt.UTC().Format("2006-01-02T15:04:05Z07:00"),
				DistanceM:  d.DistanceM,
				ElapsedSec: d.ElapsedSec,
			})
		}
	}
	writeJSON(w, http.StatusOK, out)
}

// Canonicalize handles POST /v1/activities/{id}/canonicalize — promotes a
// duplicate row to the canonical version of its run. PRD §6.8 manual
// override for cases where the automatic Strava-wins rule got it wrong.
//
// Idempotent: if {id} is already canonical, returns 200 with the current
// detail. Otherwise atomically demotes the existing canonical to dupe_of
// = {id} and clears dupe_of on {id} (see Repository.SwapCanonical).
func (h *ActivitiesHandler) Canonicalize(w http.ResponseWriter, r *http.Request) {
	vt, ok := auth.FromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing authentication")
		return
	}
	user, err := h.Users.FindByFirebaseUID(r.Context(), vt.UID)
	if err != nil || user == nil {
		writeError(w, http.StatusNotFound, "user not provisioned")
		return
	}
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "missing activity id")
		return
	}

	if err := h.Activities.Repo().SwapCanonical(r.Context(), user.ID, id); err != nil {
		if errors.Is(err, activities.ErrNotFound) {
			writeError(w, http.StatusNotFound, "activity not found")
			return
		}
		h.Log.Error("activities canonicalize: swap", "err", err, "activity_id", id)
		writeError(w, http.StatusInternalServerError, "swap failed")
		return
	}

	// Return the freshly canonicalized row so the mobile client can swap
	// state without a separate fetch round-trip.
	a, err := h.Activities.Repo().FindByID(r.Context(), user.ID, id)
	if err != nil {
		h.Log.Error("activities canonicalize: re-read", "err", err, "activity_id", id)
		writeError(w, http.StatusInternalServerError, "re-read failed")
		return
	}
	out := activityDetailResponse{
		activityResponse: toActivityResponse(a),
		Splits:           a.Splits,
		Notes:            a.Notes,
	}
	dupes, dErr := h.Activities.Repo().ListDupesOfCanonical(r.Context(), user.ID, a.ID)
	if dErr == nil {
		for _, d := range dupes {
			out.RelatedDupes = append(out.RelatedDupes, dupeRefResponse{
				ID:         d.ID,
				Source:     d.Source,
				StartedAt:  d.StartedAt.UTC().Format("2006-01-02T15:04:05Z07:00"),
				DistanceM:  d.DistanceM,
				ElapsedSec: d.ElapsedSec,
			})
		}
	}
	writeJSON(w, http.StatusOK, out)
}

type patchActivityRequest struct {
	Title *string `json:"title,omitempty"`
}

// Patch handles PATCH /v1/activities/:id — currently supports renaming.
// Returns 404 when the caller doesn't own the row (don't leak existence).
func (h *ActivitiesHandler) Patch(w http.ResponseWriter, r *http.Request) {
	vt, ok := auth.FromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing authentication")
		return
	}
	user, err := h.Users.FindByFirebaseUID(r.Context(), vt.UID)
	if err != nil || user == nil {
		writeError(w, http.StatusNotFound, "user not provisioned")
		return
	}
	id := chi.URLParam(r, "id")
	owner, err := h.Activities.Repo().OwnerOf(r.Context(), id)
	if err != nil {
		h.Log.Error("activities patch: owner", "err", err)
		writeError(w, http.StatusInternalServerError, "lookup failed")
		return
	}
	if owner == "" || owner != user.ID {
		writeError(w, http.StatusNotFound, "activity not found")
		return
	}
	var body patchActivityRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if body.Title != nil {
		title := strings.TrimSpace(*body.Title)
		if len(title) > 200 {
			title = title[:200]
		}
		if err := h.Activities.Repo().UpdateTitle(r.Context(), id, title); err != nil {
			if errors.Is(err, activities.ErrNotFound) {
				writeError(w, http.StatusNotFound, "activity not found")
				return
			}
			h.Log.Error("activities patch: update title", "err", err, "activity_id", id)
			writeError(w, http.StatusInternalServerError, "update failed")
			return
		}
	}
	w.WriteHeader(http.StatusNoContent)
}

// patchStringField normalizes a user-supplied PATCH string: trims whitespace,
// caps length, and returns nil when the result is empty so the repo writes NULL.
func patchStringField(raw string, max int) *string {
	v := strings.TrimSpace(raw)
	if len(v) > max {
		v = v[:max]
	}
	if v == "" {
		return nil
	}
	return &v
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
		ExternalID:    a.ExternalID,
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
		GapSecPerKm:   a.GAPSecPerKm,
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

