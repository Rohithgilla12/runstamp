package activities

import "math"

// Minetti's energetic-cost polynomial for running on a slope.
//
//   Cr(g) = 155.4·g⁵ − 30.4·g⁴ − 43.3·g³ + 46.3·g² + 19.5·g + 3.6   [J·kg⁻¹·m⁻¹]
//
// where g is the gradient as a fraction (e.g. 0.05 for 5%). Cr(0) = 3.6.
//
// GAP normalises a hilly run to its flat-equivalent pace by computing the
// energy spent on each segment and asking "how far would I have run on
// flat ground for the same energy?"
//
//   equivalent_flat_distance = Σᵢ (Cr(gᵢ) · dᵢ) / Cr(0)
//   GAP_sec_per_km = (total_time_sec / equivalent_flat_distance_m) · 1000
//
// Cite: Minetti AE, Moia C, Roi GS, Susta D, Ferretti G. "Energy cost of
// walking and running at extreme uphill and downhill slopes." J Appl
// Physiol 2002;93(3):1039–1046. (PMID 12183501)
//
// Strava's blog notes they cap the downhill *benefit* (steep downhills
// don't actually let you "recover" energy beyond a point — eccentric
// braking + injury risk). We floor Cr at 1.8 J/(kg·m) — half the flat
// cost — matching Strava's published GAP behaviour.
const flatCost = 3.6
const minCost = 1.8
const maxAbsGrade = 0.45

// MinettiCr returns the energetic cost in J/(kg·m) at gradient g.
func MinettiCr(g float64) float64 {
	if g > maxAbsGrade {
		g = maxAbsGrade
	} else if g < -maxAbsGrade {
		g = -maxAbsGrade
	}
	cr := 155.4*pow(g, 5) - 30.4*pow(g, 4) - 43.3*pow(g, 3) + 46.3*pow(g, 2) + 19.5*g + 3.6
	if cr < minCost {
		return minCost
	}
	return cr
}

// ComputeGAPSecPerKm returns the flat-equivalent pace in seconds-per-km,
// given aligned per-sample altitude, distance, and time streams.
//
//   altitudeM[i] in meters above sea level
//   distanceM[i] in meters (cumulative, monotonically non-decreasing)
//   timeSec[i]   in seconds (cumulative, monotonically non-decreasing)
//
// Returns 0 if the inputs are too short or inconsistent.
func ComputeGAPSecPerKm(altitudeM, distanceM, timeSec []float64) float64 {
	n := len(altitudeM)
	if n < 2 || len(distanceM) != n || len(timeSec) != n {
		return 0
	}

	var energyDistance float64 // Σ Cr(gᵢ) · dᵢ
	var totalDistance float64
	var totalTime float64
	for i := 1; i < n; i++ {
		dd := distanceM[i] - distanceM[i-1]
		dt := timeSec[i] - timeSec[i-1]
		if dd <= 0.1 || dt <= 0 {
			continue
		}
		da := altitudeM[i] - altitudeM[i-1]
		g := da / dd
		cr := MinettiCr(g)
		energyDistance += cr * dd
		totalDistance += dd
		totalTime += dt
	}
	if totalDistance < 50 || totalTime <= 0 {
		return 0
	}
	equivFlat := energyDistance / flatCost
	if equivFlat < 1 {
		return 0
	}
	return (totalTime / equivFlat) * 1000
}

// DeriveDistanceFromVelocity returns a cumulative-distance stream
// reconstructed from per-sample velocity (m/s) + time (sec). Used as a
// fallback for older imports that don't carry the distance stream.
func DeriveDistanceFromVelocity(velocityMS, timeSec []float64) []float64 {
	n := len(velocityMS)
	if n == 0 || len(timeSec) != n {
		return nil
	}
	out := make([]float64, n)
	out[0] = 0
	for i := 1; i < n; i++ {
		dt := timeSec[i] - timeSec[i-1]
		if dt <= 0 {
			out[i] = out[i-1]
			continue
		}
		avgV := (velocityMS[i] + velocityMS[i-1]) / 2
		out[i] = out[i-1] + math.Max(0, avgV)*dt
	}
	return out
}

// DeriveTimeUniform returns 0..n-1 as a stream — used when the time
// stream is missing and the activity was recorded at 1 Hz (typical
// non-Smart-Recording case).
func DeriveTimeUniform(n int) []float64 {
	out := make([]float64, n)
	for i := range out {
		out[i] = float64(i)
	}
	return out
}

func pow(x float64, n int) float64 {
	r := 1.0
	for i := 0; i < n; i++ {
		r *= x
	}
	return r
}
