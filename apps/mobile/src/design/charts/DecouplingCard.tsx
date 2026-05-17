import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import type { DecouplingPoint } from '../../analytics/decoupling';
import { Card } from '../atoms';
import { useColors } from '../theme';
import { Eyebrow, TText } from '../typography';
import { ChartShareButton, useChartShare } from './useChartShare';
import { ChartInfoButton } from './ChartInfoButton';
import { ChartTooltip } from './ChartTooltip';

interface Props {
  series: DecouplingPoint[];
  recent: number | null;
}

const EXPLANATION =
  'Pace-to-heart-rate decoupling on long runs: how much your HR drifts upward ' +
  'in the second half relative to pace. Under 5% means the aerobic engine is ' +
  'holding steady; over 10% suggests fatigue or undertraining. Lower bands ' +
  'are highlighted in moss; the high band in orange.';

// Aerobic decoupling trend. Each qualifying long run is a dot; bands at
// 5% (aerobic fit) and 10% (needs more base) anchor the eye. Trend story:
// dots drift downward into the green band as aerobic engine improves.
export function DecouplingCard({ series, recent }: Props) {
  const c = useColors();
  const { captureRef, share, busy } = useChartShare('Aerobic decoupling');
  if (series.length === 0) return null;

  const W = 300;
  const H = 160;
  const LEFT = 28;
  const RIGHT = 8;
  const TOP = 10;
  const BOTTOM = 22;
  const innerW = W - LEFT - RIGHT;
  const innerH = H - TOP - BOTTOM;

  const values = series.map((p) => p.decouplingPct);
  const dataMin = Math.min(...values, -2);
  const dataMax = Math.max(...values, 12);
  const yMin = Math.floor(dataMin / 2) * 2 - 1;
  const yMax = Math.ceil(dataMax / 2) * 2 + 1;
  const span = Math.max(2, yMax - yMin);

  const x = (i: number) => LEFT + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
  const y = (v: number) => TOP + innerH - ((v - yMin) / span) * innerH;

  const yTicks = [yMin, 0, 5, 10, yMax].filter((v, i, arr) => arr.indexOf(v) === i && v >= yMin && v <= yMax);

  // Band y-positions: green ≤5%, amber 5–10%, red >10%.
  const greenTop = y(Math.min(5, yMax));
  const greenBottom = y(yMin);
  const amberTop = y(Math.min(10, yMax));
  const amberBottom = y(Math.min(5, yMax));
  const redTop = y(yMax);
  const redBottom = y(Math.min(10, yMax));

  const last = series[series.length - 1];
  const firstDate = formatYmShort(series[0].date);
  const lastDate = formatYmShort(last.date);

  const tone = recent === null ? c.ink3 : recent < 5 ? c.moss : recent < 10 ? c.ink2 : c.accent;
  const verdict = recent === null ? '—' : recent < 5 ? 'Aerobic engine locked in' : recent < 10 ? 'Aerobic base okay' : 'More easy miles';

  return (
    <View>
      <View ref={captureRef} collapsable={false} style={{ backgroundColor: c.paper }}>
        <Card style={{ backgroundColor: c.paper2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Eyebrow>AEROBIC DECOUPLING</Eyebrow>
                <ChartInfoButton explanation={EXPLANATION} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                <TText variant="monoMedium" style={{ fontSize: 36, lineHeight: 42, letterSpacing: -1, color: c.ink }}>
                  {recent === null ? '—' : `${recent > 0 ? '+' : ''}${recent.toFixed(1)}`}
                </TText>
                <TText style={{ fontSize: 12, color: c.ink3 }}>% recent avg</TText>
              </View>
            </View>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: tone + '22', marginTop: 4, maxWidth: 130, marginRight: 40 }}>
              <TText variant="mono" style={{ fontSize: 10, color: tone, fontWeight: '500', textAlign: 'right' }}>{verdict}</TText>
            </View>
          </View>

          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <View style={{ width: W, height: H }}>
              <Svg width={W} height={H}>
                {/* Threshold bands */}
                <Rect x={LEFT} y={greenTop} width={innerW} height={Math.max(0, greenBottom - greenTop)} fill={c.moss} opacity={0.10} />
                <Rect x={LEFT} y={amberTop} width={innerW} height={Math.max(0, amberBottom - amberTop)} fill={c.ink2} opacity={0.08} />
                <Rect x={LEFT} y={redTop} width={innerW} height={Math.max(0, redBottom - redTop)} fill={c.accent} opacity={0.10} />

                {/* Y-axis grid + labels */}
                {yTicks.map((v, i) => (
                  <React.Fragment key={i}>
                    <Line x1={LEFT} y1={y(v)} x2={W - RIGHT} y2={y(v)} stroke={c.line2} strokeWidth={v === 0 ? 0.9 : 0.4} />
                    <SvgText x={LEFT - 4} y={y(v) + 3} fontSize={8} fill={c.ink3} textAnchor="end" fontFamily="JetBrainsMono-Regular">
                      {v > 0 ? '+' : ''}{v}
                    </SvgText>
                  </React.Fragment>
                ))}

                {/* Dots per run */}
                {series.map((p, i) => {
                  const dotTone = p.decouplingPct < 5 ? c.moss : p.decouplingPct < 10 ? c.ink2 : c.accent;
                  return <Circle key={i} cx={x(i)} cy={y(p.decouplingPct)} r={3} fill={dotTone} />;
                })}

                {/* Last-point ring accent */}
                <Circle cx={x(series.length - 1)} cy={y(last.decouplingPct)} r={5} fill="none" stroke={c.accent} strokeWidth={0.8} opacity={0.6} />

                <SvgText x={LEFT} y={H - 6} fontSize={9} fill={c.ink3} fontFamily="JetBrainsMono-Regular">{firstDate}</SvgText>
                <SvgText x={W - RIGHT} y={H - 6} fontSize={9} fill={c.ink3} textAnchor="end" fontFamily="JetBrainsMono-Regular">{lastDate}</SvgText>
              </Svg>
              <ChartTooltip
                series={series}
                left={LEFT}
                right={W - RIGHT}
                width={W}
                height={H}
                dotColor={c.accent}
                pointY={(p) => y(p.decouplingPct)}
                formatPrimary={(p) => formatTooltipDate(p.date)}
                formatValue={(p) => `${p.decouplingPct > 0 ? '+' : ''}${p.decouplingPct.toFixed(1)}%`}
              />
            </View>
          </View>

          <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.line, flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Eyebrow style={{ color: c.ink3 }}>RUNS</Eyebrow>
              <TText variant="monoMedium" style={{ fontSize: 16, color: c.ink }}>{series.length}</TText>
            </View>
            <View style={{ flex: 1 }}>
              <Eyebrow style={{ color: c.ink3 }}>BEST</Eyebrow>
              <TText variant="monoMedium" style={{ fontSize: 16, color: c.ink }}>
                {Math.min(...values).toFixed(1)}%
              </TText>
            </View>
            <View style={{ flex: 1 }}>
              <Eyebrow style={{ color: c.ink3 }}>LATEST</Eyebrow>
              <TText variant="monoMedium" style={{ fontSize: 16, color: c.ink }}>
                {last.decouplingPct > 0 ? '+' : ''}{last.decouplingPct.toFixed(1)}%
              </TText>
            </View>
          </View>
        </Card>
      </View>
      <ChartShareButton onPress={share} busy={busy} />
    </View>
  );
}

const MONTHS_3 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;

function formatYmShort(iso: string): string {
  const [y, m] = iso.split('-');
  const monthIdx = Math.max(0, Math.min(11, parseInt(m, 10) - 1));
  return `${MONTHS_3[monthIdx]} ${y.slice(2)}`;
}

function formatTooltipDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  const monthIdx = Math.max(0, Math.min(11, parseInt(m, 10) - 1));
  return `${MONTHS_3[monthIdx]} ${parseInt(d, 10)}, ${y}`;
}
