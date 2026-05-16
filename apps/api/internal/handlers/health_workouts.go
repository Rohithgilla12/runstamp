package handlers

import (
	"encoding/json"
	"io"
	"log/slog"
	"math"
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

// incomingStream represents a downsampled numeric time-series from the mobile
// client. tStart is epoch ms, dtSec is the uniform inter-sample gap in
// seconds, and values is the array of metric readings.
type incomingStream struct {
	TStart float64   `json:"tStart"`
	DtSec  float64   `json:"dtSec"`
	Values []float64 `json:"values"`
}

// incomingStreams carries all optional stream kinds from a single workout.
type incomingStreams struct {
	Heartrate          *incomingStream      `json:"heartrate,omitempty"`
	Speed              *incomingStream      `json:"speed,omitempty"`
	Cadence            *incomingStream      `json:"cadence,omitempty"`
	Power              *incomingStream      `json:"power,omitempty"`
	VerticalOscillation *incomingStream     `json:"verticalOscillation,omitempty"`
	GroundContactTime  *incomingStream      `json:"groundContactTime,omitempty"`
	StrideLength       *incomingStream      `json:"strideLength,omitempty"`
	Altitude           *incomingStream      `json:"altitude,omitempty"`
	Latlng             [][2]float64         `json:"latlng,omitempty"`
}

// All numeric fields that semantically end up as ints in the DB are accepted
// as float64 over the wire so HealthKit's fractional seconds / float HR
// numbers don't blow up the JSON decode. We round to int below.
type incomingWorkout struct {
	UUID                   string          `json:"uuid"`
	StartedAt              string          `json:"startedAt"`
	ElapsedSeconds         float64         `json:"elapsedSeconds"`
	MovingSeconds          *float64        `json:"movingSeconds,omitempty"`
	DistanceMeters         float64         `json:"distanceMeters"`
	ActiveEnergyKcal       *float64        `json:"activeEnergyKcal,omitempty"`
	ElevationGainMeters    *float64        `json:"elevationGainMeters,omitempty"`
	AvgHeartRate           *float64        `json:"avgHeartRate,omitempty"`
	MaxHeartRate           *float64        `json:"maxHeartRate,omitempty"`
	AvgRunningPower        *float64        `json:"avgRunningPower,omitempty"`
	AvgVerticalOscillation *float64        `json:"avgVerticalOscillation,omitempty"`
	AvgGroundContactTime   *float64        `json:"avgGroundContactTime,omitempty"`
	AvgStrideLength        *float64        `json:"avgStrideLength,omitempty"`
	AvgRunningSpeed        *float64        `json:"avgRunningSpeed,omitempty"`
	AvgCadence             *float64        `json:"avgCadence,omitempty"`
	VO2maxMlKgMin          *float64        `json:"vo2maxMlKgMin,omitempty"`
	StartLatitude          *float64        `json:"startLatitude,omitempty"`
	StartLongitude         *float64        `json:"startLongitude,omitempty"`
	Streams                *incomingStreams `json:"streams,omitempty"`
	Splits                 json.RawMessage `json:"splits,omitempty"`
}

func roundFloatPtr(f *float64) *int {
	if f == nil {
		return nil
	}
	v := int(math.Round(*f))
	return &v
}

func roundDurationPtr(f *float64) *int {
	if f == nil {
		return nil
	}
	v := int(math.Round(*f))
	return &v
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

	body, readErr := io.ReadAll(io.LimitReader(r.Body, 16*1024*1024))
	if readErr != nil {
		h.Log.Error("health sync: read body", "err", readErr)
		writeError(w, http.StatusBadRequest, "couldn't read request body")
		return
	}

	var req healthSyncRequest
	if decodeErr := json.Unmarshal(body, &req); decodeErr != nil {
		// Log the actual decode error so we never debug a generic "invalid
		// request body" 400 again. The mobile payload is large enough that
		// a typed-field mismatch (e.g. float into int) is easy to miss.
		h.Log.Warn("health sync: decode failed", "err", decodeErr, "preview", string(body[:min(256, len(body))]))
		writeError(w, http.StatusBadRequest, "invalid request body: "+decodeErr.Error())
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

		elapsed := int(math.Round(wk.ElapsedSeconds))
		movingSeconds := roundDurationPtr(wk.MovingSeconds)
		avgHR := roundFloatPtr(wk.AvgHeartRate)
		maxHR := roundFloatPtr(wk.MaxHeartRate)

		var avgPace *float64
		if elapsed > 0 && wk.DistanceMeters > 0 {
			distKm := wk.DistanceMeters / 1000.0
			paceSecPerKm := float64(elapsed) / distKm
			avgPace = &paceSecPerKm
		}

		rawMsg := json.RawMessage(rawBytes)

		var splitsRaw *json.RawMessage
		if len(wk.Splits) > 0 && string(wk.Splits) != "null" {
			msg := json.RawMessage(wk.Splits)
			splitsRaw = &msg
		}

		candidate := &activities.Activity{
			UserID:          user.ID,
			Source:          "apple_health",
			ExternalID:      wk.UUID,
			Sport:           "run",
			StartedAt:       startedAt,
			ElapsedSeconds:  elapsed,
			MovingSeconds:   movingSeconds,
			DistanceM:       wk.DistanceMeters,
			ElevationGainM:  wk.ElevationGainMeters,
			AvgHR:           avgHR,
			MaxHR:           maxHR,
			AvgPaceSPerKm:   avgPace,
			Calories:        calories,
			StartLat:        wk.StartLatitude,
			StartLon:        wk.StartLongitude,
			Raw:             &rawMsg,
			CadenceSPM:      wk.AvgCadence,
			RunningPowerW:   wk.AvgRunningPower,
			VerticalOscCm:   wk.AvgVerticalOscillation,
			GroundContactMs: wk.AvgGroundContactTime,
			StrideLengthM:   wk.AvgStrideLength,
			VO2maxMlKgMin:   wk.VO2maxMlKgMin,
			AvgSpeedMS:      wk.AvgRunningSpeed,
			Splits:          splitsRaw,
		}

		canonical, isDupe, ingestErr := h.Activities.Ingest(r.Context(), candidate)
		if ingestErr != nil {
			h.Log.Warn("health sync: ingest failed", "uuid", wk.UUID, "err", ingestErr)
			skipped++
			continue
		}

		if isDupe {
			duplicates++
		} else {
			uploaded++
			if wk.Streams != nil && canonical != nil {
				h.insertStreams(r, canonical.ID, wk.UUID, wk.Streams)
			}
		}
	}

	writeJSON(w, http.StatusOK, healthSyncResponse{
		Uploaded:   uploaded,
		Duplicates: duplicates,
		Skipped:    skipped,
	})
}

// insertStreams persists each present stream kind into activity_streams.
// Errors are logged and silently skipped — a missing stream is not fatal to
// the ingest result.
func (h *HealthHandler) insertStreams(r *http.Request, activityID, uuid string, streams *incomingStreams) {
	type streamEntry struct {
		kind string
		data interface{}
	}

	entries := []streamEntry{}

	if streams.Heartrate != nil {
		entries = append(entries, streamEntry{"heartrate", streams.Heartrate})
	}
	if streams.Speed != nil {
		entries = append(entries, streamEntry{"speed", streams.Speed})
	}
	if streams.Cadence != nil {
		entries = append(entries, streamEntry{"cadence", streams.Cadence})
	}
	if streams.Power != nil {
		entries = append(entries, streamEntry{"power", streams.Power})
	}
	if streams.VerticalOscillation != nil {
		entries = append(entries, streamEntry{"vertical_oscillation", streams.VerticalOscillation})
	}
	if streams.GroundContactTime != nil {
		entries = append(entries, streamEntry{"ground_contact_time", streams.GroundContactTime})
	}
	if streams.StrideLength != nil {
		entries = append(entries, streamEntry{"stride_length", streams.StrideLength})
	}
	if streams.Altitude != nil {
		entries = append(entries, streamEntry{"altitude", streams.Altitude})
	}
	if len(streams.Latlng) > 0 {
		entries = append(entries, streamEntry{"latlng", streams.Latlng})
	}

	for _, entry := range entries {
		data, marshalErr := json.Marshal(entry.data)
		if marshalErr != nil {
			h.Log.Warn("health sync: marshal stream failed", "uuid", uuid, "kind", entry.kind, "err", marshalErr)
			continue
		}
		if insertErr := h.Activities.Repo().InsertStream(r.Context(), activityID, entry.kind, data); insertErr != nil {
			h.Log.Warn("health sync: insert stream failed", "uuid", uuid, "kind", entry.kind, "err", insertErr)
		}
	}
}
