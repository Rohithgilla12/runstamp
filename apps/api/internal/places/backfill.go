package places

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Backfill iterates over the user's activities that have start coords but no
// city/country, calls Lookup on each, and writes the result back. Caller
// controls the batch size — typically a few hundred per invocation since
// Nominatim is 1 req/sec.
//
// Returns the number of activities updated. Stops at the first geocoder error
// (likely a Nominatim 429) so we don't burn through the rate window with
// repeated failures.
type Backfiller struct {
	pool *pgxpool.Pool
	geo  *Geocoder
	log  *slog.Logger
}

func NewBackfiller(pool *pgxpool.Pool, geo *Geocoder, log *slog.Logger) *Backfiller {
	return &Backfiller{pool: pool, geo: geo, log: log}
}

// BackfillUser runs at most `limit` lookups for activities needing geocoding.
// limit 0 means unbounded (use carefully).
func (b *Backfiller) BackfillUser(ctx context.Context, userID string, limit int) (int, error) {
	q := `
SELECT id, ST_Y(location_start::geometry) AS lat, ST_X(location_start::geometry) AS lon
FROM activities
WHERE user_id = $1
  AND location_start IS NOT NULL
  AND (location_city IS NULL OR location_city = '')`
	args := []any{userID}
	if limit > 0 {
		q += " LIMIT $2"
		args = append(args, limit)
	}
	rows, err := b.pool.Query(ctx, q, args...)
	if err != nil {
		return 0, fmt.Errorf("places: backfill query: %w", err)
	}
	type pending struct {
		id  string
		lat float64
		lon float64
	}
	var todo []pending
	for rows.Next() {
		var p pending
		if err := rows.Scan(&p.id, &p.lat, &p.lon); err != nil {
			rows.Close()
			return 0, fmt.Errorf("places: backfill scan: %w", err)
		}
		todo = append(todo, p)
	}
	rows.Close()

	updated := 0
	for _, p := range todo {
		res, err := b.geo.Lookup(ctx, p.lat, p.lon)
		if err != nil {
			b.log.Warn("places: lookup failed mid-backfill", "user_id", userID, "activity_id", p.id, "err", err)
			break
		}
		if res.City == "" && res.Country == "" {
			continue
		}
		_, err = b.pool.Exec(ctx, `
UPDATE activities
SET location_city = COALESCE(NULLIF(location_city, ''), $2),
    location_country = COALESCE(NULLIF(location_country, ''), $3)
WHERE id = $1`, p.id, nullable(res.City), nullable(res.Country))
		if err != nil {
			b.log.Warn("places: update failed", "activity_id", p.id, "err", err)
			continue
		}
		updated++
	}
	return updated, nil
}

// GeocodeActivity is the single-activity entry point used by the post-ingest
// hook. Idempotent — no-op when there's no start coord or the activity
// already has city + country.
func (b *Backfiller) GeocodeActivity(ctx context.Context, activityID string) error {
	var (
		hasLoc bool
		lat    float64
		lon    float64
		city   *string
		ctry   *string
	)
	err := b.pool.QueryRow(ctx, `
SELECT location_start IS NOT NULL,
       COALESCE(ST_Y(location_start::geometry), 0),
       COALESCE(ST_X(location_start::geometry), 0),
       location_city,
       location_country
FROM activities WHERE id = $1`, activityID).Scan(&hasLoc, &lat, &lon, &city, &ctry)
	if err != nil {
		return fmt.Errorf("places: read activity: %w", err)
	}
	if !hasLoc {
		return nil
	}
	if (city != nil && *city != "") && (ctry != nil && *ctry != "") {
		return nil
	}
	res, err := b.geo.Lookup(ctx, lat, lon)
	if err != nil {
		return err
	}
	if res.City == "" && res.Country == "" {
		return nil
	}
	_, err = b.pool.Exec(ctx, `
UPDATE activities
SET location_city = COALESCE(NULLIF(location_city, ''), $2),
    location_country = COALESCE(NULLIF(location_country, ''), $3)
WHERE id = $1`, activityID, nullable(res.City), nullable(res.Country))
	return err
}
