package coverage

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/osm"
)

const densifyStepM = 12.0 // half of snapM, so no street is skipped

// Matcher snaps an activity's route to the OSM street network and persists
// the covered ways.
type Matcher struct {
	pool *pgxpool.Pool
	repo *Repo
	osm  *osm.Importer
	log  *slog.Logger
}

func NewMatcher(pool *pgxpool.Pool, imp *osm.Importer, log *slog.Logger) *Matcher {
	return &Matcher{pool: pool, repo: NewRepo(pool), osm: imp, log: log}
}

// MatchActivity snaps one activity's route to streets. It may make a slow
// Overpass call on a new region, so callers must run it OFF the ingest hot
// path (e.g. in a goroutine). Returns errors for the caller to log.
func (m *Matcher) MatchActivity(ctx context.Context, activityID string) error {
	pts, err := m.loadLatLng(ctx, activityID)
	if err != nil {
		return err
	}
	if len(pts) < 2 {
		return nil // no GPS (treadmill) or fully masked
	}
	b := boundsOf(pts)
	if err := m.osm.EnsureRegion(ctx, b); err != nil {
		return fmt.Errorf("coverage: ensure region: %w", err)
	}
	dense := Densify(pts, densifyStepM)
	ids, err := m.repo.SnapAndStore(ctx, activityID, dense)
	if err != nil {
		return err
	}
	m.log.Info("coverage: matched activity", "activity", activityID, "ways", len(ids))
	return nil
}

// loadLatLng reads the activity's downsampled, privacy-masked latlng stream.
// activity_streams.data is a JSON array of [lat,lng] pairs.
func (m *Matcher) loadLatLng(ctx context.Context, activityID string) ([]LL, error) {
	var raw []byte
	err := m.pool.QueryRow(ctx, `
SELECT data FROM activity_streams WHERE activity_id = $1 AND type = 'latlng'`, activityID).Scan(&raw)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil // no GPS stream
		}
		return nil, fmt.Errorf("coverage: load latlng: %w", err)
	}
	var pairs [][2]float64
	if err := json.Unmarshal(raw, &pairs); err != nil {
		return nil, fmt.Errorf("coverage: decode latlng: %w", err)
	}
	out := make([]LL, 0, len(pairs))
	for _, p := range pairs {
		out = append(out, LL{Lat: p[0], Lng: p[1]})
	}
	return out, nil
}

func boundsOf(pts []LL) osm.BBox {
	b := osm.BBox{MinLat: pts[0].Lat, MaxLat: pts[0].Lat, MinLng: pts[0].Lng, MaxLng: pts[0].Lng}
	for _, p := range pts {
		if p.Lat < b.MinLat {
			b.MinLat = p.Lat
		}
		if p.Lat > b.MaxLat {
			b.MaxLat = p.Lat
		}
		if p.Lng < b.MinLng {
			b.MinLng = p.Lng
		}
		if p.Lng > b.MaxLng {
			b.MaxLng = p.Lng
		}
	}
	return b
}
