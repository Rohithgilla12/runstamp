// Package users manages persistence for runstamp user accounts.
//
// Identity flows from Firebase: every authenticated request carries a
// verified Firebase ID token; UpsertByFirebaseUID materialises (or refreshes)
// the matching users row. Connected providers (Strava in v0.1, Apple Health /
// Health Connect later) live in their own per-provider packages — see
// internal/strava for the Strava-specific table.
package users

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// User is a row from the users table.
type User struct {
	ID          string
	FirebaseUID *string
	Email       *string
	DisplayName *string
	HomeCity    *string
	Units       string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// Repo holds the connection pool. Safe to use concurrently.
type Repo struct {
	pool *pgxpool.Pool
}

func NewRepo(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool}
}

// UpsertByFirebaseUID finds or creates the users row for the given Firebase
// UID. On match, only email + updated_at are refreshed. Safe to call on
// every authenticated request.
func (r *Repo) UpsertByFirebaseUID(ctx context.Context, firebaseUID, email string) (*User, error) {
	var u User
	err := r.pool.QueryRow(ctx, `
		INSERT INTO users (firebase_uid, email)
		VALUES ($1, $2)
		ON CONFLICT (firebase_uid) DO UPDATE SET
			email      = EXCLUDED.email,
			updated_at = now()
		RETURNING id, firebase_uid, email, display_name, home_city, units, created_at, updated_at
	`, firebaseUID, email).Scan(
		&u.ID, &u.FirebaseUID, &u.Email, &u.DisplayName, &u.HomeCity, &u.Units, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("users: upsert by firebase uid: %w", err)
	}
	return &u, nil
}

// FindByFirebaseUID returns (nil, nil) when no row matches; callers can
// treat the nil return as 404.
func (r *Repo) FindByFirebaseUID(ctx context.Context, firebaseUID string) (*User, error) {
	var u User
	err := r.pool.QueryRow(ctx, `
		SELECT id, firebase_uid, email, display_name, home_city, units, created_at, updated_at
		FROM users
		WHERE firebase_uid = $1
	`, firebaseUID).Scan(
		&u.ID, &u.FirebaseUID, &u.Email, &u.DisplayName, &u.HomeCity, &u.Units, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("users: find by firebase uid: %w", err)
	}
	return &u, nil
}

// HasStravaConnection reports whether the user has a row in strava_connections.
func (r *Repo) HasStravaConnection(ctx context.Context, userID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM strava_connections WHERE user_id = $1)
	`, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("users: check strava connection: %w", err)
	}
	return exists, nil
}
