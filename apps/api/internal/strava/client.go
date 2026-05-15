// Package strava is the server-side Strava API client. The mobile app gets a
// stable HTTPS callback URL on our backend, never sees the client_secret, and
// is told to navigate to the authorize URL we generate here. We do the
// authorization-code exchange in FinishAuthorize.
package strava

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	authorizeEndpoint = "https://www.strava.com/oauth/authorize"
	tokenEndpoint     = "https://www.strava.com/oauth/token"
	deauthorizeEndpoint = "https://www.strava.com/oauth/deauthorize"
)

// DefaultScopes — minimum to read activities + profile.
var DefaultScopes = []string{"activity:read_all", "profile:read_all"}

type Client struct {
	clientID     string
	clientSecret string
	http         *http.Client
}

func New(clientID, clientSecret string) *Client {
	return &Client{
		clientID:     clientID,
		clientSecret: clientSecret,
		http:         &http.Client{Timeout: 10 * time.Second},
	}
}

// Athlete is the subset of Strava's athlete payload we surface.
type Athlete struct {
	ID        int64  `json:"id"`
	Username  string `json:"username"`
	Firstname string `json:"firstname"`
	Lastname  string `json:"lastname"`
	Profile   string `json:"profile"`
}

// TokenResponse mirrors Strava's token grant + refresh payload.
type TokenResponse struct {
	TokenType    string  `json:"token_type"`
	ExpiresAt    int64   `json:"expires_at"`
	ExpiresIn    int64   `json:"expires_in"`
	RefreshToken string  `json:"refresh_token"`
	AccessToken  string  `json:"access_token"`
	Scope        string  `json:"scope"`
	Athlete      Athlete `json:"athlete"`
}

// AuthorizeURL returns the URL the user's browser should navigate to. The
// caller is responsible for tracking `state` and verifying it on callback.
func (c *Client) AuthorizeURL(callbackURL, state string, scopes []string) string {
	if len(scopes) == 0 {
		scopes = DefaultScopes
	}
	q := url.Values{
		"client_id":       {c.clientID},
		"redirect_uri":    {callbackURL},
		"response_type":   {"code"},
		"approval_prompt": {"auto"},
		"scope":           {strings.Join(scopes, ",")},
		"state":           {state},
	}
	return authorizeEndpoint + "?" + q.Encode()
}

// ExchangeCode trades an authorization_code for an access + refresh token
// pair. Strava confidential clients don't use PKCE — the client_secret is
// the second factor and lives only on this server.
func (c *Client) ExchangeCode(ctx context.Context, code string) (*TokenResponse, error) {
	form := url.Values{
		"client_id":     {c.clientID},
		"client_secret": {c.clientSecret},
		"code":          {code},
		"grant_type":    {"authorization_code"},
	}
	return c.postToken(ctx, form)
}

// RefreshToken exchanges a refresh_token for a fresh access_token.
func (c *Client) RefreshToken(ctx context.Context, refreshToken string) (*TokenResponse, error) {
	form := url.Values{
		"client_id":     {c.clientID},
		"client_secret": {c.clientSecret},
		"grant_type":    {"refresh_token"},
		"refresh_token": {refreshToken},
	}
	return c.postToken(ctx, form)
}

// DeauthorizeAthlete revokes our access; called best-effort on disconnect.
// Errors are non-fatal — the local row is the source of truth.
func (c *Client) DeauthorizeAthlete(ctx context.Context, accessToken string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, deauthorizeEndpoint, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode/100 != 2 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("strava: deauthorize %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	return nil
}

func (c *Client) postToken(ctx context.Context, form url.Values) (*TokenResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, tokenEndpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, fmt.Errorf("strava: build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("strava: do request: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode/100 != 2 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("strava: token endpoint %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	var out TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, fmt.Errorf("strava: decode response: %w", err)
	}
	return &out, nil
}
