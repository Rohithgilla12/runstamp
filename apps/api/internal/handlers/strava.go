package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/auth"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/strava"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/users"
)

// StravaHandler wires the Strava HTTP routes. The actual OAuth + ingest
// logic lives in internal/strava.Service; handlers translate HTTP into
// service calls and back.
type StravaHandler struct {
	Service         *strava.Service
	Users           *users.Repo
	VerifyToken     string
	SuccessDeepLink string // e.g. runstamp://strava/connected
	FailureDeepLink string // e.g. runstamp://strava/error
	Log             *slog.Logger
}

// Connect — POST /v1/strava/connect (auth-gated).
// Returns the URL the mobile app should open in an in-app browser. The
// service holds short-lived state binding this OAuth flow to the
// authenticated user; the public /callback endpoint validates it.
func (h *StravaHandler) Connect(w http.ResponseWriter, r *http.Request) {
	vt, ok := auth.FromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing authentication")
		return
	}
	user, err := h.Users.UpsertByFirebaseUID(r.Context(), vt.UID, vt.Email)
	if err != nil {
		h.Log.Error("upsert user failed", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to provision user")
		return
	}
	authURL, err := h.Service.BeginAuthorize(user.ID)
	if err != nil {
		h.Log.Error("strava begin authorize failed", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to build authorize url")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"authorizeUrl": authURL})
}

// Callback — GET /v1/strava/callback (PUBLIC).
// This is the URL Strava redirects the user's browser to after consent.
// On success we redirect to the runstamp:// deep link so the in-app
// browser dismisses itself and the app refreshes its connection status.
func (h *StravaHandler) Callback(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	if errParam := q.Get("error"); errParam != "" {
		http.Redirect(w, r, h.FailureDeepLink+"?reason="+errParam, http.StatusSeeOther)
		return
	}
	code := q.Get("code")
	state := q.Get("state")
	if code == "" || state == "" {
		http.Redirect(w, r, h.FailureDeepLink+"?reason=missing_params", http.StatusSeeOther)
		return
	}
	if _, err := h.Service.FinishAuthorize(r.Context(), code, state); err != nil {
		h.Log.Warn("strava finish authorize failed", "err", err)
		http.Redirect(w, r, h.FailureDeepLink+"?reason=exchange_failed", http.StatusSeeOther)
		return
	}
	http.Redirect(w, r, h.SuccessDeepLink, http.StatusSeeOther)
}

// Status — GET /v1/strava/status (auth-gated). Mobile uses this to render
// "Connected as ..." vs a "Connect Strava" CTA.
func (h *StravaHandler) Status(w http.ResponseWriter, r *http.Request) {
	vt, ok := auth.FromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing authentication")
		return
	}
	user, err := h.Users.FindByFirebaseUID(r.Context(), vt.UID)
	if err != nil {
		h.Log.Error("find user failed", "err", err)
		writeError(w, http.StatusInternalServerError, "lookup failed")
		return
	}
	if user == nil {
		writeJSON(w, http.StatusOK, map[string]bool{"connected": false})
		return
	}
	conn, err := h.Service.Repo().GetByUser(r.Context(), user.ID)
	if err != nil {
		if errors.Is(err, strava.ErrConnectionNotFound) {
			writeJSON(w, http.StatusOK, map[string]bool{"connected": false})
			return
		}
		h.Log.Error("strava status lookup failed", "err", err)
		writeError(w, http.StatusInternalServerError, "lookup failed")
		return
	}
	resp := map[string]interface{}{
		"connected":   true,
		"athleteId":   conn.AthleteID,
		"connectedAt": conn.CreatedAt,
		"scope":       conn.Scope,
	}
	if conn.AthleteFirstname != nil || conn.AthleteLastname != nil {
		var fn, ln string
		if conn.AthleteFirstname != nil {
			fn = *conn.AthleteFirstname
		}
		if conn.AthleteLastname != nil {
			ln = *conn.AthleteLastname
		}
		resp["athleteName"] = strings.TrimSpace(fn + " " + ln)
	}
	if conn.AthleteProfileURL != nil {
		resp["athleteAvatarUrl"] = *conn.AthleteProfileURL
	}
	writeJSON(w, http.StatusOK, resp)
}

// Disconnect — DELETE /v1/strava/connection (auth-gated). Idempotent.
func (h *StravaHandler) Disconnect(w http.ResponseWriter, r *http.Request) {
	vt, ok := auth.FromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing authentication")
		return
	}
	user, err := h.Users.FindByFirebaseUID(r.Context(), vt.UID)
	if err != nil || user == nil {
		w.WriteHeader(http.StatusNoContent) // nothing to disconnect
		return
	}
	if err := h.Service.Disconnect(r.Context(), user.ID); err != nil {
		h.Log.Error("strava disconnect failed", "err", err)
		writeError(w, http.StatusInternalServerError, "disconnect failed")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// WebhookSubscription — GET /v1/strava/webhook (PUBLIC).
// Strava subscription verification handshake. Echoes hub.challenge when the
// shared verify_token matches.
func (h *StravaHandler) WebhookSubscription(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	if q.Get("hub.mode") != "subscribe" {
		writeError(w, http.StatusBadRequest, "unexpected hub.mode")
		return
	}
	if h.VerifyToken == "" || q.Get("hub.verify_token") != h.VerifyToken {
		writeError(w, http.StatusForbidden, "invalid verify_token")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"hub.challenge": q.Get("hub.challenge")})
}

// WebhookEvent — POST /v1/strava/webhook (PUBLIC).
// Strava requires a response within 2 seconds. We decode the event body, write
// 200 immediately, then ingest in a goroutine. The goroutine uses a fresh
// context (context.Background + 60-second timeout) so the response flush does
// not cancel it. Ingest errors are logged; we never return them to Strava
// (that would trigger an infinite retry loop on a persistent failure).
func (h *StravaHandler) WebhookEvent(w http.ResponseWriter, r *http.Request) {
	var evt strava.WebhookEvent
	if err := json.NewDecoder(r.Body).Decode(&evt); err != nil && !errors.Is(err, http.ErrBodyReadAfterClose) {
		h.Log.Warn("strava webhook: bad body", "err", err)
		w.WriteHeader(http.StatusOK)
		return
	}
	w.WriteHeader(http.StatusOK)

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		defer cancel()
		if err := h.Service.IngestFromWebhook(ctx, evt); err != nil {
			h.Log.Error("strava webhook: ingest failed",
				"aspect_type", evt.AspectType,
				"object_id", evt.ObjectID,
				"owner_id", evt.OwnerID,
				"err", err,
			)
		}
	}()
}

// Backfill — POST /v1/strava/backfill (auth-gated).
// Kicks off a 90-day historical backfill for the authenticated user. The
// backfill itself runs in a goroutine so this endpoint returns 202 immediately.
// The future /v1/strava/status endpoint will surface progress once M1 ships
// a background-job table.
func (h *StravaHandler) Backfill(w http.ResponseWriter, r *http.Request) {
	vt, ok := auth.FromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing authentication")
		return
	}
	user, err := h.Users.FindByFirebaseUID(r.Context(), vt.UID)
	if err != nil {
		h.Log.Error("strava backfill: find user", "err", err)
		writeError(w, http.StatusInternalServerError, "lookup failed")
		return
	}
	if user == nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	writeJSON(w, http.StatusAccepted, map[string]bool{"started": true})

	go func() {
		// Backfill may issue up to 100 Strava HTTP calls (the rate-limit
		// ceiling). Allow 5 minutes so a slow network doesn't cut it short;
		// the rate-limiter in the service stops us hitting Strava harder than
		// 100 calls / 15 min regardless.
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()
		count, err := h.Service.Backfill(ctx, user.ID, 90)
		if err != nil {
			h.Log.Error("strava backfill: failed", "user_id", user.ID, "err", err)
			return
		}
		h.Log.Info("strava backfill: complete", "user_id", user.ID, "inserted", count)
	}()
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
