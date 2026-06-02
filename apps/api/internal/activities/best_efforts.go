package activities

// BestEffort is the fastest contiguous segment covering DistanceM, in seconds.
type BestEffort struct {
	DistanceM   int
	TimeSeconds int
}

// bestEffortDistances are the target PR distances (meters). Keep in sync with
// the handler's prDistances and the profile PB distances.
var bestEffortDistances = []int{1000, 1609, 5000, 10000, 21097, 42195}

// ComputeBestEfforts finds, for each target distance the run is long enough to
// contain, the fastest contiguous segment covering exactly that distance.
// Inputs are aligned cumulative distance (m) and elapsed time (s), both
// monotonically non-decreasing and the same length. Returns nil for unusable
// input.
func ComputeBestEfforts(distanceM, timeSec []float64) []BestEffort {
	n := len(distanceM)
	if n < 2 || len(timeSec) != n {
		return nil
	}
	total := distanceM[n-1] - distanceM[0]
	out := make([]BestEffort, 0, len(bestEffortDistances))
	for _, target := range bestEffortDistances {
		if total < float64(target) {
			continue
		}
		if best := bestSegmentTime(distanceM, timeSec, float64(target)); best > 0 {
			out = append(out, BestEffort{DistanceM: target, TimeSeconds: int(best + 0.5)})
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// bestSegmentTime returns the minimum seconds to cover exactly `target` meters
// over any window that starts at a sample and ends at the interpolated point
// `target` meters later. Returns 0 if no window reaches target.
func bestSegmentTime(distanceM, timeSec []float64, target float64) float64 {
	n := len(distanceM)
	best := 0.0
	j := 0
	for i := 0; i < n; i++ {
		if j < i {
			j = i
		}
		for j < n && distanceM[j]-distanceM[i] < target {
			j++
		}
		if j >= n {
			break // no later start can reach target either
		}
		// Window [i, j] covers >= target. Interpolate the time at exactly
		// distanceM[i] + target between samples j-1 and j.
		segEnd := distanceM[i] + target
		d0, d1 := distanceM[j-1], distanceM[j]
		t0, t1 := timeSec[j-1], timeSec[j]
		endTime := t1
		if d1 > d0 {
			endTime = t0 + (segEnd-d0)/(d1-d0)*(t1-t0)
		}
		if seg := endTime - timeSec[i]; seg > 0 && (best == 0 || seg < best) {
			best = seg
		}
	}
	return best
}
