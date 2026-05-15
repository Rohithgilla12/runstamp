// Package waitlist manages marketing waitlist signups.
package waitlist

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrAlreadyExists is returned by Add when the email is already on the list.
// Callers should respond with 201 anyway (prevents enumeration).
var ErrAlreadyExists = errors.New("waitlist: email already registered")

// Repository persists waitlist signups.
type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// Add inserts a new waitlist signup. Returns ErrAlreadyExists on a
// unique-violation (23505) so callers can silently dedupe without leaking
// whether an email is already present.
func (r *Repository) Add(ctx context.Context, email, source, ipHash, userAgent string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO waitlist_signups (email, source, ip_hash, user_agent)
		VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''))
	`, email, nullString(source), ipHash, userAgent)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.UniqueViolation {
			return ErrAlreadyExists
		}
		return fmt.Errorf("waitlist: insert signup: %w", err)
	}
	return nil
}

func nullString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
