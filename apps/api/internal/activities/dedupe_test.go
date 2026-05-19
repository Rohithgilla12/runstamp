package activities

import (
	"testing"
	"time"
)

// Anchor used for all sub-tests below. Picked at random; the predicate is
// time-independent so the actual instant doesn't matter.
var anchor = time.Date(2026, 5, 19, 6, 30, 0, 0, time.UTC)

func TestIsDuplicateMatch_Identical(t *testing.T) {
	if !IsDuplicateMatch(anchor, anchor, 10000, 10000) {
		t.Fatal("same time + same distance should match")
	}
}

func TestIsDuplicateMatch_WithinTolerances(t *testing.T) {
	cases := []struct {
		name     string
		deltaSec int
		distA    float64
		distB    float64
		want     bool
	}{
		{"30s later, 1% off", 30, 10100, 10000, true},
		{"60s later, exact",  60, 10000, 10000, true},
		{"60s earlier, 2% off", -60, 10200, 10000, true},
		{"59s later, 1.9% off", 59, 9810, 10000, true},
		// Right at the cliff edges.
		{"61s later — out", 61, 10000, 10000, false},
		{"60s later, 2.1% off — out", 60, 10210, 10000, false},
		// Far outside.
		{"5 min later", 300, 10000, 10000, false},
		{"5% off", 0, 10500, 10000, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := IsDuplicateMatch(anchor.Add(time.Duration(tc.deltaSec)*time.Second), anchor, tc.distA, tc.distB)
			if got != tc.want {
				t.Errorf("IsDuplicateMatch(Δt=%ds, distA=%.0f, distB=%.0f) = %v, want %v", tc.deltaSec, tc.distA, tc.distB, got, tc.want)
			}
		})
	}
}

func TestIsDuplicateMatch_ZeroDistanceNeverMatches(t *testing.T) {
	// Defensive: a candidate with zero or negative distance is bad data and
	// must not match anything, even an exact start-time mirror.
	if IsDuplicateMatch(anchor, anchor, 0, 10000) {
		t.Error("zero candidate distance must not match")
	}
	if IsDuplicateMatch(anchor, anchor, 10000, 0) {
		t.Error("zero existing distance must not match")
	}
	if IsDuplicateMatch(anchor, anchor, -5, 10000) {
		t.Error("negative candidate distance must not match")
	}
}

func TestIsDuplicateMatch_Symmetric(t *testing.T) {
	// The relation is documented as symmetric in start-time but uses the
	// existing row's distance as the denominator. For matches strictly
	// inside the tolerance window, the result should agree both ways.
	a := anchor
	b := anchor.Add(45 * time.Second)
	if IsDuplicateMatch(a, b, 10100, 10000) != IsDuplicateMatch(b, a, 10000, 10100) {
		t.Error("strictly-inside match should be symmetric across argument order")
	}
}
