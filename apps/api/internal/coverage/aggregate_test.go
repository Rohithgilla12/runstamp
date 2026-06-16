package coverage

import (
	"context"
	"testing"
)

const (
	covUserID     = "00000000-0000-0000-0000-0000000000ca"
	covActivityID = "00000000-0000-0000-0000-0000000000c1"
)

const (
	covWayA = int64(999301)
	covWayB = int64(999302)
	covWayC = int64(999303)
)

func TestCityCoverage(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()

	// Clean up in dependency order (handle leftovers from previous runs)
	cleanup := func() {
		ctx2 := context.Background()
		_, _ = pool.Exec(ctx2, `DELETE FROM activity_covered_ways WHERE activity_id = $1`, covActivityID)
		_, _ = pool.Exec(ctx2, `DELETE FROM activities WHERE id = $1`, covActivityID)
		_, _ = pool.Exec(ctx2, `DELETE FROM osm_ways WHERE way_id IN ($1, $2, $3)`, covWayA, covWayB, covWayC)
		_, _ = pool.Exec(ctx2, `DELETE FROM users WHERE id = $1`, covUserID)
	}
	cleanup()
	t.Cleanup(cleanup)

	// Seed user
	_, err := pool.Exec(ctx,
		`INSERT INTO users (id, firebase_uid) VALUES ($1, $2)`,
		covUserID, "cov-agg-test",
	)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	// Seed activity with location_city = 'Testville'
	_, err = pool.Exec(ctx,
		`INSERT INTO activities (id, user_id, source, external_id, started_at, elapsed_seconds, distance_m, sport, location_city)
		 VALUES ($1, $2, 'manual', 'cov-agg-ext-1', now(), 3600, 5000, 'run', 'Testville')`,
		covActivityID, covUserID,
	)
	if err != nil {
		t.Fatalf("seed activity: %v", err)
	}

	// Seed osm_ways:
	// 999301: A St — east-west at lat=2.000, ~222m
	_, err = pool.Exec(ctx,
		`INSERT INTO osm_ways (way_id, highway, name, geom, length_m)
		 VALUES ($1, 'residential', 'A St',
		         ST_GeogFromText('SRID=4326;LINESTRING(2.000 2.000, 2.002 2.000)'),
		         222.0)`,
		covWayA,
	)
	if err != nil {
		t.Fatalf("seed way A: %v", err)
	}

	// 999302: B St — east-west at lat=2.001, ~222m
	_, err = pool.Exec(ctx,
		`INSERT INTO osm_ways (way_id, highway, name, geom, length_m)
		 VALUES ($1, 'residential', 'B St',
		         ST_GeogFromText('SRID=4326;LINESTRING(2.000 2.001, 2.002 2.001)'),
		         222.0)`,
		covWayB,
	)
	if err != nil {
		t.Fatalf("seed way B: %v", err)
	}

	// 999303: C St — north-south cross street, ~111m
	_, err = pool.Exec(ctx,
		`INSERT INTO osm_ways (way_id, highway, name, geom, length_m)
		 VALUES ($1, 'residential', 'C St',
		         ST_GeogFromText('SRID=4326;LINESTRING(2.000 2.000, 2.000 2.001)'),
		         111.0)`,
		covWayC,
	)
	if err != nil {
		t.Fatalf("seed way C: %v", err)
	}

	// Cover A and B, but NOT C
	_, err = pool.Exec(ctx,
		`INSERT INTO activity_covered_ways (activity_id, way_id) VALUES ($1, $2), ($1, $3)`,
		covActivityID, covWayA, covWayB,
	)
	if err != nil {
		t.Fatalf("seed covered ways: %v", err)
	}

	repo := NewRepo(pool)

	t.Run("Testville", func(t *testing.T) {
		cov, err := repo.CityCoverage(ctx, covUserID, "Testville")
		if err != nil {
			t.Fatalf("CityCoverage: %v", err)
		}

		if cov.UniqueStreets != 2 {
			t.Errorf("UniqueStreets = %d, want 2", cov.UniqueStreets)
		}

		if cov.CoveredKm <= 0.3 || cov.CoveredKm >= 0.6 {
			t.Errorf("CoveredKm = %f, want in (0.3, 0.6)", cov.CoveredKm)
		}

		if cov.HullKm < cov.CoveredKm {
			t.Errorf("HullKm %f < CoveredKm %f", cov.HullKm, cov.CoveredKm)
		}

		if cov.Pct <= 0 || cov.Pct > 1 {
			t.Errorf("Pct = %f, want in (0, 1]", cov.Pct)
		}

		if len(cov.Covered) != 2 {
			t.Errorf("len(Covered) = %d, want 2", len(cov.Covered))
		}

		if len(cov.Uncovered) < 1 {
			t.Errorf("len(Uncovered) = %d, want >= 1 (C St should be uncovered)", len(cov.Uncovered))
		}

		for i, poly := range cov.Covered {
			if len(poly) < 2 {
				t.Errorf("Covered[%d] has %d points, want >= 2", i, len(poly))
				continue
			}
			for j, pt := range poly {
				lat := pt[0]
				if lat < 1.99 || lat > 2.01 {
					t.Errorf("Covered[%d][%d] lat = %f, want ≈ 2.0", i, j, lat)
				}
			}
		}
	})

	t.Run("Nowhere", func(t *testing.T) {
		cov, err := repo.CityCoverage(ctx, covUserID, "Nowhere")
		if err != nil {
			t.Fatalf("CityCoverage Nowhere: %v", err)
		}
		if cov.CoveredKm != 0 {
			t.Errorf("Nowhere CoveredKm = %f, want 0", cov.CoveredKm)
		}
		if cov.UniqueStreets != 0 {
			t.Errorf("Nowhere UniqueStreets = %d, want 0", cov.UniqueStreets)
		}
		if len(cov.Covered) != 0 {
			t.Errorf("Nowhere len(Covered) = %d, want 0", len(cov.Covered))
		}
		if cov.Pct != 0 {
			t.Errorf("Nowhere Pct = %f, want 0", cov.Pct)
		}
		if cov.HullKm != 0 {
			t.Errorf("Nowhere HullKm = %v, want 0", cov.HullKm)
		}
	})
}
