package strava

import (
	"testing"
	"time"
)

func TestRateLimitNextSleepUntil_NothingNeeded(t *testing.T) {
	rl := RateLimit{
		ShortUsage: 30,
		ShortLimit: 100,
		DailyUsage: 200,
		DailyLimit: 1000,
		ObservedAt: time.Now().UTC(),
	}
	got := rl.NextSleepUntil()
	if !got.IsZero() {
		t.Errorf("expected zero time, got %v", got)
	}
}

func TestRateLimitNextSleepUntil_ShortWindowExhausted(t *testing.T) {
	now := time.Date(2024, 1, 15, 14, 22, 0, 0, time.UTC) // 14:22 UTC
	rl := RateLimit{
		ShortUsage: 92, // >= 100-10 = 90
		ShortLimit: 100,
		DailyUsage: 400,
		DailyLimit: 1000,
		ObservedAt: now,
	}
	got := rl.NextSleepUntil()
	if got.IsZero() {
		t.Fatal("expected non-zero sleep time")
	}
	// 14:22 → next 15-min boundary is 14:30
	want := time.Date(2024, 1, 15, 14, 30, 1, 0, time.UTC) // +1s slop
	if !got.Equal(want) {
		t.Errorf("short window: got %v, want %v", got, want)
	}
}

func TestRateLimitNextSleepUntil_ShortWindowAt45Minutes(t *testing.T) {
	now := time.Date(2024, 1, 15, 14, 47, 0, 0, time.UTC) // 14:47 UTC
	rl := RateLimit{
		ShortUsage: 95,
		ShortLimit: 100,
		DailyUsage: 400,
		DailyLimit: 1000,
		ObservedAt: now,
	}
	got := rl.NextSleepUntil()
	// 14:47 → next boundary is 15:00
	want := time.Date(2024, 1, 15, 15, 0, 1, 0, time.UTC)
	if !got.Equal(want) {
		t.Errorf("short window 45min: got %v, want %v", got, want)
	}
}

func TestRateLimitNextSleepUntil_DailyExhausted(t *testing.T) {
	now := time.Date(2024, 1, 15, 18, 0, 0, 0, time.UTC)
	rl := RateLimit{
		ShortUsage: 30,
		ShortLimit: 100,
		DailyUsage: 960, // >= 1000-50 = 950
		DailyLimit: 1000,
		ObservedAt: now,
	}
	got := rl.NextSleepUntil()
	if got.IsZero() {
		t.Fatal("expected non-zero sleep time for daily limit")
	}
	// Next UTC midnight + 1 minute
	want := time.Date(2024, 1, 16, 0, 1, 0, 0, time.UTC)
	if !got.Equal(want) {
		t.Errorf("daily limit: got %v, want %v", got, want)
	}
}

func TestRateLimitNextSleepUntil_ShortTakesPrecedenceOverDaily(t *testing.T) {
	now := time.Date(2024, 1, 15, 14, 22, 0, 0, time.UTC)
	rl := RateLimit{
		ShortUsage: 92,
		ShortLimit: 100,
		DailyUsage: 960,
		DailyLimit: 1000,
		ObservedAt: now,
	}
	got := rl.NextSleepUntil()
	// Short window fires first (14:30+1s), not midnight.
	want := time.Date(2024, 1, 15, 14, 30, 1, 0, time.UTC)
	if !got.Equal(want) {
		t.Errorf("short takes precedence: got %v, want %v", got, want)
	}
}

func TestRateLimitNextSleepUntil_ZeroLimitsNoSleep(t *testing.T) {
	rl := RateLimit{
		ShortUsage: 50,
		ShortLimit: 0, // no limit info
		DailyUsage: 500,
		DailyLimit: 0,
		ObservedAt: time.Now().UTC(),
	}
	got := rl.NextSleepUntil()
	if !got.IsZero() {
		t.Errorf("zero limits: expected zero time, got %v", got)
	}
}

func TestNext15MinBoundary(t *testing.T) {
	cases := []struct {
		from time.Time
		want time.Time
	}{
		{
			time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC),
			time.Date(2024, 1, 1, 10, 15, 0, 0, time.UTC),
		},
		{
			time.Date(2024, 1, 1, 10, 14, 59, 0, time.UTC),
			time.Date(2024, 1, 1, 10, 15, 0, 0, time.UTC),
		},
		{
			time.Date(2024, 1, 1, 10, 44, 0, 0, time.UTC),
			time.Date(2024, 1, 1, 10, 45, 0, 0, time.UTC),
		},
		{
			time.Date(2024, 1, 1, 10, 50, 0, 0, time.UTC),
			time.Date(2024, 1, 1, 11, 0, 0, 0, time.UTC),
		},
	}
	for _, tc := range cases {
		got := next15MinBoundary(tc.from)
		if !got.Equal(tc.want) {
			t.Errorf("next15MinBoundary(%v) = %v, want %v", tc.from, got, tc.want)
		}
	}
}
