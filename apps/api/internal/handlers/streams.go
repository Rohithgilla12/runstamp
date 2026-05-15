package handlers

import (
	"log/slog"
	"net/http"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/activities"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/auth"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/users"
	"github.com/go-chi/chi/v5"
)

// StreamsHandler serves GET /v1/activities/:id/streams — the downsampled
// per-activity time series (latlng for map, HR/altitude/velocity for charts).
type StreamsHandler struct {
	Activities *activities.Service
	Users      *users.Repo
	Log        *slog.Logger
}

type streamsResponse struct {
	ActivityID string               `json:"activityId"`
	Streams    []activities.Stream  `json:"streams"`
}

func (h *StreamsHandler) List(w http.ResponseWriter, r *http.Request) {
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
	owner, err := h.Activities.Repo().OwnerOf(r.Context(), id)
	if err != nil {
		h.Log.Error("streams: owner lookup", "err", err)
		writeError(w, http.StatusInternalServerError, "lookup failed")
		return
	}
	// Treat missing or other-user-owned IDs identically so we don't leak
	// existence to other users.
	if owner == "" || owner != user.ID {
		writeError(w, http.StatusNotFound, "activity not found")
		return
	}
	streams, err := h.Activities.Repo().ListStreams(r.Context(), id)
	if err != nil {
		h.Log.Error("streams: list", "err", err, "activity_id", id)
		writeError(w, http.StatusInternalServerError, "failed to load streams")
		return
	}
	writeJSON(w, http.StatusOK, streamsResponse{
		ActivityID: id,
		Streams:    streams,
	})
}
