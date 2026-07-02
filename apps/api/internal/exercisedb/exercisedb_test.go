package exercisedb

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
)

func TestClientDisabledWithoutKey(t *testing.T) {
	c := New("", "", "")
	if c.Enabled() {
		t.Fatal("client should be disabled without a key")
	}
	if _, err := c.Search(context.Background(), "plank", 5); err != ErrDisabled {
		t.Fatalf("want ErrDisabled, got %v", err)
	}
	if _, err := c.GetByID(context.Background(), "exr_1"); err != ErrDisabled {
		t.Fatalf("want ErrDisabled, got %v", err)
	}
}

func TestSearchAndGetByID(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("x-rapidapi-key"); got != "secret" {
			t.Errorf("missing/wrong api key header: %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/api/v1/exercises/search":
			if r.URL.Query().Get("search") != "dead bug" {
				t.Errorf("search query = %q", r.URL.Query().Get("search"))
			}
			_, _ = w.Write([]byte(`{"success":true,"data":[{"exerciseId":"exr_9","name":"Dead Bug","imageUrl":"https://cdn/x.jpg"}]}`))
		case "/api/v1/exercises/exr_9":
			_, _ = w.Write([]byte(`{"success":true,"data":{"exerciseId":"exr_9","name":"Dead Bug","imageUrl":"https://cdn/x.jpg","videoUrl":"https://cdn/x.mp4","targetMuscles":["abs"],"equipments":["body weight"],"instructions":["Lie on your back","Extend opposite arm and leg"],"exerciseTips":["Keep your lower back flat"]}}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	c := New("secret", srv.URL, "host.example")

	res, err := c.Search(context.Background(), "dead bug", 5)
	if err != nil {
		t.Fatalf("search: %v", err)
	}
	if len(res) != 1 || res[0].ExerciseID != "exr_9" {
		t.Fatalf("unexpected search result: %+v", res)
	}

	ex, err := c.GetByID(context.Background(), "exr_9")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if ex.VideoURL == "" || len(ex.Instructions) != 2 || len(ex.ExerciseTips) != 1 {
		t.Fatalf("detail not fully parsed: %+v", ex)
	}
}

func TestGetByIDNotFound(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.NotFound(w, r)
	}))
	defer srv.Close()

	c := New("secret", srv.URL, "host")
	if _, err := c.GetByID(context.Background(), "nope"); err != ErrNotFound {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
}

func TestServiceCachesAndResolvesByName(t *testing.T) {
	var searchHits, getHits int64
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/api/v1/exercises/search":
			atomic.AddInt64(&searchHits, 1)
			// Return a near-match first, exact match second, to exercise pickBest.
			_, _ = w.Write([]byte(`{"success":true,"data":[{"exerciseId":"exr_a","name":"Russian Twist (weighted)"},{"exerciseId":"exr_b","name":"Russian Twist"}]}`))
		case "/api/v1/exercises/exr_b":
			atomic.AddInt64(&getHits, 1)
			_, _ = w.Write([]byte(`{"success":true,"data":{"exerciseId":"exr_b","name":"Russian Twist","imageUrl":"https://cdn/rt.jpg"}}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	s := NewService(New("secret", srv.URL, "host"))

	for i := 0; i < 3; i++ {
		ex, err := s.FindByName(context.Background(), "Russian Twist")
		if err != nil {
			t.Fatalf("find: %v", err)
		}
		if ex.ExerciseID != "exr_b" { // exact-name match wins over the first result
			t.Fatalf("pickBest chose %q", ex.ExerciseID)
		}
	}
	if searchHits != 1 || getHits != 1 {
		t.Fatalf("cache miss: searchHits=%d getHits=%d (want 1,1)", searchHits, getHits)
	}
}
