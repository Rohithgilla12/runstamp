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
	authorizeEndpoint   = "https://www.strava.com/oauth/authorize"
	tokenEndpoint       = "https://www.strava.com/oauth/token"
	deauthorizeEndpoint = "https://www.strava.com/oauth/deauthorize"
	apiBase             = "https://www.strava.com/api/v3"
)

// ErrTokenExpired is returned by FetchActivity / FetchActivityStreams when
// Strava responds with 401 Unauthorized. Callers should refresh the token
// and retry exactly once.
var ErrTokenExpired = fmt.Errorf("strava: access token expired")

// SummaryActivity is the subset of a Strava summary-activity object we
// map into the activities table. Returned by ListAthleteActivities.
type SummaryActivity struct {
	ID                 int64     `json:"id"`
	Name               string    `json:"name"`
	Type               string    `json:"type"`
	StartDate          time.Time `json:"start_date"`
	ElapsedTime        int       `json:"elapsed_time"`
	MovingTime         int       `json:"moving_time"`
	Distance           float64   `json:"distance"`
	TotalElevationGain float64   `json:"total_elevation_gain"`
	AverageHeartrate   float64   `json:"average_heartrate"`
	MaxHeartrate       float64   `json:"max_heartrate"`
	AverageSpeed       float64   `json:"average_speed"`
	Calories           float64   `json:"calories"`
	StartLatlng        []float64 `json:"start_latlng"`
	LocationCity       string    `json:"location_city"`
	LocationCountry    string    `json:"location_country"`
}

// PolylineMap holds the encoded map data from Strava.
type PolylineMap struct {
	SummaryPolyline string `json:"summary_polyline"`
}

// DetailedActivity is the full Strava detailed-activity response. We store
// the full payload in the raw jsonb column for re-ingest.
type DetailedActivity struct {
	ID                 int64       `json:"id"`
	Name               string      `json:"name"`
	Type               string      `json:"type"`
	StartDate          time.Time   `json:"start_date"`
	ElapsedTime        int         `json:"elapsed_time"`
	MovingTime         int         `json:"moving_time"`
	Distance           float64     `json:"distance"`
	TotalElevationGain float64     `json:"total_elevation_gain"`
	AverageHeartrate   float64     `json:"average_heartrate"`
	MaxHeartrate       float64     `json:"max_heartrate"`
	AverageSpeed       float64     `json:"average_speed"`
	Calories           float64     `json:"calories"`
	StartLatlng        []float64   `json:"start_latlng"`
	LocationCity       string      `json:"location_city"`
	LocationCountry    string      `json:"location_country"`
	Map                PolylineMap `json:"map"`
}

// Stream is one key from the Strava streams endpoint, key_by_type=true.
type Stream struct {
	Data         []float64 `json:"data"`
	OriginalSize int       `json:"original_size"`
	Resolution   string    `json:"resolution"`
}

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

// ListAthleteActivities pages through GET /athlete/activities. Pass before /
// after as the Unix-epoch window; page and perPage control Strava pagination.
// If perPage is 0 it defaults to 200 (Strava's maximum). Returns an empty
// slice (no error) when Strava returns an empty page — callers should stop
// iterating at that point.
func (c *Client) ListAthleteActivities(ctx context.Context, accessToken string, before, after time.Time, page, perPage int) ([]SummaryActivity, error) {
	if perPage == 0 {
		perPage = 200
	}
	q := url.Values{
		"before":   {fmt.Sprintf("%d", before.Unix())},
		"after":    {fmt.Sprintf("%d", after.Unix())},
		"page":     {fmt.Sprintf("%d", page)},
		"per_page": {fmt.Sprintf("%d", perPage)},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiBase+"/athlete/activities?"+q.Encode(), nil)
	if err != nil {
		return nil, fmt.Errorf("strava: build list request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("strava: list activities: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusUnauthorized {
		return nil, ErrTokenExpired
	}
	if resp.StatusCode/100 != 2 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("strava: list activities %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	var out []SummaryActivity
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, fmt.Errorf("strava: decode list activities: %w", err)
	}
	return out, nil
}

// FetchActivity fetches GET /activities/{id}?include_all_efforts=false. Returns
// ErrTokenExpired on a 401 so the caller can refresh + retry once.
func (c *Client) FetchActivity(ctx context.Context, accessToken string, id int64) (*DetailedActivity, error) {
	u := fmt.Sprintf("%s/activities/%d?include_all_efforts=false", apiBase, id)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, fmt.Errorf("strava: build fetch request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("strava: fetch activity: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusUnauthorized {
		return nil, ErrTokenExpired
	}
	if resp.StatusCode/100 != 2 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("strava: fetch activity %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	var out DetailedActivity
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, fmt.Errorf("strava: decode activity: %w", err)
	}
	return &out, nil
}

// defaultStreamTypes are the keys we request when the caller passes nil.
var defaultStreamTypes = []string{"heartrate", "latlng", "altitude", "velocity_smooth"}

// FetchActivityStreams fetches GET /activities/{id}/streams?key_by_type=true.
// If types is nil, defaultStreamTypes is used. Returns ErrTokenExpired on 401.
// A 404 from Strava (no streams for this activity) is returned as an empty map,
// not an error.
func (c *Client) FetchActivityStreams(ctx context.Context, accessToken string, id int64, types []string) (map[string]Stream, error) {
	if len(types) == 0 {
		types = defaultStreamTypes
	}
	q := url.Values{
		"keys":         {strings.Join(types, ",")},
		"key_by_type":  {"true"},
	}
	u := fmt.Sprintf("%s/activities/%d/streams?%s", apiBase, id, q.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, fmt.Errorf("strava: build streams request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("strava: fetch streams: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusUnauthorized {
		return nil, ErrTokenExpired
	}
	if resp.StatusCode == http.StatusNotFound {
		return map[string]Stream{}, nil
	}
	if resp.StatusCode/100 != 2 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("strava: fetch streams %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	var out map[string]Stream
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, fmt.Errorf("strava: decode streams: %w", err)
	}
	return out, nil
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
