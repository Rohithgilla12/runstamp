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
	// COALESCE so NULL columns scan into empty strings instead of erroring out.
	// A legitimate "no city" cache hit (e.g. open ocean) should not poison
	// every subsequent lookup at that cell.
	err := g.pool.QueryRow(ctx, `
SELECT COALESCE(city, ''), COALESCE(country, ''), COALESCE(country_code, '')
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
		City          string `json:"city"`
		Town          string `json:"town"`
		Village       string `json:"village"`
		Municipality  string `json:"municipality"`
		CityDistrict  string `json:"city_district"`
		Suburb        string `json:"suburb"`
		County        string `json:"county"`
		StateDistrict string `json:"state_district"`
		State         string `json:"state"`
		Country       string `json:"country"`
		CountryCode   string `json:"country_code"`
	} `json:"address"`
}

// fetch resolves (lat, lon) → Result by hitting Nominatim, with a coarse-
// to-fine fallback: try zoom=10 first (good enough for any place modeled
// as a place=city in OSM); if zoom=10 only yields admin-level locality
// (county or state_district) and CityAliases doesn't rewrite it, refetch
// at zoom=14 and prefer that. Two Nominatim hits cost ~2.2s thanks to the
// rate limiter, but the fallback only fires for cells where zoom=10 was
// going to give a bad answer anyway.
func (g *Geocoder) fetch(ctx context.Context, lat, lon float64) (Result, error) {
	parsed10, err := g.fetchAtZoom(ctx, lat, lon, 10)
	if err != nil {
		return Result{}, err
	}
	rawCity10 := pickCity(parsed10)
	res := Result{
		City:        normalizeCity(rawCity10),
		Country:     parsed10.Address.Country,
		CountryCode: parsed10.Address.CountryCode,
	}

	if shouldRefineAtFinerZoom(rawCity10, res.City, parsed10) {
		parsed14, ferr := g.fetchAtZoom(ctx, lat, lon, 14)
		if ferr != nil {
			// Don't fail the whole lookup if the refinement request errors —
			// the zoom=10 result is still a valid (if coarse) answer.
			g.log.Warn("places: zoom=14 refine failed", "lat", lat, "lon", lon, "err", ferr)
			return res, nil
		}
		if refined := normalizeCity(pickCity(parsed14)); refined != "" {
			res.City = refined
		}
		if res.Country == "" {
			res.Country = parsed14.Address.Country
		}
		if res.CountryCode == "" {
			res.CountryCode = parsed14.Address.CountryCode
		}
	}
	return res, nil
}

// shouldRefineAtFinerZoom reports whether the zoom=10 result was so coarse
// that retrying at zoom=14 might yield a real city. It fires when pickCity
// fell back to county/state_district AND CityAliases didn't rewrite it.
//
// rawCity is what pickCity returned before alias normalization;
// normalizedCity is the post-alias form. If those differ, an alias caught
// the admin name (e.g. "Mumbai City District" → "Mumbai") and there's no
// point hitting Nominatim again.
func shouldRefineAtFinerZoom(rawCity, normalizedCity string, p nominatimResponse) bool {
	if rawCity == "" {
		return true
	}
	if normalizedCity != rawCity {
		return false // alias handled it
	}
	return rawCity == p.Address.County || rawCity == p.Address.StateDistrict
}

// fetchAtZoom does the rate-limited HTTP roundtrip to Nominatim and returns
// the parsed response. Caller is responsible for picking + normalizing.
func (g *Geocoder) fetchAtZoom(ctx context.Context, lat, lon float64, zoom int) (nominatimResponse, error) {
	g.mu.Lock()
	wait := time.Until(g.last.Add(requestInterval))
	if wait > 0 {
		select {
		case <-time.After(wait):
		case <-ctx.Done():
			g.mu.Unlock()
			return nominatimResponse{}, ctx.Err()
		}
	}
	g.last = time.Now()
	g.mu.Unlock()

	q := url.Values{}
	q.Set("format", "jsonv2")
	q.Set("lat", fmt.Sprintf("%.6f", lat))
	q.Set("lon", fmt.Sprintf("%.6f", lon))
	q.Set("zoom", fmt.Sprintf("%d", zoom))
	q.Set("addressdetails", "1")
	urlStr := nominatimBase + "?" + q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, urlStr, nil)
	if err != nil {
		return nominatimResponse{}, err
	}
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Accept", "application/json")
	resp, err := g.client.Do(req)
	if err != nil {
		return nominatimResponse{}, fmt.Errorf("places: nominatim request: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return nominatimResponse{}, fmt.Errorf("places: nominatim status %d: %s", resp.StatusCode, string(body))
	}
	var parsed nominatimResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nominatimResponse{}, fmt.Errorf("places: decode nominatim: %w", err)
	}
	return parsed, nil
}

// pickCity picks the best available locality from Nominatim's response.
// city > town > village > municipality > city_district > suburb > county >
// state_district.
//
// state_district is the last-resort fallback because OSM models some major
// cities (notably Mumbai, "Mumbai City District") as an administrative
// state_district rather than a place=city — at zoom=10 the only locality
// field populated is state_district. CityAliases collapses those admin
// names back to the canonical city.
func pickCity(p nominatimResponse) string {
	for _, candidate := range []string{
		p.Address.City,
		p.Address.Town,
		p.Address.Village,
		p.Address.Municipality,
		p.Address.CityDistrict,
		p.Address.Suburb,
		p.Address.County,
		p.Address.StateDistrict,
	} {
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
	// Mumbai — OSM models the city as an administrative state_district
	// ("Mumbai City District") rather than a place=city node. At zoom=10
	// pickCity ends up at state_district; at zoom=12 it'd be city_district
	// ("Mumbai Zone N"). Both collapse to "Mumbai".
	"Mumbai Suburban":          "Mumbai",
	"Mumbai Suburban District": "Mumbai",
	"Mumbai City District":     "Mumbai",
	"Mumbai City":              "Mumbai",
	"Mumbai Zone 1":            "Mumbai",
	"Mumbai Zone 2":            "Mumbai",
	"Mumbai Zone 3":            "Mumbai",
	"Mumbai Zone 4":            "Mumbai",
	"Mumbai Zone 5":            "Mumbai",
	"Mumbai Zone 6":            "Mumbai",
	"Mumbai Zone 7":            "Mumbai",
	"Bombay":                   "Mumbai",
	"Bombay Suburban":          "Mumbai",
	"Greater Bombay":           "Mumbai",
	// US counties that pickCity falls back to when there's no place=city
	// hit — alias to the underlying city.
	"Santa Clara County": "Santa Clara",
	// Telangana mandals — OSM exposes mandals (rural admin subdivisions)
	// as `county` at zoom=10. zoom=14 returns village names that aren't
	// recognizable; the user's intent is the parent city these mandals
	// belong to.
	"Hanamkonda mandal":    "Hanamkonda", // mandal seat IS the town
	"Kothapally mandal":    "Karimnagar", // Karimnagar district
	"Nandigama mandal":     "Hyderabad",  // Ranga Reddy / Hyderabad metro
	"Balapur mandal":       "Hyderabad",  // Ranga Reddy / Hyderabad metro
	"Yadagirigutta mandal": "Yadagirigutta",
	// Historical / canonical names.
	"Bengaluru Urban": "Bengaluru",
	"Bangalore Urban": "Bengaluru",
	"Bangalore":       "Bengaluru",
	"Calcutta":        "Kolkata",
	"Madras":          "Chennai",
	"Gurgaon":         "Gurugram",
}

// NormalizeCity rewrites city names to their canonical form. Idempotent.
func NormalizeCity(name string) string { return normalizeCity(name) }

func normalizeCity(name string) string {
	if alias, ok := CityAliases[name]; ok {
		return alias
	}
	return name
}
