// World map — halftone dot grid where each dot's opacity is determined by
// whether that grid coordinate falls on a landmass. Continent outlines are
// drawn as restrained strokes to anchor the eye. The city pins are the
// actual focus; lat/lon → x/y uses a clamped equirectangular projection.

import { colors, fonts } from "../theme";

interface Props {
  width: number;
  height: number;
  revealedCount: number;
  labelOpacity: (i: number) => number;
  ringScale: (i: number) => number;
}

// Coarse landmass bounding boxes [lonMin, lonMax, latMin, latMax]. A grid
// point is "land" if it falls inside one of these AND passes the per-region
// shape check.
const LAND_REGIONS: { name: string; box: [number, number, number, number]; mask?: (lon: number, lat: number) => boolean }[] = [
  // North America (incl. Central America)
  {
    name: "NA",
    box: [-168, -50, 8, 72],
    mask: (lon, lat) =>
      // West coast slants in
      (lat >= 30 && lon >= -130 + (72 - lat) * 0.5 && lon <= -55 - Math.max(0, lat - 50) * 0.4) ||
      // Mexico / Central America
      (lat >= 8 && lat < 30 && lon >= -110 + (30 - lat) * 0.8 && lon <= -80 + (30 - lat) * 0.3),
  },
  // South America — narrows southward
  {
    name: "SA",
    box: [-82, -34, -55, 12],
    mask: (lon, lat) => {
      const t = (12 - lat) / 67; // 0 at top, 1 at bottom
      const xCenter = -65 + t * 7;
      const halfWidth = 18 - t * 12;
      return lon >= xCenter - halfWidth && lon <= xCenter + halfWidth;
    },
  },
  // Europe
  {
    name: "EU",
    box: [-10, 50, 36, 70],
    mask: (lon, lat) => {
      if (lat < 50 && lon < -5) return false;
      return true;
    },
  },
  // Africa
  {
    name: "AF",
    box: [-18, 51, -34, 36],
    mask: (lon, lat) => {
      if (lat > 5 && lon > 30) return lat < 18; // Horn area
      const t = (36 - lat) / 70;
      const halfWidth = 25 - Math.abs(t - 0.45) * 22;
      const xCenter = 18 + t * 6;
      return lon >= xCenter - halfWidth && lon <= xCenter + halfWidth;
    },
  },
  // Asia (incl. Middle East, India, SE Asia)
  {
    name: "AS",
    box: [25, 145, 0, 75],
    mask: (lon, lat) => {
      if (lon < 60 && lat < 25) return false; // Arabian Sea / Indian Ocean
      if (lon < 70 && lat < 12) return false;
      if (lon > 100 && lat < 5) return lon < 120; // SE Asia stub
      return true;
    },
  },
  // Australia
  {
    name: "OC",
    box: [112, 154, -40, -10],
    mask: () => true,
  },
];

function isLand(lon: number, lat: number): boolean {
  for (const r of LAND_REGIONS) {
    const [lonMin, lonMax, latMin, latMax] = r.box;
    if (lon >= lonMin && lon <= lonMax && lat >= latMin && lat <= latMax) {
      if (!r.mask || r.mask(lon, lat)) return true;
    }
  }
  return false;
}

const cities: { name: string; lon: number; lat: number }[] = [
  { name: "Tokyo",     lon: 139.69, lat: 35.69 },
  { name: "London",    lon:  -0.13, lat: 51.51 },
  { name: "Reykjavík", lon: -21.94, lat: 64.15 },
  { name: "Hyderabad", lon:  78.49, lat: 17.39 },
  { name: "Lisbon",    lon:  -9.14, lat: 38.72 },
  { name: "Berlin",    lon:  13.41, lat: 52.52 },
  { name: "New York",  lon: -74.01, lat: 40.71 },
  { name: "Mumbai",    lon:  72.88, lat: 19.08 },
  { name: "Boston",    lon: -71.06, lat: 42.36 },
];

// Equirectangular projection: lon -180..180 → 0..W, lat 75..-55 → 0..H
const LAT_MAX = 72;
const LAT_MIN = -52;

function projectLon(lon: number, w: number): number {
  return ((lon + 180) / 360) * w;
}
function projectLat(lat: number, h: number): number {
  return ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * h;
}

export const WorldMap: React.FC<Props> = ({ width, height, revealedCount, labelOpacity, ringScale }) => {
  // Dot grid — every N degrees of lon/lat.
  const STEP_LON = 5;
  const STEP_LAT = 4;
  const dots: React.ReactElement[] = [];
  for (let lat = LAT_MAX; lat >= LAT_MIN; lat -= STEP_LAT) {
    for (let lon = -180; lon <= 180; lon += STEP_LON) {
      const land = isLand(lon, lat);
      const x = projectLon(lon, width);
      const y = projectLat(lat, height);
      const r = land ? 2.6 : 1.2;
      const opacity = land ? 0.36 : 0.10;
      dots.push(
        <circle key={`${lat}-${lon}`} cx={x} cy={y} r={r} fill={colors.ink} opacity={opacity} />
      );
    }
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <rect width={width} height={height} fill={colors.paper2} rx={6} />
      {dots}

      {/* City pins */}
      {cities.map((c, i) => {
        const cx = projectLon(c.lon, width);
        const cy = projectLat(c.lat, height);
        const visible = i < revealedCount;
        if (!visible) return null;
        return (
          <g key={c.name}>
            <circle cx={cx} cy={cy} r={ringScale(i) * 20} fill="none" stroke={colors.accent} strokeWidth={1.4} opacity={Math.max(0, 1 - ringScale(i) / 3)} />
            <circle cx={cx} cy={cy} r={7} fill={colors.accent} />
            <circle cx={cx} cy={cy} r={7} fill="none" stroke={colors.paper} strokeWidth={1.4} />
            <text
              x={cx + 14}
              y={cy + 5}
              fontFamily={fonts.serifItalic}
              fontSize={20}
              fill={colors.ink}
              opacity={labelOpacity(i)}
            >
              {c.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
