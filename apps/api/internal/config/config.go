// Package config loads runtime configuration from the process environment.
// Secrets live here and only here — the mobile app never sees them.
package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Port               int
	StravaClientID     string
	StravaClientSecret string
	StravaWebhookToken string // shared verify_token for /strava/webhook GET handshake
	AllowedOrigins     []string
}

// Load reads required values from env and fails fast on missing secrets when
// running outside local dev.
func Load() (*Config, error) {
	c := &Config{
		Port:               envInt("RUNSTAMP_PORT", 8080),
		StravaClientID:     os.Getenv("STRAVA_CLIENT_ID"),
		StravaClientSecret: os.Getenv("STRAVA_CLIENT_SECRET"),
		StravaWebhookToken: os.Getenv("STRAVA_WEBHOOK_VERIFY_TOKEN"),
		AllowedOrigins:     splitCSV(envDefault("RUNSTAMP_ALLOWED_ORIGINS", "http://localhost:8081,exp://*")),
	}
	// In production both Strava values must be set. In dev we tolerate empty
	// strings so the server can boot for `/healthz` smoke tests.
	if os.Getenv("RUNSTAMP_ENV") == "production" {
		if c.StravaClientID == "" || c.StravaClientSecret == "" {
			return nil, fmt.Errorf("STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET must be set in production")
		}
	}
	return c, nil
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
