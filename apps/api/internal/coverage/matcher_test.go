package coverage

import (
	"context"
	"io"
	"log/slog"
	"slices"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/osm"
)

const (
	matcherUserID     = "00000000-0000-0000-0000-00000c0ffee1"
	matcherActivityID = "00000000-0000-0000-0000-0000ac710011"
	matcherWayID      = int64(999201)

	noGPSUserID     = "00000000-0000-0000-0000-00000c0ffee2"
	noGPSActivityID = "00000000-0000-0000-0000-0000ac710012"
)

func seedMatcherFixtures(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testPool(t)
	ctx := context.Background()

	// Clean up leftovers (dependency order)
	for _, actID := range []string{matcherActivityID, noGPSActivityID} {
		_, _ = pool.Exec(ctx, `DELETE FROM activity_covered_ways WHERE activity_id = $1`, actID)
		_, _ = pool.Exec(ctx, `DELETE FROM activity_streams WHERE activity_id = $1`, actID)
		_, _ = pool.Exec(ctx, `DELETE FROM activities WHERE id = $1`, actID)
	}
	_, _ = pool.Exec(ctx, `DELETE FROM osm_ways WHERE way_id = $1`, matcherWayID)
	for _, uid := range []string{matcherUserID, noGPSUserID} {
		_, _ = pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, uid)
	}
	// Clean up the region we'll seed
	_, _ = pool.Exec(ctx,
		`DELETE FROM osm_regions WHERE ST_Covers(bbox::geometry, ST_MakeEnvelope(0.99,0.99,1.02,1.01,4326))`)

	// Seed users
	for _, uid := range []string{matcherUserID, noGPSUserID} {
		_, err := pool.Exec(ctx,
			`INSERT INTO users (id, firebase_uid) VALUES ($1, $2)`,
			uid, "cov-matcher-"+uid,
		)
		if err != nil {
			t.Fatalf("seed user %s: %v", uid, err)
		}
	}

	// Seed main activity (has a latlng stream)
	_, err := pool.Exec(ctx,
		`INSERT INTO activities (id, user_id, source, external_id, started_at, elapsed_seconds, distance_m, sport)
		 VALUES ($1, $2, 'manual', 'cov-matcher-ext-1', now(), 3600, 10000, 'run')`,
		matcherActivityID, matcherUserID,
	)
	if err != nil {
		t.Fatalf("seed activity: %v", err)
	}

	// Seed no-GPS activity (no latlng stream)
	_, err = pool.Exec(ctx,
		`INSERT INTO activities (id, user_id, source, external_id, started_at, elapsed_seconds, distance_m, sport)
		 VALUES ($1, $2, 'manual', 'cov-matcher-ext-2', now(), 1800, 5000, 'run')`,
		noGPSActivityID, noGPSUserID,
	)
	if err != nil {
		t.Fatalf("seed no-gps activity: %v", err)
	}

	// Seed latlng stream: points along lat=1.0, lngs 1.002–1.008
	_, err = pool.Exec(ctx,
		`INSERT INTO activity_streams (activity_id, type, data)
		 VALUES ($1, 'latlng', '[[1.0,1.002],[1.0,1.004],[1.0,1.006],[1.0,1.008]]'::jsonb)`,
		matcherActivityID,
	)
	if err != nil {
		t.Fatalf("seed latlng stream: %v", err)
	}

	// Seed osm_ways: east-west line at lat=1.0, lon 1.0→1.01 (~1113m)
	_, err = pool.Exec(ctx,
		`INSERT INTO osm_ways (way_id, highway, geom, length_m)
		 VALUES ($1, 'residential', ST_GeogFromText('SRID=4326;LINESTRING(1.0 1.0, 1.01 1.0)'), 1113.0)`,
		matcherWayID,
	)
	if err != nil {
		t.Fatalf("seed osm_way: %v", err)
	}

	// Seed osm_regions covering the test bbox so EnsureRegion does not hit the network
	_, err = pool.Exec(ctx,
		`INSERT INTO osm_regions (bbox) VALUES (ST_MakeEnvelope(0.99,0.99,1.02,1.01,4326)::geography)`)
	if err != nil {
		t.Fatalf("seed osm_region: %v", err)
	}

	t.Cleanup(func() {
		bg := context.Background()
		for _, actID := range []string{matcherActivityID, noGPSActivityID} {
			_, _ = pool.Exec(bg, `DELETE FROM activity_covered_ways WHERE activity_id = $1`, actID)
			_, _ = pool.Exec(bg, `DELETE FROM activity_streams WHERE activity_id = $1`, actID)
			_, _ = pool.Exec(bg, `DELETE FROM activities WHERE id = $1`, actID)
		}
		_, _ = pool.Exec(bg, `DELETE FROM osm_ways WHERE way_id = $1`, matcherWayID)
		for _, uid := range []string{matcherUserID, noGPSUserID} {
			_, _ = pool.Exec(bg, `DELETE FROM users WHERE id = $1`, uid)
		}
		_, _ = pool.Exec(bg,
			`DELETE FROM osm_regions WHERE ST_Covers(bbox::geometry, ST_MakeEnvelope(0.99,0.99,1.02,1.01,4326))`)
	})

	return pool
}

func TestMatchActivity_Covered(t *testing.T) {
	pool := seedMatcherFixtures(t)
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	m := NewMatcher(pool, osm.NewImporter(pool, log), log)

	if err := m.MatchActivity(context.Background(), matcherActivityID); err != nil {
		t.Fatalf("MatchActivity: %v", err)
	}

	dbIDs := coveredWaysFor(t, pool, matcherActivityID)
	if !slices.Contains(dbIDs, matcherWayID) {
		t.Errorf("activity_covered_ways %v — want way %d", dbIDs, matcherWayID)
	}
}

func TestMatchActivity_NoGPS(t *testing.T) {
	pool := seedMatcherFixtures(t)
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	m := NewMatcher(pool, osm.NewImporter(pool, log), log)

	// Activity with no latlng stream — should return nil, no covered ways
	if err := m.MatchActivity(context.Background(), noGPSActivityID); err != nil {
		t.Fatalf("MatchActivity(no-GPS): %v", err)
	}

	dbIDs := coveredWaysFor(t, pool, noGPSActivityID)
	if len(dbIDs) != 0 {
		t.Errorf("expected no covered ways for treadmill activity, got %v", dbIDs)
	}
}
