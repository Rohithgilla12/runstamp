package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"

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

// WebhookEvent — POST /v1/strava/webhook (PUBLIC). Acknowledge fast; ingest
// happens asynchronously in M1.
func (h *StravaHandler) WebhookEvent(w http.ResponseWriter, r *http.Request) {
	var raw json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil && !errors.Is(err, http.ErrBodyReadAfterClose) {
		h.Log.Warn("strava webhook: bad body", "err", err)
	}
	h.Log.Info("strava webhook event received", "bytes", len(raw))
	w.WriteHeader(http.StatusOK)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
