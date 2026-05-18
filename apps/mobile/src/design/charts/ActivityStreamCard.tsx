// ActivityStreamCard
//
// Per-activity time-series chart matching the Stats-page chart vocabulary:
//
//   ┌─────────────────────────────────────────┐
//   │  HEART RATE  ⓘ                          │  ← eyebrow + info disclosure
//   │  146                                    │  ← hero (avg) in JetBrains Mono
//   │  bpm                                    │  ← unit in ink3
//   │                                         │
//   │  170 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─     │  ← y-axis: max
//   │  145 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─     │  ← y-axis: mid + polyline
//   │  120 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─     │  ← y-axis: min
//   │  0:00              45:00         1:32  │  ← x-axis: time markers
//   │                                         │
//   │  MIN     AVG     MAX                    │  ← footer stats
//   │  118     146     172                    │
//   └─────────────────────────────────────────┘
//
// Inputs are the value array (already parsed by parseValueStream) + total
// duration in seconds (run.seconds — used to label the x-axis honestly
// instead of "sample 0..N"). formatValue / formatTooltip let HR and Pace
// share the same component with their own number formatters.

import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { Card } from '../atoms';
import { useColors } from '../theme';
import { Eyebrow, TText } from '../typography';
import { ChartInfoButton } from './ChartInfoButton';

interface Props {
  /** Caps eyebrow at the top — e.g. "HEART RATE", "PACE". */
  title: string;
  /** Numeric samples, evenly distributed across the activity. */
  data: number[];
  /** Total activity duration in seconds; used to label the x-axis. */
  durationSec: number;
  /** Inline unit ("bpm", "/km"). Quiet ink3, sits under the hero number. */
  unit: string;
  /** Solar / accent line + dot color. Defaults to the theme accent. */
  color?: string;
  /**
   * Format a value for display in the hero + footer + y-axis ticks.
   * For HR: `(v) => v.toFixed(0)`; for Pace: `(v) => fmtPace(v, units)`.
   */
  formatValue: (v: number) => string;
  /**
   * "fastest" semantics override: for HR, MIN is "lowest" / MAX is "highest".
   * For Pace, LOWER seconds = FASTER, so we swap the labels. Defaults to
   * the natural min/max framing.
   */
  invertExtremes?: boolean;
  /** Optional ⓘ text explaining the chart. */
  explanation?: string;
}

export function ActivityStreamCard({
  title,
  data,
  durationSec,
  unit,
  color,
  formatValue,
  invertExtremes = false,
  explanation,
}: Props) {
  const c = useColors();
  const stroke = color ?? c.accent;

  if (data.length < 2) {
    return (
      <Card style={{ backgroundColor: c.paper2 }}>
        <Eyebrow style={{ color: c.ink3 }}>{title}</Eyebrow>
        <TText style={{ marginTop: 8, fontSize: 13, color: c.ink2 }}>Not enough samples.</TText>
      </Card>
    );
  }

  // Aggregates — computed once, reused for hero + footer.
  const minV = Math.min(...data);
  const maxV = Math.max(...data);
  const avg = data.reduce((a, b) => a + b, 0) / data.length;

  // Chart geometry. Same shape as Vo2MaxCard so a Stats user instantly
  // recognises the lockup when they open an activity.
  const W = 320;
  const H = 150;
  const LEFT = 36;
  const RIGHT = 8;
  const TOP = 10;
  const BOTTOM = 22;
  const innerW = W - LEFT - RIGHT;
  const innerH = H - TOP - BOTTOM;

  const pad = Math.max((maxV - minV) * 0.05, 0.5);
  const yMin = minV - pad;
  const yMax = maxV + pad;
  const span = Math.max(0.1, yMax - yMin);
  const x = (i: number) => LEFT + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => TOP + innerH - ((v - yMin) / span) * innerH;
  const d = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');

  // Y axis ticks: min / mid / max, all rendered through formatValue so HR
  // shows "146" and Pace shows "5:23" with one component.
  const yTicks = [yMax, (yMin + yMax) / 2, yMin];

  // X axis labels — three time markers depending on duration. Shows hours
  // when ≥ 1h, otherwise minutes. We never label more than three positions
  // (start, mid, end) to keep the type quiet.
  const xLabels = [
    { pos: 0, t: 0 },
    { pos: 0.5, t: durationSec * 0.5 },
    { pos: 1, t: durationSec },
  ];

  const minLabel = invertExtremes ? 'FASTEST' : 'MIN';
  const maxLabel = invertExtremes ? 'SLOWEST' : 'MAX';
  // For pace, MIN seconds = fastest, MAX seconds = slowest. Swap which
  // value shows under each label.
  const fastVal = invertExtremes ? minV : minV;
  const slowVal = invertExtremes ? maxV : maxV;

  return (
    <Card style={{ backgroundColor: c.paper2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Eyebrow style={{ color: c.ink3 }}>{title}</Eyebrow>
        {explanation && <ChartInfoButton explanation={explanation} />}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 4 }}>
        <TText variant="monoMedium" style={{ fontSize: 34, lineHeight: 40, letterSpacing: -1, color: c.ink }}>
          {formatValue(avg)}
        </TText>
        <TText style={{ fontSize: 12, color: c.ink3 }}>{unit} avg</TText>
      </View>

      <View style={{ marginTop: 10, alignItems: 'center' }}>
        <Svg width={W} height={H}>
          {yTicks.map((v, i) => {
            const yy = y(v);
            return (
              <React.Fragment key={i}>
                <Line x1={LEFT} y1={yy} x2={W - RIGHT} y2={yy} stroke={c.line2} strokeWidth={0.6} />
                <SvgText
                  x={LEFT - 4}
                  y={yy + 3}
                  fontSize={8}
                  fill={c.ink3}
                  textAnchor="end"
                  fontFamily="JetBrainsMono-Regular"
                >
                  {formatValue(v)}
                </SvgText>
              </React.Fragment>
            );
          })}

          <Path
            d={d}
            fill="none"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* End marker — one warm pop, on the run's final sample. */}
          <Circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r={3.2} fill={stroke} />

          {xLabels.map((label, i) => {
            const px = LEFT + label.pos * innerW;
            const anchor: 'start' | 'middle' | 'end' = i === 0 ? 'start' : i === 2 ? 'end' : 'middle';
            return (
              <SvgText
                key={i}
                x={px}
                y={H - 6}
                fontSize={9}
                fill={c.ink3}
                textAnchor={anchor}
                fontFamily="JetBrainsMono-Regular"
              >
                {formatDuration(label.t)}
              </SvgText>
            );
          })}
        </Svg>
      </View>

      <View
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: c.line,
          flexDirection: 'row',
          gap: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <Eyebrow style={{ color: c.ink3 }}>{minLabel}</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 16, color: c.ink, marginTop: 2 }}>
            {formatValue(fastVal)}
          </TText>
        </View>
        <View style={{ flex: 1 }}>
          <Eyebrow style={{ color: c.ink3 }}>AVG</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 16, color: c.ink, marginTop: 2 }}>
            {formatValue(avg)}
          </TText>
        </View>
        <View style={{ flex: 1 }}>
          <Eyebrow style={{ color: c.ink3 }}>{maxLabel}</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 16, color: c.ink, marginTop: 2 }}>
            {formatValue(slowVal)}
          </TText>
        </View>
      </View>
    </Card>
  );
}

// "0:00" / "12:34" / "1:32:08" — same shape as fmtTime in data/sample.ts
// but inlined here so the chart owns its own number formatting and doesn't
// pull in a circular dep on the data layer.
function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  return `${m}:${String(rest).padStart(2, '0')}`;
}
