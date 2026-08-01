package handlers

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/exercisedb"
)

// ExercisesHandler proxies AscendAPI's ExerciseDB through our backend so the
// mobile app never holds the RapidAPI key. Results are cached in the service.
type ExercisesHandler struct {
	Service *exercisedb.Service
	Log     *slog.Logger
}

const defaultSearchLimit = 15

// Search: GET /v1/exercises/search?q=<query>&limit=<n>
func (h *ExercisesHandler) Search(w http.ResponseWriter, r *http.Request) {
	if !h.enabled(w) {
		return
	}
	q := r.URL.Query().Get("q")
	if q == "" {
		writeError(w, http.StatusBadRequest, "q required")
		return
	}
	limit := defaultSearchLimit
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 50 {
			limit = n
		}
	}
	res, err := h.Service.Search(r.Context(), q, limit)
	if err != nil {
		h.upstreamError(w, "search", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"exercises": res})
}

// Get: GET /v1/exercises/{id}
func (h *ExercisesHandler) Get(w http.ResponseWriter, r *http.Request) {
	if !h.enabled(w) {
		return
	}
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "id required")
		return
	}
	ex, err := h.Service.GetByID(r.Context(), id)
	if err != nil {
		h.upstreamError(w, "get", err)
		return
	}
	writeJSON(w, http.StatusOK, ex)
}

// Find: GET /v1/exercises/find?name=<name>
// Resolves a plain exercise name to a full object — used to enrich curated
// routine moves that key off names rather than upstream ids.
func (h *ExercisesHandler) Find(w http.ResponseWriter, r *http.Request) {
	if !h.enabled(w) {
		return
	}
	name := r.URL.Query().Get("name")
	if name == "" {
		writeError(w, http.StatusBadRequest, "name required")
		return
	}
	ex, err := h.Service.FindByName(r.Context(), name)
	if err != nil {
		h.upstreamError(w, "find", err)
		return
	}
	writeJSON(w, http.StatusOK, ex)
}

// enabled short-circuits with 503 when no RapidAPI key is configured, so the
// mobile client can degrade to its bundled dataset without treating it as an
// error worth surfacing.
func (h *ExercisesHandler) enabled(w http.ResponseWriter) bool {
	if h.Service == nil || !h.Service.Enabled() {
		writeError(w, http.StatusServiceUnavailable, "exercise catalogue not configured")
		return false
	}
	return true
}

func (h *ExercisesHandler) upstreamError(w http.ResponseWriter, op string, err error) {
	if errors.Is(err, exercisedb.ErrNotFound) {
		writeError(w, http.StatusNotFound, "exercise not found")
		return
	}
	h.Log.Error("exercises: "+op, "err", err)
	writeError(w, http.StatusBadGateway, "exercise catalogue unavailable")
}
