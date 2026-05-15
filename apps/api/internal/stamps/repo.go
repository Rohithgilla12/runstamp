package stamps

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Earned represents one stamps_earned row.
type Earned struct {
	ID         string          `json:"id"`
	UserID     string          `json:"userId"`
	StampID    string          `json:"stampId"`
	EarnedAt   time.Time       `json:"earnedAt"`
	ActivityID *string         `json:"activityId,omitempty"`
	Context    json.RawMessage `json:"context,omitempty"`
}

// Repository wraps pgx for stamps reads + awards.
type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// ListEarnedForUser returns all stamps earned by a user, newest first.
func (r *Repository) ListEarnedForUser(ctx context.Context, userID string) ([]Earned, error) {
	rows, err := r.pool.Query(ctx, `
SELECT id, user_id, stamp_id, earned_at, activity_id, context
FROM stamps_earned
WHERE user_id = $1
ORDER BY earned_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("stamps: list: %w", err)
	}
	defer rows.Close()
	var out []Earned
	for rows.Next() {
		var e Earned
		var actID *string
		var raw []byte
		if err := rows.Scan(&e.ID, &e.UserID, &e.StampID, &e.EarnedAt, &actID, &raw); err != nil {
			return nil, fmt.Errorf("stamps: scan: %w", err)
		}
		e.ActivityID = actID
		if raw != nil {
			e.Context = json.RawMessage(raw)
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// AwardResult is what Award returns when a new stamp lands. ZeroValue if
// stamp was already earned (idempotent).
type AwardResult struct {
	StampID    string
	Awarded    bool // false when the user already had it
	ActivityID *string
}

// Award inserts a stamps_earned row if it doesn't already exist for this
// (user, stamp) pair. Idempotent — calling twice is a no-op.
func (r *Repository) Award(ctx context.Context, userID, stampID string, activityID *string, ctxJSON json.RawMessage) (AwardResult, error) {
	if len(ctxJSON) == 0 {
		ctxJSON = json.RawMessage(`null`)
	}
	tag, err := r.pool.Exec(ctx, `
INSERT INTO stamps_earned (user_id, stamp_id, activity_id, context)
VALUES ($1, $2, $3, $4::jsonb)
ON CONFLICT (user_id, stamp_id) DO NOTHING`,
		userID, stampID, activityID, string(ctxJSON))
	if err != nil {
		return AwardResult{}, fmt.Errorf("stamps: award: %w", err)
	}
	return AwardResult{StampID: stampID, Awarded: tag.RowsAffected() > 0, ActivityID: activityID}, nil
}

// AwardedSet returns the set of stamp_ids already earned by a user. Cheap
// guard for the evaluator so it doesn't re-check every rule on every run.
func (r *Repository) AwardedSet(ctx context.Context, userID string) (map[string]struct{}, error) {
	rows, err := r.pool.Query(ctx, `SELECT stamp_id FROM stamps_earned WHERE user_id = $1`, userID)
	if err != nil {
		return nil, fmt.Errorf("stamps: awarded set: %w", err)
	}
	defer rows.Close()
	out := make(map[string]struct{}, 8)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out[id] = struct{}{}
	}
	return out, rows.Err()
}

// ListDefinitions returns the entire catalog as stored in DB. Used by the
// mobile GET /v1/stamps/catalog endpoint to render the locked-state grid.
func (r *Repository) ListDefinitions(ctx context.Context) ([]Definition, error) {
	rows, err := r.pool.Query(ctx, `
SELECT id, name, description, tier, category, criteria, sort_order
FROM stamp_definitions
ORDER BY sort_order`)
	if err != nil {
		return nil, fmt.Errorf("stamps: list definitions: %w", err)
	}
	defer rows.Close()
	var out []Definition
	for rows.Next() {
		var d Definition
		var raw []byte
		if err := rows.Scan(&d.ID, &d.Name, &d.Description, &d.Tier, &d.Category, &raw, &d.SortOrder); err != nil {
			return nil, err
		}
		d.Criteria = json.RawMessage(raw)
		out = append(out, d)
	}
	return out, rows.Err()
}

