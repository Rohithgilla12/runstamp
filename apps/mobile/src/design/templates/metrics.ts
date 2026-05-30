import type { Activity } from '../../data/models';
import type { Units } from '../theme';
import { fmtPace } from '../../lib/format';

export interface RichMetric {
  key: string;
  label: string;
  value: string;
}

// Optional, data-aware metrics a template can surface beyond the core
// distance/pace/time/HR — only the ones actually present on the run, in
// interest order. A template shows the top N it has room for; an indoor or
// unimported run that lacks them simply shows fewer, never an empty slot.
export function richMetrics(run: Activity, units: Units = 'km'): RichMetric[] {
  const out: RichMetric[] = [];
  if (run.gapPace && run.gapPace > 0) out.push({ key: 'gap', label: 'GAP', value: fmtPace(run.gapPace, units) });
  if (run.cadence && run.cadence > 0) out.push({ key: 'cadence', label: 'CADENCE', value: `${run.cadence}` });
  if (run.vo2max && run.vo2max > 0) out.push({ key: 'vo2', label: 'VO₂', value: `${run.vo2max}` });
  if (run.elev > 0) out.push({ key: 'elev', label: 'ELEV', value: `${run.elev} m` });
  if (run.power && run.power > 0) out.push({ key: 'power', label: 'POWER', value: `${run.power} W` });
  if (run.avgHr > 0) out.push({ key: 'hr', label: 'AVG HR', value: `${run.avgHr}` });
  if (run.cal > 0) out.push({ key: 'cal', label: 'CAL', value: `${run.cal}` });
  return out;
}
