package export

import (
	"encoding/xml"
	"strings"
	"testing"
	"time"
)

func TestBuildGPX_MinimalActivity(t *testing.T) {
	a := Activity{
		ID:         "abc",
		Title:      "Cubbon Park easy",
		Source:     "apple_health",
		StartedAt:  time.Date(2026, 5, 19, 6, 30, 0, 0, time.UTC),
		ElapsedSec: 60,
		DistanceM:  500,
	}
	s := StreamSet{
		Latlng: [][2]float64{
			{12.971, 77.594},
			{12.972, 77.595},
			{12.973, 77.596},
		},
	}
	out, err := BuildGPX(a, s)
	if err != nil {
		t.Fatalf("BuildGPX: %v", err)
	}
	body := string(out)
	// Sanity: header + GPX root + the three coordinates + ISO times.
	if !strings.HasPrefix(body, `<?xml`) {
		t.Errorf("missing XML header: %s", body[:60])
	}
	if !strings.Contains(body, `creator="Runstamp"`) {
		t.Error("missing creator attr")
	}
	if !strings.Contains(body, `<name>Cubbon Park easy</name>`) {
		t.Error("missing track name")
	}
	if !strings.Contains(body, `<type>running</type>`) {
		t.Error("missing track type")
	}
	if !strings.Contains(body, `lat="12.971"`) || !strings.Contains(body, `lon="77.596"`) {
		t.Error("missing trackpoints")
	}
	if !strings.Contains(body, "2026-05-19T06:30:00Z") {
		t.Error("missing/incorrect first-point time")
	}
	if !strings.Contains(body, "2026-05-19T06:31:00Z") {
		t.Error("missing/incorrect last-point time (should be start + 60s)")
	}
	// Confirm well-formed XML.
	var doc gpx
	if err := xml.Unmarshal(out, &doc); err != nil {
		t.Errorf("output isn't well-formed XML: %v", err)
	}
}

func TestBuildGPX_NoLatlng_StillWellFormed(t *testing.T) {
	a := Activity{
		ID:         "treadmill",
		Title:      "Treadmill",
		StartedAt:  time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC),
		ElapsedSec: 3600,
	}
	out, err := BuildGPX(a, StreamSet{})
	if err != nil {
		t.Fatalf("BuildGPX: %v", err)
	}
	var doc gpx
	if err := xml.Unmarshal(out, &doc); err != nil {
		t.Fatalf("treadmill GPX should still parse: %v", err)
	}
	if len(doc.Tracks) != 1 {
		t.Fatalf("want 1 track, got %d", len(doc.Tracks))
	}
	if len(doc.Tracks[0].Segments) != 1 {
		t.Fatalf("want 1 segment, got %d", len(doc.Tracks[0].Segments))
	}
	if len(doc.Tracks[0].Segments[0].Points) != 0 {
		t.Errorf("treadmill GPX should have no points, got %d", len(doc.Tracks[0].Segments[0].Points))
	}
}

func TestBuildGPX_WithHR_EmbedsExtension(t *testing.T) {
	a := Activity{
		Title:      "Tempo",
		StartedAt:  time.Date(2026, 5, 19, 18, 0, 0, 0, time.UTC),
		ElapsedSec: 30,
	}
	s := StreamSet{
		Latlng: [][2]float64{{12.97, 77.59}, {12.97, 77.60}},
		// Same length as latlng, no resample needed.
		Heartrate: &NumericStream{Values: []float64{142, 168}},
	}
	out, err := BuildGPX(a, s)
	if err != nil {
		t.Fatalf("BuildGPX: %v", err)
	}
	body := string(out)
	if !strings.Contains(body, "<gpxtpx:hr>142</gpxtpx:hr>") {
		t.Error("first-point HR missing")
	}
	if !strings.Contains(body, "<gpxtpx:hr>168</gpxtpx:hr>") {
		t.Error("last-point HR missing")
	}
	if !strings.Contains(body, "TrackPointExtension") {
		t.Error("extension wrapper missing")
	}
}

func TestBuildGPX_AltitudeAndCadence(t *testing.T) {
	a := Activity{
		Title:      "Hilly with cadence",
		StartedAt:  time.Date(2026, 5, 19, 6, 0, 0, 0, time.UTC),
		ElapsedSec: 20,
	}
	s := StreamSet{
		Latlng:   [][2]float64{{12.97, 77.59}, {12.98, 77.60}},
		Altitude: &NumericStream{Values: []float64{920.5, 935.2}},
		Cadence:  &NumericStream{Values: []float64{172, 176}},
	}
	out, err := BuildGPX(a, s)
	if err != nil {
		t.Fatalf("BuildGPX: %v", err)
	}
	body := string(out)
	if !strings.Contains(body, "<ele>920.5</ele>") {
		t.Error("missing first-point elevation")
	}
	if !strings.Contains(body, "<gpxtpx:cad>172</gpxtpx:cad>") {
		t.Error("missing cadence extension")
	}
}

func TestParseNumericStream_BothShapes(t *testing.T) {
	// Apple Health shape.
	obj := ParseNumericStream([]byte(`{"tStart":1700000000000,"dtSec":1,"values":[140,141,142]}`))
	if obj == nil || len(obj.Values) != 3 || obj.DtSec != 1 {
		t.Errorf("apple shape parse failed: %+v", obj)
	}
	// Strava shape — flat array.
	arr := ParseNumericStream([]byte(`[140, 141, 142]`))
	if arr == nil || len(arr.Values) != 3 {
		t.Errorf("strava shape parse failed: %+v", arr)
	}
	// Empty / null cases shouldn't panic; should return nil.
	if ParseNumericStream(nil) != nil {
		t.Error("nil should return nil")
	}
	if ParseNumericStream([]byte(`[]`)) != nil {
		t.Error("empty array should return nil")
	}
}

func TestParseLatlngStream(t *testing.T) {
	pts := ParseLatlngStream([]byte(`[[12.97,77.59],[12.98,77.60]]`))
	if len(pts) != 2 || pts[0][0] != 12.97 || pts[1][1] != 77.60 {
		t.Errorf("latlng parse failed: %+v", pts)
	}
	if ParseLatlngStream(nil) != nil {
		t.Error("nil should return nil")
	}
}

func TestSample_LinearResample(t *testing.T) {
	// 10 latlng points, 4 HR samples → midpoint HR should be ~average.
	ns := &NumericStream{Values: []float64{100, 200, 300, 400}}
	got, ok := sample(ns, 5, 10) // point 5 of 10 → t=5/9, j = 5/9 * 3 = 1.667
	if !ok {
		t.Fatal("sample returned !ok")
	}
	// Expected: 200 + 0.667*(300-200) = 266.67
	if got < 266 || got > 267.5 {
		t.Errorf("midpoint resample got %.2f, want ~266.67", got)
	}
}
