package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/auth"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/push"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/users"
)

// DeviceTokenHandler accepts FCM token registrations from the mobile app.
// Idempotent — the mobile client should call on every cold start so we
// have the most recent token + last_seen_at.
type DeviceTokenHandler struct {
	Pusher *push.Pusher
	Users  *users.Repo
	Log    *slog.Logger
}

type deviceTokenRequest struct {
	Token    string `json:"token"`
	Platform string `json:"platform"`
}

func (h *DeviceTokenHandler) Register(w http.ResponseWriter, r *http.Request) {
	vt, ok := auth.FromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing authentication")
		return
	}
	var req deviceTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.Token == "" {
		writeError(w, http.StatusBadRequest, "token is required")
		return
	}
	if req.Platform != "ios" && req.Platform != "android" && req.Platform != "web" {
		writeError(w, http.StatusBadRequest, "platform must be ios|android|web")
		return
	}
	user, err := h.Users.FindByFirebaseUID(r.Context(), vt.UID)
	if err != nil || user == nil {
		writeError(w, http.StatusNotFound, "user not provisioned")
		return
	}
	if err := h.Pusher.UpsertToken(r.Context(), user.ID, req.Token, req.Platform); err != nil {
		h.Log.Error("device-token: upsert", "user_id", user.ID, "err", err)
		writeError(w, http.StatusInternalServerError, "failed to save token")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
