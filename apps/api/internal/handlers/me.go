package handlers

import (
	"net/http"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/auth"
	"github.com/Rohithgilla12/runstamp/apps/api/internal/users"
)

type meResponse struct {
	UserID      string `json:"userId"`
	Email       string `json:"email"`
	FirebaseUID string `json:"firebaseUid"`
	HasStrava   bool   `json:"hasStrava"`
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

		email := ""
		if user.Email != nil {
			email = *user.Email
		}

		firebaseUID := ""
		if user.FirebaseUID != nil {
			firebaseUID = *user.FirebaseUID
		}

		writeJSON(w, http.StatusOK, meResponse{
			UserID:      user.ID,
			Email:       email,
			FirebaseUID: firebaseUID,
			HasStrava:   hasStrava,
		})
	}
}
