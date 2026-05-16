export interface HistogramBin { label: string; min: number; max: number }

export const HISTOGRAM_BINS: HistogramBin[] = [
  { label: '0–3',  min: 0,  max: 3 },
  { label: '3–7',  min: 3,  max: 7 },
  { label: '7–12', min: 7,  max: 12 },
  { label: '12–18', min: 12, max: 18 },
  { label: '18–30', min: 18, max: 30 },
  { label: '30+',  min: 30, max: Infinity },
];

export interface HistogramCell extends HistogramBin { count: number }

export function distanceHistogram(rows: readonly { distance: number }[]): HistogramCell[] {
  const cells: HistogramCell[] = HISTOGRAM_BINS.map((b) => ({ ...b, count: 0 }));
  for (const r of rows) {
    if (r.distance <= 0) continue;
    for (let i = 0; i < cells.length; i++) {
      if (r.distance >= cells[i].min && r.distance < cells[i].max) {
        cells[i].count += 1;
        break;
      }
    }
  }
  return cells;
}
