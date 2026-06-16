package osm

import (
	"strings"
	"testing"
)

func TestBuildQuery(t *testing.T) {
	q := BuildQuery(BBox{MinLat: 19.0, MinLng: 72.8, MaxLat: 19.1, MaxLng: 72.9})
	if !strings.Contains(q, "19,72.8,19.1,72.9") {
		t.Errorf("bbox not in query: %s", q)
	}
	if !strings.Contains(q, "highway") || !strings.Contains(q, "out geom") {
		t.Errorf("query missing highway/out geom: %s", q)
	}
}

func TestParseWays(t *testing.T) {
	body := `{"elements":[
	  {"type":"way","id":1,"tags":{"highway":"residential","name":"A St"},
	   "geometry":[{"lat":19.0,"lon":72.80},{"lat":19.0,"lon":72.801}]},
	  {"type":"way","id":2,"tags":{"highway":"motorway"},
	   "geometry":[{"lat":19.0,"lon":72.80},{"lat":19.0,"lon":72.81}]},
	  {"type":"way","id":3,"tags":{"highway":"footway"},
	   "geometry":[{"lat":19.0,"lon":72.80}]}
	]}`
	ways, err := ParseWays([]byte(body))
	if err != nil {
		t.Fatal(err)
	}
	if len(ways) != 1 {
		t.Fatalf("got %d ways, want 1 (residential only; motorway excluded, 1-pt dropped)", len(ways))
	}
	w := ways[0]
	if w.WayID != 1 || w.Highway != "residential" || w.Name != "A St" {
		t.Errorf("bad way: %+v", w)
	}
	if w.LengthM < 80 || w.LengthM > 130 {
		t.Errorf("length %.0f out of range", w.LengthM)
	}
	if len(w.Geometry) != 2 {
		t.Errorf("geometry len %d", len(w.Geometry))
	}
}

func TestIsRunnable(t *testing.T) {
	for _, h := range []string{"residential", "footway", "path", "living_street", "service", "track", "steps", "pedestrian", "tertiary", "secondary", "unclassified"} {
		if !isRunnable(h) {
			t.Errorf("%s should be runnable", h)
		}
	}
	for _, h := range []string{"motorway", "motorway_link", "trunk", "trunk_link", "construction", ""} {
		if isRunnable(h) {
			t.Errorf("%s should NOT be runnable", h)
		}
	}
}
