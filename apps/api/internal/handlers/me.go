package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/auth"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/users"
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
	HasStrava   bool    `json:"hasStrava"`
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
		HasStrava:   hasStrava,
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
		})
		if err != nil {
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
