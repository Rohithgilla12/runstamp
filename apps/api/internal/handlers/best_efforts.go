package handlers

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/auth"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/users"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// BestEffortsHandler serves per-distance PRs from the user's canonical
// (non-dupe) runs. Each PR is the fastest contiguous segment covering that
// distance (the true "best 5K within a longer run"), precomputed at ingest
// and stored in activity_best_efforts. Read here as MIN(time_seconds) per
// distance.
type BestEffortsHandler struct {
	Pool  *pgxpool.Pool
	Users *users.Repo
	Log   *slog.Logger
}

type bestEffort struct {
	DistanceM   int     `json:"distanceM"`
	Label       string  `json:"label"`
	TimeSeconds int     `json:"timeSeconds"`
	AchievedAt  string  `json:"achievedAt"`
	ActivityID  string  `json:"activityId"`
}

type bestEffortsResponse struct {
	Efforts []bestEffort `json:"efforts"`
}

// Each "distance" PR is the fastest activity that covered AT LEAST this
// distance. Order matters for rendering — short → long.
var prDistances = []struct {
	meters int
	label  string
}{
	{1000, "1K"},
	{1609, "1 mile"},
	{5000, "5K"},
	{10000, "10K"},
	{21097, "Half marathon"},
	{42195, "Marathon"},
}

func (h *BestEffortsHandler) List(w http.ResponseWriter, r *http.Request) {
	vt, ok := auth.FromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing authentication")
		return
	}
	user, err := h.Users.FindByFirebaseUID(r.Context(), vt.UID)
	if err != nil {
		h.Log.Error("best-efforts: load user", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to load user")
		return
	}
	if user == nil {
		writeError(w, http.StatusNotFound, "user not provisioned")
		return
	}

	efforts, err := h.compute(r.Context(), user.ID)
	if err != nil {
		h.Log.Error("best-efforts: compute", "err", err, "user_id", user.ID)
		writeError(w, http.StatusInternalServerError, "failed to compute best efforts")
		return
	}
	writeJSON(w, http.StatusOK, bestEffortsResponse{Efforts: efforts})
}

func (h *BestEffortsHandler) compute(ctx context.Context, userID string) ([]bestEffort, error) {
	out := make([]bestEffort, 0, len(prDistances))
	for _, d := range prDistances {
		var (
			id        string
			elapsed   int
			startedAt time.Time
		)
		err := h.Pool.QueryRow(ctx, `
SELECT a.id, abe.time_seconds, a.started_at
FROM activity_best_efforts abe
JOIN activities a ON a.id = abe.activity_id
WHERE a.user_id = $1
  AND a.dupe_of IS NULL
  AND a.sport = 'run'
  AND abe.distance_m = $2
ORDER BY abe.time_seconds ASC
LIMIT 1`, userID, d.meters).Scan(&id, &elapsed, &startedAt)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				continue
			}
			return nil, err
		}
		out = append(out, bestEffort{
			DistanceM:   d.meters,
			Label:       d.label,
			TimeSeconds: elapsed,
			AchievedAt:  startedAt.UTC().Format(time.RFC3339),
			ActivityID:  id,
		})
	}
	return out, nil
}
