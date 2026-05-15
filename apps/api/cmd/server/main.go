// Runstamp API server — entrypoint.
//
// Listens on $RUNSTAMP_PORT (default 8080), serves a Chi router with
// structured slog logging and CORS configured for the mobile app's
// dev origin. See README.md for the full route list.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/auth"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/config"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/crypto"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/db"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/handlers"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/middleware"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/strava"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/users"
)

// version is overridden at build time via `-ldflags "-X main.version=..."`.
var version = "dev"

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(log)

	cfg, err := config.Load()
	if err != nil {
		log.Error("config load failed", "err", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := db.Migrate(cfg.DatabaseURL, "./migrations"); err != nil {
		log.Error("migrations failed", "err", err)
		os.Exit(1)
	}

	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Error("db pool failed", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	sealer, err := crypto.NewSealer(cfg.TokenEncKeyHex)
	if err != nil {
		log.Error("crypto sealer failed", "err", err)
		os.Exit(1)
	}

	usersRepo := users.NewRepo(pool, sealer)

	isProd := os.Getenv("RUNSTAMP_ENV") == "production"

	var verifier *auth.Verifier
	if cfg.FirebaseProjectID != "" {
		verifier, err = auth.NewVerifier(ctx, cfg.FirebaseProjectID, cfg.FirebaseCredentialsPath, log)
		if err != nil {
			if isProd {
				log.Error("firebase verifier init failed", "err", err)
				os.Exit(1)
			}
			log.Warn("firebase verifier init failed — protected routes will reject all requests", "err", err)
			verifier = nil
		}
	} else {
		if isProd {
			log.Error("FIREBASE_PROJECT_ID is required in production")
			os.Exit(1)
		}
		log.Warn("FIREBASE_PROJECT_ID not set — Firebase auth disabled; all protected routes will reject requests")
	}

	if verifier == nil {
		verifier = auth.NewNullVerifier(log)
	}

	stravaClient := strava.New(cfg.StravaClientID, cfg.StravaClientSecret)
	stravaHandler := &handlers.StravaHandler{
		Client:      stravaClient,
		VerifyToken: cfg.StravaWebhookToken,
		Log:         log,
		Users:       usersRepo,
	}

	r := chi.NewRouter()
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.Recoverer)
	r.Use(middleware.Logger(log))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Get("/healthz", handlers.Health(version))
	r.Route("/v1", func(r chi.Router) {
		// Public routes — Strava webhook endpoints are called by Strava's
		// servers, not by authenticated users.
		r.Route("/strava", func(r chi.Router) {
			r.Get("/webhook", stravaHandler.WebhookSubscription)
			r.Post("/webhook", stravaHandler.WebhookEvent)
		})

		// Protected routes — require a valid Firebase ID token.
		r.Group(func(r chi.Router) {
			r.Use(auth.RequireFirebaseAuth(verifier, log))
			r.Get("/me", handlers.Me(usersRepo))
			r.Post("/auth/strava/exchange", stravaHandler.Exchange)
		})
	})

	srv := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
	}

	// Graceful shutdown on SIGINT / SIGTERM via the NotifyContext above.
	go func() {
		log.Info("starting", "addr", srv.Addr, "version", version)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("listen failed", "err", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	stop()
	log.Info("shutting down")
	shutCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutCtx); err != nil {
		log.Error("shutdown error", "err", err)
		os.Exit(1)
	}
	log.Info("bye")
}
