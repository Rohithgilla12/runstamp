// Package coverage snaps runs to a street network. geo.go holds the pure
// distance + densification helpers (no DB), so the matching math is unit-tested.
package coverage

import "math"

// LL is a lat/lng point in degrees.
type LL struct {
	Lat float64
	Lng float64
}

const earthRadiusM = 6371000.0

func haversineM(a, b LL) float64 {
	la1 := a.Lat * math.Pi / 180
	la2 := b.Lat * math.Pi / 180
	dLat := (b.Lat - a.Lat) * math.Pi / 180
	dLng := (b.Lng - a.Lng) * math.Pi / 180
	h := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(la1)*math.Cos(la2)*math.Sin(dLng/2)*math.Sin(dLng/2)
	return 2 * earthRadiusM * math.Asin(math.Min(1, math.Sqrt(h)))
}

// Densify inserts intermediate points so no consecutive gap exceeds stepM
// metres. Endpoints are preserved. Coarse downsampled tracks would otherwise
// skip streets between far-apart fixes.
func Densify(pts []LL, stepM float64) []LL {
	if len(pts) < 2 || stepM <= 0 {
		return pts
	}
	out := make([]LL, 0, len(pts))
	for i := 0; i < len(pts); i++ {
		if i == 0 {
			out = append(out, pts[0])
			continue
		}
		a, b := pts[i-1], pts[i]
		gap := haversineM(a, b)
		steps := int(math.Ceil(gap / stepM))
		for s := 1; s < steps; s++ {
			t := float64(s) / float64(steps)
			out = append(out, LL{Lat: a.Lat + (b.Lat-a.Lat)*t, Lng: a.Lng + (b.Lng-a.Lng)*t})
		}
		out = append(out, b)
	}
	return out
}
