package exercisedb

import (
	"context"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Exercise data is effectively static (an expert-curated catalogue), and the
// upstream is a metered paid API — so we cache aggressively in-process. A day
// is plenty; a redeploy clears it.
const cacheTTL = 24 * time.Hour

// Service wraps Client with an in-memory TTL cache. Safe for concurrent use.
type Service struct {
	client *Client

	mu    sync.RWMutex
	cache map[string]entry
}

type entry struct {
	val   any
	stamp time.Time
}

func NewService(client *Client) *Service {
	return &Service{client: client, cache: make(map[string]entry)}
}

// Enabled reports whether the upstream is configured.
func (s *Service) Enabled() bool { return s.client.Enabled() }

// Search proxies a fuzzy search, caching the result set per query+limit.
func (s *Service) Search(ctx context.Context, query string, limit int) ([]Exercise, error) {
	key := "search:" + strings.ToLower(strings.TrimSpace(query)) + ":" + strconv.Itoa(limit)
	if v, ok := s.load(key); ok {
		return v.([]Exercise), nil
	}
	res, err := s.client.Search(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	s.store(key, res)
	return res, nil
}

// GetByID proxies a by-id lookup, caching the full object.
func (s *Service) GetByID(ctx context.Context, id string) (*Exercise, error) {
	key := "id:" + id
	if v, ok := s.load(key); ok {
		return v.(*Exercise), nil
	}
	ex, err := s.client.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	s.store(key, ex)
	return ex, nil
}

// FindByName resolves a plain exercise name (e.g. "Dead bug") to a full
// exercise object: search for the best match, then fetch its detail. This is
// what the mobile routine screens use to enrich curated moves — the routines
// key off names, not upstream ids. Returns ErrNotFound when nothing matches.
func (s *Service) FindByName(ctx context.Context, name string) (*Exercise, error) {
	key := "name:" + strings.ToLower(strings.TrimSpace(name))
	if v, ok := s.load(key); ok {
		return v.(*Exercise), nil
	}
	matches, err := s.Search(ctx, name, 5)
	if err != nil {
		return nil, err
	}
	best := pickBest(name, matches)
	if best == nil {
		return nil, ErrNotFound
	}
	ex, err := s.GetByID(ctx, best.ExerciseID)
	if err != nil {
		return nil, err
	}
	s.store(key, ex)
	return ex, nil
}

// pickBest prefers a case-insensitive exact name match, else the first result.
func pickBest(name string, matches []Exercise) *Exercise {
	if len(matches) == 0 {
		return nil
	}
	want := strings.ToLower(strings.TrimSpace(name))
	for i := range matches {
		if strings.ToLower(strings.TrimSpace(matches[i].Name)) == want {
			return &matches[i]
		}
	}
	return &matches[0]
}

func (s *Service) load(key string) (any, bool) {
	s.mu.RLock()
	e, ok := s.cache[key]
	s.mu.RUnlock()
	if !ok || time.Since(e.stamp) > cacheTTL {
		return nil, false
	}
	return e.val, true
}

func (s *Service) store(key string, val any) {
	s.mu.Lock()
	s.cache[key] = entry{val: val, stamp: time.Now()}
	s.mu.Unlock()
}
