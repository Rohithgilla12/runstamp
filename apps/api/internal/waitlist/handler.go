package waitlist

import (
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
)

// allowedOrigins lists the origins that may call POST /v1/waitlist.
// Keeping CORS scoped here avoids opening the rest of the API.
var allowedOrigins = map[string]bool{
	"https://runstamp.gilla.fun": true,
	"http://localhost:4321":      true,
}

// emailRe is an RFC 5322-lite pattern: local-part @ domain with at least one
// dot in the domain. Intentionally not exhaustive — citext in the DB is the
// source of truth; this rejects obvious garbage before hitting the network.
var emailRe = regexp.MustCompile(`^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$`)

const maxEmailLen = 254
const maxBodyBytes = 4 * 1024

// bucket holds the token-bucket state for one IP.
type bucket struct {
	tokens    int
	lastFill  time.Time
	mu        sync.Mutex
}

// Handler handles POST /v1/waitlist.
type Handler struct {
	repo    *Repository
	ipSalt  string
	log     *slog.Logger
	buckets sync.Map // map[string]*bucket
}

func NewHandler(repo *Repository, ipSalt string, log *slog.Logger) *Handler {
	h := &Handler{repo: repo, ipSalt: ipSalt, log: log}
	go h.gcBuckets()
	return h
}

// Routes registers the waitlist sub-routes on the provided router.
func (h *Handler) Routes(r chi.Router) {
	r.Options("/", h.options)
	r.Post("/", h.signup)
}

// options responds to the CORS preflight for POST /v1/waitlist.
func (h *Handler) options(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	if !allowedOrigins[origin] {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	h.setCORSHeaders(w, origin)
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Max-Age", "300")
	w.WriteHeader(http.StatusNoContent)
}

// signup handles POST /v1/waitlist.
func (h *Handler) signup(w http.ResponseWriter, r *http.Request) {
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

	err := h.repo.Add(r.Context(), email, body.Source, ipHash, ua)
	if err != nil && !errors.Is(err, ErrAlreadyExists) {
		h.log.Error("waitlist: add signup failed", "err", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
		return
	}

	// 201 regardless of duplicate — prevents enumeration.
	writeJSON(w, http.StatusCreated, map[string]bool{"ok": true})
}

// allow implements a simple token-bucket rate limiter: 5 requests / minute / IP.
// Buckets are lazily created and garbage-collected every 5 minutes.
func (h *Handler) allow(ip string) bool {
	now := time.Now()
	v, _ := h.buckets.LoadOrStore(ip, &bucket{tokens: 5, lastFill: now})
	b := v.(*bucket)

	b.mu.Lock()
	defer b.mu.Unlock()

	// Refill tokens based on elapsed time (1 token per 12 seconds → 5/min).
	elapsed := now.Sub(b.lastFill)
	refill := int(elapsed.Seconds() / 12)
	if refill > 0 {
		b.tokens += refill
		if b.tokens > 5 {
			b.tokens = 5
		}
		b.lastFill = b.lastFill.Add(time.Duration(refill) * 12 * time.Second)
	}

	if b.tokens <= 0 {
		return false
	}
	b.tokens--
	return true
}

// gcBuckets removes stale buckets every 5 minutes to bound memory growth.
func (h *Handler) gcBuckets() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		cutoff := time.Now().Add(-10 * time.Minute)
		h.buckets.Range(func(k, v any) bool {
			b := v.(*bucket)
			b.mu.Lock()
			idle := b.lastFill.Before(cutoff)
			b.mu.Unlock()
			if idle {
				h.buckets.Delete(k)
			}
			return true
		})
	}
}

// setCORSHeaders sets the CORS response headers for allowed origins.
func (h *Handler) setCORSHeaders(w http.ResponseWriter, origin string) {
	w.Header().Set("Access-Control-Allow-Origin", origin)
	w.Header().Set("Vary", "Origin")
}

// realIP extracts the caller's IP. Trusts the first value in X-Forwarded-For
// (set by Cloudflare) and falls back to RemoteAddr.
func realIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		first, _, _ := strings.Cut(xff, ",")
		return strings.TrimSpace(first)
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// hashIP returns the first 32 hex chars of SHA-256(ip + salt). Truncating to
// 32 chars retains enough entropy for rate-limit correlation while limiting
// stored data to half a SHA-256 digest.
func hashIP(ip, salt string) string {
	h := sha256.Sum256([]byte(ip + salt))
	return fmt.Sprintf("%x", h)[:32]
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
