// Backfills street coverage over existing canonical activities with a latlng
// stream. Run manually: go run ./cmd/coverage-backfill (uses DATABASE_URL).
package main

import (
	"context"
	"log/slog"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/coverage"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/osm"
)

func main() {
	ctx := context.Background()
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
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

	matcher := coverage.NewMatcher(pool, osm.NewImporter(pool, log), log)

	rows, err := pool.Query(ctx, `
SELECT DISTINCT a.id
FROM activities a
JOIN activity_streams s ON s.activity_id = a.id AND s.type = 'latlng'
WHERE a.dupe_of IS NULL
  AND NOT EXISTS (SELECT 1 FROM activity_covered_ways c WHERE c.activity_id = a.id)
ORDER BY a.id`)
	if err != nil {
		log.Error("query activities", "err", err)
		os.Exit(1)
	}
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			log.Error("scan", "err", err)
			os.Exit(1)
		}
		ids = append(ids, id)
	}
	rows.Close()

	log.Info("coverage backfill: starting", "activities", len(ids))
	for i, id := range ids {
		if err := matcher.MatchActivity(ctx, id); err != nil {
			log.Error("match", "err", err, "activity", id)
			continue
		}
		if (i+1)%25 == 0 {
			log.Info("coverage backfill: progress", "done", i+1, "of", len(ids))
		}
	}
	log.Info("coverage backfill: done", "activities", len(ids))
}
