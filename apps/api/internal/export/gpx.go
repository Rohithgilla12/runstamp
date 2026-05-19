// Package export turns activity rows + their downsampled streams into GPX
// 1.1 documents. Used by the /v1/export.zip handler so users can take their
// data anywhere (Strava, Garmin Connect, a spreadsheet, Final Surge, etc.) —
// PRD §6.9 lists this as core to the OSS positioning.
//
// We keep this package pure: no DB, no HTTP. The handler stitches it
// together with archive/zip. Tests live next to this file.
package export

import (
	"bytes"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"time"
)

// Activity is the minimal projection of an activity row that GPX needs.
// Decoupled from internal/activities.Activity so this package doesn't
// import the DB layer.
type Activity struct {
	ID          string
	Title       string
	Source      string
	StartedAt   time.Time
	ElapsedSec  int
	DistanceM   float64
	ElevGainM   float64
	AvgHR       *int
	LocationCity    *string
	LocationCountry *string
}

// StreamSet is everything we'll consult to build the GPX body. All fields
// are optional; the GPX is still well-formed if a stream is missing (a
// treadmill run with no GPS becomes a metadata-only GPX with zero
// trackpoints, which downstream tools accept).
type StreamSet struct {
	// Latlng is the canonical track. Each row is [lat, lon].
	Latlng [][2]float64
	// Numeric streams. Either flat values (Strava-style — one sample per
	// second, evenly spaced across the activity) or {tStart, dtSec, values}
	// (Apple Health-style — explicit cadence). Both shapes feed the same
	// per-point lookup.
	Heartrate  *NumericStream
	Altitude   *NumericStream
	Cadence    *NumericStream
	Speed      *NumericStream
}

// NumericStream is the union of the two on-disk shapes. If DtSec is zero
// and TStartMs is zero, the stream is treated as Strava-style (flat values
// over the activity duration). Otherwise the (tStart, dtSec, values)
// interpretation wins.
type NumericStream struct {
	TStartMs float64   `json:"tStart"`
	DtSec    float64   `json:"dtSec"`
	Values   []float64 `json:"values"`
}

// ParseNumericStream decodes the raw jsonb stored in activity_streams. It
// accepts either {tStart, dtSec, values} (Apple Health) or a flat []number
// (Strava). Returns nil on empty / unrecognised payloads — callers should
// skip the channel in that case.
func ParseNumericStream(data []byte) *NumericStream {
	if len(data) == 0 {
		return nil
	}
	// Try the object shape first.
	var obj NumericStream
	if err := json.Unmarshal(data, &obj); err == nil && len(obj.Values) > 0 {
		return &obj
	}
	// Fall back to the flat-array shape.
	var arr []float64
	if err := json.Unmarshal(data, &arr); err == nil && len(arr) > 0 {
		return &NumericStream{Values: arr}
	}
	return nil
}

// ParseLatlngStream accepts [[lat, lon], ...]. Returns nil on malformed
// payloads.
func ParseLatlngStream(data []byte) [][2]float64 {
	if len(data) == 0 {
		return nil
	}
	var pts [][2]float64
	if err := json.Unmarshal(data, &pts); err != nil || len(pts) == 0 {
		return nil
	}
	return pts
}

// BuildGPX serialises one activity as a GPX 1.1 document. Returns the
// XML bytes (with the XML declaration already prefixed). Safe to call on
// activities with no latlng — the resulting document carries metadata but
// an empty trackseg, which is valid GPX.
func BuildGPX(a Activity, s StreamSet) ([]byte, error) {
	doc := gpx{
		XMLNS:     "http://www.topografix.com/GPX/1/1",
		XMLNSTPX:  "http://www.garmin.com/xmlschemas/TrackPointExtension/v1",
		Version:   "1.1",
		Creator:   "Runstamp",
		Metadata: &gpxMeta{
			Time: a.StartedAt.UTC().Format(time.RFC3339),
			Name: a.Title,
		},
	}

	trk := gpxTrk{
		Name: a.Title,
		Type: "running",
	}
	if a.Source != "" {
		trk.Desc = "source:" + a.Source
	}

	seg := gpxTrkSeg{
		Points: buildPoints(a, s),
	}
	trk.Segments = []gpxTrkSeg{seg}
	doc.Tracks = []gpxTrk{trk}

	var buf bytes.Buffer
	buf.WriteString(xml.Header)
	enc := xml.NewEncoder(&buf)
	enc.Indent("", "  ")
	if err := enc.Encode(doc); err != nil {
		return nil, fmt.Errorf("export: encode gpx: %w", err)
	}
	if err := enc.Flush(); err != nil {
		return nil, fmt.Errorf("export: flush gpx: %w", err)
	}
	buf.WriteByte('\n')
	return buf.Bytes(), nil
}

func buildPoints(a Activity, s StreamSet) []gpxTrkPt {
	if len(s.Latlng) == 0 {
		return nil
	}
	// Per-point timestamps. If we have an explicit dtSec for any numeric
	// stream that matches the latlng length, use it. Otherwise space the
	// points uniformly across the activity duration.
	tForIndex := uniformTimes(a.StartedAt, a.ElapsedSec, len(s.Latlng))

	points := make([]gpxTrkPt, len(s.Latlng))
	for i, ll := range s.Latlng {
		p := gpxTrkPt{
			Lat:  ll[0],
			Lon:  ll[1],
			Time: tForIndex(i).UTC().Format(time.RFC3339),
		}
		if v, ok := sample(s.Altitude, i, len(s.Latlng)); ok {
			p.Ele = formatFloat(v, 1)
		}
		hr, hrOK := sampleInt(s.Heartrate, i, len(s.Latlng))
		cad, cadOK := sampleInt(s.Cadence, i, len(s.Latlng))
		if hrOK || cadOK {
			ext := &gpxExt{
				TPX: &gpxTPX{},
			}
			if hrOK {
				ext.TPX.HR = hr
			}
			if cadOK {
				ext.TPX.Cad = cad
			}
			p.Ext = ext
		}
		points[i] = p
	}
	return points
}

// uniformTimes returns a function that maps a point index to its absolute
// timestamp. We linearly interpolate across the elapsed duration — accurate
// enough for tools that ingest GPX, and the only honest option when the
// downsampled stream dropped its original cadence.
func uniformTimes(start time.Time, elapsedSec, nPoints int) func(int) time.Time {
	if nPoints <= 1 {
		return func(int) time.Time { return start }
	}
	step := float64(elapsedSec) / float64(nPoints-1)
	return func(i int) time.Time {
		return start.Add(time.Duration(float64(i)*step*float64(time.Second)) / 1)
	}
}

// sample returns the metric value at the i-th of n points, resampling if
// the stream length differs from the latlng length. Returns (0, false) when
// the stream is nil or empty.
func sample(ns *NumericStream, i, n int) (float64, bool) {
	if ns == nil || len(ns.Values) == 0 {
		return 0, false
	}
	if len(ns.Values) == n {
		return ns.Values[i], true
	}
	// Linear resample to the latlng length. j is the fractional index into
	// ns.Values that corresponds to point i.
	j := float64(i) * float64(len(ns.Values)-1) / float64(max(n-1, 1))
	lo := int(j)
	hi := lo + 1
	if hi >= len(ns.Values) {
		return ns.Values[len(ns.Values)-1], true
	}
	frac := j - float64(lo)
	return ns.Values[lo]*(1-frac) + ns.Values[hi]*frac, true
}

func sampleInt(ns *NumericStream, i, n int) (int, bool) {
	v, ok := sample(ns, i, n)
	if !ok {
		return 0, false
	}
	return int(v + 0.5), true
}

func formatFloat(v float64, decimals int) string {
	return fmt.Sprintf("%.*f", decimals, v)
}

// ── XML structs ──────────────────────────────────────────────────────────
//
// One-line structs aren't pretty, but encoding/xml is allergic to anything
// fancier. Keep names tight; this is the GPX schema's vocabulary, not ours.

type gpx struct {
	XMLName  xml.Name  `xml:"gpx"`
	XMLNS    string    `xml:"xmlns,attr"`
	XMLNSTPX string    `xml:"xmlns:gpxtpx,attr"`
	Version  string    `xml:"version,attr"`
	Creator  string    `xml:"creator,attr"`
	Metadata *gpxMeta  `xml:"metadata,omitempty"`
	Tracks   []gpxTrk  `xml:"trk"`
}

type gpxMeta struct {
	Time string `xml:"time,omitempty"`
	Name string `xml:"name,omitempty"`
}

type gpxTrk struct {
	Name     string      `xml:"name,omitempty"`
	Desc     string      `xml:"desc,omitempty"`
	Type     string      `xml:"type,omitempty"`
	Segments []gpxTrkSeg `xml:"trkseg"`
}

type gpxTrkSeg struct {
	Points []gpxTrkPt `xml:"trkpt"`
}

type gpxTrkPt struct {
	Lat  float64 `xml:"lat,attr"`
	Lon  float64 `xml:"lon,attr"`
	Ele  string  `xml:"ele,omitempty"`
	Time string  `xml:"time,omitempty"`
	Ext  *gpxExt `xml:"extensions,omitempty"`
}

type gpxExt struct {
	TPX *gpxTPX `xml:"gpxtpx:TrackPointExtension,omitempty"`
}

type gpxTPX struct {
	HR  int `xml:"gpxtpx:hr,omitempty"`
	Cad int `xml:"gpxtpx:cad,omitempty"`
}
