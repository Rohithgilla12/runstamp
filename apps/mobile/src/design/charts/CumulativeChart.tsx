import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import type { MonthlyPoint } from '../../analytics/cumulative';
import { useColors } from '../theme';
import { TText } from '../typography';

interface Props {
  series: MonthlyPoint[];
  compare?: MonthlyPoint[];
}

const W = 320;
const H = 150;
const PAD = 14;

export function CumulativeChart({ series, compare }: Props) {
  const c = useColors();

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

  return (
    <View>
      <Svg width={W} height={H}>
        {[0.25, 0.5, 0.75].map((p, i) => (
          <Line key={i} x1={PAD} y1={PAD + (H - PAD * 2) * p} x2={W - PAD} y2={PAD + (H - PAD * 2) * p} stroke={c.line2} />
        ))}
        {compare && db ? <Path d={db} fill="none" stroke={c.ink2} strokeWidth={1.5} strokeDasharray="3 3" /> : null}
        <Path d={`${da} L${PAD + (series.length - 1) * step} ${H - PAD} L${PAD} ${H - PAD}Z`} fill={c.accent} opacity={0.1} />
        <Path d={da} fill="none" stroke={c.accent} strokeWidth={2} strokeLinecap="round" />
        <Circle cx={PAD + (series.length - 1) * step} cy={y(last.cumulativeKm)} r={4} fill={c.accent} />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <TText variant="mono" style={{ fontSize: 10, color: c.ink3 }}>{first.ym}</TText>
        <TText variant="mono" style={{ fontSize: 10, color: c.ink3 }}>{last.ym}</TText>
      </View>
    </View>
  );
}
