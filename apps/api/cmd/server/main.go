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

	"github.com/Rohithgilla12/runstamp/apps/api/internal/config"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/handlers"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/middleware"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/strava"
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

	stravaClient := strava.New(cfg.StravaClientID, cfg.StravaClientSecret)
	stravaHandler := &handlers.StravaHandler{
		Client:      stravaClient,
		VerifyToken: cfg.StravaWebhookToken,
		Log:         log,
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
		r.Route("/auth/strava", func(r chi.Router) {
			r.Post("/exchange", stravaHandler.Exchange)
		})
		r.Route("/strava", func(r chi.Router) {
			r.Get("/webhook", stravaHandler.WebhookSubscription)
			r.Post("/webhook", stravaHandler.WebhookEvent)
		})
	})

	srv := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
	}

	// Graceful shutdown on SIGINT / SIGTERM.
	go func() {
		log.Info("starting", "addr", srv.Addr, "version", version)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("listen failed", "err", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	log.Info("shutting down")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Error("shutdown error", "err", err)
		os.Exit(1)
	}
	log.Info("bye")
}
