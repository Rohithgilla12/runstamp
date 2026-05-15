package db

import (
	"errors"
	"fmt"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// Migrate runs all pending up-migrations found in migrationsDir against the
// database at dbURL. It is idempotent: already-applied migrations are skipped.
// migrationsDir should be a path resolvable by the file:// source, e.g.
// "./migrations" or an absolute path.
//
// golang-migrate's pgx/v5 driver registers under the "pgx5" scheme, so any
// postgres:// or postgresql:// URL is rewritten before being handed to the
// migrate library.
func Migrate(dbURL, migrationsDir string) error {
	driverURL := toPgx5URL(dbURL)
	sourceURL := "file://" + migrationsDir

	m, err := migrate.New(sourceURL, driverURL)
	if err != nil {
		return fmt.Errorf("db: migrate init: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("db: migrate up: %w", err)
	}

	return nil
}

// toPgx5URL rewrites a postgres:// or postgresql:// DSN to pgx5:// so the
// golang-migrate pgx/v5 driver is resolved instead of the stdlib pgx driver.
func toPgx5URL(dsn string) string {
	for _, prefix := range []string{"postgresql://", "postgres://"} {
		if strings.HasPrefix(dsn, prefix) {
			return "pgx5://" + dsn[len(prefix):]
		}
	}
	return dsn
}
