package strava

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/activities"
)

const (
	// refreshSkew — refresh proactively so an in-flight request doesn't trip
	// a 401 from Strava. Strava tokens last 6h; 5 min skew is comfortable.
	refreshSkew = 5 * time.Minute
	// stateTTL — long enough for a user to read the consent screen, short
	// enough that a leaked state isn't interesting.
	stateTTL = 10 * time.Minute
)

// Service owns the OAuth lifecycle and activity ingest for Strava. Short-lived
// state lives in memory; everything long-lived lives in the repository.
type Service struct {
	client     *Client
	repo       *Repository
	publicURL  string
	activities *activities.Service

	stateMu sync.Mutex
	states  map[string]stateRecord
}

type stateRecord struct {
	UserID    string
	CreatedAt time.Time
}

func NewService(client *Client, repo *Repository, publicURL string) *Service {
	return &Service{
		client:    client,
		repo:      repo,
		publicURL: publicURL,
		states:    make(map[string]stateRecord),
	}
}

// Repo gives HTTP handlers a read-only view without going through write paths.
func (s *Service) Repo() *Repository { return s.repo }

// BeginAuthorize returns the URL we hand to the mobile app to open in an
// in-app browser. The state token is opaque to Strava and verified on
// callback — without it an attacker could swap their auth code into our
// callback and silently link their Strava to our victim's Runstamp user.
func (s *Service) BeginAuthorize(userID string) (string, error) {
	state, err := randomState()
	if err != nil {
		return "", fmt.Errorf("generate state: %w", err)
	}
	s.stateMu.Lock()
	s.states[state] = stateRecord{UserID: userID, CreatedAt: time.Now()}
	s.gcStatesLocked()
	s.stateMu.Unlock()
	return s.client.AuthorizeURL(s.callbackURL(), state, nil), nil
}

// FinishAuthorize is the second leg — called by the public callback handler.
// Validates state, exchanges code, persists. Returns the user we resolved
// from state so the handler can build a deep-link redirect with the right
// context.
func (s *Service) FinishAuthorize(ctx context.Context, code, state string) (string, error) {
	s.stateMu.Lock()
	rec, ok := s.states[state]
	if ok {
		delete(s.states, state)
	}
	s.stateMu.Unlock()
	if !ok {
		return "", errors.New("strava: unknown or expired state")
	}
	if time.Since(rec.CreatedAt) > stateTTL {
		return "", errors.New("strava: state expired")
	}
	tok, err := s.client.ExchangeCode(ctx, code)
	if err != nil {
		return "", fmt.Errorf("exchange code: %w", err)
	}
	if _, err := s.repo.UpsertConnection(ctx, rec.UserID, tok); err != nil {
		return "", fmt.Errorf("upsert connection: %w", err)
	}
	return rec.UserID, nil
}

// Disconnect deletes the local row + best-effort revokes upstream. Idempotent.
func (s *Service) Disconnect(ctx context.Context, userID string) error {
	conn, err := s.repo.GetByUser(ctx, userID)
	if err != nil {
		if errors.Is(err, ErrConnectionNotFound) {
			return nil
		}
		return err
	}
	if err := s.repo.Delete(ctx, userID); err != nil {
		return err
	}
	deauthCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	_ = s.client.DeauthorizeAthlete(deauthCtx, conn.AccessToken)
	return nil
}

// EnsureFreshToken returns an access token guaranteed not to expire in the
// next refreshSkew. On refresh, the new tokens are persisted so the next
// call doesn't re-refresh. Exported because the future webhook handler will
// call it directly when fetching activity payloads.
func (s *Service) EnsureFreshToken(ctx context.Context, conn *Connection) (string, error) {
	if time.Until(conn.ExpiresAt) > refreshSkew {
		return conn.AccessToken, nil
	}
	tok, err := s.client.RefreshToken(ctx, conn.RefreshToken)
	if err != nil {
		return "", fmt.Errorf("refresh token: %w", err)
	}
	if _, err := s.repo.UpsertConnection(ctx, conn.UserID, tok); err != nil {
		return "", fmt.Errorf("persist refreshed token: %w", err)
	}
	return tok.AccessToken, nil
}

func (s *Service) callbackURL() string {
	return s.publicURL + "/v1/strava/callback"
}

// gcStatesLocked drops state entries older than the TTL. Caller must hold
// stateMu. Called from BeginAuthorize so map size is bounded by the rate at
// which users initiate flows.
func (s *Service) gcStatesLocked() {
	cutoff := time.Now().Add(-stateTTL)
	for k, v := range s.states {
		if v.CreatedAt.Before(cutoff) {
			delete(s.states, k)
		}
	}
}

func randomState() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
