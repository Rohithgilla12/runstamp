package activities

import (
	"math"
	"time"
)

// IsDuplicateMatch reports whether two activity records describe the same
// run for purposes of cross-source dedup. PRD §6.8: match if the start
// times are within ±60 seconds AND the distances are within ±2%.
//
// This is the canonical Go definition of the dedupe predicate. The SQL in
// repo.findDuplicateQ MUST mirror this rule — see the test file for the
// parity check (`TestIsDuplicateMatch_*`). If you change the rule here,
// update the SQL too and run the tests to verify.
//
// Equal start-times and zero distance defensively return false: a zero
// candidate distance is almost certainly bad source data, and matching
// every other zero-distance run would silently merge unrelated stationary
// records.
func IsDuplicateMatch(startedA, startedB time.Time, distA, distB float64) bool {
	if distA <= 0 || distB <= 0 {
		return false
	}
	delta := startedA.Sub(startedB)
	if delta < 0 {
		delta = -delta
	}
	if delta > 60*time.Second {
		return false
	}
	// Relative distance delta, denominator is the candidate. Mirrors the SQL
	// expression `ABS(distance_m - $4) / NULLIF($4, 0) <= 0.02`.
	diff := math.Abs(distA-distB) / distB
	return diff <= 0.02
}
