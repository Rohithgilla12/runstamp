// Package middleware contains HTTP middlewares wired by cmd/server.
package middleware

import (
	"log/slog"
	"net/http"
	"time"
)

// statusRecorder lets us read the status code AND the bytes written after
// the handler runs. The bytes counter is exact for plain Write paths; for
// http.ResponseWriter implementations that bypass Write (rare) it'll
// under-count, which is fine for our diagnostic purposes.
type statusRecorder struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (s *statusRecorder) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

func (s *statusRecorder) Write(p []byte) (int, error) {
	n, err := s.ResponseWriter.Write(p)
	s.bytes += n
	return n, err
}

// Slow-request threshold. Anything over this gets logged at WARN with the
// full timing breakdown so it stands out in `docker logs`. 300ms picked as
// "slow enough that a runner pulling-to-refresh would notice the pause."
const slowRequestMs = 300

// Logger emits one structured slog line per request with duration + status.
// When request timings have been threaded through Timings (auth/db/json),
// the line breaks them out so we can argue with real numbers instead of a
// single opaque dur_ms. Requests over `slowRequestMs` get the WARN level so
// they're easy to grep for in production logs.
func Logger(log *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			ctx, timings := WithTimings(r.Context())
			rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(rec, r.WithContext(ctx))

			totalMs := time.Since(start).Milliseconds()
			// json_ms is intentionally omitted — measuring it would mean
			// touching ~24 writeJSON call sites for a value that's
			// roughly recoverable as `dur_ms - auth_ms - db_ms` and
			// correlates tightly with `bytes_out` for any read endpoint.
			attrs := []any{
				"method", r.Method,
				"path", r.URL.Path,
				"status", rec.status,
				"dur_ms", totalMs,
				"auth_ms", timings.AuthMs(),
				"db_ms", timings.DBMs(),
				"db_queries", timings.DBQueries(),
				"bytes_out", rec.bytes,
				"remote", r.RemoteAddr,
			}
			if totalMs > slowRequestMs {
				log.Warn("http slow", attrs...)
			} else {
				log.Info("http", attrs...)
			}
		})
	}
}
