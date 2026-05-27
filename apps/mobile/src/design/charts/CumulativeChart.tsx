import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import type { MonthlyPoint } from '../../analytics/cumulative';
import { useColors } from '../theme';
import { TText } from '../typography';
import { ChartTooltip } from './ChartTooltip';
import { LegendChip, LegendRow } from './ChartLegend';
import { pathDrawOffset } from './reveal';

interface Props {
  series: MonthlyPoint[];
  compare?: MonthlyPoint[];
  /** 0..1 reveal progress. Undefined = static. */
  progress?: number;
}

const W = 320;
const H = 150;
const PAD = 14;

export function CumulativeChart({ series, compare, progress }: Props) {
  const c = useColors();
  const revealing = progress !== undefined;

  if (series.length === 0) {
    return (
      <View style={{ height: H, alignItems: 'center', justifyContent: 'center' }}>
        <TText style={{ fontSize: 12, color: c.ink3 }}>No runs yet.</TText>
      </View>
    );
  }

  const all = compare ? [...series, ...compare] : series;
  const max = Math.max(1, ...all.map((p) => p.cumulativeKm));
  const n = Math.max(series.length, compare?.length ?? 0);
  const step = n === 1 ? 0 : (W - PAD * 2) / (n - 1);
  const y = (v: number) => PAD + (H - PAD * 2) - (v / max) * (H - PAD * 2);

  const buildPath = (pts: MonthlyPoint[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${(PAD + i * step).toFixed(1)} ${y(p.cumulativeKm).toFixed(1)}`).join(' ');

  const da = buildPath(series);
  const db = compare ? buildPath(compare) : null;
  const last = series[series.length - 1]!;
  const first = series[0]!;

  // Polyline length for the stroke-dash trick. Summed per-segment so reveal
  // pace matches the visual path length (a chart that climbs steeply has a
  // longer geometric path; this draws it proportionally).
  let pathLen = 0;
  for (let i = 1; i < series.length; i++) {
    const dx = step;
    const dy = y(series[i].cumulativeKm) - y(series[i - 1].cumulativeKm);
    pathLen += Math.sqrt(dx * dx + dy * dy);
  }
  const dashOffset = revealing ? pathDrawOffset(pathLen, progress) : 0;
  // The current head of the line during reveal — used to clip the area
  // fill and pin the dot so they don't overshoot the drawn line.
  const drawnTip = revealing ? Math.max(0, Math.min(series.length - 1, progress * (series.length - 1))) : series.length - 1;
  const tipIdx = Math.floor(drawnTip);
  const tipFrac = drawnTip - tipIdx;
  const tipX = PAD + (tipIdx + tipFrac) * step;
  const tipY = tipIdx + 1 < series.length
    ? y(series[tipIdx].cumulativeKm) + tipFrac * (y(series[tipIdx + 1].cumulativeKm) - y(series[tipIdx].cumulativeKm))
    : y(series[tipIdx].cumulativeKm);
  // Area-fill path clipped to the current tip. When not revealing, this
  // matches the original full-area shape.
  const areaPath = revealing
    ? buildPath(series.slice(0, tipIdx + 1)) +
      (tipIdx + 1 < series.length ? ` L${tipX.toFixed(1)} ${tipY.toFixed(1)}` : '') +
      ` L${tipX.toFixed(1)} ${H - PAD} L${PAD} ${H - PAD}Z`
    : `${da} L${PAD + (series.length - 1) * step} ${H - PAD} L${PAD} ${H - PAD}Z`;

  return (
    <View>
      {/* Legend — only when comparing, since otherwise a single accent line
          doesn't need labelling. Solid solar bullet for the primary period;
          dashed ink2 mark for the compare period, matching the chart strokes. */}
      {compare && (
        <LegendRow>
          <LegendChip color={c.accent} label="This period" />
          <LegendChip color={c.ink2} label="vs compare" dashed />
        </LegendRow>
      )}
      <View style={{ width: W, height: H }}>
        <Svg width={W} height={H}>
          {[0.25, 0.5, 0.75].map((p, i) => (
            <Line key={i} x1={PAD} y1={PAD + (H - PAD * 2) * p} x2={W - PAD} y2={PAD + (H - PAD * 2) * p} stroke={c.line2} />
          ))}
          {compare && db ? <Path d={db} fill="none" stroke={c.ink2} strokeWidth={1.5} strokeDasharray="3 3" /> : null}
          <Path d={areaPath} fill={c.accent} opacity={0.1} />
          <Path
            d={da}
            fill="none"
            stroke={c.accent}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={revealing ? `${pathLen} ${pathLen}` : undefined}
            strokeDashoffset={revealing ? dashOffset : undefined}
          />
          <Circle cx={revealing ? tipX : PAD + (series.length - 1) * step} cy={revealing ? tipY : y(last.cumulativeKm)} r={4} fill={c.accent} opacity={revealing && progress < 0.05 ? 0 : 1} />
        </Svg>
        <ChartTooltip
          series={series}
          left={PAD}
          right={W - PAD}
          width={W}
          height={H}
          dotColor={c.accent}
          pointY={(p) => y(p.cumulativeKm)}
          formatPrimary={(p) => p.ym}
          formatValue={(p) => `${Math.round(p.cumulativeKm).toLocaleString()} km · +${Math.round(p.monthlyKm)} this month`}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <TText variant="mono" style={{ fontSize: 10, color: c.ink3 }}>{first.ym}</TText>
        <TText variant="mono" style={{ fontSize: 10, color: c.ink3 }}>{last.ym}</TText>
      </View>
    </View>
  );
}

