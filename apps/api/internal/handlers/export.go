package handlers

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/activities"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/auth"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/export"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/stamps"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/users"
)

// exportActivityCap is an absolute ceiling on how many activities we'll
// include in a single export. Even a power runner with 10 years of daily
// runs is ~3650 activities. If a real user blows past this, the answer is
// to paginate the export, not to silently truncate — log a warning.
const exportActivityCap = 10000

// ExportHandler streams a zip of the caller's data: a manifest.json with
// profile + stamps + activity index, plus one GPX file per activity that
// has a latlng stream. PRD §6.9 "Data export (GPX zip + JSON)".
type ExportHandler struct {
	Activities *activities.Service
	Users      *users.Repo
	Stamps     *stamps.Repository
	Log        *slog.Logger
}

// ZipExport serves GET /v1/export.zip. The response is streamed: we never
// materialise the entire archive in memory.
func (h *ExportHandler) ZipExport(w http.ResponseWriter, r *http.Request) {
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

	acts, err := h.Activities.Repo().ListForUser(r.Context(), user.ID, exportActivityCap)
	if err != nil {
		h.Log.Error("export: list activities", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to load activities")
		return
	}
	if len(acts) >= exportActivityCap {
		h.Log.Warn("export: hit activity cap", "user_id", user.ID, "cap", exportActivityCap)
	}
	earned, err := h.Stamps.ListEarnedForUser(r.Context(), user.ID)
	if err != nil {
		// Stamps are nice-to-have in the export; if the read fails, ship
		// the activities anyway with an empty stamps list.
		h.Log.Warn("export: list stamps", "err", err)
		earned = nil
	}

	// Filename includes the date so back-to-back exports don't clobber each
	// other in the user's Downloads folder.
	today := time.Now().UTC().Format("2006-01-02")
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="runstamp-export-%s.zip"`, today))
	// Streaming response — no Content-Length, the client handles the EOF.
	w.WriteHeader(http.StatusOK)

	zw := zip.NewWriter(w)
	defer zw.Close()

	if err := writeManifest(zw, user, acts, earned); err != nil {
		h.Log.Error("export: write manifest", "err", err)
		return
	}

	for i := range acts {
		if err := writeOneGPX(r, h, zw, &acts[i]); err != nil {
			// Log + skip the file; the rest of the archive should still
			// reach the user.
			h.Log.Warn("export: write activity gpx", "activity_id", acts[i].ID, "err", err)
		}
	}
}

func writeManifest(zw *zip.Writer, u *users.User, acts []activities.Activity, earned []stamps.Earned) error {
	type manifestActivity struct {
		ID         string  `json:"id"`
		Source     string  `json:"source"`
		StartedAt  string  `json:"startedAt"`
		ElapsedSec int     `json:"elapsedSeconds"`
		DistanceM  float64 `json:"distanceMeters"`
		Title      string  `json:"title,omitempty"`
		City       string  `json:"city,omitempty"`
		Country    string  `json:"country,omitempty"`
		GPXFile    string  `json:"gpxFile,omitempty"`
	}
	type manifestUser struct {
		ID          string `json:"id"`
		Email       string `json:"email,omitempty"`
		DisplayName string `json:"displayName,omitempty"`
		Units       string `json:"units,omitempty"`
	}
	type manifest struct {
		App        string             `json:"app"`
		Format     string             `json:"format"`
		Version    int                `json:"version"`
		ExportedAt string             `json:"exportedAt"`
		User       manifestUser       `json:"user"`
		Activities []manifestActivity `json:"activities"`
		Stamps     []stamps.Earned    `json:"stamps"`
	}

	mu := manifestUser{ID: u.ID, Units: u.Units}
	if u.Email != nil {
		mu.Email = *u.Email
	}
	if u.DisplayName != nil {
		mu.DisplayName = *u.DisplayName
	}

	ma := make([]manifestActivity, len(acts))
	for i, a := range acts {
		ma[i] = manifestActivity{
			ID:         a.ID,
			Source:     a.Source,
			StartedAt:  a.StartedAt.UTC().Format(time.RFC3339),
			ElapsedSec: a.ElapsedSeconds,
			DistanceM:  a.DistanceM,
			GPXFile:    "activities/" + a.ID + ".gpx",
		}
		if a.Title != nil {
			ma[i].Title = *a.Title
		}
		if a.LocationCity != nil {
			ma[i].City = *a.LocationCity
		}
		if a.LocationCountry != nil {
			ma[i].Country = *a.LocationCountry
		}
	}

	m := manifest{
		App:        "Runstamp",
		Format:     "runstamp-export-v1",
		Version:    1,
		ExportedAt: time.Now().UTC().Format(time.RFC3339),
		User:       mu,
		Activities: ma,
		Stamps:     earned,
	}
	body, err := json.MarshalIndent(m, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal manifest: %w", err)
	}
	zf, err := zw.Create("runstamp-export.json")
	if err != nil {
		return fmt.Errorf("create manifest entry: %w", err)
	}
	if _, err := zf.Write(body); err != nil {
		return fmt.Errorf("write manifest body: %w", err)
	}
	return nil
}

func writeOneGPX(r *http.Request, h *ExportHandler, zw *zip.Writer, a *activities.Activity) error {
	streams, err := h.Activities.Repo().ListStreams(r.Context(), a.ID)
	if err != nil {
		return fmt.Errorf("list streams: %w", err)
	}

	set := export.StreamSet{}
	for _, s := range streams {
		switch s.Type {
		case "latlng":
			set.Latlng = export.ParseLatlngStream(s.Data)
		case "heartrate":
			set.Heartrate = export.ParseNumericStream(s.Data)
		case "altitude":
			set.Altitude = export.ParseNumericStream(s.Data)
		case "cadence":
			set.Cadence = export.ParseNumericStream(s.Data)
		case "speed":
			set.Speed = export.ParseNumericStream(s.Data)
		}
	}

	title := ""
	if a.Title != nil {
		title = *a.Title
	}
	ea := export.Activity{
		ID:              a.ID,
		Title:           title,
		Source:          a.Source,
		StartedAt:       a.StartedAt,
		ElapsedSec:      a.ElapsedSeconds,
		DistanceM:       a.DistanceM,
		AvgHR:           a.AvgHR,
		LocationCity:    a.LocationCity,
		LocationCountry: a.LocationCountry,
	}
	if a.ElevationGainM != nil {
		ea.ElevGainM = *a.ElevationGainM
	}

	body, err := export.BuildGPX(ea, set)
	if err != nil {
		return fmt.Errorf("build gpx: %w", err)
	}
	zf, err := zw.Create("activities/" + a.ID + ".gpx")
	if err != nil {
		return fmt.Errorf("create gpx entry: %w", err)
	}
	if _, err := zf.Write(body); err != nil {
		return fmt.Errorf("write gpx body: %w", err)
	}
	return nil
}
