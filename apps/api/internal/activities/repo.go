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

// selectColumns is the FULL column list — used by detail / ingest / dedup
// reads where we need every field including the heavy JSONB ones. scanActivity
// expects this exact ordering. Keep them in sync.
//
// startLat / startLon are extracted from location_start (PostGIS geography)
// via ST_Y / ST_X so the application layer never has to parse WKB. Before
// this, those fields were always nil on read (we wrote them via location_start
// but the SELECT never decoded them back) — a quiet bug that broke the
// Places world-map clustering.
const selectColumns = `id, user_id, source, external_id, sport, started_at,
  elapsed_seconds, moving_seconds, distance_m, elevation_gain_m,
  avg_hr, max_hr, avg_pace_s_per_km, calories,
  title, notes,
  location_city, location_country,
  ST_Y(location_start::geometry), ST_X(location_start::geometry),
  raw, dupe_of, ingested_at,
  cadence_spm, running_power_w, vertical_oscillation_cm, ground_contact_ms,
  stride_length_m, vo2max_ml_kg_min, avg_speed_m_s, splits,
  gap_seconds_per_km,
  has_detail, has_streams`

// selectColumnsList is the LEAN column list — used by ListForUser only.
// Drops every field the activities list response doesn't render:
//   - raw, splits        — heavy JSONB, list never reads
//   - notes              — not surfaced on the list row
//   - user_id, dupe_of   — internal bookkeeping
//   - ingested_at, has_detail, has_streams — internal
//   - avg_speed_m_s, vertical_oscillation_cm, ground_contact_ms,
//     stride_length_m   — detail-screen metrics, never in the list
//
// scanActivityList expects this ordering. Big perf win: a 561-row list
// was taking 190ms / 210KB before; this drops raw+splits which were the
// JSONB bulk.
const selectColumnsList = `id, source, external_id, sport, started_at,
  elapsed_seconds, moving_seconds, distance_m, elevation_gain_m,
  avg_hr, max_hr, avg_pace_s_per_km, calories,
  title,
  location_city, location_country,
  ST_Y(location_start::geometry), ST_X(location_start::geometry),
  cadence_spm, running_power_w, vo2max_ml_kg_min,
  gap_seconds_per_km`

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
	CadenceSPM      *float64
	RunningPowerW   *float64
	VerticalOscCm   *float64
	GroundContactMs *float64
	StrideLengthM   *float64
	VO2maxMlKgMin   *float64
	AvgSpeedMS      *float64
	Splits          *json.RawMessage
	GAPSecPerKm     *float64
	HasDetail       bool
	HasStreams       bool
}

// DetailFields holds the rich columns written during the enrichment phase.
// Only non-nil fields are updated; summary fields (distance, started_at, etc.)
// are left untouched.
type DetailFields struct {
	ElevationGainM  *float64
	MaxHR           *int
	AvgHR           *int
	Calories        *int
	LocationCity    *string
	LocationCountry *string
	Title           *string
	AvgPaceSPerKm   *float64
	StartLat        *float64
	StartLon        *float64
	Raw             *json.RawMessage
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
  raw, dupe_of,
  cadence_spm, running_power_w, vertical_oscillation_cm, ground_contact_ms,
  stride_length_m, vo2max_ml_kg_min, avg_speed_m_s, splits
) VALUES (
  $1,  $2,  $3,  $4,  $5,
  $6,  $7,  $8,  $9,
  ST_SetSRID(ST_MakePoint($10, $11), 4326)::geography,
  $12, $13, $14, $15,
  $16, $17,
  $18, $19,
  $20, $21,
  $22, $23, $24, $25,
  $26, $27, $28, $29
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
			a.CadenceSPM, a.RunningPowerW, a.VerticalOscCm, a.GroundContactMs,
			a.StrideLengthM, a.VO2maxMlKgMin, a.AvgSpeedMS, a.Splits,
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
  raw, dupe_of,
  cadence_spm, running_power_w, vertical_oscillation_cm, ground_contact_ms,
  stride_length_m, vo2max_ml_kg_min, avg_speed_m_s, splits
) VALUES (
  $1,  $2,  $3,  $4,  $5,
  $6,  $7,  $8,  $9,
  NULL,
  $10, $11, $12, $13,
  $14, $15,
  $16, $17,
  $18, $19,
  $20, $21, $22, $23,
  $24, $25, $26, $27
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
		a.CadenceSPM, a.RunningPowerW, a.VerticalOscCm, a.GroundContactMs,
		a.StrideLengthM, a.VO2maxMlKgMin, a.AvgSpeedMS, a.Splits,
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
// UpdateTitle changes only the user-editable title. Empty string clears it.
func (r *Repository) UpdateTitle(ctx context.Context, activityID, title string) error {
	titleArg := any(title)
	if title == "" {
		titleArg = nil
	}
	tag, err := r.pool.Exec(ctx, `UPDATE activities SET title = $2 WHERE id = $1`, activityID, titleArg)
	if err != nil {
		return fmt.Errorf("activities: update title: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// Stream is a single (type, jsonb-data) row from activity_streams.
type Stream struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

// ListStreams returns every stream row for an activity. The mobile renderer
// pulls latlng for the map; HR/altitude/velocity feed charts.
func (r *Repository) ListStreams(ctx context.Context, activityID string) ([]Stream, error) {
	rows, err := r.pool.Query(ctx, `SELECT type, data FROM activity_streams WHERE activity_id = $1`, activityID)
	if err != nil {
		return nil, fmt.Errorf("activities: list streams: %w", err)
	}
	defer rows.Close()
	var out []Stream
	for rows.Next() {
		var s Stream
		var raw []byte
		if err := rows.Scan(&s.Type, &raw); err != nil {
			return nil, err
		}
		s.Data = json.RawMessage(raw)
		out = append(out, s)
	}
	return out, rows.Err()
}

// OwnerOf returns the user_id that owns an activity, or empty string if it
// doesn't exist. Used by the streams handler to enforce caller authorization.
func (r *Repository) OwnerOf(ctx context.Context, activityID string) (string, error) {
	var userID string
	if err := r.pool.QueryRow(ctx, `SELECT user_id FROM activities WHERE id = $1`, activityID).Scan(&userID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", nil
		}
		return "", fmt.Errorf("activities: owner of: %w", err)
	}
	return userID, nil
}

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

// UpsertBestEfforts writes the segment best efforts for an activity. Idempotent
// per (activity_id, distance_m) so re-ingest / backfill overwrites cleanly.
func (r *Repository) UpsertBestEfforts(ctx context.Context, activityID string, efforts []BestEffort) error {
	for _, e := range efforts {
		_, err := r.pool.Exec(ctx, `
INSERT INTO activity_best_efforts (activity_id, distance_m, time_seconds)
VALUES ($1, $2, $3)
ON CONFLICT (activity_id, distance_m) DO UPDATE SET time_seconds = EXCLUDED.time_seconds`,
			activityID, e.DistanceM, e.TimeSeconds)
		if err != nil {
			return fmt.Errorf("activities: upsert best effort: %w", err)
		}
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
	sql := `
SELECT ` + selectColumns + `
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

// DupeRef is a thin projection of a duplicate row — just enough for the
// mobile client to render "also imported from <source> at <time>" and offer
// a switch. The full row is reachable via the canonical → flip → re-fetch
// path if needed.
type DupeRef struct {
	ID         string
	Source     string
	StartedAt  time.Time
	DistanceM  float64
	ElapsedSec int
}

// ListDupesOfCanonical returns every row marked as a duplicate of the given
// canonical activity, scoped to the owning user. Usually returns 0 or 1 rows
// since we only ingest from two sources today.
func (r *Repository) ListDupesOfCanonical(ctx context.Context, userID, canonicalID string) ([]DupeRef, error) {
	rows, err := r.pool.Query(ctx, `
SELECT id, source, started_at, distance_m, elapsed_seconds
FROM activities
WHERE user_id = $1 AND dupe_of = $2
ORDER BY started_at`, userID, canonicalID)
	if err != nil {
		return nil, fmt.Errorf("activities: list dupes of canonical: %w", err)
	}
	defer rows.Close()
	var out []DupeRef
	for rows.Next() {
		var d DupeRef
		if err := rows.Scan(&d.ID, &d.Source, &d.StartedAt, &d.DistanceM, &d.ElapsedSec); err != nil {
			return nil, fmt.Errorf("activities: scan dupe ref: %w", err)
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// SwapCanonical promotes a duplicate to canonical and demotes the current
// canonical to dupe_of = <new canonical>. Both rows must belong to the same
// user. The operation runs in a single transaction so concurrent reads never
// see two canonicals or zero canonicals for the same run.
//
// Returns ErrNotFound if either id is missing or owned by a different user.
// No-op (returns nil) if newCanonicalID is already canonical.
func (r *Repository) SwapCanonical(ctx context.Context, userID, newCanonicalID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("activities: swap canonical: begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Lock the target row and its current canonical sibling. FOR UPDATE so a
	// racing Strava ingest can't flip dupe_of out from under us mid-swap.
	var targetUserID string
	var targetDupeOf *string
	err = tx.QueryRow(ctx,
		`SELECT user_id, dupe_of FROM activities WHERE id = $1 FOR UPDATE`,
		newCanonicalID).Scan(&targetUserID, &targetDupeOf)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("activities: swap canonical: read target: %w", err)
	}
	if targetUserID != userID {
		// Don't leak existence to other users.
		return ErrNotFound
	}
	if targetDupeOf == nil {
		// Already canonical — nothing to do.
		return tx.Commit(ctx)
	}

	currentCanonicalID := *targetDupeOf
	// Lock the current canonical too. If it was deleted between the dupe_of
	// pointer and now, fall through to a clean promotion (just clear dupe_of).
	var canonicalUserID string
	err = tx.QueryRow(ctx,
		`SELECT user_id FROM activities WHERE id = $1 FOR UPDATE`,
		currentCanonicalID).Scan(&canonicalUserID)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		// Stale pointer. Just promote the dupe.
	case err != nil:
		return fmt.Errorf("activities: swap canonical: read current: %w", err)
	case canonicalUserID != userID:
		// This would mean a fk violation — defensive bail.
		return ErrNotFound
	default:
		// Demote the existing canonical to point at the new one.
		if _, err := tx.Exec(ctx,
			`UPDATE activities SET dupe_of = $1 WHERE id = $2`,
			newCanonicalID, currentCanonicalID); err != nil {
			return fmt.Errorf("activities: swap canonical: demote: %w", err)
		}
	}

	if _, err := tx.Exec(ctx,
		`UPDATE activities SET dupe_of = NULL WHERE id = $1`,
		newCanonicalID); err != nil {
		return fmt.Errorf("activities: swap canonical: promote: %w", err)
	}
	return tx.Commit(ctx)
}

// ListForUser returns canonical activities (dupe_of IS NULL) for a user,
// most-recent first, up to limit rows. Uses the lean SELECT — drops raw,
// splits, notes, and other fields the list response doesn't render. For
// the full row (e.g. splits on the detail screen) call FindByID.
func (r *Repository) ListForUser(ctx context.Context, userID string, limit int) ([]Activity, error) {
	sql := `
SELECT ` + selectColumnsList + `
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
		a, err := scanActivityList(rows)
		if err != nil {
			return nil, fmt.Errorf("activities: scan list row: %w", err)
		}
		out = append(out, *a)
	}
	return out, rows.Err()
}

// FindByID returns the full activity row (including splits + raw + notes)
// for the given id, scoped to its owning user. Returns (nil, ErrNotFound)
// when the row doesn't exist or belongs to another user — same ambiguity
// shape we use elsewhere so cross-user IDs don't leak existence.
func (r *Repository) FindByID(ctx context.Context, userID, activityID string) (*Activity, error) {
	sql := `
SELECT ` + selectColumns + `
FROM activities
WHERE id = $1 AND user_id = $2 AND dupe_of IS NULL`

	row := r.pool.QueryRow(ctx, sql, activityID, userID)
	a, err := scanActivity(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("activities: find by id: %w", err)
	}
	return a, nil
}

// Pool exposes the underlying pool so the Service can begin transactions.
func (r *Repository) Pool() *pgxpool.Pool { return r.pool }

// findBySourceExternalQ re-selects a row by its unique key after a conflict.
func (r *Repository) findBySourceExternalQ(ctx context.Context, q rowQuerier, userID, source, externalID string) (*Activity, error) {
	sql := `
SELECT ` + selectColumns + `
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
	var splits []byte
	if err := row.Scan(
		&a.ID, &a.UserID, &a.Source, &a.ExternalID, &a.Sport, &a.StartedAt,
		&a.ElapsedSeconds, &a.MovingSeconds, &a.DistanceM, &a.ElevationGainM,
		&a.AvgHR, &a.MaxHR, &a.AvgPaceSPerKm, &a.Calories,
		&a.Title, &a.Notes,
		&a.LocationCity, &a.LocationCountry,
		&a.StartLat, &a.StartLon,
		&raw, &a.DupeOf, &a.IngestedAt,
		&a.CadenceSPM, &a.RunningPowerW, &a.VerticalOscCm, &a.GroundContactMs,
		&a.StrideLengthM, &a.VO2maxMlKgMin, &a.AvgSpeedMS, &splits,
		&a.GAPSecPerKm,
		&a.HasDetail, &a.HasStreams,
	); err != nil {
		return nil, err
	}
	if raw != nil {
		msg := json.RawMessage(raw)
		a.Raw = &msg
	}
	if splits != nil {
		msg := json.RawMessage(splits)
		a.Splits = &msg
	}
	return &a, nil
}

// scanActivityList scans the lean column set from selectColumnsList. Fields
// not in the lean set (Raw, Splits, Notes, UserID, DupeOf, IngestedAt, etc)
// are left at their zero values — handlers that use list rows must not
// reach for those.
func scanActivityList(row pgx.Row) (*Activity, error) {
	var a Activity
	if err := row.Scan(
		&a.ID, &a.Source, &a.ExternalID, &a.Sport, &a.StartedAt,
		&a.ElapsedSeconds, &a.MovingSeconds, &a.DistanceM, &a.ElevationGainM,
		&a.AvgHR, &a.MaxHR, &a.AvgPaceSPerKm, &a.Calories,
		&a.Title,
		&a.LocationCity, &a.LocationCountry,
		&a.StartLat, &a.StartLon,
		&a.CadenceSPM, &a.RunningPowerW, &a.VO2maxMlKgMin,
		&a.GAPSecPerKm,
	); err != nil {
		return nil, err
	}
	return &a, nil
}

// MarkDetailFetched sets has_detail=true for the given activity ID.
func (r *Repository) MarkDetailFetched(ctx context.Context, activityID string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE activities SET has_detail = true WHERE id = $1`,
		activityID)
	if err != nil {
		return fmt.Errorf("activities: mark detail fetched: %w", err)
	}
	return nil
}

// UpdateGAP writes the grade-adjusted pace (sec/km) for the given activity.
// A zero or negative value clears the column.
func (r *Repository) UpdateGAP(ctx context.Context, activityID string, gapSecPerKm float64) error {
	var v *float64
	if gapSecPerKm > 0 {
		v = &gapSecPerKm
	}
	_, err := r.pool.Exec(ctx,
		`UPDATE activities SET gap_seconds_per_km = $2 WHERE id = $1`,
		activityID, v)
	if err != nil {
		return fmt.Errorf("activities: update gap: %w", err)
	}
	return nil
}

// MarkStreamsFetched sets has_streams=true for the given activity ID.
func (r *Repository) MarkStreamsFetched(ctx context.Context, activityID string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE activities SET has_streams = true WHERE id = $1`,
		activityID)
	if err != nil {
		return fmt.Errorf("activities: mark streams fetched: %w", err)
	}
	return nil
}

// UpdateDetail overwrites rich detail columns for an already-inserted row.
// Only non-nil fields in df are written; nil fields are left unchanged.
func (r *Repository) UpdateDetail(ctx context.Context, activityID string, df *DetailFields) error {
	if df == nil {
		return nil
	}
	if df.StartLat != nil && df.StartLon != nil {
		_, err := r.pool.Exec(ctx, `
UPDATE activities SET
  elevation_gain_m  = COALESCE($2, elevation_gain_m),
  max_hr            = COALESCE($3, max_hr),
  avg_hr            = COALESCE($4, avg_hr),
  calories          = COALESCE($5, calories),
  location_city     = COALESCE($6, location_city),
  location_country  = COALESCE($7, location_country),
  title             = COALESCE($8, title),
  avg_pace_s_per_km = COALESCE($9, avg_pace_s_per_km),
  location_start    = COALESCE(ST_SetSRID(ST_MakePoint($11, $10), 4326)::geography, location_start),
  raw               = COALESCE($12, raw)
WHERE id = $1`,
			activityID,
			df.ElevationGainM, df.MaxHR, df.AvgHR, df.Calories,
			df.LocationCity, df.LocationCountry, df.Title, df.AvgPaceSPerKm,
			df.StartLat, df.StartLon,
			df.Raw,
		)
		if err != nil {
			return fmt.Errorf("activities: update detail: %w", err)
		}
		return nil
	}
	_, err := r.pool.Exec(ctx, `
UPDATE activities SET
  elevation_gain_m  = COALESCE($2, elevation_gain_m),
  max_hr            = COALESCE($3, max_hr),
  avg_hr            = COALESCE($4, avg_hr),
  calories          = COALESCE($5, calories),
  location_city     = COALESCE($6, location_city),
  location_country  = COALESCE($7, location_country),
  title             = COALESCE($8, title),
  avg_pace_s_per_km = COALESCE($9, avg_pace_s_per_km),
  raw               = COALESCE($10, raw)
WHERE id = $1`,
		activityID,
		df.ElevationGainM, df.MaxHR, df.AvgHR, df.Calories,
		df.LocationCity, df.LocationCountry, df.Title, df.AvgPaceSPerKm,
		df.Raw,
	)
	if err != nil {
		return fmt.Errorf("activities: update detail: %w", err)
	}
	return nil
}

// NextPendingDetail returns the most-recently-started Strava activity for
// this user that still has has_detail=false. Returns (nil, nil) when all
// activities are enriched.
func (r *Repository) NextPendingDetail(ctx context.Context, userID string) (*Activity, error) {
	sql := `
SELECT ` + selectColumns + `
FROM activities
WHERE user_id = $1
  AND source = 'strava'
  AND has_detail = false
ORDER BY started_at DESC
LIMIT 1`

	row := r.pool.QueryRow(ctx, sql, userID)
	a, err := scanActivity(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("activities: next pending detail: %w", err)
	}
	return a, nil
}
