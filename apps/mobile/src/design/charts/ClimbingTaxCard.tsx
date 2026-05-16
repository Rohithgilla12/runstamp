import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import type { GapTaxPoint } from '../../analytics/gap';
import { Card } from '../atoms';
import { useColors } from '../theme';
import { Eyebrow, TText } from '../typography';
import { ChartShareButton, useChartShare } from './useChartShare';
import { ChartInfoButton } from './ChartInfoButton';
import { ChartTooltip } from './ChartTooltip';

interface Props {
  series: GapTaxPoint[];
  lifetimeAvgSec: number | null;
}

const EXPLANATION =
  'Seconds per kilometre that the hills are costing you. We compare your raw ' +
  'pace against grade-adjusted pace (Minetti model) and average the gap per ' +
  'month. Near zero means flat terrain; large values mean climbing is doing ' +
  'real work. Useful for comparing a hilly month to a flat one fairly.';

// Climbing tax — how much elevation is costing your pace, per month.
// Computed as the per-km gap between raw pace and GAP, weighted by km.
// Trend story: pick flatter routes and the line trends toward zero;
// move to a hillier city and watch it climb.
export function ClimbingTaxCard({ series, lifetimeAvgSec }: Props) {
  const c = useColors();
  const { captureRef, share, busy } = useChartShare('Climbing tax');
  if (series.length === 0) return null;

  const W = 300;
  const H = 130;
  const LEFT = 30;
  const RIGHT = 8;
  const TOP = 10;
  const BOTTOM = 22;
  const innerW = W - LEFT - RIGHT;
  const innerH = H - TOP - BOTTOM;

  const values = series.map((p) => p.meanTaxSecPerKm);
  const minV = Math.min(0, ...values);
  const maxV = Math.max(...values, 5);
  const pad = Math.max(2, (maxV - minV) * 0.1);
  const yMin = minV - pad;
  const yMax = maxV + pad;
  const span = Math.max(2, yMax - yMin);

  const x = (i: number) => LEFT + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
  const y = (v: number) => TOP + innerH - ((v - yMin) / span) * innerH;

  const last = series[series.length - 1];
  const d = series.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.meanTaxSecPerKm).toFixed(1)}`).join(' ');
  const zeroY = y(0);

  return (
    <View>
      <View ref={captureRef} collapsable={false} style={{ backgroundColor: c.paper }}>
        <Card style={{ backgroundColor: c.paper2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Eyebrow>CLIMBING TAX</Eyebrow>
                <ChartInfoButton explanation={EXPLANATION} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                <TText variant="monoMedium" style={{ fontSize: 36, lineHeight: 42, letterSpacing: -1, color: c.ink }}>
                  {lifetimeAvgSec === null ? '—' : `+${lifetimeAvgSec.toFixed(0)}`}
                </TText>
                <TText style={{ fontSize: 12, color: c.ink3 }}>sec/km avg</TText>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', maxWidth: 130, marginRight: 40 }}>
              <Eyebrow style={{ color: c.ink3, fontSize: 9 }}>LATEST MONTH</Eyebrow>
              <TText variant="monoMedium" style={{ fontSize: 14, color: c.ink, marginTop: 2 }}>
                +{last.meanTaxSecPerKm.toFixed(0)} s/km
              </TText>
              <TText style={{ fontSize: 10, color: c.ink3 }}>{Math.round(last.totalKm)} km · {last.runs} runs</TText>
            </View>
          </View>

          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <View style={{ width: W, height: H }}>
              <Svg width={W} height={H}>
                {/* Zero line — "perfectly flat" reference */}
                <Line x1={LEFT} y1={zeroY} x2={W - RIGHT} y2={zeroY} stroke={c.line2} strokeWidth={0.8} strokeDasharray="2 3" />
                <SvgText x={LEFT - 4} y={zeroY + 3} fontSize={8} fill={c.ink3} textAnchor="end" fontFamily="JetBrainsMono-Regular">0</SvgText>
                <SvgText x={LEFT - 4} y={y(yMax) + 3} fontSize={8} fill={c.ink3} textAnchor="end" fontFamily="JetBrainsMono-Regular">{`+${Math.round(yMax)}`}</SvgText>

                <Path d={d} fill="none" stroke={c.accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                {series.map((p, i) => (
                  <Circle key={i} cx={x(i)} cy={y(p.meanTaxSecPerKm)} r={Math.min(5, 2 + p.totalKm / 30)} fill={c.accent} opacity={0.85} />
                ))}
                <Circle cx={x(series.length - 1)} cy={y(last.meanTaxSecPerKm)} r={6.4} fill="none" stroke={c.accent} strokeWidth={0.6} opacity={0.5} />

                <SvgText x={LEFT} y={H - 6} fontSize={9} fill={c.ink3} fontFamily="JetBrainsMono-Regular">{formatMonthShort(series[0].month)}</SvgText>
                <SvgText x={W - RIGHT} y={H - 6} fontSize={9} fill={c.ink3} textAnchor="end" fontFamily="JetBrainsMono-Regular">{formatMonthShort(last.month)}</SvgText>
              </Svg>
              <ChartTooltip
                series={series}
                left={LEFT}
                right={W - RIGHT}
                width={W}
                height={H}
                dotColor={c.accent}
                pointY={(p) => y(p.meanTaxSecPerKm)}
                formatPrimary={(p) => formatMonthShort(p.month)}
                formatValue={(p) => `+${p.meanTaxSecPerKm.toFixed(0)} s/km · ${Math.round(p.totalKm)} km`}
              />
            </View>
          </View>

          <TText style={{ fontSize: 10, color: c.ink3, marginTop: 8, lineHeight: 14 }}>
            How much hills are slowing each kilometre vs. a flat-equivalent
            Minetti pace. Near zero = flat city. Climbing more = the cost rises.
          </TText>
        </Card>
      </View>
      <ChartShareButton onPress={share} busy={busy} />
    </View>
  );
}

const MONTHS_3 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;

function formatMonthShort(month: string): string {
  const [y, m] = month.split('-');
  const idx = Math.max(0, Math.min(11, parseInt(m, 10) - 1));
  return `${MONTHS_3[idx]} ${y.slice(2)}`;
}
