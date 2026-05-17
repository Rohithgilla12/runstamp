// Package privacy owns the privacy_zones table. Zones are user-scoped
// circular regions used by the mobile client to mask route polylines at
// render time. The server is the source of truth so adding a zone on one
// device shows up on every device the user signs in to.
//
// Render-time masking happens on the mobile client (apps/mobile/src/
// analytics/privacyMask.ts) — the streams endpoint still returns full lat/lng
// arrays. We'll add server-side trimming when the public web profile lands
// (roadmap "Later"), since that's the only path where the route leaves the
// owner's own clients.
package privacy

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Zone is one privacy region. Lat/lng are in degrees; radius_m is metres.
type Zone struct {
	ID       string  `json:"id"`
	UserID   string  `json:"-"`
	Name     *string `json:"name,omitempty"`
	Lat      float64 `json:"lat"`
	Lng      float64 `json:"lng"`
	RadiusM  int     `json:"radiusM"`
}

// CreateZone is the input for Repo.Create.
type CreateZone struct {
	UserID  string
	Name    *string
	Lat     float64
	Lng     float64
	RadiusM int
}

// ErrNotFound is returned by Delete when no row matches (user_id, zone_id).
var ErrNotFound = errors.New("privacy: zone not found")

// Repo is the data access layer. Same shape as users.Repo / push.Pusher —
// pgxpool reference + slog. No service layer is needed; the rules are
// simple enough to live in the handler.
type Repo struct {
	pool *pgxpool.Pool
	log  *slog.Logger
}

// NewRepo wires the repo to its pool. Pass nil for log to silence logging.
func NewRepo(pool *pgxpool.Pool, log *slog.Logger) *Repo {
	if log == nil {
		log = slog.Default()
	}
	return &Repo{pool: pool, log: log}
}

// ListForUser returns the user's zones, oldest-first. The list is short
// (1–5 typical, capped at the radius_m check constraint via per-user count
// enforcement in the handler) so no pagination.
func (r *Repo) ListForUser(ctx context.Context, userID string) ([]Zone, error) {
	rows, err := r.pool.Query(
		ctx,
		`SELECT id, user_id, name, lat, lng, radius_m
		   FROM privacy_zones
		  WHERE user_id = $1
		  ORDER BY created_at ASC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("privacy: list zones: %w", err)
	}
	defer rows.Close()
	var out []Zone
	for rows.Next() {
		var z Zone
		if err := rows.Scan(&z.ID, &z.UserID, &z.Name, &z.Lat, &z.Lng, &z.RadiusM); err != nil {
			return nil, fmt.Errorf("privacy: scan zone: %w", err)
		}
		out = append(out, z)
	}
	return out, rows.Err()
}

// CountForUser is used by the handler to enforce the per-user cap.
func (r *Repo) CountForUser(ctx context.Context, userID string) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `SELECT count(*) FROM privacy_zones WHERE user_id = $1`, userID).Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("privacy: count zones: %w", err)
	}
	return n, nil
}

// Create persists a new zone. Returns the created row (with id + created_at
// populated by the DB).
func (r *Repo) Create(ctx context.Context, in CreateZone) (*Zone, error) {
	row := r.pool.QueryRow(
		ctx,
		`INSERT INTO privacy_zones (user_id, name, lat, lng, radius_m)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, user_id, name, lat, lng, radius_m`,
		in.UserID, in.Name, in.Lat, in.Lng, in.RadiusM,
	)
	var z Zone
	if err := row.Scan(&z.ID, &z.UserID, &z.Name, &z.Lat, &z.Lng, &z.RadiusM); err != nil {
		return nil, fmt.Errorf("privacy: insert zone: %w", err)
	}
	return &z, nil
}

// Delete removes a zone, scoped to the owner. Returns ErrNotFound if the
// id doesn't exist for this user — same shape we use elsewhere to avoid
// leaking existence on cross-user ids.
func (r *Repo) Delete(ctx context.Context, userID, zoneID string) error {
	tag, err := r.pool.Exec(
		ctx,
		`DELETE FROM privacy_zones WHERE id = $1 AND user_id = $2`,
		zoneID, userID,
	)
	if err != nil {
		return fmt.Errorf("privacy: delete zone: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// Used for tests / quiet pgx import.
var _ = pgx.ErrNoRows
