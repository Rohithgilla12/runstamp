package activities

import (
	"math"
	"testing"
)

func TestMinettiCr(t *testing.T) {
	// Flat = 3.6 J/(kg·m).
	if got := MinettiCr(0); math.Abs(got-3.6) > 0.01 {
		t.Errorf("Cr(0) = %v, want 3.6", got)
	}
	// Strong uphill: cost rises.
	if got := MinettiCr(0.10); got <= 3.6 {
		t.Errorf("Cr(0.10) = %v, expected > flat", got)
	}
	// Moderate downhill: lower than flat.
	if got := MinettiCr(-0.10); got >= 3.6 {
		t.Errorf("Cr(-0.10) = %v, expected < flat", got)
	}
	// Steep downhill capped at minCost (1.8).
	if got := MinettiCr(-0.30); got < 1.8 {
		t.Errorf("Cr(-0.30) = %v, expected >= 1.8 floor", got)
	}
}

func TestComputeGAPSecPerKm_FlatGround(t *testing.T) {
	// 10 km in 3000 s on flat ground → 5:00/km (300 sec/km).
	// 1000 samples, 1 Hz, 0 m altitude change.
	n := 1000
	alt := make([]float64, n)
	dist := make([]float64, n)
	time := make([]float64, n)
	speed := 10000.0 / 3000.0 // m/s
	for i := 0; i < n; i++ {
		alt[i] = 0
		time[i] = float64(i) * 3 // 3 s between samples
		dist[i] = speed * time[i]
	}
	got := ComputeGAPSecPerKm(alt, dist, time)
	// Should be ~300 s/km since flat.
	if math.Abs(got-300) > 1 {
		t.Errorf("flat GAP = %v, want ~300", got)
	}
}

func TestComputeGAPSecPerKm_UphillFasterEquivalent(t *testing.T) {
	// Constant 5% uphill — same actual pace should produce a faster
	// (lower number) GAP, because the runner is "really running easier
	// pace" than the hills make it look.
	//
	// Wait — actually GAP should be FASTER than raw pace on uphill
	// (because for the same effort on flat you'd be faster). Let's
	// verify direction.
	n := 1000
	alt := make([]float64, n)
	dist := make([]float64, n)
	time := make([]float64, n)
	speed := 3.0 // m/s — slow uphill
	for i := 0; i < n; i++ {
		time[i] = float64(i)
		dist[i] = speed * time[i]
		alt[i] = dist[i] * 0.05 // 5% grade
	}
	rawPace := 1000.0 / speed // = 333.33 sec/km
	gap := ComputeGAPSecPerKm(alt, dist, time)
	// On a 5% climb, GAP should be faster (smaller) than raw pace —
	// because the equivalent flat distance for the same energy is bigger.
	if gap >= rawPace {
		t.Errorf("uphill GAP %v should be < raw %v", gap, rawPace)
	}
	// And the speedup should be material (>15%).
	if (rawPace-gap)/rawPace < 0.15 {
		t.Errorf("uphill GAP only %.1f%% faster, expected >15%%", (rawPace-gap)/rawPace*100)
	}
}

func TestComputeGAPSecPerKm_TooShort(t *testing.T) {
	if got := ComputeGAPSecPerKm([]float64{0}, []float64{0}, []float64{0}); got != 0 {
		t.Errorf("single point GAP = %v, want 0", got)
	}
	if got := ComputeGAPSecPerKm(nil, nil, nil); got != 0 {
		t.Errorf("nil GAP = %v, want 0", got)
	}
}

func TestDeriveDistanceFromVelocity(t *testing.T) {
	v := []float64{3, 3, 4, 4}
	tt := []float64{0, 1, 2, 3}
	d := DeriveDistanceFromVelocity(v, tt)
	// d[0]=0; d[1]=0 + avg(3,3)*1 = 3; d[2]=3+avg(3,4)*1=6.5; d[3]=6.5+avg(4,4)*1=10.5
	want := []float64{0, 3, 6.5, 10.5}
	for i := range want {
		if math.Abs(d[i]-want[i]) > 0.01 {
			t.Errorf("d[%d] = %v, want %v", i, d[i], want[i])
		}
	}
}
