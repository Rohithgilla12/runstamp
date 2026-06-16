package osm

import (
	"context"
	"io"
	"log/slog"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	url := os.Getenv("DATABASE_URL_TEST")
	if url == "" {
		t.Skip("set DATABASE_URL_TEST to run integration tests")
	}
	pool, err := pgxpool.New(context.Background(), url)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func TestIntegrationUpsertAndEnsureRegion(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()

	// Use a bbox far from real data (around lat 1.0 / lng 1.0) so we don't
	// collide with real imported ways.
	testBBox := BBox{MinLat: 1.0, MinLng: 1.0, MaxLat: 1.1, MaxLng: 1.1}
	innerBBox := BBox{MinLat: 1.02, MinLng: 1.02, MaxLat: 1.08, MaxLng: 1.08}
	testWayIDs := []int64{999001, 999002}

	// Cleanup before and after so the test is idempotent.
	cleanup := func() {
		_, _ = pool.Exec(ctx, `DELETE FROM osm_ways WHERE way_id = ANY($1::bigint[])`, testWayIDs)
		_, _ = pool.Exec(ctx,
			`DELETE FROM osm_regions WHERE ST_Covers(bbox::geometry, ST_MakeEnvelope($1,$2,$3,$4,4326))`,
			testBBox.MinLng, testBBox.MinLat, testBBox.MaxLng, testBBox.MaxLat)
	}
	cleanup()
	t.Cleanup(cleanup)

	fixtureWays := []Way{
		{
			WayID:   999001,
			Highway: "residential",
			Name:    "Test Street",
			Geometry: [][2]float64{
				{1.01, 1.01}, // lat, lng
				{1.02, 1.02},
			},
			LengthM: 1570.0,
		},
		{
			WayID:   999002,
			Highway: "footway",
			Name:    "",
			Geometry: [][2]float64{
				{1.05, 1.05},
				{1.06, 1.06},
			},
			LengthM: 1570.0,
		},
	}

	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	imp := NewImporter(pool, log)

	// Insert the fixture ways and register the region.
	if err := imp.Upsert(ctx, testBBox, fixtureWays); err != nil {
		t.Fatalf("Upsert: %v", err)
	}

	// Verify way 999001 was written correctly.
	var highway, name string
	var lengthM float64
	err := pool.QueryRow(ctx,
		`SELECT highway, COALESCE(name,''), length_m FROM osm_ways WHERE way_id = $1`, 999001).
		Scan(&highway, &name, &lengthM)
	if err != nil {
		t.Fatalf("query way 999001: %v", err)
	}
	if highway != "residential" {
		t.Errorf("highway = %q, want %q", highway, "residential")
	}
	if name != "Test Street" {
		t.Errorf("name = %q, want %q", name, "Test Street")
	}
	if lengthM < 1000 || lengthM > 3000 {
		t.Errorf("length_m = %.0f, expected roughly 1570", lengthM)
	}

	// Verify way 999002 (no name) was written.
	var count int
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM osm_ways WHERE way_id = $1`, 999002).Scan(&count); err != nil {
		t.Fatalf("query way 999002 count: %v", err)
	}
	if count != 1 {
		t.Errorf("expected 1 row for way 999002, got %d", count)
	}

	// Verify the region row was recorded.
	var regionCount int
	if err := pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM osm_regions WHERE ST_Covers(bbox::geometry, ST_MakeEnvelope($1,$2,$3,$4,4326))`,
		testBBox.MinLng, testBBox.MinLat, testBBox.MaxLng, testBBox.MaxLat).Scan(&regionCount); err != nil {
		t.Fatalf("query region count: %v", err)
	}
	if regionCount != 1 {
		t.Errorf("expected 1 region row, got %d", regionCount)
	}

	// EnsureRegion with an innerBBox fully contained in the already-imported
	// region should return nil without adding a second region row.
	if err := imp.EnsureRegion(ctx, innerBBox); err != nil {
		t.Fatalf("EnsureRegion(innerBBox): %v", err)
	}

	// Confirm no second region was added.
	if err := pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM osm_regions WHERE ST_Covers(bbox::geometry, ST_MakeEnvelope($1,$2,$3,$4,4326))`,
		testBBox.MinLng, testBBox.MinLat, testBBox.MaxLng, testBBox.MaxLat).Scan(&regionCount); err != nil {
		t.Fatalf("query region count after EnsureRegion: %v", err)
	}
	if regionCount != 1 {
		t.Errorf("EnsureRegion added a second region; expected 1 region, got %d", regionCount)
	}
}
