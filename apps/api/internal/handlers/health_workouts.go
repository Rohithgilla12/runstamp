package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/activities"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/auth"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/users"
)

// HealthHandler serves the Apple Health workout ingestion route.
// POST /v1/health/workouts (auth-gated).
type HealthHandler struct {
	Activities *activities.Service
	Users      *users.Repo
	Log        *slog.Logger
}

type incomingWorkout struct {
	UUID                string       `json:"uuid"`
	StartedAt           string       `json:"startedAt"`
	ElapsedSeconds      int          `json:"elapsedSeconds"`
	MovingSeconds       *int         `json:"movingSeconds,omitempty"`
	DistanceMeters      float64      `json:"distanceMeters"`
	ActiveEnergyKcal    *float64     `json:"activeEnergyKcal,omitempty"`
	ElevationGainMeters *float64     `json:"elevationGainMeters,omitempty"`
	AvgHeartRate        *int         `json:"avgHeartRate,omitempty"`
	MaxHeartRate        *int         `json:"maxHeartRate,omitempty"`
	StartLatitude       *float64     `json:"startLatitude,omitempty"`
	StartLongitude      *float64     `json:"startLongitude,omitempty"`
	Route               []routePoint `json:"route,omitempty"`
}

type routePoint struct {
	Lat float64  `json:"lat"`
	Lon float64  `json:"lon"`
	T   int64    `json:"t"`
	Alt *float64 `json:"alt,omitempty"`
}

type healthSyncRequest struct {
	Workouts []incomingWorkout `json:"workouts"`
}

type healthSyncResponse struct {
	Uploaded   int `json:"uploaded"`
	Duplicates int `json:"duplicates"`
	Skipped    int `json:"skipped"`
}

// Sync handles POST /v1/health/workouts. It materialises the user, then
// iterates over the workout batch: each valid workout is ingested via
// activities.Service.Ingest which implements the dedup contract from PRD §6.8
// (Strava wins as canonical when both sources race in).
//
// Return value: { uploaded, duplicates, skipped }
//   - uploaded   — rows newly inserted (isDupe == false)
//   - duplicates — rows where the run already existed from another source
//   - skipped    — rows rejected before calling Ingest (bad distance, parse error, etc.)
func (h *HealthHandler) Sync(w http.ResponseWriter, r *http.Request) {
	vt, ok := auth.FromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing authentication")
		return
	}

	user, err := h.Users.UpsertByFirebaseUID(r.Context(), vt.UID, vt.Email)
	if err != nil {
		h.Log.Error("health sync: upsert user failed", "uid", vt.UID, "err", err)
		writeError(w, http.StatusInternalServerError, "failed to provision user")
		return
	}

	var req healthSyncRequest
	if decodeErr := json.NewDecoder(r.Body).Decode(&req); decodeErr != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var uploaded, duplicates, skipped int

	for i := range req.Workouts {
		wk := req.Workouts[i]

		if wk.DistanceMeters <= 0 {
			skipped++
			continue
		}

		startedAt, parseErr := time.Parse(time.RFC3339, wk.StartedAt)
		if parseErr != nil {
			h.Log.Warn("health sync: bad startedAt", "uuid", wk.UUID, "val", wk.StartedAt)
			skipped++
			continue
		}

		rawBytes, marshalErr := json.Marshal(wk)
		if marshalErr != nil {
			rawBytes = []byte("{}")
		}

		var calories *int
		if wk.ActiveEnergyKcal != nil {
			rounded := int(*wk.ActiveEnergyKcal)
			calories = &rounded
		}

		var avgPace *float64
		if wk.ElapsedSeconds > 0 && wk.DistanceMeters > 0 {
			distKm := wk.DistanceMeters / 1000.0
			paceSecPerKm := float64(wk.ElapsedSeconds) / distKm
			avgPace = &paceSecPerKm
		}

		rawMsg := json.RawMessage(rawBytes)

		candidate := &activities.Activity{
			UserID:        user.ID,
			Source:        "apple_health",
			ExternalID:    wk.UUID,
			Sport:         "run",
			StartedAt:     startedAt,
			ElapsedSeconds: wk.ElapsedSeconds,
			MovingSeconds: wk.MovingSeconds,
			DistanceM:     wk.DistanceMeters,
			ElevationGainM: wk.ElevationGainMeters,
			AvgHR:         wk.AvgHeartRate,
			MaxHR:         wk.MaxHeartRate,
			AvgPaceSPerKm: avgPace,
			Calories:      calories,
			StartLat:      wk.StartLatitude,
			StartLon:      wk.StartLongitude,
			Raw:           &rawMsg,
		}

		_, isDupe, ingestErr := h.Activities.Ingest(r.Context(), candidate)
		if ingestErr != nil {
			h.Log.Warn("health sync: ingest failed", "uuid", wk.UUID, "err", ingestErr)
			skipped++
			continue
		}

		if isDupe {
			duplicates++
		} else {
			uploaded++
		}

		// TODO(v0.2): when route is present, insert a downsampled latlng
		// stream into activity_streams after the activity row is committed.
	}

	writeJSON(w, http.StatusOK, healthSyncResponse{
		Uploaded:   uploaded,
		Duplicates: duplicates,
		Skipped:    skipped,
	})
}
