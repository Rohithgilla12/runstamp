package handlers

import (
	"testing"
	"time"
)

func TestIsoWeekStart(t *testing.T) {
	cases := []struct {
		name string
		in   string // RFC3339
		want string // ISO date of the Monday at 00:00 UTC
	}{
		{"monday stays put", "2026-05-18T15:00:00Z", "2026-05-18"},
		{"sunday rolls back to monday", "2026-05-24T23:30:00Z", "2026-05-18"},
		{"wednesday rolls back", "2026-05-20T07:14:00Z", "2026-05-18"},
		{"year boundary", "2026-01-02T12:00:00Z", "2025-12-29"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			in, err := time.Parse(time.RFC3339, tc.in)
			if err != nil {
				t.Fatalf("parse %q: %v", tc.in, err)
			}
			got := isoWeekStart(in).Format("2006-01-02")
			if got != tc.want {
				t.Fatalf("isoWeekStart(%s) = %s; want %s", tc.in, got, tc.want)
			}
		})
	}
}

func TestFillZeroWeeks(t *testing.T) {
	// "Now" is a Thursday in mid-May 2026; ISO week starts Mon 2026-05-18.
	now := time.Date(2026, 5, 21, 10, 0, 0, 0, time.UTC)

	t.Run("empty input → all zero buckets, length matches", func(t *testing.T) {
		out := fillZeroWeeks(nil, now, 4)
		if len(out) != 4 {
			t.Fatalf("len = %d; want 4", len(out))
		}
		for i, w := range out {
			if w.DistanceKm != 0 || w.Runs != 0 {
				t.Fatalf("week[%d] not zero: %+v", i, w)
			}
		}
		if out[3].WeekStart != "2026-05-18" {
			t.Fatalf("last week = %s; want 2026-05-18", out[3].WeekStart)
		}
		if out[0].WeekStart != "2026-04-27" {
			t.Fatalf("first week = %s; want 2026-04-27", out[0].WeekStart)
		}
	})

	t.Run("sparse input slots into the right positions", func(t *testing.T) {
		sparse := []weeklyBucket{
			{WeekStart: "2026-05-04", DistanceKm: 32.1, Runs: 4},
			{WeekStart: "2026-05-18", DistanceKm: 18.0, Runs: 2}, // current week
		}
		out := fillZeroWeeks(sparse, now, 4)
		// out[0] = 2026-04-27, out[1] = 2026-05-04, out[2] = 2026-05-11, out[3] = 2026-05-18
		if out[0].DistanceKm != 0 {
			t.Fatalf("out[0] should be empty: %+v", out[0])
		}
		if out[1].DistanceKm != 32.1 || out[1].Runs != 4 {
			t.Fatalf("out[1] should carry the 04 bucket: %+v", out[1])
		}
		if out[2].DistanceKm != 0 {
			t.Fatalf("out[2] should be the gap week: %+v", out[2])
		}
		if out[3].DistanceKm != 18.0 || out[3].Runs != 2 {
			t.Fatalf("out[3] should carry the current week: %+v", out[3])
		}
	})

	t.Run("inputs outside the window are ignored", func(t *testing.T) {
		sparse := []weeklyBucket{
			{WeekStart: "2024-01-01", DistanceKm: 99, Runs: 99},
		}
		out := fillZeroWeeks(sparse, now, 4)
		for _, w := range out {
			if w.DistanceKm != 0 || w.Runs != 0 {
				t.Fatalf("week with old data leaked through: %+v", w)
			}
		}
	})
}
