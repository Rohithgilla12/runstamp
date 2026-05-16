// Package push owns the device_tokens table and dispatches stamp-earned
// notifications via the Expo Push Service.
//
// Why Expo Push instead of Firebase Admin Messaging: the mobile client uses
// `useFrameworks: 'static'` for Firebase pods on iOS (see
// apps/mobile/app.config.ts), which is incompatible with
// @react-native-firebase/messaging's native module. Expo Push tokens
// (`ExponentPushToken[...]`) are issued by expo-notifications instead, and
// the Expo Push Service fans them out to APNs + FCM behind the scenes — no
// Firebase Admin Messaging dependency on this side, no native conflict on
// the mobile side. Same pattern proven in apps/cadence-api/internal/notify.
//
// SendStampEarned is called by the post-ingest hook for each fresh stamp
// awarded; errors are logged but never propagated.
package push

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Pusher dispatches Expo push messages and prunes invalid tokens.
type Pusher struct {
	client *http.Client
	pool   *pgxpool.Pool
	log    *slog.Logger
}

// NewPusher builds a Pusher. No external credentials needed — the Expo Push
// Service is a public HTTPS endpoint, tokens are scoped per Expo project.
func NewPusher(pool *pgxpool.Pool, log *slog.Logger) *Pusher {
	return &Pusher{
		client: &http.Client{Timeout: 15 * time.Second},
		pool:   pool,
		log:    log,
	}
}

const expoPushURL = "https://exp.host/--/api/v2/push/send"

// SendStampEarned fans the push out to every token registered for userID.
// Tokens that Expo reports as DeviceNotRegistered are pruned. Other per-
// token errors are counted but don't abort the batch.
//
// Title + body follow the quiet brand voice ("Sub-3:45 marathon. Stamped.").
// data["deeplink"] = "runstamp://stamps/<id>" for the mobile tap handler.
func (p *Pusher) SendStampEarned(ctx context.Context, userID, stampID, stampName, stampTier string) {
	tokens, err := p.tokensFor(ctx, userID)
	if err != nil {
		p.log.Error("push: load tokens", "user_id", userID, "err", err)
		return
	}
	if len(tokens) == 0 {
		return
	}

	title, body := composeStampMessage(stampName, stampTier)
	data := map[string]string{
		"kind":     "stamp_earned",
		"stampId":  stampID,
		"deeplink": "runstamp://stamps/" + stampID,
		"category": "stamp_earned",
	}

	if _, _, err := p.send(ctx, tokens, title, body, data); err != nil {
		p.log.Warn("push: send stamp earned", "user_id", userID, "stamp_id", stampID, "err", err)
	}
}

// UpsertToken registers (or refreshes) a device token. Called by
// POST /v1/me/device-token. Token-on-conflict so a device's Expo token
// gets reclaimed cleanly when the same device's user changes (sign out,
// sign in as different user on the same install).
func (p *Pusher) UpsertToken(ctx context.Context, userID, token, platform string) error {
	token = strings.TrimSpace(token)
	if token == "" {
		return errors.New("push: empty token")
	}
	_, err := p.pool.Exec(ctx, `
INSERT INTO device_tokens (user_id, token, platform, last_seen_at)
VALUES ($1, $2, $3, now())
ON CONFLICT (user_id, token) DO UPDATE
SET platform = EXCLUDED.platform, last_seen_at = now()
`, userID, token, platform)
	return err
}

// DeleteToken removes the (user, token) pair. Called by the mobile client
// on sign-out so a shared device doesn't keep delivering pushes to a
// signed-out account.
func (p *Pusher) DeleteToken(ctx context.Context, userID, token string) error {
	_, err := p.pool.Exec(ctx,
		`DELETE FROM device_tokens WHERE user_id = $1 AND token = $2`,
		userID, token)
	return err
}

func (p *Pusher) tokensFor(ctx context.Context, userID string) ([]string, error) {
	rows, err := p.pool.Query(ctx, `
SELECT token FROM device_tokens WHERE user_id = $1 ORDER BY last_seen_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var t string
		if err := rows.Scan(&t); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (p *Pusher) pruneInvalid(ctx context.Context, token string) {
	if _, err := p.pool.Exec(ctx,
		`DELETE FROM device_tokens WHERE token = $1`, token); err != nil {
		p.log.Warn("push: prune token", "err", err)
	}
}

// expoMessage is one entry in the Expo Push Service batch body.
type expoMessage struct {
	To    string            `json:"to"`
	Title string            `json:"title,omitempty"`
	Body  string            `json:"body,omitempty"`
	Data  map[string]string `json:"data,omitempty"`
	Sound string            `json:"sound,omitempty"`
}

type expoTicket struct {
	Status  string         `json:"status"`
	Message string         `json:"message,omitempty"`
	Details map[string]any `json:"details,omitempty"`
}

type expoResponse struct {
	Data []expoTicket `json:"data"`
}

// send batches one POST to the Expo Push Service. Returns (sent, pruned,
// err). One transport error fails the whole batch; per-token errors only
// count toward pruned.
func (p *Pusher) send(ctx context.Context, tokens []string, title, body string, data map[string]string) (int, int, error) {
	messages := make([]expoMessage, 0, len(tokens))
	for _, tok := range tokens {
		messages = append(messages, expoMessage{
			To:    tok,
			Title: title,
			Body:  body,
			Data:  data,
			Sound: "default",
		})
	}
	payload, err := json.Marshal(messages)
	if err != nil {
		return 0, 0, fmt.Errorf("push: marshal: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, expoPushURL, bytes.NewReader(payload))
	if err != nil {
		return 0, 0, fmt.Errorf("push: build request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Accept-Encoding", "gzip, deflate")
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return 0, 0, fmt.Errorf("push: post: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return 0, 0, fmt.Errorf("push: expo http %d", resp.StatusCode)
	}

	var decoded expoResponse
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return 0, 0, fmt.Errorf("push: decode: %w", err)
	}

	// Tickets are returned in the same order as the request.
	sent, pruned := 0, 0
	for i, t := range decoded.Data {
		if i >= len(tokens) {
			break
		}
		if t.Status == "ok" {
			sent++
			continue
		}
		if errCode, _ := t.Details["error"].(string); errCode == "DeviceNotRegistered" {
			p.pruneInvalid(ctx, tokens[i])
			pruned++
		}
	}
	return sent, pruned, nil
}

// composeStampMessage produces the title/body for a stamp-earned push.
// Quiet voice — no exclamation marks, no emoji. The stamp name is the headline.
func composeStampMessage(name, tier string) (string, string) {
	title := name + ". Stamped."
	body := ""
	switch tier {
	case "mythic":
		body = "Mythic-tier stamp earned. Tap to share."
	case "rare":
		body = "Rare stamp earned. Tap to share."
	default:
		body = "Earned. Tap to share."
	}
	return title, body
}
