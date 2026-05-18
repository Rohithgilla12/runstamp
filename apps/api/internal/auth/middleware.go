package auth

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/middleware"
)

type contextKey struct{}

// RequireFirebaseAuth returns a middleware that verifies a Firebase ID token
// supplied as "Authorization: Bearer <token>".
//
// Missing header        → 401 {"error":"missing bearer token"}
// Invalid / expired     → 401 {"error":"invalid token"}
// Valid                 → VerifiedToken injected into the request context;
//
//	call FromContext to retrieve it in downstream handlers.
func RequireFirebaseAuth(verifier *Verifier, log *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if header == "" {
				writeAuthError(w, http.StatusUnauthorized, "missing bearer token")
				return
			}

			token, ok := strings.CutPrefix(header, "Bearer ")
			if !ok || strings.TrimSpace(token) == "" {
				writeAuthError(w, http.StatusUnauthorized, "missing bearer token")
				return
			}

			authStart := time.Now()
			vt, err := verifier.Verify(r.Context(), token)
			middleware.TimingsFromContext(r.Context()).AddAuth(time.Since(authStart))
			if err != nil {
				log.DebugContext(r.Context(), "firebase auth middleware: token rejected", "err", err)
				writeAuthError(w, http.StatusUnauthorized, "invalid token")
				return
			}

			if vt.UID == "" {
				log.WarnContext(r.Context(), "firebase auth middleware: verified token has empty UID")
				writeAuthError(w, http.StatusUnauthorized, "invalid token")
				return
			}

			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), contextKey{}, vt)))
		})
	}
}

// FromContext retrieves the VerifiedToken stored by RequireFirebaseAuth.
// Returns (nil, false) if the context carries no token (e.g. on an unprotected
// route or in tests that do not set it up).
func FromContext(ctx context.Context) (*VerifiedToken, bool) {
	vt, ok := ctx.Value(contextKey{}).(*VerifiedToken)
	return vt, ok && vt != nil
}

func writeAuthError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(`{"error":"` + msg + `"}`))
}
