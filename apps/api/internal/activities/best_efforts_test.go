package activities

import "testing"

func effortMap(efforts []BestEffort) map[int]int {
	m := make(map[int]int, len(efforts))
	for _, e := range efforts {
		m[e.DistanceM] = e.TimeSeconds
	}
	return m
}

func TestComputeBestEfforts_ConstantPace(t *testing.T) {
	// 5:00/km (300 s/km) over 5 km, sampled every 1 km.
	dist := []float64{0, 1000, 2000, 3000, 4000, 5000}
	tm := []float64{0, 300, 600, 900, 1200, 1500}
	got := effortMap(ComputeBestEfforts(dist, tm))

	if got[1000] != 300 {
		t.Errorf("1K: want 300, got %d", got[1000])
	}
	if got[5000] != 1500 {
		t.Errorf("5K: want 1500, got %d", got[5000])
	}
	// 1 mile = 1609 m: interpolated between 1000 m (300 s) and 2000 m (600 s):
	// 300 + 0.609*300 = 482.7 -> 483.
	if got[1609] != 483 {
		t.Errorf("1mi: want 483, got %d", got[1609])
	}
	// Run is only 5 km — no 10K/HM/Marathon efforts.
	if _, ok := got[10000]; ok {
		t.Errorf("10K should be absent for a 5 km run")
	}
}

func TestComputeBestEfforts_NegativeSplitPicksFasterSegment(t *testing.T) {
	// First km 400 s, second km 300 s. Best 1K must be the faster (second) km.
	dist := []float64{0, 1000, 2000}
	tm := []float64{0, 400, 700}
	got := effortMap(ComputeBestEfforts(dist, tm))
	if got[1000] != 300 {
		t.Errorf("1K: want 300 (the fast second km), got %d", got[1000])
	}
}

func TestComputeBestEfforts_RejectsBadInput(t *testing.T) {
	if ComputeBestEfforts([]float64{0}, []float64{0}) != nil {
		t.Error("single-point input should return nil")
	}
	if ComputeBestEfforts([]float64{0, 1000}, []float64{0}) != nil {
		t.Error("mismatched lengths should return nil")
	}
	if ComputeBestEfforts([]float64{0, 500}, []float64{0, 200}) != nil {
		t.Error("run shorter than the smallest target (1 km) yields no efforts -> nil")
	}
}

func TestComputeBestEfforts_ExactDistanceRun(t *testing.T) {
	// Run total exactly equals the 1K target — boundary case.
	got := effortMap(ComputeBestEfforts([]float64{0, 1000}, []float64{0, 300}))
	if got[1000] != 300 {
		t.Errorf("exact 1K run: want 300, got %d", got[1000])
	}
}

func TestComputeBestEfforts_GpsPlateauExcludesPausedTime(t *testing.T) {
	// 60 s pause at 1000 m (distance repeats), then a fast 240 s second km.
	// The fastest 1K must start AFTER the pause: 240 s, not 300 s.
	dist := []float64{0, 1000, 1000, 2000}
	tm := []float64{0, 300, 360, 600}
	got := effortMap(ComputeBestEfforts(dist, tm))
	if got[1000] != 240 {
		t.Errorf("plateau 1K: want 240 (pause excluded), got %d", got[1000])
	}
}
