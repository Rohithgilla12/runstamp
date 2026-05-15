// Package activities owns the persistence layer for the cross-source activities
// table. Both Strava and Apple Health ingest through this package, so the dedup
// logic is centralised here rather than duplicated per-source.
package activities

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound is returned by repo reads when no row matches.
var ErrNotFound = errors.New("activities: not found")

// Activity is an in-memory view of one activities row.
type Activity struct {
	ID              string
	UserID          string
	Source          string
	ExternalID      string
	Sport           string
	StartedAt       time.Time
	ElapsedSeconds  int
	MovingSeconds   *int
	DistanceM       float64
	ElevationGainM  *float64
	AvgHR           *int
	MaxHR           *int
	AvgPaceSPerKm   *float64
	Calories        *int
	Title           *string
	Notes           *string
	StartLat        *float64
	StartLon        *float64
	LocationCity    *string
	LocationCountry *string
	Raw             *json.RawMessage
	DupeOf          *string
	IngestedAt      time.Time
}

// Repository wraps a pgxpool and performs CRUD on the activities table.
type Repository struct {
	pool *pgxpool.Pool
}

// NewRepository constructs a Repository.
func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// Insert writes a new activities row and returns the persisted record.
// The INSERT uses ON CONFLICT (user_id, source, external_id) DO NOTHING so
// a duplicate event from the same source is a no-op; in that case we
// re-SELECT and return the existing row (its ID is the canonical ID for
// this source+external_id pair).
func (r *Repository) Insert(ctx context.Context, a *Activity) (*Activity, error) {
	return r.insertWithQuerier(ctx, pgxRowQuerier{pool: r.pool}, a)
}

// insertTx is the transactional variant used by the Service's Ingest method.
func (r *Repository) insertTx(ctx context.Context, tx pgx.Tx, a *Activity) (*Activity, error) {
	return r.insertWithQuerier(ctx, txRowQuerier{tx: tx}, a)
}

// insertWithQuerier executes the INSERT using whichever row-query surface is
// provided (pool or transaction).
func (r *Repository) insertWithQuerier(ctx context.Context, q rowQuerier, a *Activity) (*Activity, error) {
	if a.StartLat != nil && a.StartLon != nil {
		const sql = `
INSERT INTO activities (
  user_id, source, external_id, sport, started_at,
  elapsed_seconds, moving_seconds, distance_m, elevation_gain_m,
  location_start,
  avg_hr, max_hr, avg_pace_s_per_km, calories,
  title, notes,
  location_city, location_country,
  raw, dupe_of
) VALUES (
  $1,  $2,  $3,  $4,  $5,
  $6,  $7,  $8,  $9,
  ST_SetSRID(ST_MakePoint($10, $11), 4326)::geography,
  $12, $13, $14, $15,
  $16, $17,
  $18, $19,
  $20, $21
)
ON CONFLICT (user_id, source, external_id) DO NOTHING
RETURNING id, ingested_at`

		row := q.QueryRow(ctx, sql,
			a.UserID, a.Source, a.ExternalID, a.Sport, a.StartedAt,
			a.ElapsedSeconds, a.MovingSeconds, a.DistanceM, a.ElevationGainM,
			*a.StartLon, *a.StartLat,
			a.AvgHR, a.MaxHR, a.AvgPaceSPerKm, a.Calories,
			a.Title, a.Notes,
			a.LocationCity, a.LocationCountry,
			a.Raw, a.DupeOf,
		)
		return r.scanInsertResult(ctx, q, row, a)
	}

	const sql = `
INSERT INTO activities (
  user_id, source, external_id, sport, started_at,
  elapsed_seconds, moving_seconds, distance_m, elevation_gain_m,
  location_start,
  avg_hr, max_hr, avg_pace_s_per_km, calories,
  title, notes,
  location_city, location_country,
  raw, dupe_of
) VALUES (
  $1,  $2,  $3,  $4,  $5,
  $6,  $7,  $8,  $9,
  NULL,
  $10, $11, $12, $13,
  $14, $15,
  $16, $17,
  $18, $19
)
ON CONFLICT (user_id, source, external_id) DO NOTHING
RETURNING id, ingested_at`

	row := q.QueryRow(ctx, sql,
		a.UserID, a.Source, a.ExternalID, a.Sport, a.StartedAt,
		a.ElapsedSeconds, a.MovingSeconds, a.DistanceM, a.ElevationGainM,
		a.AvgHR, a.MaxHR, a.AvgPaceSPerKm, a.Calories,
		a.Title, a.Notes,
		a.LocationCity, a.LocationCountry,
		a.Raw, a.DupeOf,
	)
	return r.scanInsertResult(ctx, q, row, a)
}

func (r *Repository) scanInsertResult(ctx context.Context, q rowQuerier, row pgx.Row, a *Activity) (*Activity, error) {
	var id string
	var ingestedAt time.Time
	if err := row.Scan(&id, &ingestedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Conflict: row already existed — re-select so we return the real ID.
			return r.findBySourceExternalQ(ctx, q, a.UserID, a.Source, a.ExternalID)
		}
		return nil, fmt.Errorf("activities: insert: %w", err)
	}
	out := *a
	out.ID = id
	out.IngestedAt = ingestedAt
	return &out, nil
}

// InsertStream writes a downsampled stream for an activity. ON CONFLICT
// replaces the existing row so a re-ingest overwrites the stale stream.
func (r *Repository) InsertStream(ctx context.Context, activityID, kind string, data []byte) error {
	_, err := r.pool.Exec(ctx, `
INSERT INTO activity_streams (activity_id, type, data)
VALUES ($1, $2, $3)
ON CONFLICT (activity_id, type) DO UPDATE SET data = EXCLUDED.data`,
		activityID, kind, data)
	if err != nil {
		return fmt.Errorf("activities: insert stream: %w", err)
	}
	return nil
}

// FindDuplicate looks for an existing canonical activity (dupe_of IS NULL) for
// the same user where started_at is within ±60 s and distance_m is within ±2%
// of the candidate. The source parameter is the source of the *incoming* row;
// the query returns only rows from a *different* source. Returns (nil, nil)
// if no match is found.
//
// Dedup flip rule — Strava wins as canonical:
//   - Incoming source is "apple_health", match source is "strava": the incoming
//     row should set dupe_of = match.id (Strava is already canonical).
//   - Incoming source is "strava", match source is "apple_health": the existing
//     Apple Health row must be flipped to dupe_of = <new strava row id> so the
//     Strava row is canonical. This flip is done atomically inside Ingest.
func (r *Repository) FindDuplicate(ctx context.Context, userID, source string, startedAt time.Time, distanceM float64) (*Activity, error) {
	return r.findDuplicateQ(ctx, pgxRowQuerier{pool: r.pool}, userID, source, startedAt, distanceM)
}

// findDuplicateTx is the transactional variant.
func (r *Repository) findDuplicateTx(ctx context.Context, tx pgx.Tx, userID, source string, startedAt time.Time, distanceM float64) (*Activity, error) {
	return r.findDuplicateQ(ctx, txRowQuerier{tx: tx}, userID, source, startedAt, distanceM)
}

func (r *Repository) findDuplicateQ(ctx context.Context, q rowQuerier, userID, source string, startedAt time.Time, distanceM float64) (*Activity, error) {
	const sql = `
SELECT
  id, user_id, source, external_id, sport, started_at,
  elapsed_seconds, moving_seconds, distance_m, elevation_gain_m,
  avg_hr, max_hr, avg_pace_s_per_km, calories,
  title, notes,
  location_city, location_country,
  raw, dupe_of, ingested_at
FROM activities
WHERE user_id = $1
  AND dupe_of IS NULL
  AND source != $2
  AND ABS(EXTRACT(EPOCH FROM (started_at - $3::timestamptz))) <= 60
  AND ABS(distance_m - $4) / NULLIF($4, 0) <= 0.02
LIMIT 1`

	row := q.QueryRow(ctx, sql, userID, source, startedAt, distanceM)
	a, err := scanActivity(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("activities: find duplicate: %w", err)
	}
	return a, nil
}

// flipDupeOfTx updates an existing activity row to mark it as a duplicate of
// the given canonical ID. Called when a Strava activity arrives and the
// existing canonical row is from Apple Health.
func (r *Repository) flipDupeOfTx(ctx context.Context, tx pgx.Tx, existingID, canonicalID string) error {
	_, err := tx.Exec(ctx, `UPDATE activities SET dupe_of = $1 WHERE id = $2`, canonicalID, existingID)
	if err != nil {
		return fmt.Errorf("activities: flip dupe_of: %w", err)
	}
	return nil
}

// ListForUser returns canonical activities (dupe_of IS NULL) for a user,
// most-recent first, up to limit rows. The future Home screen ingest API
// will call this.
func (r *Repository) ListForUser(ctx context.Context, userID string, limit int) ([]Activity, error) {
	const sql = `
SELECT
  id, user_id, source, external_id, sport, started_at,
  elapsed_seconds, moving_seconds, distance_m, elevation_gain_m,
  avg_hr, max_hr, avg_pace_s_per_km, calories,
  title, notes,
  location_city, location_country,
  raw, dupe_of, ingested_at
FROM activities
WHERE user_id = $1
  AND dupe_of IS NULL
ORDER BY started_at DESC
LIMIT $2`

	rows, err := r.pool.Query(ctx, sql, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("activities: list for user: %w", err)
	}
	defer rows.Close()

	var out []Activity
	for rows.Next() {
		a, err := scanActivity(rows)
		if err != nil {
			return nil, fmt.Errorf("activities: scan list row: %w", err)
		}
		out = append(out, *a)
	}
	return out, rows.Err()
}

// Pool exposes the underlying pool so the Service can begin transactions.
func (r *Repository) Pool() *pgxpool.Pool { return r.pool }

// findBySourceExternalQ re-selects a row by its unique key after a conflict.
func (r *Repository) findBySourceExternalQ(ctx context.Context, q rowQuerier, userID, source, externalID string) (*Activity, error) {
	const sql = `
SELECT
  id, user_id, source, external_id, sport, started_at,
  elapsed_seconds, moving_seconds, distance_m, elevation_gain_m,
  avg_hr, max_hr, avg_pace_s_per_km, calories,
  title, notes,
  location_city, location_country,
  raw, dupe_of, ingested_at
FROM activities
WHERE user_id = $1 AND source = $2 AND external_id = $3`

	row := q.QueryRow(ctx, sql, userID, source, externalID)
	a, err := scanActivity(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("activities: re-select after conflict: %w", err)
	}
	return a, nil
}

// rowQuerier is the minimal interface satisfied by both *pgxpool.Pool and
// pgx.Tx for single-row queries. We use concrete wrapper types so the
// implementation is unambiguous and avoids interface{} / any.
type rowQuerier interface {
	QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
}

type pgxRowQuerier struct{ pool *pgxpool.Pool }

func (q pgxRowQuerier) QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row {
	return q.pool.QueryRow(ctx, sql, args...)
}

type txRowQuerier struct{ tx pgx.Tx }

func (q txRowQuerier) QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row {
	return q.tx.QueryRow(ctx, sql, args...)
}

func scanActivity(row pgx.Row) (*Activity, error) {
	var a Activity
	var raw []byte
	if err := row.Scan(
		&a.ID, &a.UserID, &a.Source, &a.ExternalID, &a.Sport, &a.StartedAt,
		&a.ElapsedSeconds, &a.MovingSeconds, &a.DistanceM, &a.ElevationGainM,
		&a.AvgHR, &a.MaxHR, &a.AvgPaceSPerKm, &a.Calories,
		&a.Title, &a.Notes,
		&a.LocationCity, &a.LocationCountry,
		&raw, &a.DupeOf, &a.IngestedAt,
	); err != nil {
		return nil, err
	}
	if raw != nil {
		msg := json.RawMessage(raw)
		a.Raw = &msg
	}
	return &a, nil
}
