package strava

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/crypto"
)

// ErrConnectionNotFound is returned by GetByUser / GetByAthleteID when no row
// matches. Callers should branch on it to render a "Connect Strava" CTA
// rather than treat the absence as an error.
var ErrConnectionNotFound = errors.New("strava: connection not found")

// Connection is the decrypted, in-memory view of a strava_connections row.
// Tokens are plaintext here — encryption is only at-rest in the DB.
type Connection struct {
	UserID            string
	AthleteID         int64
	AccessToken       string
	RefreshToken      string
	ExpiresAt         time.Time
	Scope             string
	AthleteFirstname  *string
	AthleteLastname   *string
	AthleteProfileURL *string
	CreatedAt         time.Time
	RefreshedAt       time.Time
}

type Repository struct {
	pool   *pgxpool.Pool
	sealer *crypto.Sealer
}

func NewRepository(pool *pgxpool.Pool, sealer *crypto.Sealer) *Repository {
	return &Repository{pool: pool, sealer: sealer}
}

// UpsertConnection writes the latest token + athlete summary. Used on both
// initial connect and token refresh.
func (r *Repository) UpsertConnection(ctx context.Context, userID string, tok *TokenResponse) (*Connection, error) {
	accessEnc, err := r.sealer.Seal([]byte(tok.AccessToken))
	if err != nil {
		return nil, fmt.Errorf("seal access token: %w", err)
	}
	refreshEnc, err := r.sealer.Seal([]byte(tok.RefreshToken))
	if err != nil {
		return nil, fmt.Errorf("seal refresh token: %w", err)
	}
	expires := time.Unix(tok.ExpiresAt, 0).UTC()
	scope := tok.Scope
	if scope == "" {
		scope = "activity:read"
	}

	const q = `
INSERT INTO strava_connections (
  user_id, athlete_id, access_token_enc, refresh_token_enc, expires_at, scope,
  athlete_firstname, athlete_lastname, athlete_profile_url
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
ON CONFLICT (user_id) DO UPDATE SET
  athlete_id          = EXCLUDED.athlete_id,
  access_token_enc    = EXCLUDED.access_token_enc,
  refresh_token_enc   = EXCLUDED.refresh_token_enc,
  expires_at          = EXCLUDED.expires_at,
  scope               = EXCLUDED.scope,
  athlete_firstname   = COALESCE(EXCLUDED.athlete_firstname, strava_connections.athlete_firstname),
  athlete_lastname    = COALESCE(EXCLUDED.athlete_lastname,  strava_connections.athlete_lastname),
  athlete_profile_url = COALESCE(EXCLUDED.athlete_profile_url, strava_connections.athlete_profile_url),
  refreshed_at        = now()
`
	firstname := nullString(tok.Athlete.Firstname)
	lastname := nullString(tok.Athlete.Lastname)
	profile := nullString(tok.Athlete.Profile)

	if _, err := r.pool.Exec(ctx, q,
		userID,
		tok.Athlete.ID,
		base64.StdEncoding.EncodeToString(accessEnc),
		base64.StdEncoding.EncodeToString(refreshEnc),
		expires,
		scope,
		firstname,
		lastname,
		profile,
	); err != nil {
		return nil, fmt.Errorf("upsert strava connection: %w", err)
	}
	return r.GetByUser(ctx, userID)
}

func (r *Repository) GetByUser(ctx context.Context, userID string) (*Connection, error) {
	return r.queryOne(ctx, `WHERE user_id = $1`, userID)
}

func (r *Repository) GetByAthleteID(ctx context.Context, athleteID int64) (*Connection, error) {
	return r.queryOne(ctx, `WHERE athlete_id = $1`, athleteID)
}

func (r *Repository) Delete(ctx context.Context, userID string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM strava_connections WHERE user_id = $1`, userID)
	if err != nil {
		return fmt.Errorf("delete strava connection: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrConnectionNotFound
	}
	return nil
}

func (r *Repository) queryOne(ctx context.Context, where string, arg any) (*Connection, error) {
	const cols = `
  user_id, athlete_id, access_token_enc, refresh_token_enc, expires_at, scope,
  athlete_firstname, athlete_lastname, athlete_profile_url, created_at, refreshed_at
`
	row := r.pool.QueryRow(ctx, "SELECT"+cols+"FROM strava_connections "+where, arg)
	var (
		c            Connection
		accessEnc    string
		refreshEnc   string
		firstname    *string
		lastname     *string
		profile      *string
	)
	if err := row.Scan(
		&c.UserID, &c.AthleteID, &accessEnc, &refreshEnc, &c.ExpiresAt, &c.Scope,
		&firstname, &lastname, &profile, &c.CreatedAt, &c.RefreshedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrConnectionNotFound
		}
		return nil, fmt.Errorf("scan strava connection: %w", err)
	}
	accessCT, err := base64.StdEncoding.DecodeString(accessEnc)
	if err != nil {
		return nil, fmt.Errorf("decode access token: %w", err)
	}
	refreshCT, err := base64.StdEncoding.DecodeString(refreshEnc)
	if err != nil {
		return nil, fmt.Errorf("decode refresh token: %w", err)
	}
	access, err := r.sealer.Open(accessCT)
	if err != nil {
		return nil, fmt.Errorf("open access token: %w", err)
	}
	refresh, err := r.sealer.Open(refreshCT)
	if err != nil {
		return nil, fmt.Errorf("open refresh token: %w", err)
	}
	c.AccessToken = string(access)
	c.RefreshToken = string(refresh)
	c.AthleteFirstname = firstname
	c.AthleteLastname = lastname
	c.AthleteProfileURL = profile
	return &c, nil
}

func nullString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
