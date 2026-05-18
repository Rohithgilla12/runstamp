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
	"strings"
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
	HRMax       *int
	HRResting   *int
	BirthYear   *int
	// UI preferences — nullable. NULL means "use the client default" so a
	// user who has never opened Settings doesn't get forced into a value.
	UIDark      *bool
	UIAccent    *string
	UITileStyle *string
	UIOnboarded *bool
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
		RETURNING id, firebase_uid, email, display_name, home_city, units, hr_max, hr_resting, birth_year, ui_dark, ui_accent, ui_tile_style, ui_onboarded, created_at, updated_at
	`, firebaseUID, email).Scan(
		&u.ID, &u.FirebaseUID, &u.Email, &u.DisplayName, &u.HomeCity, &u.Units, &u.HRMax, &u.HRResting, &u.BirthYear, &u.UIDark, &u.UIAccent, &u.UITileStyle, &u.UIOnboarded, &u.CreatedAt, &u.UpdatedAt,
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
		SELECT id, firebase_uid, email, display_name, home_city, units, hr_max, hr_resting, birth_year, ui_dark, ui_accent, ui_tile_style, ui_onboarded, created_at, updated_at
		FROM users
		WHERE firebase_uid = $1
	`, firebaseUID).Scan(
		&u.ID, &u.FirebaseUID, &u.Email, &u.DisplayName, &u.HomeCity, &u.Units, &u.HRMax, &u.HRResting, &u.BirthYear, &u.UIDark, &u.UIAccent, &u.UITileStyle, &u.UIOnboarded, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("users: find by firebase uid: %w", err)
	}
	return &u, nil
}

// Delete hard-deletes a user row. Every fk pointing at users(id) was set up
// with ON DELETE CASCADE — strava_connections, activities + streams + dupes,
// strava_imports, stamps_earned. So a single delete is enough to satisfy the
// privacy policy contract: 30-day hard delete on user request.
func (r *Repo) Delete(ctx context.Context, userID string) error {
	if _, err := r.pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, userID); err != nil {
		return fmt.Errorf("users: delete: %w", err)
	}
	return nil
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

// ProfilePatch holds optional updates; nil pointers leave the column unchanged.
type ProfilePatch struct {
	DisplayName *string
	HomeCity    *string
	Units       *string
	HRMax       *int
	HRResting   *int
	BirthYear   *int
	// UI prefs. Pointer-of-pointer would let us distinguish "set to null"
	// from "leave alone" but mobile only ever sets to a concrete value, so
	// a plain *T (nil = leave alone) is enough.
	UIDark      *bool
	UIAccent    *string
	UITileStyle *string
	UIOnboarded *bool
}

// UpdateProfile applies a partial update and returns the refreshed row.
func (r *Repo) UpdateProfile(ctx context.Context, userID string, p ProfilePatch) (*User, error) {
	sets := []string{"updated_at = now()"}
	args := []any{userID}
	if p.DisplayName != nil {
		args = append(args, *p.DisplayName)
		sets = append(sets, fmt.Sprintf("display_name = $%d", len(args)))
	}
	if p.HomeCity != nil {
		args = append(args, *p.HomeCity)
		sets = append(sets, fmt.Sprintf("home_city = $%d", len(args)))
	}
	if p.Units != nil {
		args = append(args, *p.Units)
		sets = append(sets, fmt.Sprintf("units = $%d", len(args)))
	}
	if p.HRMax != nil {
		args = append(args, *p.HRMax)
		sets = append(sets, fmt.Sprintf("hr_max = $%d", len(args)))
	}
	if p.HRResting != nil {
		args = append(args, *p.HRResting)
		sets = append(sets, fmt.Sprintf("hr_resting = $%d", len(args)))
	}
	if p.BirthYear != nil {
		args = append(args, *p.BirthYear)
		sets = append(sets, fmt.Sprintf("birth_year = $%d", len(args)))
	}
	if p.UIDark != nil {
		args = append(args, *p.UIDark)
		sets = append(sets, fmt.Sprintf("ui_dark = $%d", len(args)))
	}
	if p.UIAccent != nil {
		args = append(args, *p.UIAccent)
		sets = append(sets, fmt.Sprintf("ui_accent = $%d", len(args)))
	}
	if p.UITileStyle != nil {
		args = append(args, *p.UITileStyle)
		sets = append(sets, fmt.Sprintf("ui_tile_style = $%d", len(args)))
	}
	if p.UIOnboarded != nil {
		args = append(args, *p.UIOnboarded)
		sets = append(sets, fmt.Sprintf("ui_onboarded = $%d", len(args)))
	}
	q := fmt.Sprintf(`
		UPDATE users SET %s
		WHERE id = $1
		RETURNING id, firebase_uid, email, display_name, home_city, units, hr_max, hr_resting, birth_year, ui_dark, ui_accent, ui_tile_style, ui_onboarded, created_at, updated_at
	`, strings.Join(sets, ", "))
	var u User
	err := r.pool.QueryRow(ctx, q, args...).Scan(
		&u.ID, &u.FirebaseUID, &u.Email, &u.DisplayName, &u.HomeCity, &u.Units,
		&u.HRMax, &u.HRResting, &u.BirthYear,
		&u.UIDark, &u.UIAccent, &u.UITileStyle, &u.UIOnboarded,
		&u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("users: update profile: %w", err)
	}
	return &u, nil
}
