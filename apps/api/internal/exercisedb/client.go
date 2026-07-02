// Package exercisedb is the server-side client for AscendAPI's ExerciseDB V2.
// The RapidAPI key is a secret and lives only here — the mobile app talks to
// our own /v1/exercises endpoints, never to RapidAPI directly.
package exercisedb

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Defaults for AscendAPI's ExerciseDB V2 on RapidAPI. Both are overridable via
// env so a plan/host change is config, not code.
const (
	DefaultBaseURL = "https://edb-with-videos-and-images-by-ascendapi.p.rapidapi.com"
	DefaultHost    = "edb-with-videos-and-images-by-ascendapi.p.rapidapi.com"
)

// ErrNotFound is returned by GetByID when the exercise id is unknown.
var ErrNotFound = fmt.Errorf("exercisedb: exercise not found")

// Exercise is the subset of an ExerciseDB V2 object we surface to the app.
// Unknown fields on the wire are ignored.
type Exercise struct {
	ExerciseID       string   `json:"exerciseId"`
	Name             string   `json:"name"`
	ImageURL         string   `json:"imageUrl"`
	VideoURL         string   `json:"videoUrl,omitempty"`
	BodyParts        []string `json:"bodyParts,omitempty"`
	TargetMuscles    []string `json:"targetMuscles,omitempty"`
	SecondaryMuscles []string `json:"secondaryMuscles,omitempty"`
	Equipments       []string `json:"equipments,omitempty"`
	ExerciseType     string   `json:"exerciseType,omitempty"`
	Overview         string   `json:"overview,omitempty"`
	Instructions     []string `json:"instructions,omitempty"`
	ExerciseTips     []string `json:"exerciseTips,omitempty"`
}

// envelope is AscendAPI's uniform response wrapper: {"success":true,"data":...}.
type envelope struct {
	Success bool            `json:"success"`
	Data    json.RawMessage `json:"data"`
}

// Client is a thin HTTP client for the RapidAPI-hosted ExerciseDB V2. A Client
// with an empty apiKey is disabled — every call returns ErrDisabled — so the
// server boots (and the app degrades) without a key configured.
type Client struct {
	baseURL string
	host    string
	apiKey  string
	http    *http.Client
}

// ErrDisabled is returned by every method when no RapidAPI key is configured.
var ErrDisabled = fmt.Errorf("exercisedb: no RapidAPI key configured")

func New(apiKey, baseURL, host string) *Client {
	if baseURL == "" {
		baseURL = DefaultBaseURL
	}
	if host == "" {
		host = DefaultHost
	}
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		host:    host,
		apiKey:  apiKey,
		http:    &http.Client{Timeout: 12 * time.Second},
	}
}

// Enabled reports whether a RapidAPI key is configured.
func (c *Client) Enabled() bool { return c.apiKey != "" }

// Search returns light exercise matches (id, name, image) for a fuzzy query.
func (c *Client) Search(ctx context.Context, query string, limit int) ([]Exercise, error) {
	if !c.Enabled() {
		return nil, ErrDisabled
	}
	q := url.Values{}
	q.Set("search", query)
	if limit > 0 {
		q.Set("limit", strconv.Itoa(limit))
	}
	raw, err := c.get(ctx, "/api/v1/exercises/search?"+q.Encode())
	if err != nil {
		return nil, err
	}
	var out []Exercise
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("exercisedb: decode search: %w", err)
	}
	return out, nil
}

// GetByID returns the full exercise object for an id, or ErrNotFound.
func (c *Client) GetByID(ctx context.Context, id string) (*Exercise, error) {
	if !c.Enabled() {
		return nil, ErrDisabled
	}
	raw, err := c.get(ctx, "/api/v1/exercises/"+url.PathEscape(id))
	if err != nil {
		return nil, err
	}
	var ex Exercise
	if err := json.Unmarshal(raw, &ex); err != nil {
		return nil, fmt.Errorf("exercisedb: decode exercise: %w", err)
	}
	return &ex, nil
}

// get performs a GET, unwraps the {success,data} envelope, and returns the
// raw data payload. A 404 maps to ErrNotFound.
func (c *Client) get(ctx context.Context, path string) (json.RawMessage, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+path, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("x-rapidapi-key", c.apiKey)
	req.Header.Set("x-rapidapi-host", c.host)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("exercisedb: request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, fmt.Errorf("exercisedb: read body: %w", err)
	}
	if resp.StatusCode == http.StatusNotFound {
		return nil, ErrNotFound
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("exercisedb: upstream %d: %s", resp.StatusCode, truncate(string(body), 200))
	}

	var env envelope
	if err := json.Unmarshal(body, &env); err != nil {
		return nil, fmt.Errorf("exercisedb: decode envelope: %w", err)
	}
	if len(env.Data) == 0 {
		return nil, ErrNotFound
	}
	return env.Data, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
