import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import type { Vo2Point } from '../../analytics/vo2max';
import { Card } from '../atoms';
import { useColors } from '../theme';
import { Eyebrow, TText } from '../typography';

interface Props {
  series: Vo2Point[];
  current: number;
  delta28d: number | null;
}

// VO₂ max trend card — line chart of model-derived VO₂ over the user's
// activity history, with the latest measurement as the hero number and
// a 28-day delta chip. Quiet: no gridlines, single accent line, last
// point dotted. Renders nothing when there are no measurements; the
// caller decides whether to surface that empty state.
export function Vo2MaxCard({ series, current, delta28d }: Props) {
  const c = useColors();
  if (series.length === 0) return null;

  const W = 280;
  const H = 56;
  const PAD = 4;
  const values = series.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.1, max - min);
  const step = series.length === 1 ? 0 : (W - PAD * 2) / (series.length - 1);
  const y = (v: number) => PAD + (H - PAD * 2) - ((v - min) / span) * (H - PAD * 2);
  const d = series
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${(PAD + i * step).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(' ');
  const last = series[series.length - 1];

  // Tone the delta chip: positive = moss, negative = accent, zero/null = muted ink.
  const deltaTone =
    delta28d === null ? c.ink3 : delta28d > 0 ? c.moss : delta28d < 0 ? c.accent : c.ink2;
  const deltaLabel =
    delta28d === null
      ? null
      : `${delta28d > 0 ? '+' : ''}${delta28d.toFixed(1)} vs 28d`;

  return (
    <Card style={{ backgroundColor: c.paper2 }}>
      <Eyebrow>VO₂ MAX</Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <TText variant="monoMedium" style={{ fontSize: 36, lineHeight: 42, letterSpacing: -1, color: c.ink }}>
              {current.toFixed(1)}
            </TText>
            <TText style={{ fontSize: 12, color: c.ink3 }}>ml/kg/min</TText>
          </View>
          <Eyebrow style={{ color: c.ink3 }}>CURRENT</Eyebrow>
        </View>
        <Svg width={W * 0.55} height={H}>
          {/* Baseline at min */}
          <Line x1={PAD} y1={H - PAD} x2={W * 0.55 - PAD} y2={H - PAD} stroke={c.line2} strokeWidth={0.6} />
          <Path d={d} fill="none" stroke={c.accent} strokeWidth={1.6} strokeLinecap="round" />
          <Circle cx={PAD + (series.length - 1) * step} cy={y(last.value)} r={3} fill={c.accent} />
        </Svg>
      </View>
      {deltaLabel ? (
        <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.line, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: deltaTone + '22' }}>
            <TText variant="mono" style={{ fontSize: 11, color: deltaTone, fontWeight: '500' }}>{deltaLabel}</TText>
          </View>
          <TText style={{ fontSize: 11, color: c.ink3 }}>
            {series.length} {series.length === 1 ? 'measurement' : 'measurements'}
          </TText>
        </View>
      ) : null}
    </Card>
  );
}
