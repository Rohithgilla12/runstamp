// Loads runnable streets from a Geofabrik .osm.pbf extract into osm_ways,
// then records the covered bbox in osm_regions so per-activity EnsureRegion
// stops calling Overpass (unreachable from prod).
//
// Usage:
//   DATABASE_URL=... go run ./cmd/osm-load -file hyderabad.osm.pbf
//   DATABASE_URL=... go run ./cmd/osm-load -file india.osm.pbf -bbox 17.2,78.2,17.6,78.7
//
// -bbox is minLat,minLng,maxLat,maxLng. Prefer city/region extracts from
// download.geofabrik.de over country files — the loader keeps runnable-way
// node refs in memory.
package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/osm"
)

func main() {
	file := flag.String("file", "", "path to .osm.pbf extract (required)")
	bboxStr := flag.String("bbox", "", "optional filter: minLat,minLng,maxLat,maxLng")
	flag.Parse()

	ctx := context.Background()
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	if *file == "" {
		log.Error("-file is required")
		os.Exit(1)
	}
	var filter *osm.BBox
	if *bboxStr != "" {
		b, err := parseBBox(*bboxStr)
		if err != nil {
			log.Error("bad -bbox", "err", err)
			os.Exit(1)
		}
		filter = &b
	}
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Error("DATABASE_URL not set")
		os.Exit(1)
	}
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Error("db connect", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	log.Info("osm-load: parsing", "file", *file)
	ways, err := osm.ParsePBFFile(ctx, *file, filter)
	if err != nil {
		log.Error("parse pbf", "err", err)
		os.Exit(1)
	}
	if len(ways) == 0 {
		log.Error("no runnable ways found — wrong extract or bbox?")
		os.Exit(1)
	}
	log.Info("osm-load: parsed", "ways", len(ways))

	im := osm.NewImporter(pool, log)
	const chunk = 1000
	for i := 0; i < len(ways); i += chunk {
		end := min(i+chunk, len(ways))
		if err := im.UpsertWays(ctx, ways[i:end]); err != nil {
			log.Error("upsert chunk", "err", err, "offset", i)
			os.Exit(1)
		}
		log.Info("osm-load: progress", "done", end, "of", len(ways))
	}

	// One region row covering everything loaded, so EnsureRegion no-ops.
	region, ok := osm.GeomBBox(ways)
	if filter != nil {
		region, ok = *filter, true
	}
	if ok {
		if err := im.InsertRegion(ctx, region); err != nil {
			log.Error("insert region", "err", err)
			os.Exit(1)
		}
	}
	log.Info("osm-load: done", "ways", len(ways),
		"region", fmt.Sprintf("%.4f,%.4f,%.4f,%.4f", region.MinLat, region.MinLng, region.MaxLat, region.MaxLng))
}

func parseBBox(s string) (osm.BBox, error) {
	parts := strings.Split(s, ",")
	if len(parts) != 4 {
		return osm.BBox{}, fmt.Errorf("want 4 comma-separated numbers, got %d", len(parts))
	}
	vals := make([]float64, 4)
	for i, p := range parts {
		v, err := strconv.ParseFloat(strings.TrimSpace(p), 64)
		if err != nil {
			return osm.BBox{}, fmt.Errorf("part %d: %w", i+1, err)
		}
		vals[i] = v
	}
	b := osm.BBox{MinLat: vals[0], MinLng: vals[1], MaxLat: vals[2], MaxLng: vals[3]}
	if b.MinLat >= b.MaxLat || b.MinLng >= b.MaxLng {
		return osm.BBox{}, fmt.Errorf("min must be < max")
	}
	return b, nil
}
