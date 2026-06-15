// Buckets GPS route points into a fixed ~Nm grid to estimate "explored area"
// per city. Pure + react-native-free (vitest-testable). Segments are densified
// so the app's downsampled (~500-pt) tracks still produce contiguous coverage.

export interface GridSpec {
  cellMeters: number;
  refLat: number; // city latitude — sets the longitude cell width
}

export interface CellBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface CoverageStats {
  cellCount: number;
  areaKm2: number;
}

const M_PER_DEG_LAT = 111320;

function dLatDeg(cellMeters: number): number {
  return cellMeters / M_PER_DEG_LAT;
}

function dLngDeg(cellMeters: number, refLat: number): number {
  const cos = Math.max(0.01, Math.cos((refLat * Math.PI) / 180));
  return cellMeters / (M_PER_DEG_LAT * cos);
}

export function cellIndex(lat: number, lng: number, spec: GridSpec): { ix: number; iy: number } {
  return {
    ix: Math.floor(lng / dLngDeg(spec.cellMeters, spec.refLat)),
    iy: Math.floor(lat / dLatDeg(spec.cellMeters)),
  };
}

export function cellKey(ix: number, iy: number): string {
  return `${ix}:${iy}`;
}

export function cellBounds(ix: number, iy: number, spec: GridSpec): CellBounds {
  const dLat = dLatDeg(spec.cellMeters);
  const dLng = dLngDeg(spec.cellMeters, spec.refLat);
  return {
    minLng: ix * dLng,
    maxLng: (ix + 1) * dLng,
    minLat: iy * dLat,
    maxLat: (iy + 1) * dLat,
  };
}

type LL = readonly [number, number];

function add(cells: Set<string>, lat: number, lng: number, spec: GridSpec): void {
  const { ix, iy } = cellIndex(lat, lng, spec);
  cells.add(cellKey(ix, iy));
}

/** Marks every cell touched by each polyline, densifying segments to half a cell. */
export function coverCells(routes: ReadonlyArray<ReadonlyArray<LL>>, spec: GridSpec): Set<string> {
  const cells = new Set<string>();
  const stepDeg = dLatDeg(spec.cellMeters) / 2;
  for (const route of routes) {
    for (let i = 0; i < route.length; i++) {
      const [lat, lng] = route[i];
      add(cells, lat, lng, spec);
      if (i > 0) {
        const [pLat, pLng] = route[i - 1];
        const dLat = lat - pLat;
        const dLng = lng - pLng;
        const steps = Math.ceil(Math.max(Math.abs(dLat), Math.abs(dLng)) / stepDeg);
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          add(cells, pLat + dLat * t, pLng + dLng * t, spec);
        }
      }
    }
  }
  return cells;
}

export function coverageStats(cells: ReadonlySet<string>, spec: GridSpec): CoverageStats {
  const cellAreaKm2 = (spec.cellMeters * spec.cellMeters) / 1e6;
  return { cellCount: cells.size, areaKm2: cells.size * cellAreaKm2 };
}
