package coverage

import (
	"math"
	"testing"
)

func TestHaversineM(t *testing.T) {
	got := haversineM(LL{0, 0}, LL{1, 0})
	if math.Abs(got-111195) > 500 {
		t.Errorf("haversineM 1deg lat = %.0f, want ~111195", got)
	}
	if d := haversineM(LL{19, 72.8}, LL{19, 72.8}); d != 0 {
		t.Errorf("same point = %.4f, want 0", d)
	}
}

func TestDensify(t *testing.T) {
	pts := []LL{{19.0, 72.8}, {19.0027, 72.8}}
	out := Densify(pts, 50)
	if len(out) < 6 {
		t.Errorf("densified len = %d, want >= 6", len(out))
	}
	if out[0] != pts[0] || out[len(out)-1] != pts[1] {
		t.Errorf("endpoints not preserved: %v .. %v", out[0], out[len(out)-1])
	}
	for i := 1; i < len(out); i++ {
		if g := haversineM(out[i-1], out[i]); g > 51 { // linear lat/lng interpolation: actual max ~43m for a 50m step
			t.Errorf("gap %.0f exceeds step", g)
		}
	}
}

func TestDensifyIdenticalPoints(t *testing.T) {
	pts := []LL{{19, 72.8}, {19, 72.8}, {19.1, 72.9}}
	out := Densify(pts, 50)
	if len(out) < 3 {
		t.Errorf("identical-consecutive densify -> %d, want >= 3", len(out))
	}
}

func TestDensifyShort(t *testing.T) {
	if out := Densify(nil, 50); len(out) != 0 {
		t.Errorf("nil -> %d", len(out))
	}
	one := []LL{{1, 2}}
	if out := Densify(one, 50); len(out) != 1 {
		t.Errorf("single -> %d", len(out))
	}
}
