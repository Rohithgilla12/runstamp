package handlers

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/auth"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/coverage"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/users"
)

// CoverageHandler serves a user's explored-neighborhood street coverage for a
// city. Owner-only: reads only the authed user's own covered ways.
type CoverageHandler struct {
	Repo  *coverage.Repo
	Users *users.Repo
	Log   *slog.Logger
}

func (h *CoverageHandler) Get(w http.ResponseWriter, r *http.Request) {
	vt, ok := auth.FromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing authentication")
		return
	}
	user, err := h.Users.FindByFirebaseUID(r.Context(), vt.UID)
	if err != nil {
		h.Log.Error("coverage: load user", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to load user")
		return
	}
	if user == nil {
		writeError(w, http.StatusNotFound, "user not provisioned")
		return
	}
	city := chi.URLParam(r, "city")
	if city == "" {
		writeError(w, http.StatusBadRequest, "city required")
		return
	}
	cov, err := h.Repo.CityCoverage(r.Context(), user.ID, city)
	if err != nil {
		h.Log.Error("coverage: aggregate", "err", err, "user_id", user.ID, "city", city)
		writeError(w, http.StatusInternalServerError, "failed to compute coverage")
		return
	}
	writeJSON(w, http.StatusOK, cov)
}
