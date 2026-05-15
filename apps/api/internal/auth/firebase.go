// Package auth wraps Firebase Admin SDK token verification for the Runstamp API.
//
// Production usage: supply both a projectID and a credentialsPath pointing at
// a downloaded service-account JSON file.  The SDK then verifies ID tokens
// against Firebase's public key endpoint.
//
// Dev / staging escape hatch: when credentialsPath is empty, the Verifier is
// initialised with option.WithoutAuthentication().  The Firebase project is
// still targeted via projectID, but because no service-account credentials are
// present, calls to VerifyIDToken will fail at runtime with a permission error.
// This is intentional: the mode is suitable only for environments where Firebase
// is not configured (e.g. a staging server running without GCP credentials) and
// the operator understands that auth will be non-functional.  If projectID is
// also empty the constructor returns an error immediately so the misconfiguration
// is caught at startup rather than silently at request time.
package auth

import (
	"context"
	"fmt"
	"log/slog"

	firebase "firebase.google.com/go/v4"
	firebaseauth "firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

// VerifiedToken is the caller-facing result of a successful ID-token
// verification.  Only the fields most handlers care about are extracted; the
// raw *firebaseauth.Token can be added later if needed.
type VerifiedToken struct {
	UID           string
	Email         string
	EmailVerified bool
	Issuer        string
}

// Verifier wraps a Firebase auth client and exposes a single Verify method.
// Construct with NewVerifier; zero-value is not usable.
type Verifier struct {
	client *firebaseauth.Client
	log    *slog.Logger
}

// NewVerifier initialises a Firebase Admin SDK auth client.
//
//   - projectID must not be empty; it selects which Firebase project's tokens
//     are accepted.
//   - credentialsPath is a path to a service-account JSON file downloaded from
//     https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk
//     When it is empty the SDK is initialised without authentication (see the
//     package-level doc comment for the consequences).
func NewVerifier(ctx context.Context, projectID, credentialsPath string, log *slog.Logger) (*Verifier, error) {
	if projectID == "" {
		return nil, fmt.Errorf("auth: firebase projectID must not be empty")
	}

	var opt option.ClientOption
	if credentialsPath != "" {
		opt = option.WithCredentialsFile(credentialsPath)
	} else {
		log.Warn("auth: no Firebase credentials path set — token verification will fail at runtime",
			"project_id", projectID)
		opt = option.WithoutAuthentication()
	}

	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: projectID}, opt)
	if err != nil {
		return nil, fmt.Errorf("auth: init firebase app: %w", err)
	}

	client, err := app.Auth(ctx)
	if err != nil {
		return nil, fmt.Errorf("auth: init firebase auth client: %w", err)
	}

	return &Verifier{client: client, log: log}, nil
}

// Verify validates a Firebase ID token and returns the extracted claims.
// The raw SDK error is logged at debug level; the caller receives a sanitised
// error that is safe to surface to the client.
//
// If the Verifier was constructed via NewNullVerifier (no Firebase project
// configured) every call returns an error immediately without panicking.
func (v *Verifier) Verify(ctx context.Context, idToken string) (*VerifiedToken, error) {
	if v.client == nil {
		v.log.WarnContext(ctx, "auth: firebase not configured — rejecting token")
		return nil, fmt.Errorf("auth: firebase not configured")
	}

	tok, err := v.client.VerifyIDToken(ctx, idToken)
	if err != nil {
		v.log.DebugContext(ctx, "auth: firebase token verification failed", "err", err)
		return nil, fmt.Errorf("auth: invalid or expired token")
	}

	email, _ := tok.Claims["email"].(string)
	emailVerified, _ := tok.Claims["email_verified"].(bool)

	return &VerifiedToken{
		UID:           tok.UID,
		Email:         email,
		EmailVerified: emailVerified,
		Issuer:        tok.Issuer,
	}, nil
}

// NewNullVerifier returns a Verifier that always rejects tokens.  It is used
// as a safe fallback in development when FIREBASE_PROJECT_ID is absent.
// Protected routes will return 401 for every request, making the
// misconfiguration visible rather than silently passing traffic through.
func NewNullVerifier(log *slog.Logger) *Verifier {
	return &Verifier{client: nil, log: log}
}
