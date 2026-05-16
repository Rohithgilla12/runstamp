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
// Returns the number of activities updated. Individual lookup failures are
// logged and skipped so a transient Nominatim error doesn't strand the rest
// of the batch (the rate limiter already gates outbound requests at 1.1s,
// so failures don't burn the rate window).
type Backfiller struct {
	pool *pgxpool.Pool
	geo  *Geocoder
	log  *slog.Logger
}

func NewBackfiller(pool *pgxpool.Pool, geo *Geocoder, log *slog.Logger) *Backfiller {
	return &Backfiller{pool: pool, geo: geo, log: log}
}

// BackfillUser runs at most `limit` lookups for activities needing geocoding.
// limit 0 means unbounded (use carefully). It also rewrites any already-
// geocoded rows whose city name has a canonical alias (e.g. "Mumbai
// Suburban" → "Mumbai") so the Places list collapses correctly.
func (b *Backfiller) BackfillUser(ctx context.Context, userID string, limit int) (int, error) {
	// First, cheaply normalize any rows that already have a non-canonical
	// city name. No Nominatim call needed — just an UPDATE per alias.
	normalized, err := b.normalizeAliases(ctx, userID)
	if err != nil {
		b.log.Warn("places: alias normalization failed", "user_id", userID, "err", err)
	}

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

	updated := normalized
	for _, p := range todo {
		res, err := b.geo.Lookup(ctx, p.lat, p.lon)
		if err != nil {
			b.log.Warn("places: lookup failed mid-backfill", "user_id", userID, "activity_id", p.id, "err", err)
			continue
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

// normalizeAliases rewrites already-geocoded rows whose city name has a
// canonical form (CityAliases). One UPDATE per alias — cheap, no network.
func (b *Backfiller) normalizeAliases(ctx context.Context, userID string) (int, error) {
	total := 0
	for from, to := range CityAliases {
		tag, err := b.pool.Exec(ctx, `
UPDATE activities
SET location_city = $3
WHERE user_id = $1
  AND location_city = $2`, userID, from, to)
		if err != nil {
			return total, fmt.Errorf("places: normalize %q→%q: %w", from, to, err)
		}
		total += int(tag.RowsAffected())
	}
	return total, nil
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
