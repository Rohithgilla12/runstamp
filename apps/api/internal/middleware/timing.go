package middleware

import (
	"context"
	"sync"
	"sync/atomic"
	"time"
)

// Timings accumulates per-request component durations so the request logger
// can break down `dur_ms` into auth / db / json instead of leaving it as
// one opaque number. Add helpers are concurrency-safe; nothing in our stack
// runs handlers concurrently for a single request but pgx tracer callbacks
// can interleave with handler code so we use atomics rather than a mutex.
//
// The struct sits behind a context value: middleware puts it on, callers
// (auth middleware, pgx tracer, writeJSON) read it and bump their counter,
// the logger reads the totals and emits.
type Timings struct {
	authNs atomic.Int64
	dbNs   atomic.Int64
	// dbQueries tracks how many pgx queries fired during the request so the
	// log line can flag N+1 patterns (e.g. 47 queries on what should be one
	// list endpoint).
	dbQueries atomic.Int64
	once      sync.Once
}

type timingsCtxKey struct{}

// WithTimings returns a context with a fresh Timings attached. Called at the
// start of every request by the logger middleware.
func WithTimings(ctx context.Context) (context.Context, *Timings) {
	t := &Timings{}
	return context.WithValue(ctx, timingsCtxKey{}, t), t
}

// TimingsFromContext returns the Timings attached to ctx, or nil if none.
// Callers should no-op when nil (e.g. queries fired during boot / outside
// a request).
func TimingsFromContext(ctx context.Context) *Timings {
	if t, ok := ctx.Value(timingsCtxKey{}).(*Timings); ok {
		return t
	}
	return nil
}

func (t *Timings) AddAuth(d time.Duration) {
	if t == nil {
		return
	}
	t.authNs.Add(int64(d))
}

func (t *Timings) AddDB(d time.Duration) {
	if t == nil {
		return
	}
	t.dbNs.Add(int64(d))
	t.dbQueries.Add(1)
}

func (t *Timings) AuthMs() int64    { return t.authNs.Load() / int64(time.Millisecond) }
func (t *Timings) DBMs() int64      { return t.dbNs.Load() / int64(time.Millisecond) }
func (t *Timings) DBQueries() int64 { return t.dbQueries.Load() }
