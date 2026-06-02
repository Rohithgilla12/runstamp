export interface DistanceTimeSeries {
  distanceM: number[];
  timeSec: number[];
}

interface RoutePoint {
  latitude: number;
  longitude: number;
  date: Date;
}

const EARTH_RADIUS_M = 6371000;

function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad;
  const dLng = (bLng - aLng) * toRad;
  const lat1 = aLat * toRad;
  const lat2 = bLat * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Build aligned cumulative-distance (m) + elapsed-time (s) arrays from GPS
// route points (assumed sorted by date). Distance is monotonic non-decreasing.
// Returns null when there's no usable movement. Downsamples to <= maxPoints,
// always keeping the final point so totals are preserved.
export function deriveDistanceTime(
  points: ReadonlyArray<RoutePoint>,
  maxPoints = 500,
): DistanceTimeSeries | null {
  if (points.length < 2) return null;
  const t0 = points[0].date.getTime();
  const distanceM: number[] = [0];
  const timeSec: number[] = [0];
  let cum = 0;
  for (let i = 1; i < points.length; i++) {
    const step = haversineM(
      points[i - 1].latitude,
      points[i - 1].longitude,
      points[i].latitude,
      points[i].longitude,
    );
    if (step > 0) cum += step;
    distanceM.push(cum);
    timeSec.push((points[i].date.getTime() - t0) / 1000);
  }
  if (cum <= 0) return null;
  return downsample({ distanceM, timeSec }, maxPoints);
}

function downsample(s: DistanceTimeSeries, maxPoints: number): DistanceTimeSeries {
  const n = s.distanceM.length;
  if (n <= maxPoints) return s;
  const stride = Math.ceil(n / maxPoints);
  const distanceM: number[] = [];
  const timeSec: number[] = [];
  for (let i = 0; i < n; i += stride) {
    distanceM.push(s.distanceM[i]);
    timeSec.push(s.timeSec[i]);
  }
  if (distanceM[distanceM.length - 1] !== s.distanceM[n - 1]) {
    distanceM.push(s.distanceM[n - 1]);
    timeSec.push(s.timeSec[n - 1]);
  }
  return { distanceM, timeSec };
}
