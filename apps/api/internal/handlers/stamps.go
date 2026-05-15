package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/auth"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/stamps"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/users"
)

// StampsHandler serves the stamps endpoints. The catalog is public-ish (any
// authenticated user gets the same list); earned stamps are per-user.
type StampsHandler struct {
	Stamps    *stamps.Repository
	Evaluator *stamps.Evaluator
	Users     *users.Repo
	Log       *slog.Logger
}

type stampDefinitionResponse struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Tier        string          `json:"tier"`
	Category    string          `json:"category"`
	Criteria    json.RawMessage `json:"criteria"`
	SortOrder   int             `json:"sortOrder"`
}

type earnedStampResponse struct {
	StampID    string          `json:"stampId"`
	EarnedAt   string          `json:"earnedAt"`
	ActivityID *string         `json:"activityId,omitempty"`
	Context    json.RawMessage `json:"context,omitempty"`
}

type listStampsResponse struct {
	Catalog []stampDefinitionResponse `json:"catalog"`
	Earned  []earnedStampResponse     `json:"earned"`
}

// List handles GET /v1/stamps — returns both the catalog and the caller's
// earned stamps. One call so the mobile renders the locked grid + earned
// markers without two round-trips.
func (h *StampsHandler) List(w http.ResponseWriter, r *http.Request) {
	vt, ok := auth.FromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing authentication")
		return
	}
	user, err := h.Users.FindByFirebaseUID(r.Context(), vt.UID)
	if err != nil {
		h.Log.Error("stamps list: load user", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to load user")
		return
	}
	if user == nil {
		writeError(w, http.StatusNotFound, "user not provisioned")
		return
	}
	defs, err := h.Stamps.ListDefinitions(r.Context())
	if err != nil {
		h.Log.Error("stamps list: definitions", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to load catalog")
		return
	}
	earned, err := h.Stamps.ListEarnedForUser(r.Context(), user.ID)
	if err != nil {
		h.Log.Error("stamps list: earned", "err", err, "user_id", user.ID)
		writeError(w, http.StatusInternalServerError, "failed to load earned stamps")
		return
	}
	resp := listStampsResponse{
		Catalog: make([]stampDefinitionResponse, 0, len(defs)),
		Earned:  make([]earnedStampResponse, 0, len(earned)),
	}
	for _, d := range defs {
		resp.Catalog = append(resp.Catalog, stampDefinitionResponse{
			ID:          d.ID,
			Name:        d.Name,
			Description: d.Description,
			Tier:        d.Tier,
			Category:    d.Category,
			Criteria:    d.Criteria,
			SortOrder:   d.SortOrder,
		})
	}
	for _, e := range earned {
		resp.Earned = append(resp.Earned, earnedStampResponse{
			StampID:    e.StampID,
			EarnedAt:   e.EarnedAt.UTC().Format(time.RFC3339),
			ActivityID: e.ActivityID,
			Context:    e.Context,
		})
	}
	writeJSON(w, http.StatusOK, resp)
}

// Reevaluate handles POST /v1/stamps/reevaluate — manual trigger for the
// evaluator, useful for users with imported history that pre-dates the
// stamps engine going live, or while developing new rules.
func (h *StampsHandler) Reevaluate(w http.ResponseWriter, r *http.Request) {
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
	awarded, err := h.Evaluator.EvaluateForUser(r.Context(), user.ID)
	if err != nil {
		h.Log.Error("stamps: manual reevaluate failed", "user_id", user.ID, "err", err)
		writeError(w, http.StatusInternalServerError, "evaluator failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"awarded": awarded})
}
