package handlers

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/auth"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/users"
	"github.com/jackc/pgx/v5/pgxpool"
)

// BestEffortsHandler computes per-distance PRs from the user's canonical
// (non-dupe) activities. We approximate by finding the fastest run that
// covers >= distance — i.e. a 5K PR is min(elapsed_seconds) over runs that
// went >= 5000m. This isn't a true "best 5K split inside a longer run"
// (that needs the GPS stream); a stream-backed implementation lands later
// once we ingest the polyline. For now this matches what Strava's free tier
// surfaces and is good enough to render the Analytics PRs section.
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
SELECT id, elapsed_seconds, started_at
FROM activities
WHERE user_id = $1
  AND dupe_of IS NULL
  AND sport = 'run'
  AND distance_m >= $2
ORDER BY elapsed_seconds ASC
LIMIT 1`, userID, d.meters).Scan(&id, &elapsed, &startedAt)
		if err != nil {
			if err.Error() == "no rows in result set" {
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
