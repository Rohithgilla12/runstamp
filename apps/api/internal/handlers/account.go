package handlers

import (
	"log/slog"
	"net/http"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/auth"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/users"
)

// AccountHandler covers user-account self-service (delete for now).
type AccountHandler struct {
	Users *users.Repo
	Log   *slog.Logger
}

// Delete handles DELETE /v1/me. Hard-deletes the user row; cascading FKs
// nuke activities, streams, strava connections, stamps_earned. Firebase
// account stays — the mobile app deletes the Firebase user separately so
// re-signing-in produces a fresh account.
//
// Idempotent: deleting an already-gone user returns 204 (we treat the
// Firebase token's uid lookup miss as "already deleted").
func (h *AccountHandler) Delete(w http.ResponseWriter, r *http.Request) {
	vt, ok := auth.FromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing authentication")
		return
	}
	user, err := h.Users.FindByFirebaseUID(r.Context(), vt.UID)
	if err != nil {
		h.Log.Error("account delete: load user", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to load user")
		return
	}
	if user == nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if err := h.Users.Delete(r.Context(), user.ID); err != nil {
		h.Log.Error("account delete: hard delete failed", "user_id", user.ID, "err", err)
		writeError(w, http.StatusInternalServerError, "delete failed")
		return
	}
	h.Log.Info("account deleted", "user_id", user.ID)
	w.WriteHeader(http.StatusNoContent)
}
