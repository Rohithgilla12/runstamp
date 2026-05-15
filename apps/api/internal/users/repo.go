// Package users manages persistence for user accounts and their connected
// third-party providers. All token material is encrypted at rest via the
// crypto.Sealer before it reaches the database.
//
// Flow change (Firebase auth): the preferred call sequence is now:
//  1. UpsertByFirebaseUID — materialise the users row from a verified Firebase
//     identity (fires on every authenticated request that needs a user row).
//  2. UpsertStravaAccountForUser — attach / refresh Strava tokens for a known
//     users.id returned by step 1.
//
// The original UpsertStravaAccount is retained for backwards compatibility but
// now delegates to the two-step flow above.  New callers should prefer the
// split methods.
package users

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/crypto"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/strava"
)

// User is a row from the users table, returned after an upsert.
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

// Repo holds the pool and encryption key. Safe to use concurrently.
type Repo struct {
	pool   *pgxpool.Pool
	sealer *crypto.Sealer
}

// NewRepo constructs a Repo.
func NewRepo(pool *pgxpool.Pool, sealer *crypto.Sealer) *Repo {
	return &Repo{pool: pool, sealer: sealer}
}

// UpsertByFirebaseUID finds or creates the users row identified by the given
// Firebase UID.  If the row already exists only the email and updated_at
// columns are refreshed.  The method is safe to call on every authenticated
// request; the ON CONFLICT clause ensures exactly-once semantics.
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
		&u.ID,
		&u.FirebaseUID,
		&u.Email,
		&u.DisplayName,
		&u.HomeCity,
		&u.Units,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("users: upsert by firebase uid: %w", err)
	}
	return &u, nil
}

// FindByFirebaseUID returns the user row for the given Firebase UID, or
// (nil, nil) when no such row exists.  Callers that require the row to exist
// should treat a nil return as a 404 condition.
func (r *Repo) FindByFirebaseUID(ctx context.Context, firebaseUID string) (*User, error) {
	var u User
	err := r.pool.QueryRow(ctx, `
		SELECT id, firebase_uid, email, display_name, home_city, units, created_at, updated_at
		FROM users
		WHERE firebase_uid = $1
	`, firebaseUID).Scan(
		&u.ID,
		&u.FirebaseUID,
		&u.Email,
		&u.DisplayName,
		&u.HomeCity,
		&u.Units,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("users: find by firebase uid: %w", err)
	}
	return &u, nil
}

// HasStravaAccount reports whether the given user has a connected Strava
// account row.
func (r *Repo) HasStravaAccount(ctx context.Context, userID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM connected_accounts
			WHERE user_id = $1 AND provider = 'strava'
		)
	`, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("users: check strava account: %w", err)
	}
	return exists, nil
}

// UpsertStravaAccountForUser upserts the connected_accounts row for the given
// userID.  The user row must already exist in the database; call
// UpsertByFirebaseUID first to guarantee that.
func (r *Repo) UpsertStravaAccountForUser(ctx context.Context, userID string, athlete *strava.Athlete, tokens *strava.TokenResponse) error {
	externalID := fmt.Sprintf("%d", athlete.ID)

	encAccess, err := r.sealer.Seal([]byte(tokens.AccessToken))
	if err != nil {
		return fmt.Errorf("users: encrypt access token: %w", err)
	}
	encRefresh, err := r.sealer.Seal([]byte(tokens.RefreshToken))
	if err != nil {
		return fmt.Errorf("users: encrypt refresh token: %w", err)
	}

	expiresAt := time.Unix(tokens.ExpiresAt, 0).UTC()
	scopes := parseScopes(tokens.Scope)

	_, err = r.pool.Exec(ctx, `
		INSERT INTO connected_accounts
			(user_id, provider, external_id,
			 access_token_encrypted, refresh_token_encrypted,
			 expires_at, scopes, updated_at)
		VALUES ($1, 'strava', $2, $3, $4, $5, $6, now())
		ON CONFLICT (provider, external_id) DO UPDATE SET
			user_id                 = EXCLUDED.user_id,
			access_token_encrypted  = EXCLUDED.access_token_encrypted,
			refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
			expires_at              = EXCLUDED.expires_at,
			scopes                  = EXCLUDED.scopes,
			updated_at              = now()
	`, userID, externalID, encAccess, encRefresh, expiresAt, scopes)
	if err != nil {
		return fmt.Errorf("users: upsert connected_accounts for user: %w", err)
	}
	return nil
}

// UpsertStravaAccount finds or creates the user row associated with the given
// Strava athlete, then upserts the corresponding connected_accounts row with
// freshly encrypted tokens. The whole operation runs in a single transaction.
func (r *Repo) UpsertStravaAccount(ctx context.Context, athlete *strava.Athlete, tokens *strava.TokenResponse) (*User, error) {
	externalID := fmt.Sprintf("%d", athlete.ID)

	encAccess, err := r.sealer.Seal([]byte(tokens.AccessToken))
	if err != nil {
		return nil, fmt.Errorf("users: encrypt access token: %w", err)
	}
	encRefresh, err := r.sealer.Seal([]byte(tokens.RefreshToken))
	if err != nil {
		return nil, fmt.Errorf("users: encrypt refresh token: %w", err)
	}

	expiresAt := time.Unix(tokens.ExpiresAt, 0).UTC()

	scopes := parseScopes(tokens.Scope)

	displayName := strings.TrimSpace(athlete.Firstname + " " + athlete.Lastname)

	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("users: begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Resolve or create the users row.
	var userID string
	err = tx.QueryRow(ctx, `
		SELECT u.id
		FROM users u
		JOIN connected_accounts ca ON ca.user_id = u.id
		WHERE ca.provider = 'strava' AND ca.external_id = $1
	`, externalID).Scan(&userID)

	if err != nil {
		if err != pgx.ErrNoRows {
			return nil, fmt.Errorf("users: lookup by strava id: %w", err)
		}
		// No existing user — insert a fresh one.
		if err = tx.QueryRow(ctx, `
			INSERT INTO users (display_name, home_city)
			VALUES ($1, '')
			RETURNING id
		`, displayName).Scan(&userID); err != nil {
			return nil, fmt.Errorf("users: insert user: %w", err)
		}
	}

	// Upsert connected_accounts for this Strava identity.
	_, err = tx.Exec(ctx, `
		INSERT INTO connected_accounts
			(user_id, provider, external_id,
			 access_token_encrypted, refresh_token_encrypted,
			 expires_at, scopes, updated_at)
		VALUES ($1, 'strava', $2, $3, $4, $5, $6, now())
		ON CONFLICT (provider, external_id) DO UPDATE SET
			access_token_encrypted  = EXCLUDED.access_token_encrypted,
			refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
			expires_at              = EXCLUDED.expires_at,
			scopes                  = EXCLUDED.scopes,
			updated_at              = now()
	`, userID, externalID, encAccess, encRefresh, expiresAt, scopes)
	if err != nil {
		return nil, fmt.Errorf("users: upsert connected_accounts: %w", err)
	}

	// Re-read the users row so we return authoritative DB state.
	var u User
	err = tx.QueryRow(ctx, `
		SELECT id, firebase_uid, email, display_name, home_city, units, created_at, updated_at
		FROM users
		WHERE id = $1
	`, userID).Scan(
		&u.ID,
		&u.FirebaseUID,
		&u.Email,
		&u.DisplayName,
		&u.HomeCity,
		&u.Units,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("users: read user row: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("users: commit tx: %w", err)
	}

	return &u, nil
}

// parseScopes splits a comma-separated scope string. Returns nil if s is empty
// so the DB default ('{}') is used rather than an empty array literal.
func parseScopes(s string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
