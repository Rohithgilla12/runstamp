package db

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/middleware"
	"github.com/jackc/pgx/v5"
)

// QueryTracer is a pgx.QueryTracer implementation that:
//   - accumulates per-query duration onto the request's middleware.Timings,
//     so the HTTP request log line can report db_ms / db_queries
//   - logs any individual query that takes longer than `slowQueryMs` at
//     WARN with the SQL snippet + duration, so the slow culprit is grep-
//     able in `docker logs runstamp-api`
//
// The Timings context value is only present for queries fired inside an
// HTTP request handler; queries from the importer worker / boot path will
// just be no-ops for the timing add (the slow-log still fires).
type QueryTracer struct {
	Log *slog.Logger
}

// Slow-query threshold. 50ms is the boundary Postgres' built-in
// log_min_duration_statement recommends for "worth investigating" on OLTP
// workloads. Below that and the noise floor of the slog channel dominates
// what you'd learn.
const slowQueryMs = 50

type tracerStateKey struct{}

type tracerState struct {
	startedAt time.Time
	sql       string
}

// TraceQueryStart stashes the start time + SQL on the per-query context.
// pgx threads the returned context into the matching TraceQueryEnd.
func (t *QueryTracer) TraceQueryStart(ctx context.Context, _ *pgx.Conn, data pgx.TraceQueryStartData) context.Context {
	return context.WithValue(ctx, tracerStateKey{}, &tracerState{
		startedAt: time.Now(),
		sql:       data.SQL,
	})
}

func (t *QueryTracer) TraceQueryEnd(ctx context.Context, _ *pgx.Conn, data pgx.TraceQueryEndData) {
	state, ok := ctx.Value(tracerStateKey{}).(*tracerState)
	if !ok || state == nil {
		return
	}
	dur := time.Since(state.startedAt)

	if timings := middleware.TimingsFromContext(ctx); timings != nil {
		timings.AddDB(dur)
	}

	if dur.Milliseconds() >= slowQueryMs && t.Log != nil {
		t.Log.Warn("db slow query",
			"dur_ms", dur.Milliseconds(),
			"rows", data.CommandTag.RowsAffected(),
			"sql", squashSQL(state.sql),
		)
	}
}

// squashSQL flattens multi-line SQL into a single-line snippet for the log.
// Truncates at 200 chars so a verbose RETURNING clause doesn't blow up the
// log line — the prefix is plenty to identify the query.
func squashSQL(s string) string {
	s = strings.Join(strings.Fields(s), " ")
	if len(s) > 200 {
		return s[:200] + "…"
	}
	return s
}
