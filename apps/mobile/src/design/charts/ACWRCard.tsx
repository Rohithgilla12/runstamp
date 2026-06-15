import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { AcwrPoint, RiskLevel } from '../../analytics/acwr';
import { Card } from '../atoms';
import { useColors } from '../theme';
import { Eyebrow, TText } from '../typography';
import { ChartShareButton, useChartShare } from './useChartShare';
import { ChartInfoButton } from './ChartInfoButton';
import { ChartTooltip } from './ChartTooltip';

interface Props {
  series: AcwrPoint[];
  current: number | null;
  risk: RiskLevel | null;
}

const EXPLANATION =
  'ACWR compares your last 7 days of training load to your 28-day average. ' +
  '0.8–1.3 is the sweet spot; spiking above 1.5 is when injury risk tends to ' +
  'climb (Gabbett, Br J Sports Med 2016).';

// ACWR injury-risk card. Fixed y-range [0.5, 2.0]; sweet-spot band (0.8–1.3)
// shaded in moss; danger line at 1.5 in accent. Last 90 data points.
export function ACWRCard({ series, current, risk }: Props) {
  const c = useColors();
  const { captureRef, share, busy } = useChartShare('ACWR');
  if (series.length === 0 || current === null) return null;

  const W = 300;
  const H = 160;
  const LEFT = 28;
  const RIGHT = 8;
  const TOP = 10;
  const BOTTOM = 22;
  const innerW = W - LEFT - RIGHT;
  const innerH = H - TOP - BOTTOM;

  // Fixed y-range: 0.5 → 2.0
  const Y_MIN = 0.5;
  const Y_MAX = 2.0;
  const span = Y_MAX - Y_MIN;

  const tail = series.slice(-90);
  const last = tail[tail.length - 1];

  const x = (i: number) => LEFT + (tail.length === 1 ? innerW / 2 : (i / (tail.length - 1)) * innerW);
  const y = (v: number) => {
    const clamped = Math.min(Y_MAX, Math.max(Y_MIN, v));
    return TOP + innerH - ((clamped - Y_MIN) / span) * innerH;
  };

  // Sweet-spot band: 0.8 → 1.3
  const sweetTop = y(1.3);
  const sweetBottom = y(0.8);

  // Danger line at 1.5
  const dangerY = y(1.5);

  // ACWR line path
  const linePath = tail
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.acwr).toFixed(1)}`)
    .join(' ');

  const yTicks = [0.5, 0.8, 1.0, 1.3, 1.5, 2.0];

  const firstDate = formatYmShort(tail[0].date);
  const lastDate = formatYmShort(last.date);

  const { chipLabel, chipColor } = riskChip(risk, c);

  return (
    <View>
      <View ref={captureRef} collapsable={false} style={{ backgroundColor: c.paper }}>
        <Card style={{ backgroundColor: c.paper2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Eyebrow>INJURY RISK · ACWR</Eyebrow>
                <ChartInfoButton explanation={EXPLANATION} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                <TText variant="monoMedium" style={{ fontSize: 36, lineHeight: 42, letterSpacing: -1, color: c.ink }}>
                  {current.toFixed(2)}
                </TText>
              </View>
            </View>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: chipColor + '22', marginTop: 4, maxWidth: 130, marginRight: 40 }}>
              <TText variant="mono" style={{ fontSize: 10, color: chipColor, fontWeight: '500', textAlign: 'right' }}>{chipLabel}</TText>
            </View>
          </View>

          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <View style={{ width: W, height: H }}>
              <Svg width={W} height={H}>
                {/* Sweet-spot band: 0.8 → 1.3 */}
                <Rect
                  x={LEFT} y={sweetTop}
                  width={innerW} height={Math.max(0, sweetBottom - sweetTop)}
                  fill={c.moss} opacity={0.12}
                />

                {/* Y-axis grid + labels */}
                {yTicks.map((v, i) => (
                  <React.Fragment key={i}>
                    <Line
                      x1={LEFT} y1={y(v)} x2={W - RIGHT} y2={y(v)}
                      stroke={c.line2} strokeWidth={v === 1.0 ? 0.9 : 0.4}
                    />
                    <SvgText x={LEFT - 4} y={y(v) + 3} fontSize={8} fill={c.ink3} textAnchor="end" fontFamily="JetBrainsMono-Regular">
                      {v.toFixed(1)}
                    </SvgText>
                  </React.Fragment>
                ))}

                {/* Danger line at 1.5 (dashed) */}
                <Line
                  x1={LEFT} y1={dangerY} x2={W - RIGHT} y2={dangerY}
                  stroke={c.accent} strokeWidth={0.8}
                  strokeDasharray="3 3" opacity={0.5}
                />

                {/* ACWR line */}
                <Path
                  d={linePath}
                  fill="none"
                  stroke={c.ink}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Latest dot */}
                <Circle cx={x(tail.length - 1)} cy={y(last.acwr)} r={3} fill={c.accent} />
                <Circle cx={x(tail.length - 1)} cy={y(last.acwr)} r={5} fill="none" stroke={c.accent} strokeWidth={0.8} opacity={0.6} />

                <SvgText x={LEFT} y={H - 6} fontSize={9} fill={c.ink3} fontFamily="JetBrainsMono-Regular">{firstDate}</SvgText>
                <SvgText x={W - RIGHT} y={H - 6} fontSize={9} fill={c.ink3} textAnchor="end" fontFamily="JetBrainsMono-Regular">{lastDate}</SvgText>
              </Svg>
              <ChartTooltip
                series={tail}
                left={LEFT}
                right={W - RIGHT}
                width={W}
                height={H}
                dotColor={c.accent}
                pointY={(p) => y(p.acwr)}
                formatPrimary={(p) => formatTooltipDate(p.date)}
                formatValue={(p) => `ACWR ${p.acwr.toFixed(2)}`}
              />
            </View>
          </View>

          <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.line, flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Eyebrow style={{ color: c.ink3 }}>CURRENT</Eyebrow>
              <TText variant="monoMedium" style={{ fontSize: 16, color: c.ink }}>{current.toFixed(2)}</TText>
            </View>
            <View style={{ flex: 1 }}>
              <Eyebrow style={{ color: c.ink3 }}>ACUTE</Eyebrow>
              <TText variant="monoMedium" style={{ fontSize: 16, color: c.ink }}>{Math.round(last.acute)}</TText>
            </View>
            <View style={{ flex: 1 }}>
              <Eyebrow style={{ color: c.ink3 }}>CHRONIC</Eyebrow>
              <TText variant="monoMedium" style={{ fontSize: 16, color: c.ink }}>{Math.round(last.chronic)}</TText>
            </View>
          </View>
        </Card>
      </View>
      <ChartShareButton onPress={share} busy={busy} />
    </View>
  );
}

function riskChip(risk: RiskLevel | null, c: ReturnType<typeof useColors>): { chipLabel: string; chipColor: string } {
  switch (risk) {
    case 'optimal':   return { chipLabel: 'Sweet spot',    chipColor: c.moss };
    case 'rampdown':  return { chipLabel: 'Ramping down',  chipColor: c.ink3 };
    case 'caution':   return { chipLabel: 'Caution',       chipColor: c.warn };
    case 'high':      return { chipLabel: 'High risk',     chipColor: c.accent };
    default:          return { chipLabel: '—',             chipColor: c.ink3 };
  }
}

const MONTHS_3 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;

function formatYmShort(iso: string): string {
  const [yr, m] = iso.split('-');
  const monthIdx = Math.max(0, Math.min(11, parseInt(m, 10) - 1));
  return `${MONTHS_3[monthIdx]} ${yr.slice(2)}`;
}

function formatTooltipDate(iso: string): string {
  const [yr, m, d] = iso.split('-');
  const monthIdx = Math.max(0, Math.min(11, parseInt(m, 10) - 1));
  return `${MONTHS_3[monthIdx]} ${parseInt(d, 10)}, ${yr}`;
}
