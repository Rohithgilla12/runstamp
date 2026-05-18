// Package db handles Postgres connection pooling and migrations.
package db

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// NewPool opens a pgxpool.Pool from the given connection URL and applies
// sensible capacity defaults. When `log` is non-nil the pool is wired with
// a QueryTracer that logs slow queries + accumulates per-request DB time
// onto middleware.Timings. The caller is responsible for calling
// pool.Close() when the process shuts down.
func NewPool(ctx context.Context, databaseURL string, log *slog.Logger) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("db: parse config: %w", err)
	}

	cfg.MaxConns = 10
	cfg.MaxConnLifetime = 30 * time.Minute
	if log != nil {
		cfg.ConnConfig.Tracer = &QueryTracer{Log: log}
	}

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("db: open pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("db: ping: %w", err)
	}

	return pool, nil
}
