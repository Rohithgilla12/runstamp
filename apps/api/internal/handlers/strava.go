package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/auth"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/strava"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/users"
)

// StravaHandler holds the dependencies the Strava routes need.
type StravaHandler struct {
	Client      *strava.Client
	VerifyToken string // for the webhook subscription GET handshake
	Log         *slog.Logger
	Users       *users.Repo
}

type stravaExchangeReq struct {
	Code         string `json:"code"`
	CodeVerifier string `json:"codeVerifier"`
	RedirectURI  string `json:"redirectUri"`
}

type stravaExchangeRes struct {
	AccessToken  string         `json:"accessToken"`
	RefreshToken string         `json:"refreshToken"`
	ExpiresAt    int64          `json:"expiresAt"`
	Athlete      strava.Athlete `json:"athlete"`
	UserID       string         `json:"userId"`
}

// Exchange is POST /v1/auth/strava/exchange. The route is protected by
// RequireFirebaseAuth middleware — the caller must supply a valid Firebase ID
// token in the Authorization header so we can anchor the Strava account to a
// known Firebase user.
//
// Flow:
//  1. Extract verified Firebase identity from context.
//  2. Materialise (or refresh) the runstamp users row via UpsertByFirebaseUID.
//  3. Complete the Strava PKCE code exchange server-side.
//  4. Attach the encrypted Strava tokens to that user via UpsertStravaAccountForUser.
//
// In M1 this will also: kick off a backfill job (last 90 days) and return a
// session JWT instead of the raw Strava tokens.
func (h *StravaHandler) Exchange(w http.ResponseWriter, r *http.Request) {
	vt, ok := auth.FromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing authentication")
		return
	}

	var req stravaExchangeReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}
	if req.Code == "" {
		writeError(w, http.StatusBadRequest, "missing code")
		return
	}

	user, err := h.Users.UpsertByFirebaseUID(r.Context(), vt.UID, vt.Email)
	if err != nil {
		h.Log.Error("upsert user by firebase uid failed", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to provision user")
		return
	}

	tokens, err := h.Client.ExchangeCode(r.Context(), req.Code, req.CodeVerifier)
	if err != nil {
		h.Log.Error("strava exchange failed", "err", err)
		writeError(w, http.StatusBadGateway, "strava token exchange failed")
		return
	}

	if err := h.Users.UpsertStravaAccountForUser(r.Context(), user.ID, &tokens.Athlete, tokens); err != nil {
		h.Log.Error("upsert strava account failed", "err", err)
		writeError(w, http.StatusBadGateway, "failed to persist strava account")
		return
	}

	writeJSON(w, http.StatusOK, stravaExchangeRes{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresAt:    tokens.ExpiresAt,
		Athlete:      tokens.Athlete,
		UserID:       user.ID,
	})
}

// WebhookSubscription handles GET /v1/strava/webhook — the subscription
// verification handshake Strava performs when you register the endpoint.
//
// Strava docs: respond with `{"hub.challenge": <challenge>}` when the
// verify_token matches what we configured at subscription time.
func (h *StravaHandler) WebhookSubscription(w http.ResponseWriter, r *http.Request) {
	mode := r.URL.Query().Get("hub.mode")
	token := r.URL.Query().Get("hub.verify_token")
	challenge := r.URL.Query().Get("hub.challenge")
	if mode != "subscribe" {
		writeError(w, http.StatusBadRequest, "unexpected hub.mode")
		return
	}
	if h.VerifyToken == "" || token != h.VerifyToken {
		writeError(w, http.StatusForbidden, "invalid verify_token")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"hub.challenge": challenge})
}

// WebhookEvent handles POST /v1/strava/webhook — Strava POSTs an event payload
// when an athlete creates / updates / deletes an activity. We acknowledge fast
// (must be <2s) and enqueue work asynchronously.
//
// M1 will: validate the payload, enqueue a fetch-activity job in Redis (asynq),
// then return 200 immediately.
func (h *StravaHandler) WebhookEvent(w http.ResponseWriter, r *http.Request) {
	var raw json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil && !errors.Is(err, http.ErrBodyReadAfterClose) {
		h.Log.Warn("strava webhook: bad body", "err", err)
	}
	h.Log.Info("strava webhook event received", "bytes", len(raw))
	// TODO(M1): unmarshal `{ object_type, object_id, aspect_type, owner_id, ... }`,
	// enqueue async fetch + ingest, then ack.
	w.WriteHeader(http.StatusOK)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
