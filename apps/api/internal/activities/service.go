package activities

import (
	"context"
	"fmt"
)

// Service is a thin layer above Repository that provides the Ingest method.
// It is the only entry point callers outside this package should use for
// writing activities — it enforces the dedup contract atomically.
type Service struct {
	repo *Repository
}

// NewService constructs a Service.
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// Ingest writes a candidate activity while enforcing the cross-source dedup
// contract. The method runs the find-and-insert (and optional flip) inside a
// single transaction so no concurrent ingest can race it.
//
// Returns:
//   - canonical: the row that should be treated as the authoritative record
//     for this run. This is the newly inserted row unless the incoming is a
//     dupe of an existing Strava activity (in which case the existing Strava
//     row is returned).
//   - isDupe: true when the incoming activity was marked as dupe_of another
//     row or when the incoming Strava activity triggered a flip of an existing
//     Apple Health row.
//   - err: non-nil only on database errors.
func (s *Service) Ingest(ctx context.Context, candidate *Activity) (canonical *Activity, isDupe bool, err error) {
	tx, err := s.repo.Pool().Begin(ctx)
	if err != nil {
		return nil, false, fmt.Errorf("activities: begin tx: %w", err)
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	match, err := s.repo.findDuplicateTx(ctx, tx, candidate.UserID, candidate.Source, candidate.StartedAt, candidate.DistanceM)
	if err != nil {
		return nil, false, err
	}

	if match != nil {
		if candidate.Source == "strava" && match.Source == "apple_health" {
			// Strava wins: insert the incoming Strava row as canonical (dupe_of = nil),
			// then flip the existing Apple Health row to dupe_of = new strava row id.
			inserted, insertErr := s.repo.insertTx(ctx, tx, candidate)
			if insertErr != nil {
				return nil, false, insertErr
			}
			if flipErr := s.repo.flipDupeOfTx(ctx, tx, match.ID, inserted.ID); flipErr != nil {
				return nil, false, flipErr
			}
			if commitErr := tx.Commit(ctx); commitErr != nil {
				return nil, false, fmt.Errorf("activities: commit strava-wins flip: %w", commitErr)
			}
			return inserted, true, nil
		}

		// Apple Health incoming, Strava already canonical (or same-source conflict):
		// mark the incoming as a dupe.
		candidate.DupeOf = &match.ID
		if _, insertErr := s.repo.insertTx(ctx, tx, candidate); insertErr != nil {
			return nil, false, insertErr
		}
		if commitErr := tx.Commit(ctx); commitErr != nil {
			return nil, false, fmt.Errorf("activities: commit dupe insert: %w", commitErr)
		}
		return match, true, nil
	}

	// No duplicate found — straight insert as canonical.
	inserted, insertErr := s.repo.insertTx(ctx, tx, candidate)
	if insertErr != nil {
		return nil, false, insertErr
	}
	if commitErr := tx.Commit(ctx); commitErr != nil {
		return nil, false, fmt.Errorf("activities: commit insert: %w", commitErr)
	}
	return inserted, false, nil
}

// Repo exposes the underlying repository for callers that need direct
// access (e.g. InsertStream after ingest).
func (s *Service) Repo() *Repository { return s.repo }
