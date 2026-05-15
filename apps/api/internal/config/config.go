// Package config loads runtime configuration from the process environment.
// Secrets live here and only here — the mobile app never sees them.
package config

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"os"
	"strconv"
)

// devTokenEncKey is a zero-filled 64-hex-char (32-byte) key used only in
// local development when RUNSTAMP_TOKEN_ENC_KEY is absent. Boot warns loudly.
const devTokenEncKey = "0000000000000000000000000000000000000000000000000000000000000000"

type Config struct {
	Port               int
	StravaClientID     string
	StravaClientSecret string
	StravaWebhookToken string // shared verify_token for /strava/webhook GET handshake
	AllowedOrigins     []string
	DatabaseURL        string
	TokenEncKeyHex     string

	// PublicBaseURL is the externally reachable origin where the Strava
	// callback URL is hosted, e.g. "https://runstamp-api.gilla.fun". Falls
	// back to http://localhost:8080 in dev. Strava redirects browsers here
	// after consent — the value MUST match what's registered as the
	// authorization callback domain in the Strava API settings.
	PublicBaseURL string
	// Deep-link URLs to send the mobile app to after the Strava OAuth
	// roundtrip completes. The custom scheme matches app.config.ts.
	StravaSuccessDeepLink string
	StravaFailureDeepLink string

	// Firebase Admin SDK — used for ID-token verification on protected routes.
	// FirebaseProjectID is required whenever Firebase auth is active.
	// FirebaseCredentialsPath is the local path to the service-account JSON.
	// When blank the SDK runs without credentials (token verification will fail
	// at runtime — intentional; see auth.NewVerifier).
	// FirebaseAuthOptional, when true, allows the server to start even when
	// FirebaseProjectID is absent.  Intended for staging environments that do
	// not have Firebase configured.  Set FIREBASE_AUTH_OPTIONAL=1 to enable.
	FirebaseProjectID       string
	FirebaseCredentialsPath string
	FirebaseAuthOptional    bool

	// WaitlistIPSalt is mixed into the SHA-256 hash of caller IPs before
	// storage. 16+ random bytes (hex-encoded). Required in production.
	WaitlistIPSalt string
}

// Load reads required values from env and fails fast on missing secrets when
// running outside local dev.
func Load() (*Config, error) {
	tokenKey := os.Getenv("RUNSTAMP_TOKEN_ENC_KEY")
	if tokenKey == "" {
		tokenKey = devTokenEncKey
		slog.Warn("RUNSTAMP_TOKEN_ENC_KEY not set — using insecure dev-only key; do NOT use in production")
	}

	firebaseOptional := os.Getenv("FIREBASE_AUTH_OPTIONAL") == "1"

	waitlistSalt, err := loadWaitlistSalt()
	if err != nil {
		return nil, err
	}

	c := &Config{
		Port:               envInt("RUNSTAMP_PORT", 8080),
		StravaClientID:     os.Getenv("STRAVA_CLIENT_ID"),
		StravaClientSecret: os.Getenv("STRAVA_CLIENT_SECRET"),
		StravaWebhookToken: os.Getenv("STRAVA_WEBHOOK_VERIFY_TOKEN"),
		AllowedOrigins:     splitCSV(envDefault("RUNSTAMP_ALLOWED_ORIGINS", "http://localhost:8081,exp://*")),
		DatabaseURL:        envDefault("DATABASE_URL", "postgres://runstamp:runstamp@localhost:5432/runstamp?sslmode=disable"),
		TokenEncKeyHex:     tokenKey,
		PublicBaseURL:      envDefault("RUNSTAMP_PUBLIC_BASE_URL", "http://localhost:8080"),
		StravaSuccessDeepLink: envDefault("STRAVA_SUCCESS_DEEPLINK", "runstamp://strava/connected"),
		StravaFailureDeepLink: envDefault("STRAVA_FAILURE_DEEPLINK", "runstamp://strava/error"),

		FirebaseProjectID:       os.Getenv("FIREBASE_PROJECT_ID"),
		FirebaseCredentialsPath: os.Getenv("FIREBASE_CREDENTIALS_PATH"),
		FirebaseAuthOptional:    firebaseOptional,

		WaitlistIPSalt: waitlistSalt,
	}

	isProd := os.Getenv("RUNSTAMP_ENV") == "production"

	if isProd {
		if c.StravaClientID == "" || c.StravaClientSecret == "" {
			return nil, fmt.Errorf("STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET must be set in production")
		}
		if c.DatabaseURL == "" {
			return nil, fmt.Errorf("DATABASE_URL must be set in production")
		}
		if c.TokenEncKeyHex == devTokenEncKey {
			return nil, fmt.Errorf("RUNSTAMP_TOKEN_ENC_KEY must be set to a real 32-byte hex key in production")
		}
		if !firebaseOptional {
			if c.FirebaseProjectID == "" {
				return nil, fmt.Errorf("FIREBASE_PROJECT_ID must be set in production (or set FIREBASE_AUTH_OPTIONAL=1 to skip)")
			}
			if c.FirebaseCredentialsPath == "" {
				return nil, fmt.Errorf("FIREBASE_CREDENTIALS_PATH must be set in production (or set FIREBASE_AUTH_OPTIONAL=1 to skip)")
			}
		}
	} else {
		if c.FirebaseProjectID == "" {
			slog.Warn("FIREBASE_PROJECT_ID not set — Firebase auth will be non-functional")
		}
		if c.FirebaseCredentialsPath == "" {
			slog.Warn("FIREBASE_CREDENTIALS_PATH not set — Firebase auth will run without credentials")
		}
	}

	return c, nil
}

// loadWaitlistSalt reads RUNSTAMP_WAITLIST_IP_SALT. In production the absence
// is fatal; in dev a random per-boot value is generated with a warning.
func loadWaitlistSalt() (string, error) {
	salt := os.Getenv("RUNSTAMP_WAITLIST_IP_SALT")
	if salt != "" {
		return salt, nil
	}
	isProd := os.Getenv("RUNSTAMP_ENV") == "production"
	if isProd {
		return "", fmt.Errorf("RUNSTAMP_WAITLIST_IP_SALT must be set in production (generate with: openssl rand -hex 16)")
	}
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate dev waitlist salt: %w", err)
	}
	devSalt := hex.EncodeToString(buf)
	slog.Warn("RUNSTAMP_WAITLIST_IP_SALT not set — using random per-boot salt; set this in .env for consistent hashing")
	return devSalt, nil
}

func envInt(key string, def int) int {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return n
}

func envDefault(key, def string) string {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	return v
}

func splitCSV(s string) []string {
	if s == "" {
		return nil
	}
	out := []string{}
	cur := ""
	for _, r := range s {
		if r == ',' {
			if cur != "" {
				out = append(out, cur)
				cur = ""
			}
			continue
		}
		cur += string(r)
	}
	if cur != "" {
		out = append(out, cur)
	}
	return out
}
