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

	"github.com/Rohithgilla12/runstamp/apps/api/internal/activities"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/auth"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/config"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/crypto"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/db"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/handlers"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/middleware"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/places"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/stamps"
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

	usersRepo := users.NewRepo(pool)

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

	activitiesRepo := activities.NewRepository(pool)
	activitiesService := activities.NewService(activitiesRepo)

	stampsRepo := stamps.NewRepository(pool)
	stampsEval := stamps.NewEvaluator(pool, stampsRepo, log)

	geocoder := places.NewGeocoder(pool, log)
	geoBackfiller := places.NewBackfiller(pool, geocoder, log)
	activitiesService.SetPostIngest(func(ctx context.Context, userID string, canonical *activities.Activity) {
		// Stamps eval runs synchronously — handful of indexed queries, awards
		// visible by the time the HTTP response goes out.
		if _, err := stampsEval.EvaluateForUser(ctx, userID); err != nil {
			log.Error("stamps: post-ingest eval failed", "user_id", userID, "err", err)
		}
		// Geocoding is async — Nominatim is 1 req/sec serialized via mutex
		// inside the Geocoder, so a Strava import burst of N activities will
		// take ~N seconds. We don't want to block the ingest response on
		// that. The activity is already persisted; the worker just fills in
		// city/country when it gets to it. After geocoding lands, re-eval
		// stamps so place-based ones fire.
		if canonical != nil && canonical.StartLat != nil && canonical.StartLon != nil {
			go func(actID, uid string) {
				bg, cancel := context.WithTimeout(context.Background(), 30*time.Second)
				defer cancel()
				if err := geoBackfiller.GeocodeActivity(bg, actID); err != nil {
					log.Warn("places: post-ingest geocode failed", "activity_id", actID, "err", err)
					return
				}
				if _, err := stampsEval.EvaluateForUser(bg, uid); err != nil {
					log.Warn("stamps: post-geocode eval failed", "user_id", uid, "err", err)
				}
			}(canonical.ID, userID)
		}
	})
	if err := stamps.Sync(ctx, pool); err != nil {
		log.Error("stamps: catalog sync failed at boot", "err", err)
		os.Exit(1)
	}

	stravaClient := strava.New(cfg.StravaClientID, cfg.StravaClientSecret)
	stravaRepo := strava.NewRepository(pool, sealer)
	stravaService := strava.NewService(stravaClient, stravaRepo, cfg.PublicBaseURL)
	stravaService.SetActivities(activitiesService)

	stravaImporter := strava.NewImporter(pool, stravaClient, stravaRepo, activitiesService, log)

	stravaHandler := &handlers.StravaHandler{
		Service:         stravaService,
		Importer:        stravaImporter,
		Users:           usersRepo,
		VerifyToken:     cfg.StravaWebhookToken,
		SuccessDeepLink: cfg.StravaSuccessDeepLink,
		FailureDeepLink: cfg.StravaFailureDeepLink,
		Log:             log,
	}

	r := chi.NewRouter()
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.Recoverer)
	r.Use(middleware.Logger(log))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Get("/healthz", handlers.Health(version))
	r.Route("/v1", func(r chi.Router) {
		// All /strava routes — public legs (called by Strava itself or by
		// the user's browser returning from the consent page) sit at the
		// top level; protected legs nest under a Group with the firebase
		// auth middleware.
		r.Route("/strava", func(r chi.Router) {
			// Public — no Firebase token possible from these callers.
			r.Get("/callback", stravaHandler.Callback)
			r.Get("/webhook", stravaHandler.WebhookSubscription)
			r.Post("/webhook", stravaHandler.WebhookEvent)
			// Protected — require a valid Firebase ID token.
			r.Group(func(r chi.Router) {
				r.Use(auth.RequireFirebaseAuth(verifier, log))
				r.Post("/connect", stravaHandler.Connect)
				r.Get("/status", stravaHandler.Status)
				r.Delete("/connection", stravaHandler.Disconnect)
				r.Post("/backfill", stravaHandler.Backfill)
				r.Post("/import/start", stravaHandler.ImportStart)
				r.Get("/import/status", stravaHandler.ImportStatus)
			})
		})
		// Apple Health ingestion — all routes are auth-gated.
		healthHandler := &handlers.HealthHandler{
			Activities: activitiesService,
			Users:      usersRepo,
			Log:        log,
		}
		r.Route("/health", func(r chi.Router) {
			r.Group(func(r chi.Router) {
				r.Use(auth.RequireFirebaseAuth(verifier, log))
				r.Post("/workouts", healthHandler.Sync)
			})
		})
		// Protected non-strava routes.
		activitiesHandler := &handlers.ActivitiesHandler{
			Activities: activitiesService,
			Users:      usersRepo,
			Log:        log,
		}
		stampsHandler := &handlers.StampsHandler{
			Stamps:    stampsRepo,
			Evaluator: stampsEval,
			Users:     usersRepo,
			Log:       log,
		}
		bestEffortsHandler := &handlers.BestEffortsHandler{
			Pool:  pool,
			Users: usersRepo,
			Log:   log,
		}
		placesHandler := &handlers.PlacesHandler{
			Backfiller: geoBackfiller,
			Evaluator:  stampsEval,
			Users:      usersRepo,
			Log:        log,
		}
		accountHandler := &handlers.AccountHandler{
			Users: usersRepo,
			Log:   log,
		}
		r.Group(func(r chi.Router) {
			r.Use(auth.RequireFirebaseAuth(verifier, log))
			r.Get("/me", handlers.Me(usersRepo))
			r.Delete("/me", accountHandler.Delete)
			r.Get("/activities", activitiesHandler.List)
			r.Get("/stamps", stampsHandler.List)
			r.Post("/stamps/reevaluate", stampsHandler.Reevaluate)
			r.Get("/best-efforts", bestEffortsHandler.List)
			r.Post("/places/backfill", placesHandler.Backfill)
		})
	})

	srv := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
	}

	// importerCtx has a longer deadline than the HTTP shutdown context so the
	// worker can finish its current batch before the process exits.
	importerCtx, importerCancel := context.WithCancel(context.Background())

	go stravaImporter.Run(importerCtx)

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

	// Give the HTTP server 10 seconds to drain in-flight requests.
	shutCtx, shutCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutCancel()
	if err := srv.Shutdown(shutCtx); err != nil {
		log.Error("shutdown error", "err", err)
	}

	// Give the importer 30 seconds to finish its current unit of work.
	log.Info("waiting for importer to drain")
	importerDone := make(chan struct{})
	go func() {
		importerCancel()
		close(importerDone)
	}()
	select {
	case <-importerDone:
	case <-time.After(30 * time.Second):
		log.Warn("importer drain timeout")
	}

	log.Info("bye")
}
