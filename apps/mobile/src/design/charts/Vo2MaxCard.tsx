import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import type { Vo2Point } from '../../analytics/vo2max';
import { Card } from '../atoms';
import { useColors } from '../theme';
import { Eyebrow, TText } from '../typography';
import { ChartShareButton, useChartShare } from './useChartShare';
import { ChartInfoButton } from './ChartInfoButton';
import { ChartTooltip } from './ChartTooltip';

interface Props {
  series: Vo2Point[];
  current: number;
  delta28d: number | null;
}

const EXPLANATION =
  'VO₂ max estimates how much oxygen your body uses per kilogram per minute ' +
  'at full effort — a proxy for aerobic fitness. Modelled from heart-rate-to-' +
  'pace ratio on the runs that include HR data. Useful for tracking direction ' +
  'over weeks; single readings carry noise so look at the trend, not the point.';

// VO₂ max trend card — full-width line chart of model-derived VO₂ over the
// user's activity history. Current value is the hero number, with a 28-day
// delta chip and peak/average tiles below the chart. Hides itself when
// there are no measurements.
export function Vo2MaxCard({ series, current, delta28d }: Props) {
  const c = useColors();
  const { captureRef, share, busy } = useChartShare('VO₂ max');
  if (series.length === 0) return null;

  const W = 300;
  const H = 140;
  const LEFT = 22;
  const RIGHT = 8;
  const TOP = 10;
  const BOTTOM = 22;
  const innerW = W - LEFT - RIGHT;
  const innerH = H - TOP - BOTTOM;

  const values = series.map((p) => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const pad = Math.max(0.5, (maxV - minV) * 0.1);
  const yMin = Math.max(0, minV - pad);
  const yMax = maxV + pad;
  const span = Math.max(0.1, yMax - yMin);
  const x = (i: number) => LEFT + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
  const y = (v: number) => TOP + innerH - ((v - yMin) / span) * innerH;
  const d = series.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const last = series[series.length - 1];
  const lastIdx = series.length - 1;

  const yTicks = [yMin, (yMin + yMax) / 2, yMax];

  const firstDate = formatYmShort(series[0].date);
  const lastDate = formatYmShort(last.date);

  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  const deltaTone =
    delta28d === null ? c.ink3 : delta28d > 0 ? c.moss : delta28d < 0 ? c.accent : c.ink2;
  const deltaLabel =
    delta28d === null
      ? null
      : `${delta28d > 0 ? '+' : ''}${delta28d.toFixed(1)} vs 28d`;

  return (
    <View>
      <View ref={captureRef} collapsable={false} style={{ backgroundColor: c.paper }}>
        <Card style={{ backgroundColor: c.paper2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Eyebrow>VO₂ MAX</Eyebrow>
                <ChartInfoButton explanation={EXPLANATION} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                <TText variant="monoMedium" style={{ fontSize: 36, lineHeight: 42, letterSpacing: -1, color: c.ink }}>
                  {current.toFixed(1)}
                </TText>
                <TText style={{ fontSize: 12, color: c.ink3 }}>ml/kg/min</TText>
              </View>
            </View>
            {deltaLabel ? (
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: deltaTone + '22', marginTop: 4, marginRight: 40 }}>
                <TText variant="mono" style={{ fontSize: 11, color: deltaTone, fontWeight: '500' }}>{deltaLabel}</TText>
              </View>
            ) : null}
          </View>

          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <View style={{ width: W, height: H }}>
              <Svg width={W} height={H}>
                {yTicks.map((v, i) => {
                  const yy = y(v);
                  return (
                    <React.Fragment key={i}>
                      <Line x1={LEFT} y1={yy} x2={W - RIGHT} y2={yy} stroke={c.line2} strokeWidth={0.6} />
                      <SvgText x={LEFT - 4} y={yy + 3} fontSize={8} fill={c.ink3} textAnchor="end" fontFamily="JetBrainsMono-Regular">
                        {v.toFixed(0)}
                      </SvgText>
                    </React.Fragment>
                  );
                })}

                <Path d={d} fill="none" stroke={c.accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />

                <Circle cx={x(lastIdx)} cy={y(last.value)} r={3.4} fill={c.accent} />
                <Circle cx={x(lastIdx)} cy={y(last.value)} r={5.4} fill="none" stroke={c.accent} strokeWidth={0.6} opacity={0.5} />

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
                pointY={(p) => y(p.value)}
                formatPrimary={(p) => formatTooltipDate(p.date)}
                formatValue={(p) => `${p.value.toFixed(1)} ml/kg/min`}
              />
            </View>
          </View>

          <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.line, flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Eyebrow style={{ color: c.ink3 }}>PEAK</Eyebrow>
              <TText variant="monoMedium" style={{ fontSize: 16, color: c.ink }}>{maxV.toFixed(1)}</TText>
            </View>
            <View style={{ flex: 1 }}>
              <Eyebrow style={{ color: c.ink3 }}>AVERAGE</Eyebrow>
              <TText variant="monoMedium" style={{ fontSize: 16, color: c.ink }}>{avg.toFixed(1)}</TText>
            </View>
            <View style={{ flex: 1 }}>
              <Eyebrow style={{ color: c.ink3 }}>READINGS</Eyebrow>
              <TText variant="monoMedium" style={{ fontSize: 16, color: c.ink }}>{series.length}</TText>
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
