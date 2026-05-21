package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"strings"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/auth"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/users"
	"github.com/jackc/pgx/v5/pgconn"
)

type meResponse struct {
	UserID      string  `json:"userId"`
	Email       string  `json:"email"`
	FirebaseUID string  `json:"firebaseUid"`
	DisplayName *string `json:"displayName,omitempty"`
	HomeCity    *string `json:"homeCity,omitempty"`
	Units       string  `json:"units"`
	HRMax       *int    `json:"hrMax,omitempty"`
	HRResting   *int    `json:"hrResting,omitempty"`
	BirthYear   *int    `json:"birthYear,omitempty"`
	// UI preferences. omitempty so a fresh user (NULL columns) shows up as
	// "not set" to the mobile client, which then keeps the local default.
	UIDark           *bool   `json:"uiDark,omitempty"`
	UIAccent         *string `json:"uiAccent,omitempty"`
	UITileStyle      *string `json:"uiTileStyle,omitempty"`
	UIOnboarded      *bool   `json:"uiOnboarded,omitempty"`
	UIDefaultSurface *string `json:"uiDefaultSurface,omitempty"`
	Handle           *string `json:"handle,omitempty"`
	ProfilePublic    bool    `json:"profilePublic"`
	HasStrava        bool    `json:"hasStrava"`
}

func toMeResponse(u *users.User, hasStrava bool) meResponse {
	email := ""
	if u.Email != nil {
		email = *u.Email
	}
	firebaseUID := ""
	if u.FirebaseUID != nil {
		firebaseUID = *u.FirebaseUID
	}
	return meResponse{
		UserID:      u.ID,
		Email:       email,
		FirebaseUID: firebaseUID,
		DisplayName: u.DisplayName,
		HomeCity:    u.HomeCity,
		Units:       u.Units,
		HRMax:       u.HRMax,
		HRResting:   u.HRResting,
		BirthYear:   u.BirthYear,
		UIDark:           u.UIDark,
		UIAccent:         u.UIAccent,
		UITileStyle:      u.UITileStyle,
		UIOnboarded:      u.UIOnboarded,
		UIDefaultSurface: u.UIDefaultSurface,
		Handle:           u.Handle,
		ProfilePublic:    u.ProfilePublic,
		HasStrava:        hasStrava,
	}
}

// Me handles GET /v1/me. It requires a valid Firebase ID token (injected into
// context by RequireFirebaseAuth middleware).
//
// If no users row exists for the caller's Firebase UID, a 404 is returned with
// {"error":"user not provisioned"}.  The mobile app should call
// POST /v1/auth/strava/exchange first, which creates the row as a side-effect.
func Me(repo *users.Repo) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vt, ok := auth.FromContext(r.Context())
		if !ok {
			writeError(w, http.StatusUnauthorized, "missing authentication")
			return
		}
		user, err := repo.FindByFirebaseUID(r.Context(), vt.UID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to load user")
			return
		}
		if user == nil {
			writeError(w, http.StatusNotFound, "user not provisioned")
			return
		}
		hasStrava, err := repo.HasStravaConnection(r.Context(), user.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to check strava account")
			return
		}
		writeJSON(w, http.StatusOK, toMeResponse(user, hasStrava))
	}
}

type patchMeRequest struct {
	DisplayName *string `json:"displayName"`
	HomeCity    *string `json:"homeCity"`
	Units       *string `json:"units"`
	HRMax       *int    `json:"hrMax"`
	HRResting   *int    `json:"hrResting"`
	BirthYear   *int    `json:"birthYear"`
	UIDark           *bool   `json:"uiDark"`
	UIAccent         *string `json:"uiAccent"`
	UITileStyle      *string `json:"uiTileStyle"`
	UIOnboarded      *bool   `json:"uiOnboarded"`
	UIDefaultSurface *string `json:"uiDefaultSurface"`
	// Empty string clears the claimed handle (rare — mostly handled as "user
	// wants to switch handles"). Any other value is validated below.
	Handle        *string `json:"handle"`
	ProfilePublic *bool   `json:"profilePublic"`
}

// Handle validation: 3–30 chars, ASCII alphanumeric + dash + underscore,
// must start and end with alphanumeric. Reserved words protect the URL
// space at runstamp.app/u/<handle> from being shadowed by app routes.
var validHandleRe = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$`)

var reservedHandles = map[string]bool{
	"admin": true, "api": true, "app": true, "auth": true, "u": true,
	"www":   true, "settings": true, "about": true, "help": true, "support": true,
	"login": true, "logout": true, "signup": true, "signin": true, "signout": true,
	"runstamp": true, "stamp": true, "stamps": true, "profile": true, "profiles": true,
	"new":   true, "edit": true, "delete": true, "share": true, "shares": true,
	"static": true, "assets": true, "public": true, "private": true,
}

func validateHandle(h string) error {
	if h == "" {
		return nil // explicit clear
	}
	if !validHandleRe.MatchString(h) {
		return errors.New("handle must be 3-30 chars, lowercase alphanumerics, dashes or underscores, starting + ending alphanumeric")
	}
	if reservedHandles[h] {
		return errors.New("that handle is reserved")
	}
	return nil
}

// Whitelists keep the column values to known good ones so a stale or
// malicious client can't write garbage into the row. Defaults change on the
// mobile side without coordination since NULL means "use the client default."
var validAccents = map[string]bool{
	"solar": true, "moss": true, "ink": true, "indigo": true, "sand": true,
}

var validTileStyles = map[string]bool{
	"light_nolabels": true, "light_all": true,
	"dark_nolabels": true, "dark_all": true,
	"voyager_nolabels": true,
}

// Allowed editor surfaces. Keep in sync with the DefaultSurface union in
// apps/mobile/src/state/AppState.tsx — if you add a new aspect ratio there,
// add it here too or a 400 is the next thing you'll see.
var validDefaultSurfaces = map[string]bool{
	"9:16": true, "1:1": true, "4:5": true,
}

func validateBirthYear(by *int) error {
	if by == nil {
		return nil
	}
	if *by < 1900 || *by > 2100 {
		return errors.New("birth_year must be a plausible 4-digit year")
	}
	return nil
}

var errInvalidUnits = errors.New("units must be 'metric' or 'imperial'")

func validateHRProfile(hrMax, hrResting *int) error {
	if hrMax != nil {
		if *hrMax < 120 || *hrMax > 230 {
			return errors.New("hr_max must be between 120 and 230")
		}
	}
	if hrResting != nil {
		if *hrResting < 30 || *hrResting > 100 {
			return errors.New("hr_resting must be between 30 and 100")
		}
	}
	if hrMax != nil && hrResting != nil && *hrResting >= *hrMax {
		return errors.New("hr_resting must be less than hr_max")
	}
	return nil
}

// PatchMe handles PATCH /v1/me. All fields are optional; only the keys present
// in the body are updated. Returns the full updated profile.
func PatchMe(repo *users.Repo) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vt, ok := auth.FromContext(r.Context())
		if !ok {
			writeError(w, http.StatusUnauthorized, "missing authentication")
			return
		}
		var req patchMeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json")
			return
		}
		if req.Units != nil && *req.Units != "metric" && *req.Units != "imperial" {
			writeError(w, http.StatusBadRequest, errInvalidUnits.Error())
			return
		}
		if err := validateHRProfile(req.HRMax, req.HRResting); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := validateBirthYear(req.BirthYear); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if req.UIAccent != nil && !validAccents[*req.UIAccent] {
			writeError(w, http.StatusBadRequest, "uiAccent must be one of solar/moss/ink/indigo/sand")
			return
		}
		if req.UITileStyle != nil && !validTileStyles[*req.UITileStyle] {
			writeError(w, http.StatusBadRequest, "uiTileStyle must be one of the known CartoCDN basemap slugs")
			return
		}
		if req.UIDefaultSurface != nil && !validDefaultSurfaces[*req.UIDefaultSurface] {
			writeError(w, http.StatusBadRequest, "uiDefaultSurface must be one of 9:16, 1:1, 4:5")
			return
		}
		// Handle is case-folded to lowercase before validation + persistence.
		// We never round-trip mixed case so the unique index does its job.
		if req.Handle != nil {
			normalised := strings.ToLower(strings.TrimSpace(*req.Handle))
			if err := validateHandle(normalised); err != nil {
				writeError(w, http.StatusBadRequest, err.Error())
				return
			}
			req.Handle = &normalised
		}
		user, err := repo.FindByFirebaseUID(r.Context(), vt.UID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to load user")
			return
		}
		if user == nil {
			writeError(w, http.StatusNotFound, "user not provisioned")
			return
		}
		updated, err := repo.UpdateProfile(r.Context(), user.ID, users.ProfilePatch{
			DisplayName: req.DisplayName,
			HomeCity:    req.HomeCity,
			Units:       req.Units,
			HRMax:       req.HRMax,
			HRResting:   req.HRResting,
			BirthYear:   req.BirthYear,
			UIDark:           req.UIDark,
			UIAccent:         req.UIAccent,
			UITileStyle:      req.UITileStyle,
			UIOnboarded:      req.UIOnboarded,
			UIDefaultSurface: req.UIDefaultSurface,
			Handle:           req.Handle,
			ProfilePublic:    req.ProfilePublic,
		})
		if err != nil {
			// Handle collision → 409 Conflict so the mobile client can show
			// "that handle is taken" instead of a generic 500.
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "23505" {
				writeError(w, http.StatusConflict, "that handle is taken")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to update profile")
			return
		}
		hasStrava, err := repo.HasStravaConnection(r.Context(), updated.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to check strava account")
			return
		}
		writeJSON(w, http.StatusOK, toMeResponse(updated, hasStrava))
	}
}
