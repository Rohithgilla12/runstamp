// pbf.go reads runnable ways from a Geofabrik .osm.pbf extract. It replaces
// the Overpass fetch path on hosts that can't reach public Overpass mirrors.
//
// A .pbf stores way geometry as node ID references, so we scan the file
// twice: pass 1 collects runnable ways + the node IDs they reference,
// pass 2 collects coordinates for just those nodes. Assembly and filtering
// are pure functions so they're unit-tested without pbf fixtures.
package osm

import (
	"context"
	"fmt"
	"os"
	"runtime"

	"github.com/paulmach/osm"
	"github.com/paulmach/osm/osmpbf"
)

// rawWay is a way as read from the pbf: tags + node refs, no coordinates yet.
type rawWay struct {
	ID       int64
	Highway  string
	Name     string
	NodeRefs []int64
}

// ParsePBFFile extracts runnable ways from a .osm.pbf file. When filter is
// non-nil, only ways with at least one point inside the bbox are returned.
func ParsePBFFile(ctx context.Context, path string, filter *BBox) ([]Way, error) {
	ways, needed, err := scanWays(ctx, path)
	if err != nil {
		return nil, err
	}
	coords, err := scanNodes(ctx, path, needed)
	if err != nil {
		return nil, err
	}
	return assembleWays(ways, coords, filter), nil
}

func scanWays(ctx context.Context, path string) ([]rawWay, map[int64]struct{}, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, nil, fmt.Errorf("osm: open pbf: %w", err)
	}
	defer f.Close()

	sc := osmpbf.New(ctx, f, runtime.NumCPU())
	defer sc.Close()
	sc.SkipNodes = true
	sc.SkipRelations = true

	var ways []rawWay
	needed := make(map[int64]struct{})
	for sc.Scan() {
		w, ok := sc.Object().(*osm.Way)
		if !ok {
			continue
		}
		highway := w.Tags.Find("highway")
		if !isRunnable(highway) || len(w.Nodes) < 2 {
			continue
		}
		refs := make([]int64, len(w.Nodes))
		for i, n := range w.Nodes {
			refs[i] = int64(n.ID)
			needed[int64(n.ID)] = struct{}{}
		}
		ways = append(ways, rawWay{
			ID: int64(w.ID), Highway: highway, Name: w.Tags.Find("name"), NodeRefs: refs,
		})
	}
	if err := sc.Err(); err != nil {
		return nil, nil, fmt.Errorf("osm: scan ways: %w", err)
	}
	return ways, needed, nil
}

func scanNodes(ctx context.Context, path string, needed map[int64]struct{}) (map[int64][2]float64, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("osm: open pbf: %w", err)
	}
	defer f.Close()

	sc := osmpbf.New(ctx, f, runtime.NumCPU())
	defer sc.Close()
	sc.SkipWays = true
	sc.SkipRelations = true

	coords := make(map[int64][2]float64, len(needed))
	for sc.Scan() {
		n, ok := sc.Object().(*osm.Node)
		if !ok {
			continue
		}
		if _, want := needed[int64(n.ID)]; !want {
			continue
		}
		coords[int64(n.ID)] = [2]float64{n.Lat, n.Lon}
	}
	if err := sc.Err(); err != nil {
		return nil, fmt.Errorf("osm: scan nodes: %w", err)
	}
	return coords, nil
}

// assembleWays joins node coordinates onto ways, computes lengths, and
// applies the optional bbox filter. Ways with unresolved node refs keep the
// points that did resolve; ways left with <2 points are dropped.
func assembleWays(raw []rawWay, coords map[int64][2]float64, filter *BBox) []Way {
	out := make([]Way, 0, len(raw))
	for _, rw := range raw {
		geom := make([][2]float64, 0, len(rw.NodeRefs))
		for _, ref := range rw.NodeRefs {
			if c, ok := coords[ref]; ok {
				geom = append(geom, c)
			}
		}
		if len(geom) < 2 {
			continue
		}
		if filter != nil && !anyPointIn(geom, *filter) {
			continue
		}
		var length float64
		for i := 1; i < len(geom); i++ {
			length += wayHaversineM(geom[i-1][0], geom[i-1][1], geom[i][0], geom[i][1])
		}
		out = append(out, Way{
			WayID: rw.ID, Highway: rw.Highway, Name: rw.Name,
			Geometry: geom, LengthM: length,
		})
	}
	return out
}

func anyPointIn(geom [][2]float64, b BBox) bool {
	for _, p := range geom {
		if p[0] >= b.MinLat && p[0] <= b.MaxLat && p[1] >= b.MinLng && p[1] <= b.MaxLng {
			return true
		}
	}
	return false
}

// GeomBBox returns the bounding box of all points across the given ways.
// ok is false when there are no points.
func GeomBBox(ways []Way) (BBox, bool) {
	var b BBox
	found := false
	for _, w := range ways {
		for _, p := range w.Geometry {
			if !found {
				b = BBox{MinLat: p[0], MinLng: p[1], MaxLat: p[0], MaxLng: p[1]}
				found = true
				continue
			}
			if p[0] < b.MinLat {
				b.MinLat = p[0]
			}
			if p[0] > b.MaxLat {
				b.MaxLat = p[0]
			}
			if p[1] < b.MinLng {
				b.MinLng = p[1]
			}
			if p[1] > b.MaxLng {
				b.MaxLng = p[1]
			}
		}
	}
	return b, found
}
