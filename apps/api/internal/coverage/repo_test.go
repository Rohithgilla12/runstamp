package coverage

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	testUserID     = "00000000-0000-0000-0000-00000c0ffee0"
	testActivityID = "00000000-0000-0000-0000-0000ac710010"
	testWayID      = int64(999101)
)

func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	u := os.Getenv("DATABASE_URL_TEST")
	if u == "" {
		t.Skip("set DATABASE_URL_TEST to run integration tests")
	}
	p, err := pgxpool.New(context.Background(), u)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(p.Close)
	return p
}

func seedFixtures(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()

	// Clean up leftovers first (in dependency order)
	_, _ = pool.Exec(ctx, `DELETE FROM activity_covered_ways WHERE activity_id = $1`, testActivityID)
	_, _ = pool.Exec(ctx, `DELETE FROM activities WHERE id = $1`, testActivityID)
	_, _ = pool.Exec(ctx, `DELETE FROM osm_ways WHERE way_id = $1`, testWayID)
	_, _ = pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, testUserID)

	// Seed user
	_, err := pool.Exec(ctx,
		`INSERT INTO users (id, firebase_uid) VALUES ($1, $2)`,
		testUserID, "cov-test",
	)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	// Seed activity
	_, err = pool.Exec(ctx,
		`INSERT INTO activities (id, user_id, source, external_id, started_at, elapsed_seconds, distance_m, sport)
		 VALUES ($1, $2, 'manual', 'cov-test-ext-1', now(), 3600, 10000, 'run')`,
		testActivityID, testUserID,
	)
	if err != nil {
		t.Fatalf("seed activity: %v", err)
	}

	// Seed osm_ways: straight east-west line at lat=1.0, lon 1.0→1.01 (~1113m)
	_, err = pool.Exec(ctx,
		`INSERT INTO osm_ways (way_id, highway, geom, length_m)
		 VALUES ($1, 'residential',
		         ST_GeogFromText('SRID=4326;LINESTRING(1.0 1.0, 1.01 1.0)'),
		         1113.0)`,
		testWayID,
	)
	if err != nil {
		t.Fatalf("seed osm_way: %v", err)
	}

	t.Cleanup(func() {
		ctx2 := context.Background()
		_, _ = pool.Exec(ctx2, `DELETE FROM activity_covered_ways WHERE activity_id = $1`, testActivityID)
		_, _ = pool.Exec(ctx2, `DELETE FROM activities WHERE id = $1`, testActivityID)
		_, _ = pool.Exec(ctx2, `DELETE FROM osm_ways WHERE way_id = $1`, testWayID)
		_, _ = pool.Exec(ctx2, `DELETE FROM users WHERE id = $1`, testUserID)
	})
}

func coveredWaysFor(t *testing.T, pool *pgxpool.Pool, activityID string) []int64 {
	t.Helper()
	rows, err := pool.Query(context.Background(),
		`SELECT way_id FROM activity_covered_ways WHERE activity_id = $1`, activityID)
	if err != nil {
		t.Fatalf("query covered ways: %v", err)
	}
	defer rows.Close()
	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			t.Fatalf("scan: %v", err)
		}
		ids = append(ids, id)
	}
	return ids
}

func containsWay(ids []int64, wayID int64) bool {
	for _, id := range ids {
		if id == wayID {
			return true
		}
	}
	return false
}

func TestSnapAndStore_Covered(t *testing.T) {
	pool := testPool(t)
	seedFixtures(t, pool)
	repo := NewRepo(pool)
	ctx := context.Background()

	// 4 points ON the line (lat=1.0, various lngs between 1.0 and 1.01)
	pts := []LL{
		{Lat: 1.0, Lng: 1.002},
		{Lat: 1.0, Lng: 1.004},
		{Lat: 1.0, Lng: 1.006},
		{Lat: 1.0, Lng: 1.008},
	}

	ids, err := repo.SnapAndStore(ctx, testActivityID, pts)
	if err != nil {
		t.Fatalf("SnapAndStore: %v", err)
	}
	if !containsWay(ids, testWayID) {
		t.Errorf("returned ids %v — want way %d", ids, testWayID)
	}

	dbIDs := coveredWaysFor(t, pool, testActivityID)
	if !containsWay(dbIDs, testWayID) {
		t.Errorf("DB covered ways %v — want way %d persisted", dbIDs, testWayID)
	}
}

func TestSnapAndStore_TooFar(t *testing.T) {
	pool := testPool(t)
	seedFixtures(t, pool)
	repo := NewRepo(pool)
	ctx := context.Background()

	// Points at lat=1.1 (~11 km north of the way — well outside 25m)
	pts := []LL{
		{Lat: 1.1, Lng: 1.002},
		{Lat: 1.1, Lng: 1.004},
		{Lat: 1.1, Lng: 1.006},
		{Lat: 1.1, Lng: 1.008},
	}

	ids, err := repo.SnapAndStore(ctx, testActivityID, pts)
	if err != nil {
		t.Fatalf("SnapAndStore: %v", err)
	}
	if containsWay(ids, testWayID) {
		t.Errorf("way %d should NOT be returned for far-away points", testWayID)
	}

	dbIDs := coveredWaysFor(t, pool, testActivityID)
	if containsWay(dbIDs, testWayID) {
		t.Errorf("way %d should NOT be in DB for far-away points", testWayID)
	}
}

func TestSnapAndStore_TooFewPoints(t *testing.T) {
	pool := testPool(t)
	seedFixtures(t, pool)
	repo := NewRepo(pool)
	ctx := context.Background()

	// Only 2 points on the line — below the minPtsPerWay=3 threshold
	pts := []LL{
		{Lat: 1.0, Lng: 1.002},
		{Lat: 1.0, Lng: 1.004},
	}

	ids, err := repo.SnapAndStore(ctx, testActivityID, pts)
	if err != nil {
		t.Fatalf("SnapAndStore: %v", err)
	}
	if containsWay(ids, testWayID) {
		t.Errorf("way %d should NOT be returned for only 2 points (need >= 3)", testWayID)
	}

	dbIDs := coveredWaysFor(t, pool, testActivityID)
	if containsWay(dbIDs, testWayID) {
		t.Errorf("way %d should NOT be in DB for too-few points", testWayID)
	}
}

func TestSnapAndStore_Replaces(t *testing.T) {
	pool := testPool(t)
	seedFixtures(t, pool)
	repo := NewRepo(pool)
	ctx := context.Background()

	// First call: COVERED — way should appear
	onPts := []LL{
		{Lat: 1.0, Lng: 1.002},
		{Lat: 1.0, Lng: 1.004},
		{Lat: 1.0, Lng: 1.006},
		{Lat: 1.0, Lng: 1.008},
	}
	if _, err := repo.SnapAndStore(ctx, testActivityID, onPts); err != nil {
		t.Fatalf("first SnapAndStore: %v", err)
	}
	dbIDs := coveredWaysFor(t, pool, testActivityID)
	if !containsWay(dbIDs, testWayID) {
		t.Fatalf("expected way %d after first call, got %v", testWayID, dbIDs)
	}

	// Second call: TOO FAR — should replace and leave empty
	farPts := []LL{
		{Lat: 1.1, Lng: 1.002},
		{Lat: 1.1, Lng: 1.004},
		{Lat: 1.1, Lng: 1.006},
		{Lat: 1.1, Lng: 1.008},
	}
	if _, err := repo.SnapAndStore(ctx, testActivityID, farPts); err != nil {
		t.Fatalf("second SnapAndStore: %v", err)
	}
	dbIDs = coveredWaysFor(t, pool, testActivityID)
	if len(dbIDs) != 0 {
		t.Errorf("after replacement with far points, expected empty covered_ways, got %v", dbIDs)
	}
}
