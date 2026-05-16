// Package places handles reverse geocoding from (lat, lon) → (city, country).
//
// We hit Nominatim's public API (https://nominatim.openstreetmap.org/reverse).
// Their usage policy:
//   - Max 1 request per second per IP.
//   - Send a real User-Agent identifying the app + contact.
//   - Cache aggressively, never bypass our own cache.
//
// The cache lives in the geocode_cache table, keyed by a 0.01° grid cell
// (~1.1km at the equator). Two activities that started within a city block
// share a cache hit. PRD §5 calls for this.
package places

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	userAgent       = "Runstamp/0.1 (https://runstamp.gilla.fun; rohith@gilla.fun)"
	nominatimBase   = "https://nominatim.openstreetmap.org/reverse"
	requestInterval = 1100 * time.Millisecond // a hair over 1s to be safe
	httpTimeout     = 15 * time.Second
)

// Result holds what we cache + return.
type Result struct {
	City        string
	Country     string
	CountryCode string
}

// Geocoder serializes outbound requests so we respect Nominatim's rate limit.
// It's safe to share across goroutines; calls block until the previous
// request is at least requestInterval ago.
type Geocoder struct {
	pool   *pgxpool.Pool
	client *http.Client
	log    *slog.Logger
	mu     sync.Mutex // serializes outbound requests
	last   time.Time
}

func NewGeocoder(pool *pgxpool.Pool, log *slog.Logger) *Geocoder {
	return &Geocoder{
		pool:   pool,
		client: &http.Client{Timeout: httpTimeout},
		log:    log,
	}
}

// Lookup returns the Result for the given coordinates. Cache hit returns
// immediately; cache miss spends up to ~1s waiting on the rate limiter,
// then issues a single Nominatim request, persists the result, and returns.
func (g *Geocoder) Lookup(ctx context.Context, lat, lon float64) (Result, error) {
	latCell := int(math.Floor(lat * 100))
	lonCell := int(math.Floor(lon * 100))

	var cached Result
	err := g.pool.QueryRow(ctx, `
SELECT city, country, country_code
FROM geocode_cache
WHERE lat_cell = $1 AND lon_cell = $2`, latCell, lonCell).Scan(&cached.City, &cached.Country, &cached.CountryCode)
	if err == nil {
		// Normalize on read so legacy cache rows ("Mumbai Suburban", "Bombay")
		// surface as the canonical city without needing a cache invalidation.
		cached.City = normalizeCity(cached.City)
		return cached, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return Result{}, fmt.Errorf("places: cache lookup: %w", err)
	}

	res, err := g.fetch(ctx, lat, lon)
	if err != nil {
		return Result{}, err
	}

	_, err = g.pool.Exec(ctx, `
INSERT INTO geocode_cache (lat_cell, lon_cell, city, country, country_code)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (lat_cell, lon_cell) DO NOTHING`,
		latCell, lonCell, nullable(res.City), nullable(res.Country), nullable(res.CountryCode))
	if err != nil {
		g.log.Warn("places: cache insert failed", "err", err)
	}
	return res, nil
}

func nullable(s string) any {
	if s == "" {
		return nil
	}
	return s
}

type nominatimResponse struct {
	Address struct {
		City        string `json:"city"`
		Town        string `json:"town"`
		Village     string `json:"village"`
		Municipality string `json:"municipality"`
		Suburb      string `json:"suburb"`
		County      string `json:"county"`
		State       string `json:"state"`
		Country     string `json:"country"`
		CountryCode string `json:"country_code"`
	} `json:"address"`
}

func (g *Geocoder) fetch(ctx context.Context, lat, lon float64) (Result, error) {
	g.mu.Lock()
	wait := time.Until(g.last.Add(requestInterval))
	if wait > 0 {
		select {
		case <-time.After(wait):
		case <-ctx.Done():
			g.mu.Unlock()
			return Result{}, ctx.Err()
		}
	}
	g.last = time.Now()
	g.mu.Unlock()

	q := url.Values{}
	q.Set("format", "jsonv2")
	q.Set("lat", fmt.Sprintf("%.6f", lat))
	q.Set("lon", fmt.Sprintf("%.6f", lon))
	q.Set("zoom", "10")
	q.Set("addressdetails", "1")
	urlStr := nominatimBase + "?" + q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, urlStr, nil)
	if err != nil {
		return Result{}, err
	}
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Accept", "application/json")
	resp, err := g.client.Do(req)
	if err != nil {
		return Result{}, fmt.Errorf("places: nominatim request: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return Result{}, fmt.Errorf("places: nominatim status %d: %s", resp.StatusCode, string(body))
	}
	var parsed nominatimResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return Result{}, fmt.Errorf("places: decode nominatim: %w", err)
	}

	return Result{
		City:        normalizeCity(pickCity(parsed)),
		Country:     parsed.Address.Country,
		CountryCode: parsed.Address.CountryCode,
	}, nil
}

// pickCity picks the best available locality from Nominatim's response.
// city > town > village > municipality > suburb > county.
func pickCity(p nominatimResponse) string {
	for _, candidate := range []string{p.Address.City, p.Address.Town, p.Address.Village, p.Address.Municipality, p.Address.Suburb, p.Address.County} {
		if candidate != "" {
			return candidate
		}
	}
	return ""
}

// CityAliases is the canonical form for cities Nominatim returns under
// administrative-district or historical names. Without this, a user who ran
// in Bandra gets "Mumbai Suburban" and shows up as a separate city from
// someone who ran in South Mumbai. Exported so the backfill sweep can
// re-normalize already-geocoded rows in the activities table.
var CityAliases = map[string]string{
	"Mumbai Suburban":          "Mumbai",
	"Mumbai Suburban District": "Mumbai",
	"Bombay":                   "Mumbai",
	"Bombay Suburban":          "Mumbai",
	"Greater Bombay":           "Mumbai",
	"Bengaluru Urban":          "Bengaluru",
	"Bangalore Urban":          "Bengaluru",
	"Bangalore":                "Bengaluru",
	"Calcutta":                 "Kolkata",
	"Madras":                   "Chennai",
	"Gurgaon":                  "Gurugram",
}

// NormalizeCity rewrites city names to their canonical form. Idempotent.
func NormalizeCity(name string) string { return normalizeCity(name) }

func normalizeCity(name string) string {
	if alias, ok := CityAliases[name]; ok {
		return alias
	}
	return name
}
