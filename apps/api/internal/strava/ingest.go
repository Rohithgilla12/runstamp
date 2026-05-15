package strava

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/activities"
)

// backfillRateLimit is the maximum number of Strava API calls a single
// Backfill invocation may make. Each activity page + each FetchActivity call
// count against this ceiling. Keeps us well inside Strava's 15-minute
// rate-limit window (100 requests / 15 min per athlete).
const backfillRateLimit = 100

// WebhookEvent is the JSON body Strava POSTs to our /webhook endpoint.
type WebhookEvent struct {
	AspectType     string            `json:"aspect_type"`
	EventTime      int64             `json:"event_time"`
	ObjectID       int64             `json:"object_id"`
	ObjectType     string            `json:"object_type"`
	OwnerID        int64             `json:"owner_id"`
	Updates        map[string]string `json:"updates"`
	SubscriptionID int64             `json:"subscription_id"`
}

// SetActivities wires the activities.Service so the strava.Service can call
// Ingest. Called from main.go after both services are constructed, avoiding a
// circular import.
func (s *Service) SetActivities(svc *activities.Service) {
	s.activities = svc
}

// IngestFromWebhook handles a single Strava webhook event. Only
// object_type=activity with aspect_type=create or update is acted on;
// everything else is silently dropped. The method resolves athlete → user,
// ensures the token is fresh, fetches the full activity, and delegates to
// activities.Service.Ingest. For an update event, if the canonical row for
// this activity already exists and is from Strava we still call Ingest which
// (via ON CONFLICT DO NOTHING + re-select) is idempotent; updated fields are
// not patched in v0.1.
func (s *Service) IngestFromWebhook(ctx context.Context, evt WebhookEvent) error {
	if evt.ObjectType != "activity" {
		return nil
	}
	if evt.AspectType != "create" && evt.AspectType != "update" {
		return nil
	}

	conn, err := s.repo.GetByAthleteID(ctx, evt.OwnerID)
	if err != nil {
		if errors.Is(err, ErrConnectionNotFound) {
			return nil
		}
		return fmt.Errorf("strava ingest: resolve athlete %d: %w", evt.OwnerID, err)
	}

	access, err := s.EnsureFreshToken(ctx, conn)
	if err != nil {
		return fmt.Errorf("strava ingest: ensure token: %w", err)
	}

	activity, err := s.client.FetchActivity(ctx, access, evt.ObjectID)
	if err != nil {
		if errors.Is(err, ErrTokenExpired) {
			// One retry: the proactive refresh window missed clock skew.
			tok, refreshErr := s.client.RefreshToken(ctx, conn.RefreshToken)
			if refreshErr != nil {
				return fmt.Errorf("strava ingest: refresh after 401: %w", refreshErr)
			}
			if _, persistErr := s.repo.UpsertConnection(ctx, conn.UserID, tok); persistErr != nil {
				return fmt.Errorf("strava ingest: persist refreshed token: %w", persistErr)
			}
			activity, err = s.client.FetchActivity(ctx, tok.AccessToken, evt.ObjectID)
			if err != nil {
				return fmt.Errorf("strava ingest: fetch after refresh: %w", err)
			}
		} else {
			return fmt.Errorf("strava ingest: fetch activity %d: %w", evt.ObjectID, err)
		}
	}

	if activity.Type != "Run" {
		return nil
	}

	candidate := detailedToActivity(conn.UserID, activity)
	if _, _, err := s.activities.Ingest(ctx, candidate); err != nil {
		return fmt.Errorf("strava ingest: persist activity %d: %w", evt.ObjectID, err)
	}
	return nil
}

// Backfill fetches the user's Strava activities from the last `days` days and
// ingests each one. Pages through ListAthleteActivities until empty, stopping
// early if the backfillRateLimit is reached. Returns the count of canonical
// rows inserted (dupes and pre-existing rows excluded).
func (s *Service) Backfill(ctx context.Context, userID string, days int) (int, error) {
	conn, err := s.repo.GetByUser(ctx, userID)
	if err != nil {
		return 0, fmt.Errorf("strava backfill: get connection: %w", err)
	}

	access, err := s.EnsureFreshToken(ctx, conn)
	if err != nil {
		return 0, fmt.Errorf("strava backfill: ensure token: %w", err)
	}

	now := time.Now().UTC()
	after := now.AddDate(0, 0, -days)
	page := 1
	inserted := 0
	calls := 0

	for {
		if calls >= backfillRateLimit {
			break
		}
		summaries, err := s.client.ListAthleteActivities(ctx, access, now, after, page, 0)
		calls++
		if err != nil {
			if errors.Is(err, ErrTokenExpired) {
				tok, refreshErr := s.client.RefreshToken(ctx, conn.RefreshToken)
				if refreshErr != nil {
					return inserted, fmt.Errorf("strava backfill: refresh after 401: %w", refreshErr)
				}
				if _, persistErr := s.repo.UpsertConnection(ctx, conn.UserID, tok); persistErr != nil {
					return inserted, fmt.Errorf("strava backfill: persist refreshed token: %w", persistErr)
				}
				access = tok.AccessToken
				calls++
				summaries, err = s.client.ListAthleteActivities(ctx, access, now, after, page, 0)
				if err != nil {
					return inserted, fmt.Errorf("strava backfill: list after refresh: %w", err)
				}
			} else {
				return inserted, fmt.Errorf("strava backfill: list page %d: %w", page, err)
			}
		}
		if len(summaries) == 0 {
			break
		}

		for _, sum := range summaries {
			if sum.Type != "Run" {
				continue
			}
			if calls >= backfillRateLimit {
				return inserted, nil
			}
			detailed, err := s.client.FetchActivity(ctx, access, sum.ID)
			calls++
			if err != nil {
				if errors.Is(err, ErrTokenExpired) {
					tok, refreshErr := s.client.RefreshToken(ctx, conn.RefreshToken)
					if refreshErr != nil {
						return inserted, fmt.Errorf("strava backfill: refresh mid-page: %w", refreshErr)
					}
					if _, persistErr := s.repo.UpsertConnection(ctx, conn.UserID, tok); persistErr != nil {
						return inserted, fmt.Errorf("strava backfill: persist mid-page token: %w", persistErr)
					}
					access = tok.AccessToken
					calls++
					detailed, err = s.client.FetchActivity(ctx, access, sum.ID)
					if err != nil {
						return inserted, fmt.Errorf("strava backfill: fetch after refresh: %w", err)
					}
				} else {
					return inserted, fmt.Errorf("strava backfill: fetch activity %d: %w", sum.ID, err)
				}
			}

			candidate := detailedToActivity(conn.UserID, detailed)
			canonical, isDupe, ingestErr := s.activities.Ingest(ctx, candidate)
			if ingestErr != nil {
				return inserted, fmt.Errorf("strava backfill: ingest activity %d: %w", detailed.ID, ingestErr)
			}
			_ = canonical
			if !isDupe {
				inserted++
			}
		}
		page++
	}
	return inserted, nil
}

// detailedToActivity maps a Strava DetailedActivity onto an activities.Activity
// candidate ready for ingest. Pace is computed when distance > 0.
func detailedToActivity(userID string, a *DetailedActivity) *activities.Activity {
	raw, _ := json.Marshal(a)
	rawMsg := json.RawMessage(raw)

	act := &activities.Activity{
		UserID:         userID,
		Source:         "strava",
		ExternalID:     strconv.FormatInt(a.ID, 10),
		Sport:          "run",
		StartedAt:      a.StartDate.UTC(),
		ElapsedSeconds: a.ElapsedTime,
		DistanceM:      a.Distance,
		Raw:            &rawMsg,
	}

	if a.MovingTime > 0 {
		v := a.MovingTime
		act.MovingSeconds = &v
	}
	if a.TotalElevationGain > 0 {
		v := a.TotalElevationGain
		act.ElevationGainM = &v
	}
	if a.AverageHeartrate > 0 {
		v := int(a.AverageHeartrate)
		act.AvgHR = &v
	}
	if a.MaxHeartrate > 0 {
		v := int(a.MaxHeartrate)
		act.MaxHR = &v
	}
	if a.Calories > 0 {
		v := int(a.Calories)
		act.Calories = &v
	}
	if a.Name != "" {
		v := a.Name
		act.Title = &v
	}
	if a.Distance > 0 && a.ElapsedTime > 0 {
		pace := float64(a.ElapsedTime) / (a.Distance / 1000.0)
		act.AvgPaceSPerKm = &pace
	}
	if len(a.StartLatlng) == 2 {
		lat := a.StartLatlng[0]
		lon := a.StartLatlng[1]
		act.StartLat = &lat
		act.StartLon = &lon
	}
	if a.LocationCity != "" {
		v := a.LocationCity
		act.LocationCity = &v
	}
	if a.LocationCountry != "" {
		v := a.LocationCountry
		act.LocationCountry = &v
	}
	return act
}
