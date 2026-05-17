package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/auth"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/privacy"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/users"
	"github.com/go-chi/chi/v5"
)

// PrivacyZonesHandler serves /v1/privacy-zones. Auth-gated; the user must
// already be provisioned (any prior /v1/me call materialises the row).
type PrivacyZonesHandler struct {
	Zones *privacy.Repo
	Users *users.Repo
	Log   *slog.Logger
}

// Cap matches what's realistically useful. A runner with home + office +
// gym + a couple of family addresses comfortably fits, but past ~10 the
// list becomes hard to manage and you're better off using a custom mask.
const maxZonesPerUser = 10

type zoneResponse struct {
	ID      string  `json:"id"`
	Name    *string `json:"name,omitempty"`
	Lat     float64 `json:"lat"`
	Lng     float64 `json:"lng"`
	RadiusM int     `json:"radiusM"`
}

type listZonesResponse struct {
	Zones []zoneResponse `json:"zones"`
}

type createZoneRequest struct {
	Name    *string `json:"name,omitempty"`
	Lat     float64 `json:"lat"`
	Lng     float64 `json:"lng"`
	RadiusM int     `json:"radiusM"`
}

// List handles GET /v1/privacy-zones.
func (h *PrivacyZonesHandler) List(w http.ResponseWriter, r *http.Request) {
	user, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	zones, err := h.Zones.ListForUser(r.Context(), user.ID)
	if err != nil {
		h.Log.Error("privacy list", "err", err, "user_id", user.ID)
		writeError(w, http.StatusInternalServerError, "failed to list zones")
		return
	}
	out := listZonesResponse{Zones: make([]zoneResponse, 0, len(zones))}
	for _, z := range zones {
		out.Zones = append(out.Zones, zoneResponse{ID: z.ID, Name: z.Name, Lat: z.Lat, Lng: z.Lng, RadiusM: z.RadiusM})
	}
	writeJSON(w, http.StatusOK, out)
}

// Create handles POST /v1/privacy-zones.
func (h *PrivacyZonesHandler) Create(w http.ResponseWriter, r *http.Request) {
	user, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	var req createZoneRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	// Validate inputs. Tight bounds: lat ∈ [-90,90], lng ∈ [-180,180],
	// radius matches the DB CHECK constraint (50–1000m).
	if req.Lat < -90 || req.Lat > 90 {
		writeError(w, http.StatusBadRequest, "lat must be between -90 and 90")
		return
	}
	if req.Lng < -180 || req.Lng > 180 {
		writeError(w, http.StatusBadRequest, "lng must be between -180 and 180")
		return
	}
	if req.RadiusM < 50 || req.RadiusM > 1000 {
		writeError(w, http.StatusBadRequest, "radiusM must be between 50 and 1000")
		return
	}
	if req.Name != nil {
		trimmed := strings.TrimSpace(*req.Name)
		if len(trimmed) > 60 {
			trimmed = trimmed[:60]
		}
		if trimmed == "" {
			req.Name = nil
		} else {
			req.Name = &trimmed
		}
	}
	// Per-user cap.
	count, err := h.Zones.CountForUser(r.Context(), user.ID)
	if err != nil {
		h.Log.Error("privacy count", "err", err, "user_id", user.ID)
		writeError(w, http.StatusInternalServerError, "failed to count zones")
		return
	}
	if count >= maxZonesPerUser {
		writeError(w, http.StatusBadRequest, "you've hit the privacy-zone cap; delete one to add another")
		return
	}
	zone, err := h.Zones.Create(r.Context(), privacy.CreateZone{
		UserID:  user.ID,
		Name:    req.Name,
		Lat:     req.Lat,
		Lng:     req.Lng,
		RadiusM: req.RadiusM,
	})
	if err != nil {
		h.Log.Error("privacy create", "err", err, "user_id", user.ID)
		writeError(w, http.StatusInternalServerError, "failed to create zone")
		return
	}
	writeJSON(w, http.StatusCreated, zoneResponse{
		ID: zone.ID, Name: zone.Name, Lat: zone.Lat, Lng: zone.Lng, RadiusM: zone.RadiusM,
	})
}

// Delete handles DELETE /v1/privacy-zones/{id}.
func (h *PrivacyZonesHandler) Delete(w http.ResponseWriter, r *http.Request) {
	user, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "missing zone id")
		return
	}
	if err := h.Zones.Delete(r.Context(), user.ID, id); err != nil {
		if errors.Is(err, privacy.ErrNotFound) {
			writeError(w, http.StatusNotFound, "zone not found")
			return
		}
		h.Log.Error("privacy delete", "err", err, "user_id", user.ID, "zone_id", id)
		writeError(w, http.StatusInternalServerError, "failed to delete zone")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// requireUser pulls the authed user from the request and writes the error
// response on miss. Returns (user, true) on hit and (nil, false) on miss.
func (h *PrivacyZonesHandler) requireUser(w http.ResponseWriter, r *http.Request) (*users.User, bool) {
	vt, ok := auth.FromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing authentication")
		return nil, false
	}
	user, err := h.Users.FindByFirebaseUID(r.Context(), vt.UID)
	if err != nil {
		h.Log.Error("privacy: load user", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to load user")
		return nil, false
	}
	if user == nil {
		writeError(w, http.StatusNotFound, "user not provisioned")
		return nil, false
	}
	return user, true
}
