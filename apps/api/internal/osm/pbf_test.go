package osm

import "testing"

func TestAssembleWays(t *testing.T) {
	coords := map[int64][2]float64{
		1: {17.40, 78.40},
		2: {17.41, 78.41},
		3: {17.42, 78.42},
		9: {40.00, -74.00},
	}
	raw := []rawWay{
		{ID: 100, Highway: "residential", Name: "Road Rd", NodeRefs: []int64{1, 2, 3}},
		{ID: 101, Highway: "footway", NodeRefs: []int64{1, 999}},      // 1 resolved point → dropped
		{ID: 102, Highway: "service", NodeRefs: []int64{2, 999, 3}},   // unresolved ref skipped, 2 points kept
		{ID: 103, Highway: "residential", NodeRefs: []int64{9, 9}},    // outside filter bbox
	}
	filter := &BBox{MinLat: 17.0, MinLng: 78.0, MaxLat: 18.0, MaxLng: 79.0}

	got := assembleWays(raw, coords, filter)
	if len(got) != 2 {
		t.Fatalf("want 2 ways, got %d", len(got))
	}
	if got[0].WayID != 100 || got[1].WayID != 102 {
		t.Fatalf("wrong ways kept: %d, %d", got[0].WayID, got[1].WayID)
	}
	if len(got[0].Geometry) != 3 || len(got[1].Geometry) != 2 {
		t.Fatalf("wrong geometry lengths: %d, %d", len(got[0].Geometry), len(got[1].Geometry))
	}
	if got[0].LengthM < 2000 || got[0].LengthM > 4000 {
		t.Fatalf("way 100 length out of range: %f", got[0].LengthM)
	}
	if got[0].Name != "Road Rd" {
		t.Fatalf("name not carried: %q", got[0].Name)
	}

	// No filter keeps the out-of-bbox way too.
	if got := assembleWays(raw, coords, nil); len(got) != 3 {
		t.Fatalf("unfiltered: want 3 ways, got %d", len(got))
	}
}

func TestGeomBBox(t *testing.T) {
	ways := []Way{
		{Geometry: [][2]float64{{17.40, 78.40}, {17.42, 78.38}}},
		{Geometry: [][2]float64{{17.45, 78.41}}},
	}
	b, ok := GeomBBox(ways)
	if !ok {
		t.Fatal("expected ok")
	}
	want := BBox{MinLat: 17.40, MinLng: 78.38, MaxLat: 17.45, MaxLng: 78.41}
	if b != want {
		t.Fatalf("got %+v want %+v", b, want)
	}
	if _, ok := GeomBBox(nil); ok {
		t.Fatal("empty input should not be ok")
	}
}
