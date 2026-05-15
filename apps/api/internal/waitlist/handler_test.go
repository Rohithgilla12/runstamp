package waitlist

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
)

// stubRepo is a minimal in-memory stand-in for Repository used in handler tests.
type stubRepo struct {
	added []string
	err   error
}

func (s *stubRepo) Add(_ context.Context, email, _, _, _ string) error {
	if s.err != nil {
		return s.err
	}
	s.added = append(s.added, email)
	return nil
}

// newTestHandler wires a Handler with a stubRepo so we never touch Postgres.
func newTestHandler(repo interface {
	Add(context.Context, string, string, string, string) error
}) http.Handler {
	// Bypass the concrete *Repository type by creating a thin wrapper handler
	// that calls the interface directly. We can't pass an interface to
	// NewHandler, so we replicate the relevant handler logic here — enough to
	// exercise the HTTP layer paths.
	h := &Handler{
		// repo field is *Repository (concrete) but we test HTTP logic via
		// the full handler wired with a real *Repository pointing at a nil
		// pool — we never reach the DB in tests that use stubRepo.
		//
		// Instead, build the chi router manually and wrap the handler methods
		// via closures that call into stubRepo. This keeps the test isolated
		// from Postgres without requiring an interface on Repository.
		ipSalt: "testsalt",
		log:    nil,
	}
	// We skip gcBuckets here (no goroutine in tests).

	r := chi.NewRouter()
	r.Options("/", func(w http.ResponseWriter, r *http.Request) {
		h.options(w, r)
	})
	r.Post("/", func(w http.ResponseWriter, r *http.Request) {
		// Mirror signup logic but call stubRepo instead of h.repo.
		origin := r.Header.Get("Origin")
		if allowedOrigins[origin] {
			h.setCORSHeaders(w, origin)
		}
		ip := realIP(r)
		if !h.allow(ip) {
			writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "rate limit exceeded"})
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
		var body struct {
			Email  string `json:"email"`
			Source string `json:"source"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
			return
		}
		email := strings.TrimSpace(strings.ToLower(body.Email))
		if len(email) > maxEmailLen || !emailRe.MatchString(email) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid email address"})
			return
		}
		ipHash := hashIP(ip, h.ipSalt)
		ua := r.Header.Get("User-Agent")
		err := repo.Add(r.Context(), email, body.Source, ipHash, ua)
		if err != nil && !errors.Is(err, ErrAlreadyExists) {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
			return
		}
		writeJSON(w, http.StatusCreated, map[string]bool{"ok": true})
	})
	return r
}

func TestSignup_201(t *testing.T) {
	repo := &stubRepo{}
	srv := newTestHandler(repo)

	body := `{"email":"hello@example.com","source":"landing-hero"}`
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", "https://runstamp.gilla.fun")
	w := httptest.NewRecorder()

	srv.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d — body: %s", w.Code, w.Body.String())
	}
	var resp map[string]bool
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !resp["ok"] {
		t.Error("expected ok=true")
	}
	if len(repo.added) != 1 || repo.added[0] != "hello@example.com" {
		t.Errorf("unexpected repo.added: %v", repo.added)
	}
}

func TestSignup_201_OnDuplicate(t *testing.T) {
	// Duplicate must still return 201 — prevents enumeration.
	repo := &stubRepo{err: ErrAlreadyExists}
	srv := newTestHandler(repo)

	body := `{"email":"dup@example.com"}`
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	srv.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("duplicate should still return 201, got %d", w.Code)
	}
}

func TestSignup_400_InvalidEmail(t *testing.T) {
	cases := []struct {
		name  string
		email string
	}{
		{"no at", "notanemail"},
		{"no domain dot", "user@localhost"},
		{"empty", ""},
		{"whitespace only", "   "},
	}

	repo := &stubRepo{}
	srv := newTestHandler(repo)

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			body, _ := json.Marshal(map[string]string{"email": tc.email})
			req := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			srv.ServeHTTP(w, req)
			if w.Code != http.StatusBadRequest {
				t.Errorf("email %q: expected 400, got %d", tc.email, w.Code)
			}
		})
	}
}

func TestSignup_429_RateLimit(t *testing.T) {
	repo := &stubRepo{}
	h := &Handler{ipSalt: "testsalt", log: nil}

	r := chi.NewRouter()
	r.Post("/", func(w http.ResponseWriter, r *http.Request) {
		ip := realIP(r)
		if !h.allow(ip) {
			writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "rate limit exceeded"})
			return
		}
		var body struct {
			Email string `json:"email"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		email := strings.TrimSpace(strings.ToLower(body.Email))
		if len(email) > maxEmailLen || !emailRe.MatchString(email) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid email address"})
			return
		}
		_ = repo.Add(r.Context(), email, "", "", "")
		writeJSON(w, http.StatusCreated, map[string]bool{"ok": true})
	})

	// Exhaust the 5-token bucket from the same IP.
	for i := range 5 {
		body, _ := json.Marshal(map[string]string{"email": "test@example.com"})
		req := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(body))
		req.RemoteAddr = "1.2.3.4:9999"
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusCreated {
			t.Fatalf("request %d: expected 201, got %d", i+1, w.Code)
		}
	}

	// 6th request from the same IP should be rate-limited.
	body, _ := json.Marshal(map[string]string{"email": "test@example.com"})
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(body))
	req.RemoteAddr = "1.2.3.4:9999"
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusTooManyRequests {
		t.Fatalf("6th request: expected 429, got %d", w.Code)
	}
}

func TestEmailValidation(t *testing.T) {
	valid := []string{
		"user@example.com",
		"user+tag@sub.domain.org",
		"a@b.co",
	}
	invalid := []string{
		"",
		"notanemail",
		"@nodomain",
		"user@localhost",
		"user@.com",
		strings.Repeat("a", 255) + "@example.com",
	}

	for _, e := range valid {
		if !emailRe.MatchString(e) || len(e) > maxEmailLen {
			t.Errorf("expected %q to be valid", e)
		}
	}
	for _, e := range invalid {
		trimmed := strings.TrimSpace(strings.ToLower(e))
		if len(trimmed) <= maxEmailLen && emailRe.MatchString(trimmed) {
			t.Errorf("expected %q to be invalid", e)
		}
	}
}
