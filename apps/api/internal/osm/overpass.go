// Package osm imports a runnable OSM street network into PostGIS for a bbox.
// overpass.go holds the pure query builder + response parser (no HTTP/DB),
// so they're unit-tested.
package osm

import (
	"encoding/json"
	"fmt"
	"math"
)

// BBox is a lat/lng bounding box.
type BBox struct {
	MinLat, MinLng, MaxLat, MaxLng float64
}

// Way is a runnable OSM way with its polyline + length.
type Way struct {
	WayID    int64
	Highway  string
	Name     string
	Geometry [][2]float64 // [lat, lng] pairs
	LengthM  float64
}

// runnable highway types — what a runner can actually run on. Motorways/trunks
// (and their links) are excluded; primary/secondary arterials are included
// (commonly run, esp. in dense city grids).
var runnable = map[string]bool{
	"primary": true, "primary_link": true,
	"residential": true, "living_street": true, "tertiary": true, "tertiary_link": true,
	"secondary": true, "secondary_link": true, "unclassified": true, "service": true,
	"footway": true, "path": true, "pedestrian": true, "track": true, "steps": true,
	"road": true, "cycleway": true,
}

func isRunnable(h string) bool { return runnable[h] }

// BuildQuery returns an Overpass QL query for runnable ways in the bbox,
// returning full geometry.
func BuildQuery(b BBox) string {
	bbox := fmt.Sprintf("%.7f,%.7f,%.7f,%.7f", b.MinLat, b.MinLng, b.MaxLat, b.MaxLng)
	return fmt.Sprintf(`[out:json][timeout:60];way["highway"](%s);out geom;`, bbox)
}

type overpassResp struct {
	Elements []struct {
		Type     string            `json:"type"`
		ID       int64             `json:"id"`
		Tags     map[string]string `json:"tags"`
		Geometry []struct {
			Lat float64 `json:"lat"`
			Lon float64 `json:"lon"`
		} `json:"geometry"`
	} `json:"elements"`
}

// ParseWays decodes an Overpass JSON body into runnable ways (>=2 points),
// computing each way's length via haversine.
func ParseWays(body []byte) ([]Way, error) {
	var r overpassResp
	if err := json.Unmarshal(body, &r); err != nil {
		return nil, fmt.Errorf("osm: decode overpass: %w", err)
	}
	out := make([]Way, 0, len(r.Elements))
	for _, e := range r.Elements {
		if e.Type != "way" || !isRunnable(e.Tags["highway"]) || len(e.Geometry) < 2 {
			continue
		}
		geom := make([][2]float64, len(e.Geometry))
		var length float64
		for i, g := range e.Geometry {
			geom[i] = [2]float64{g.Lat, g.Lon}
			if i > 0 {
				length += wayHaversineM(e.Geometry[i-1].Lat, e.Geometry[i-1].Lon, g.Lat, g.Lon)
			}
		}
		out = append(out, Way{
			WayID: e.ID, Highway: e.Tags["highway"], Name: e.Tags["name"],
			Geometry: geom, LengthM: length,
		})
	}
	return out, nil
}

func wayHaversineM(aLat, aLng, bLat, bLng float64) float64 {
	const R = 6371000.0
	la1 := aLat * math.Pi / 180
	la2 := bLat * math.Pi / 180
	dLat := (bLat - aLat) * math.Pi / 180
	dLng := (bLng - aLng) * math.Pi / 180
	h := math.Sin(dLat/2)*math.Sin(dLat/2) + math.Cos(la1)*math.Cos(la2)*math.Sin(dLng/2)*math.Sin(dLng/2)
	return 2 * R * math.Asin(math.Min(1, math.Sqrt(h)))
}
