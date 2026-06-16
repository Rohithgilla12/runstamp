package coverage

import (
	"context"
	"encoding/json"
	"fmt"
)

type CityCoverage struct {
	City          string         `json:"city"`
	Pct           float64        `json:"pct"`
	CoveredKm     float64        `json:"coveredKm"`
	HullKm        float64        `json:"hullKm"`
	UniqueStreets int            `json:"uniqueStreets"`
	Covered       [][][2]float64 `json:"covered"`
	Uncovered     [][][2]float64 `json:"uncovered"`
}

type geoLine struct {
	Type        string       `json:"type"`
	Coordinates [][2]float64 `json:"coordinates"` // GeoJSON [lng,lat]
}

// CityCoverage builds the concave hull of the user's covered streets in a city,
// then covered-vs-in-hull length (%) + simplified polylines ([lat,lng]).
func (r *Repo) CityCoverage(ctx context.Context, userID, city string) (*CityCoverage, error) {
	out := &CityCoverage{City: city, Covered: [][][2]float64{}, Uncovered: [][][2]float64{}}

	rows, err := r.pool.Query(ctx, `
WITH covered AS (
  SELECT DISTINCT w.way_id, w.geom, w.length_m, w.name
  FROM activity_covered_ways acw
  JOIN activities a ON a.id = acw.activity_id
  JOIN osm_ways  w ON w.way_id = acw.way_id
  WHERE a.user_id = $1 AND a.location_city = $2 AND a.dupe_of IS NULL
),
hull AS (
  SELECT COALESCE(
    ST_ConcaveHull(ST_Collect(geom::geometry), 0.9),
    ST_ConvexHull(ST_Collect(geom::geometry))
  ) AS g FROM covered
),
in_hull AS (
  SELECT w.way_id, w.geom, w.length_m, w.name,
         EXISTS (SELECT 1 FROM covered c WHERE c.way_id = w.way_id) AS is_covered
  FROM osm_ways w, hull h
  WHERE h.g IS NOT NULL AND ST_Intersects(w.geom, h.g::geography)
)
SELECT is_covered, length_m, name,
       ST_AsGeoJSON(ST_Simplify(geom::geometry, 0.00005)) AS gj
FROM in_hull`, userID, city)
	if err != nil {
		return nil, fmt.Errorf("coverage: city query: %w", err)
	}
	defer rows.Close()

	coveredNames := map[string]bool{}
	for rows.Next() {
		var isCovered bool
		var lengthM float64
		var name *string
		var gj string
		if err := rows.Scan(&isCovered, &lengthM, &name, &gj); err != nil {
			return nil, fmt.Errorf("coverage: scan: %w", err)
		}
		var line geoLine
		if err := json.Unmarshal([]byte(gj), &line); err != nil {
			return nil, fmt.Errorf("coverage: decode geojson: %w", err)
		}
		if len(line.Coordinates) < 2 {
			continue
		}
		poly := make([][2]float64, len(line.Coordinates))
		for i, c := range line.Coordinates {
			poly[i] = [2]float64{c[1], c[0]} // [lng,lat] -> [lat,lng]
		}
		out.HullKm += lengthM / 1000
		if isCovered {
			out.CoveredKm += lengthM / 1000
			out.Covered = append(out.Covered, poly)
			if name != nil && *name != "" {
				coveredNames[*name] = true
			}
		} else {
			out.Uncovered = append(out.Uncovered, poly)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("coverage: rows: %w", err)
	}
	out.UniqueStreets = len(coveredNames)
	if out.HullKm > 0 {
		out.Pct = out.CoveredKm / out.HullKm
	}
	return out, nil
}
