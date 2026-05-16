// Package push wraps the Firebase Cloud Messaging client for sending stamp
// notifications. Mobile clients register their FCM token via
// POST /v1/me/device-token; the evaluator calls SendStampEarned after
// awarding a fresh stamp, which queries this user's tokens and dispatches
// in parallel. Errors are logged but never propagated — a missing/stale
// token is normal (user reinstalled, denied permission, etc) and the
// stamp award is already committed.
package push

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/api/option"
)

// Pusher dispatches FCM messages and prunes invalid tokens from the DB.
type Pusher struct {
	client *messaging.Client
	pool   *pgxpool.Pool
	log    *slog.Logger
}

// NewPusher initialises a Firebase Cloud Messaging client. When credentialsPath
// is empty the pusher is constructed in dry-run mode — Send-style calls log
// but don't attempt FCM dispatch. This mirrors the Verifier escape hatch in
// internal/auth so dev environments without service-account creds can boot.
func NewPusher(ctx context.Context, projectID, credentialsPath string, pool *pgxpool.Pool, log *slog.Logger) (*Pusher, error) {
	if projectID == "" {
		return nil, fmt.Errorf("push: firebase projectID must not be empty")
	}
	if credentialsPath == "" {
		log.Warn("push: no Firebase credentials path set — running in dry-run mode")
		return &Pusher{client: nil, pool: pool, log: log}, nil
	}
	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: projectID}, option.WithCredentialsFile(credentialsPath))
	if err != nil {
		return nil, fmt.Errorf("push: init firebase app: %w", err)
	}
	client, err := app.Messaging(ctx)
	if err != nil {
		return nil, fmt.Errorf("push: init messaging client: %w", err)
	}
	return &Pusher{client: client, pool: pool, log: log}, nil
}

// SendStampEarned dispatches one push per registered device for the user.
// Title + body follow the quiet brand voice ("Sub-3:45 marathon. Stamped.").
// data["stampId"] carries the catalog id so the mobile tap handler can
// deep-link straight to the share modal.
func (p *Pusher) SendStampEarned(ctx context.Context, userID, stampID, stampName, stampTier string) {
	if p.client == nil {
		p.log.Info("push: dry-run stamp earn", "user_id", userID, "stamp_id", stampID)
		return
	}
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
		"stampId":   stampID,
		"stampName": stampName,
		"deepLink":  "runstamp://stamps/" + stampID,
		"kind":      "stamp_earned",
	}

	for _, tok := range tokens {
		msg := &messaging.Message{
			Token: tok,
			Notification: &messaging.Notification{
				Title: title,
				Body:  body,
			},
			Data: data,
			APNS: &messaging.APNSConfig{
				Payload: &messaging.APNSPayload{
					Aps: &messaging.Aps{
						Sound: "default",
						Alert: &messaging.ApsAlert{Title: title, Body: body},
					},
				},
			},
			Android: &messaging.AndroidConfig{
				Notification: &messaging.AndroidNotification{
					ChannelID: "stamps",
				},
				Priority: "high",
			},
		}
		if _, err := p.client.Send(ctx, msg); err != nil {
			p.log.Warn("push: send failed", "user_id", userID, "stamp_id", stampID, "err", err)
			if isInvalidTokenError(err) {
				p.prune(ctx, userID, tok)
			}
		}
	}
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

func (p *Pusher) prune(ctx context.Context, userID, token string) {
	if _, err := p.pool.Exec(ctx,
		`DELETE FROM device_tokens WHERE user_id = $1 AND token = $2`,
		userID, token); err != nil {
		p.log.Warn("push: prune token", "err", err)
	}
}

// UpsertToken registers (or refreshes) a device token. Called by
// POST /v1/me/device-token.
func (p *Pusher) UpsertToken(ctx context.Context, userID, token, platform string) error {
	_, err := p.pool.Exec(ctx, `
INSERT INTO device_tokens (user_id, token, platform, last_seen_at)
VALUES ($1, $2, $3, now())
ON CONFLICT (user_id, token) DO UPDATE
SET platform = EXCLUDED.platform, last_seen_at = now()
`, userID, token, platform)
	return err
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

// FCM returns specific error codes for an unregistered/invalid token. We
// detect them via a substring match because the SDK doesn't expose typed
// errors for these particular cases as of v4.20.
func isInvalidTokenError(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	for _, needle := range []string{
		"registration-token-not-registered",
		"invalid-registration-token",
		"invalid-argument",
		"NotRegistered",
		"InvalidRegistration",
	} {
		if strings.Contains(msg, needle) {
			return true
		}
	}
	return false
}
