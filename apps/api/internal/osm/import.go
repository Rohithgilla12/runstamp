package osm

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const overpassURL = "https://overpass-api.de/api/interpreter"

// Importer fetches runnable OSM ways for a bbox and upserts them.
type Importer struct {
	pool *pgxpool.Pool
	http *http.Client
	log  *slog.Logger
}

func NewImporter(pool *pgxpool.Pool, log *slog.Logger) *Importer {
	return &Importer{pool: pool, http: &http.Client{Timeout: 90 * time.Second}, log: log}
}

// EnsureRegion imports the bbox once. No-op if an existing region already
// covers it. Returns nil when ways are available for the bbox.
func (im *Importer) EnsureRegion(ctx context.Context, b BBox) error {
	var covered bool
	err := im.pool.QueryRow(ctx, `
SELECT EXISTS (
  SELECT 1 FROM osm_regions
  WHERE ST_Covers(bbox::geometry, ST_MakeEnvelope($1,$2,$3,$4,4326))
)`, b.MinLng, b.MinLat, b.MaxLng, b.MaxLat).Scan(&covered)
	if err != nil {
		return fmt.Errorf("osm: region check: %w", err)
	}
	if covered {
		return nil
	}
	ways, err := im.fetch(ctx, b)
	if err != nil {
		return err
	}
	return im.Upsert(ctx, b, ways)
}

func (im *Importer) fetch(ctx context.Context, b BBox) ([]Way, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, overpassURL,
		strings.NewReader(url.Values{"data": {BuildQuery(b)}}.Encode()))
	if err != nil {
		return nil, fmt.Errorf("osm: build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := im.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("osm: overpass request: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("osm: read overpass: %w", err)
	}
	if resp.StatusCode/100 != 2 {
		return nil, fmt.Errorf("osm: overpass %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	return ParseWays(body)
}

// Upsert writes the ways and records the imported region (one transaction).
// Exported so integration tests can exercise it with fixture ways (no network).
func (im *Importer) Upsert(ctx context.Context, b BBox, ways []Way) error {
	tx, err := im.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("osm: begin: %w", err)
	}
	defer tx.Rollback(ctx)

	for _, w := range ways {
		var sb strings.Builder
		sb.WriteString("SRID=4326;LINESTRING(")
		for i, p := range w.Geometry {
			if i > 0 {
				sb.WriteString(",")
			}
			fmt.Fprintf(&sb, "%.7f %.7f", p[1], p[0]) // lng lat
		}
		sb.WriteString(")")
		if _, err := tx.Exec(ctx, `
INSERT INTO osm_ways (way_id, highway, name, geom, length_m)
VALUES ($1,$2,$3, ST_GeogFromText($4), $5)
ON CONFLICT (way_id) DO UPDATE SET
  highway = EXCLUDED.highway, name = EXCLUDED.name,
  geom = EXCLUDED.geom, length_m = EXCLUDED.length_m`,
			w.WayID, w.Highway, nullStr(w.Name), sb.String(), w.LengthM); err != nil {
			return fmt.Errorf("osm: upsert way %d: %w", w.WayID, err)
		}
	}
	if _, err := tx.Exec(ctx, `
INSERT INTO osm_regions (bbox)
VALUES (ST_MakeEnvelope($1,$2,$3,$4,4326)::geography)`,
		b.MinLng, b.MinLat, b.MaxLng, b.MaxLat); err != nil {
		return fmt.Errorf("osm: insert region: %w", err)
	}
	im.log.Info("osm: imported region", "ways", len(ways))
	return tx.Commit(ctx)
}

func nullStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
