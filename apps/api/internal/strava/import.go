package strava

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/activities"
)

const (
	importBatchSize = 5
	maxListPages    = 50
	listPerPage     = 200
	workerIdleSleep = 30 * time.Second
)

// ImportStatus mirrors a strava_imports row plus a derived ETA.
type ImportStatus struct {
	Status          string
	SummaryCount    int
	DetailFetched   int
	DetailTotal     int
	EtaMinutes      int
	LastError       string
	StartedAt       time.Time
	UpdatedAt       time.Time
	CompletedAt     *time.Time
	RateWindowUntil *time.Time
}

// Importer owns the full import lifecycle for Strava deep history.
type Importer struct {
	pool           *pgxpool.Pool
	client         *Client
	stravaRepo     *Repository
	activitiesRepo *activities.Repository
	log            *slog.Logger
}

// NewImporter constructs an Importer.
func NewImporter(
	pool *pgxpool.Pool,
	client *Client,
	stravaRepo *Repository,
	activitiesRepo *activities.Repository,
	log *slog.Logger,
) *Importer {
	return &Importer{
		pool:           pool,
		client:         client,
		stravaRepo:     stravaRepo,
		activitiesRepo: activitiesRepo,
		log:            log,
	}
}

// Start is idempotent. It ensures a strava_imports row exists for the user and
// is in a state where the worker will pick it up.
//
//   - complete  → no-op
//   - listing / enriching → no-op (already running)
//   - pending / paused / error / missing → insert or reset to pending
func (im *Importer) Start(ctx context.Context, userID string) error {
	_, err := im.pool.Exec(ctx, `
INSERT INTO strava_imports (user_id, status)
VALUES ($1, 'pending')
ON CONFLICT (user_id) DO UPDATE
  SET status     = CASE
                     WHEN strava_imports.status IN ('listing','enriching','complete') THEN strava_imports.status
                     ELSE 'pending'
                   END,
      last_error = CASE
                     WHEN strava_imports.status IN ('listing','enriching','complete') THEN strava_imports.last_error
                     ELSE NULL
                   END,
      updated_at = CASE
                     WHEN strava_imports.status IN ('listing','enriching','complete') THEN strava_imports.updated_at
                     ELSE now()
                   END`,
		userID)
	if err != nil {
		return fmt.Errorf("importer start: %w", err)
	}
	return nil
}

// Status returns the current ImportStatus for a user. Returns nil when no
// import row exists.
func (im *Importer) Status(ctx context.Context, userID string) (*ImportStatus, error) {
	row := im.pool.QueryRow(ctx, `
SELECT status, summary_count, detail_fetched, detail_total,
       last_error, started_at, updated_at, completed_at, rate_window_until
FROM strava_imports
WHERE user_id = $1`, userID)

	var s ImportStatus
	var lastErr *string
	if err := row.Scan(
		&s.Status, &s.SummaryCount, &s.DetailFetched, &s.DetailTotal,
		&lastErr, &s.StartedAt, &s.UpdatedAt, &s.CompletedAt, &s.RateWindowUntil,
	); err != nil {
		// pgx.ErrNoRows — treat as nil, nil
		return nil, nil
	}
	if lastErr != nil {
		s.LastError = *lastErr
	}

	// Derive ETA: (remaining * 2 calls) / 90 calls per window * 15 min.
	if s.DetailTotal > s.DetailFetched && s.DetailTotal > 0 {
		remaining := s.DetailTotal - s.DetailFetched
		callsNeeded := remaining * 2
		windows := math.Ceil(float64(callsNeeded) / 90.0)
		s.EtaMinutes = int(math.Ceil(windows * 15))
	}

	return &s, nil
}

// Run is the long-running worker loop. It should be launched as a goroutine
// from main. Exits when ctx is cancelled.
func (im *Importer) Run(ctx context.Context) {
	im.log.Info("strava importer: worker started")
	for {
		select {
		case <-ctx.Done():
			im.log.Info("strava importer: worker stopped")
			return
		default:
		}

		didWork, err := im.tick(ctx)
		if err != nil {
			im.log.Error("strava importer: tick error", "err", err)
		}
		if !didWork {
			select {
			case <-ctx.Done():
				return
			case <-time.After(workerIdleSleep):
			}
		}
	}
}

// tick does one unit of work: either advance a listing row or advance an
// enriching row. Returns true if any work was performed.
func (im *Importer) tick(ctx context.Context) (bool, error) {
	// First priority: advance a listing row.
	listingUserID, err := im.oldestInStatus(ctx, "listing")
	if err != nil {
		return false, err
	}
	if listingUserID == "" {
		// No listing row — maybe there's a pending one we can transition.
		pendingUserID, err := im.oldestInStatus(ctx, "pending")
		if err != nil {
			return false, err
		}
		if pendingUserID != "" {
			if err := im.transitionStatus(ctx, pendingUserID, "listing"); err != nil {
				return false, err
			}
			listingUserID = pendingUserID
		}
	}
	if listingUserID != "" {
		if err := im.advanceListing(ctx, listingUserID); err != nil {
			im.log.Error("strava importer: listing error", "user_id", listingUserID, "err", err)
			_ = im.setError(ctx, listingUserID, err.Error())
		}
		return true, nil
	}

	// Second priority: advance an enriching row that is not rate-limited.
	enrichingUserID, err := im.oldestReadyEnriching(ctx)
	if err != nil {
		return false, err
	}
	if enrichingUserID != "" {
		if err := im.advanceEnriching(ctx, enrichingUserID); err != nil {
			im.log.Error("strava importer: enriching error", "user_id", enrichingUserID, "err", err)
			_ = im.setError(ctx, enrichingUserID, err.Error())
		}
		return true, nil
	}

	return false, nil
}

// advanceListing fetches up to one page of activities for the user, inserts
// summaries, and increments summary_count. When an empty page is returned it
// transitions to enriching.
func (im *Importer) advanceListing(ctx context.Context, userID string) error {
	conn, access, err := im.freshToken(ctx, userID)
	if err != nil {
		return err
	}
	_ = conn

	// Determine which page we're on from summary_count.
	summaryCount, err := im.getSummaryCount(ctx, userID)
	if err != nil {
		return err
	}
	page := (summaryCount / listPerPage) + 1
	if page > maxListPages {
		return im.finishListing(ctx, userID, summaryCount)
	}

	callCtx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	now := time.Now().UTC()
	epoch := time.Unix(0, 0).UTC()
	summaries, err := im.client.ListAthleteActivities(callCtx, access, now, epoch, page, listPerPage)
	if err != nil {
		if errors.Is(err, ErrTokenExpired) {
			access, err = im.refreshAndStore(ctx, userID)
			if err != nil {
				return fmt.Errorf("listing: refresh token: %w", err)
			}
			summaries, err = im.client.ListAthleteActivities(callCtx, access, now, epoch, page, listPerPage)
			if err != nil {
				return fmt.Errorf("listing: list after refresh: %w", err)
			}
		} else if errors.Is(err, ErrRateLimited) {
			return im.handleRateLimit(ctx, userID)
		} else {
			return fmt.Errorf("listing: page %d: %w", page, err)
		}
	}

	// React to rate-limit headers after every call.
	if wakeAt := im.client.LastRateLimit().NextSleepUntil(); !wakeAt.IsZero() {
		if err := im.setRateWindow(ctx, userID, wakeAt); err != nil {
			im.log.Warn("strava importer: set rate window", "err", err)
		}
		sleepDuration := time.Until(wakeAt)
		if sleepDuration > 0 {
			im.log.Info("strava importer: rate-limit sleep (listing)", "user_id", userID, "until", wakeAt)
			select {
			case <-ctx.Done():
				return nil
			case <-time.After(sleepDuration):
			}
			_ = im.clearRateWindow(ctx, userID)
		}
	}

	if len(summaries) == 0 {
		return im.finishListing(ctx, userID, summaryCount)
	}

	inserted := 0
	for _, s := range summaries {
		act := summaryToActivity(userID, &s)
		if _, err := im.activitiesRepo.Insert(callCtx, act); err != nil {
			im.log.Warn("strava importer: insert summary", "activity_id", s.ID, "err", err)
			continue
		}
		inserted++
	}

	newCount := summaryCount + inserted
	if _, err := im.pool.Exec(ctx,
		`UPDATE strava_imports SET summary_count = $1, updated_at = now() WHERE user_id = $2`,
		newCount, userID); err != nil {
		return fmt.Errorf("listing: update count: %w", err)
	}

	// If Strava returned a partial page, we're done listing.
	if len(summaries) < listPerPage {
		return im.finishListing(ctx, userID, newCount)
	}

	return nil
}

func (im *Importer) finishListing(ctx context.Context, userID string, summaryCount int) error {
	_, err := im.pool.Exec(ctx, `
UPDATE strava_imports
SET status = 'enriching', detail_total = $2, summary_count = $2, updated_at = now()
WHERE user_id = $1`,
		userID, summaryCount)
	if err != nil {
		return fmt.Errorf("finish listing: %w", err)
	}
	im.log.Info("strava importer: listing complete, moving to enriching",
		"user_id", userID, "summary_count", summaryCount)
	return nil
}

// advanceEnriching fetches detail+streams for up to importBatchSize pending
// activities. When none remain, marks the import complete.
func (im *Importer) advanceEnriching(ctx context.Context, userID string) error {
	_, access, err := im.freshToken(ctx, userID)
	if err != nil {
		return err
	}

	for i := 0; i < importBatchSize; i++ {
		act, err := im.activitiesRepo.NextPendingDetail(ctx, userID)
		if err != nil {
			return fmt.Errorf("enriching: next pending: %w", err)
		}
		if act == nil {
			// All enriched — mark complete.
			if _, err := im.pool.Exec(ctx, `
UPDATE strava_imports
SET status = 'complete', completed_at = now(), updated_at = now()
WHERE user_id = $1`, userID); err != nil {
				return fmt.Errorf("enriching: mark complete: %w", err)
			}
			im.log.Info("strava importer: enriching complete", "user_id", userID)
			return nil
		}

		if err := im.enrichOne(ctx, userID, act, &access); err != nil {
			return err
		}
	}
	return nil
}

// enrichOne fetches detail + streams for a single activity, persists them,
// and advances the counter. On transient errors it uses exponential backoff
// (up to 3 attempts); if all fail, it skips by flipping has_detail=true.
func (im *Importer) enrichOne(ctx context.Context, userID string, act *activities.Activity, access *string) error {
	externalID, err := strconv.ParseInt(act.ExternalID, 10, 64)
	if err != nil {
		im.log.Warn("strava importer: invalid external_id, skipping", "activity_id", act.ID)
		return im.activitiesRepo.MarkDetailFetched(ctx, act.ID)
	}

	callCtx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	var detailed *DetailedActivity
	for attempt := 0; attempt < 3; attempt++ {
		detailed, err = im.client.FetchActivity(callCtx, *access, externalID)
		if err == nil {
			break
		}
		if errors.Is(err, ErrTokenExpired) {
			newAccess, refreshErr := im.refreshAndStore(ctx, userID)
			if refreshErr != nil {
				return fmt.Errorf("enrich: refresh token: %w", refreshErr)
			}
			*access = newAccess
			detailed, err = im.client.FetchActivity(callCtx, *access, externalID)
			if err == nil {
				break
			}
		}
		if errors.Is(err, ErrRateLimited) {
			return im.handleRateLimit(ctx, userID)
		}
		backoff := []time.Duration{10 * time.Second, 30 * time.Second, 90 * time.Second}
		if attempt < len(backoff) {
			im.log.Warn("strava importer: fetch detail transient error, backing off",
				"activity_id", act.ID, "attempt", attempt+1, "err", err)
			select {
			case <-ctx.Done():
				return nil
			case <-time.After(backoff[attempt]):
			}
		}
	}

	// Check rate headers after FetchActivity.
	if wakeAt := im.client.LastRateLimit().NextSleepUntil(); !wakeAt.IsZero() {
		if err2 := im.setRateWindow(ctx, userID, wakeAt); err2 != nil {
			im.log.Warn("strava importer: set rate window", "err", err2)
		}
		sleepDuration := time.Until(wakeAt)
		if sleepDuration > 0 {
			im.log.Info("strava importer: rate-limit sleep (enrich detail)", "user_id", userID, "until", wakeAt)
			select {
			case <-ctx.Done():
				return nil
			case <-time.After(sleepDuration):
			}
			_ = im.clearRateWindow(ctx, userID)
		}
	}

	if err != nil {
		// All attempts failed — skip this activity.
		im.log.Warn("strava importer: skipping activity after 3 failures",
			"activity_id", act.ID, "err", err)
		return im.activitiesRepo.MarkDetailFetched(ctx, act.ID)
	}

	// Persist detail fields.
	df := detailedToDetailFields(detailed)
	if err := im.activitiesRepo.UpdateDetail(ctx, act.ID, df); err != nil {
		return fmt.Errorf("enrich: update detail: %w", err)
	}

	// Fetch streams (best-effort — a 404 or empty result still marks done).
	callCtx2, cancel2 := context.WithTimeout(ctx, 60*time.Second)
	defer cancel2()

	streams, streamsErr := im.client.FetchActivityStreams(callCtx2, *access, externalID, nil)
	if streamsErr != nil {
		if errors.Is(streamsErr, ErrTokenExpired) {
			newAccess, refreshErr := im.refreshAndStore(ctx, userID)
			if refreshErr != nil {
				return fmt.Errorf("enrich: refresh for streams: %w", refreshErr)
			}
			*access = newAccess
			streams, streamsErr = im.client.FetchActivityStreams(callCtx2, *access, externalID, nil)
		}
		if streamsErr != nil && !errors.Is(streamsErr, ErrRateLimited) {
			im.log.Warn("strava importer: streams fetch failed, continuing",
				"activity_id", act.ID, "err", streamsErr)
			streams = nil
		} else if errors.Is(streamsErr, ErrRateLimited) {
			// Mark detail done (we got it), then handle rate limit.
			if err := im.activitiesRepo.MarkDetailFetched(ctx, act.ID); err != nil {
				return err
			}
			if err := im.incrementDetailFetched(ctx, userID); err != nil {
				return err
			}
			return im.handleRateLimit(ctx, userID)
		}
	}

	// Check rate headers after FetchActivityStreams.
	if wakeAt := im.client.LastRateLimit().NextSleepUntil(); !wakeAt.IsZero() {
		if err2 := im.setRateWindow(ctx, userID, wakeAt); err2 != nil {
			im.log.Warn("strava importer: set rate window", "err", err2)
		}
		sleepDuration := time.Until(wakeAt)
		if sleepDuration > 0 {
			im.log.Info("strava importer: rate-limit sleep (enrich streams)", "user_id", userID, "until", wakeAt)
			select {
			case <-ctx.Done():
				return nil
			case <-time.After(sleepDuration):
			}
			_ = im.clearRateWindow(ctx, userID)
		}
	}

	// Persist streams (velocity_smooth → "velocity").
	for streamType, stream := range streams {
		storeType := streamType
		if storeType == "velocity_smooth" {
			storeType = "velocity"
		}
		data, marshalErr := json.Marshal(stream.Data)
		if marshalErr != nil {
			im.log.Warn("strava importer: marshal stream", "type", streamType, "err", marshalErr)
			continue
		}
		if err := im.activitiesRepo.InsertStream(ctx, act.ID, storeType, data); err != nil {
			im.log.Warn("strava importer: insert stream", "type", storeType, "err", err)
		}
	}

	if err := im.activitiesRepo.MarkDetailFetched(ctx, act.ID); err != nil {
		return fmt.Errorf("enrich: mark detail fetched: %w", err)
	}
	// Mark streams fetched regardless of whether streams came back (indoor run = no GPS).
	if err := im.activitiesRepo.MarkStreamsFetched(ctx, act.ID); err != nil {
		return fmt.Errorf("enrich: mark streams fetched: %w", err)
	}

	return im.incrementDetailFetched(ctx, userID)
}

func (im *Importer) incrementDetailFetched(ctx context.Context, userID string) error {
	_, err := im.pool.Exec(ctx,
		`UPDATE strava_imports SET detail_fetched = detail_fetched + 1, updated_at = now() WHERE user_id = $1`,
		userID)
	if err != nil {
		return fmt.Errorf("enrich: increment detail_fetched: %w", err)
	}
	return nil
}

// handleRateLimit persists rate_window_until and sleeps the worker until the
// window clears. Leaves status as-is (enriching continues after wake).
func (im *Importer) handleRateLimit(ctx context.Context, userID string) error {
	rl := im.client.LastRateLimit()
	wakeAt := rl.NextSleepUntil()
	if wakeAt.IsZero() {
		// Fallback: 15 minutes if we have no header data.
		if rl.RetryAfter > 0 {
			wakeAt = time.Now().UTC().Add(rl.RetryAfter)
		} else {
			wakeAt = next15MinBoundary(time.Now().UTC()).Add(time.Second)
		}
	}
	if err := im.setRateWindow(ctx, userID, wakeAt); err != nil {
		return err
	}
	sleepDuration := time.Until(wakeAt)
	if sleepDuration > 0 {
		im.log.Info("strava importer: rate limited, sleeping", "user_id", userID, "until", wakeAt, "duration", sleepDuration)
		select {
		case <-ctx.Done():
			return nil
		case <-time.After(sleepDuration):
		}
	}
	return im.clearRateWindow(ctx, userID)
}

func (im *Importer) setRateWindow(ctx context.Context, userID string, until time.Time) error {
	_, err := im.pool.Exec(ctx,
		`UPDATE strava_imports SET rate_window_until = $1, updated_at = now() WHERE user_id = $2`,
		until, userID)
	return err
}

func (im *Importer) clearRateWindow(ctx context.Context, userID string) error {
	_, err := im.pool.Exec(ctx,
		`UPDATE strava_imports SET rate_window_until = NULL, updated_at = now() WHERE user_id = $1`,
		userID)
	return err
}

func (im *Importer) setError(ctx context.Context, userID string, msg string) error {
	_, err := im.pool.Exec(ctx,
		`UPDATE strava_imports SET status = 'error', last_error = $1, updated_at = now() WHERE user_id = $2`,
		msg, userID)
	return err
}

func (im *Importer) transitionStatus(ctx context.Context, userID, newStatus string) error {
	_, err := im.pool.Exec(ctx,
		`UPDATE strava_imports SET status = $1, updated_at = now() WHERE user_id = $2`,
		newStatus, userID)
	return err
}

func (im *Importer) getSummaryCount(ctx context.Context, userID string) (int, error) {
	var n int
	err := im.pool.QueryRow(ctx,
		`SELECT summary_count FROM strava_imports WHERE user_id = $1`, userID).Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("get summary count: %w", err)
	}
	return n, nil
}

// oldestInStatus returns the user_id of the strava_imports row with the given
// status that has the oldest updated_at. Returns "" when none found.
func (im *Importer) oldestInStatus(ctx context.Context, status string) (string, error) {
	var userID string
	err := im.pool.QueryRow(ctx,
		`SELECT user_id FROM strava_imports WHERE status = $1 ORDER BY updated_at ASC LIMIT 1`,
		status).Scan(&userID)
	if err != nil {
		// pgx returns an error wrapping pgx.ErrNoRows for no-row scans.
		return "", nil
	}
	return userID, nil
}

// oldestReadyEnriching returns the user_id of the oldest enriching row whose
// rate_window_until is either null or in the past.
func (im *Importer) oldestReadyEnriching(ctx context.Context) (string, error) {
	var userID string
	err := im.pool.QueryRow(ctx, `
SELECT user_id
FROM strava_imports
WHERE status = 'enriching'
  AND (rate_window_until IS NULL OR rate_window_until <= now())
ORDER BY updated_at ASC
LIMIT 1`).Scan(&userID)
	if err != nil {
		return "", nil
	}
	return userID, nil
}

// freshToken loads the strava connection and ensures the access token is fresh.
func (im *Importer) freshToken(ctx context.Context, userID string) (*Connection, string, error) {
	conn, err := im.stravaRepo.GetByUser(ctx, userID)
	if err != nil {
		if errors.Is(err, ErrConnectionNotFound) {
			return nil, "", fmt.Errorf("importer: no strava connection for user %s", userID)
		}
		return nil, "", fmt.Errorf("importer: get connection: %w", err)
	}
	// Refresh proactively if token expires soon.
	if time.Until(conn.ExpiresAt) < 5*time.Minute {
		access, err := im.refreshAndStore(ctx, userID)
		if err != nil {
			return conn, "", err
		}
		return conn, access, nil
	}
	return conn, conn.AccessToken, nil
}

func (im *Importer) refreshAndStore(ctx context.Context, userID string) (string, error) {
	conn, err := im.stravaRepo.GetByUser(ctx, userID)
	if err != nil {
		return "", fmt.Errorf("importer: get conn for refresh: %w", err)
	}
	tok, err := im.client.RefreshToken(ctx, conn.RefreshToken)
	if err != nil {
		// A failed refresh should pause the import, not error it permanently.
		_ = im.setImportPaused(ctx, userID, err.Error())
		return "", fmt.Errorf("importer: refresh token: %w", err)
	}
	if _, err := im.stravaRepo.UpsertConnection(ctx, userID, tok); err != nil {
		return "", fmt.Errorf("importer: persist refreshed token: %w", err)
	}
	return tok.AccessToken, nil
}

func (im *Importer) setImportPaused(ctx context.Context, userID string, msg string) error {
	_, err := im.pool.Exec(ctx,
		`UPDATE strava_imports SET status = 'paused', last_error = $1, updated_at = now() WHERE user_id = $2`,
		msg, userID)
	return err
}

// summaryToActivity maps a SummaryActivity to an activities.Activity for the
// fast listing phase. Most detail fields are left nil.
func summaryToActivity(userID string, s *SummaryActivity) *activities.Activity {
	act := &activities.Activity{
		UserID:         userID,
		Source:         "strava",
		ExternalID:     strconv.FormatInt(s.ID, 10),
		Sport:          "run",
		StartedAt:      s.StartDate.UTC(),
		ElapsedSeconds: s.ElapsedTime,
		DistanceM:      s.Distance,
	}
	if s.MovingTime > 0 {
		v := s.MovingTime
		act.MovingSeconds = &v
	}
	if s.TotalElevationGain > 0 {
		v := s.TotalElevationGain
		act.ElevationGainM = &v
	}
	if s.AverageHeartrate > 0 {
		v := int(s.AverageHeartrate)
		act.AvgHR = &v
	}
	if s.MaxHeartrate > 0 {
		v := int(s.MaxHeartrate)
		act.MaxHR = &v
	}
	if s.Calories > 0 {
		v := int(s.Calories)
		act.Calories = &v
	}
	if s.Name != "" {
		v := s.Name
		act.Title = &v
	}
	if s.Distance > 0 && s.ElapsedTime > 0 {
		pace := float64(s.ElapsedTime) / (s.Distance / 1000.0)
		act.AvgPaceSPerKm = &pace
	}
	if len(s.StartLatlng) == 2 {
		lat := s.StartLatlng[0]
		lon := s.StartLatlng[1]
		act.StartLat = &lat
		act.StartLon = &lon
	}
	if s.LocationCity != "" {
		v := s.LocationCity
		act.LocationCity = &v
	}
	if s.LocationCountry != "" {
		v := s.LocationCountry
		act.LocationCountry = &v
	}
	return act
}

// detailedToDetailFields maps the rich fields from a DetailedActivity into a
// DetailFields struct for UpdateDetail.
func detailedToDetailFields(a *DetailedActivity) *activities.DetailFields {
	raw, _ := json.Marshal(a)
	rawMsg := json.RawMessage(raw)
	df := &activities.DetailFields{
		Raw: &rawMsg,
	}
	if a.TotalElevationGain > 0 {
		v := a.TotalElevationGain
		df.ElevationGainM = &v
	}
	if a.MaxHeartrate > 0 {
		v := int(a.MaxHeartrate)
		df.MaxHR = &v
	}
	if a.AverageHeartrate > 0 {
		v := int(a.AverageHeartrate)
		df.AvgHR = &v
	}
	if a.Calories > 0 {
		v := int(a.Calories)
		df.Calories = &v
	}
	if a.LocationCity != "" {
		v := a.LocationCity
		df.LocationCity = &v
	}
	if a.LocationCountry != "" {
		v := a.LocationCountry
		df.LocationCountry = &v
	}
	if a.Name != "" {
		v := a.Name
		df.Title = &v
	}
	if a.Distance > 0 && a.ElapsedTime > 0 {
		pace := float64(a.ElapsedTime) / (a.Distance / 1000.0)
		df.AvgPaceSPerKm = &pace
	}
	if len(a.StartLatlng) == 2 {
		lat := a.StartLatlng[0]
		lon := a.StartLatlng[1]
		df.StartLat = &lat
		df.StartLon = &lon
	}
	return df
}
