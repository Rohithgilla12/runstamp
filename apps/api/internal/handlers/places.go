package handlers

import (
	"log/slog"
	"net/http"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/auth"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/places"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/stamps"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/users"
)

// PlacesHandler exposes the geocode backfill trigger for the Connections UI.
type PlacesHandler struct {
	Backfiller *places.Backfiller
	Evaluator  *stamps.Evaluator
	Users      *users.Repo
	Log        *slog.Logger
}

// Backfill handles POST /v1/places/backfill. Geocodes up to 50 of the
// caller's activities per request — keeps Nominatim happy and the response
// time bounded. Mobile can call multiple times until it sees `updated: 0`.
//
// Triggers a stamps re-evaluation after the backfill so place-based stamps
// (5 cities, 3 countries) fire on the same call.
func (h *PlacesHandler) Backfill(w http.ResponseWriter, r *http.Request) {
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
	updated, err := h.Backfiller.BackfillUser(r.Context(), user.ID, 50)
	if err != nil {
		h.Log.Error("places: backfill failed", "user_id", user.ID, "err", err)
		writeError(w, http.StatusInternalServerError, "backfill failed")
		return
	}
	var awarded []string
	if updated > 0 {
		awarded, _ = h.Evaluator.EvaluateForUser(r.Context(), user.ID)
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"updated":         updated,
		"awardedStamps":   awarded,
	})
}
