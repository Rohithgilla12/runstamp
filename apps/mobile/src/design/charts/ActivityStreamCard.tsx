// ActivityStreamCard — per-activity time-series chart for HR / Pace tabs
// on the Activity screen.
//
// Redesigned per .impeccable.md Principle 6: this is an analytical surface,
// so the CHART is the hero. The previous version was a hero-metric template
// (big AVG number above, MIN/AVG/MAX tile row below) — but AVG showed up
// twice and the chart fought the number for attention. A runner opens the
// HR tab to read the *shape* of their effort; the bounds are labels on the
// shape, not separate facts.
//
// Layout:
//   ┌─────────────────────────────────────────────────┐
//   │  HEART RATE                              ⓘ      │  eyebrow + info
//   │                                                  │
//   │  172   ─                                         │  y-tick (MAX)
//   │             ╱╲    ╱╲╱╲              ╱╲      ●   │  polyline + end dot
//   │  146   ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │  avg reference line
//   │       ╱   ╲╱      ╲╱╲╱╲    ╱╲╱  ╲                │
//   │  118   ─                                         │  y-tick (MIN)
//   │  0:00              45:00              1:32:08   │  x-axis time markers
//   │                                                  │
//   │  AVG  146 bpm  ·  drift  +6  ·  range  54        │  one quiet stats line
//   └─────────────────────────────────────────────────┘
//
// Drift is the change from the first-decile average to the last-decile
// average — meaningful for cardiac drift (HR rising over time at the same
// pace) on HR, slowing on Pace. Only shown when there are enough samples
// for both deciles to be at least 5 points (otherwise the number is noisy).

import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { Card } from '../atoms';
import { useColors } from '../theme';
import { Eyebrow, TText } from '../typography';
import { ChartInfoButton } from './ChartInfoButton';
import { ChartTooltip } from './ChartTooltip';

interface Props {
  /** Caps eyebrow at the top — e.g. "HEART RATE", "PACE". */
  title: string;
  /** Numeric samples, evenly distributed across the activity. */
  data: number[];
  /** Total activity duration in seconds; used to label the x-axis. */
  durationSec: number;
  /** Inline unit ("bpm", "/km"). */
  unit: string;
  /** Polyline color. Defaults to the theme accent. */
  color?: string;
  /**
   * Format a value for display in the footer + y-axis ticks + tooltip.
   * For HR: `(v) => v.toFixed(0)`; for Pace: `(v) => fmtPace(v, units)`.
   */
  formatValue: (v: number) => string;
  /**
   * For Pace, drift POSITIVE = slowing (seconds-per-km going up) = worse;
   * for HR, drift POSITIVE = climbing HR = worse. Same sign convention works
   * for both — this flag only changes the *label* (we say "slowing" vs
   * "climbing" so the runner reads it in their own language).
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

  // Aggregates — computed once, read by the chart (y-ticks, avg line) and
  // the footer line.
  const minV = Math.min(...data);
  const maxV = Math.max(...data);
  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  const range = maxV - minV;

  // First/last decile averages → drift signal. 5-sample minimum per decile
  // so a 30-sample run doesn't compute drift from 3 points each side.
  const decileSize = Math.max(5, Math.floor(data.length / 10));
  const driftable = data.length >= decileSize * 2;
  let driftDelta: number | null = null;
  if (driftable) {
    const head = data.slice(0, decileSize);
    const tail = data.slice(-decileSize);
    const headAvg = head.reduce((a, b) => a + b, 0) / head.length;
    const tailAvg = tail.reduce((a, b) => a + b, 0) / tail.length;
    driftDelta = tailAvg - headAvg;
  }

  // Chart geometry. Taller than before — the chart is the hero now.
  const W = 320;
  const H = 180;
  const LEFT = 36;
  const RIGHT = 10;
  const TOP = 8;
  const BOTTOM = 22;
  const innerW = W - LEFT - RIGHT;
  const innerH = H - TOP - BOTTOM;

  const pad = Math.max(range * 0.05, 0.5);
  const yMin = minV - pad;
  const yMax = maxV + pad;
  const span = Math.max(0.1, yMax - yMin);
  const x = (i: number) => LEFT + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => TOP + innerH - ((v - yMin) / span) * innerH;
  const d = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');

  // X axis labels — three time markers.
  const xLabels = [
    { pos: 0, t: 0 },
    { pos: 0.5, t: durationSec * 0.5 },
    { pos: 1, t: durationSec },
  ];

  // Drift copy. Direction labels swap so a runner reads "slowing" on a Pace
  // chart when seconds/km climbs (i.e. they got slower).
  const driftCopy = (() => {
    if (driftDelta == null) return null;
    const climbing = driftDelta > 0;
    const verb = invertExtremes
      ? climbing ? 'slowing' : 'speeding up'
      : climbing ? 'climbing' : 'falling';
    const sign = climbing ? '+' : '−';
    const mag = formatValue(Math.abs(driftDelta));
    return { verb, sign, mag, climbing };
  })();

  return (
    <Card style={{ backgroundColor: c.paper2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Eyebrow style={{ color: c.ink3 }}>{title}</Eyebrow>
        {explanation && <ChartInfoButton explanation={explanation} />}
      </View>

      <View style={{ marginTop: 10, alignItems: 'center' }}>
        <View style={{ width: W, height: H }}>
          <Svg width={W} height={H}>
            {/* AVG reference line — dashed, faint. Solid would compete with
                 the polyline; dashed reads as "label" not "data." */}
            <Line
              x1={LEFT}
              y1={y(avg)}
              x2={W - RIGHT}
              y2={y(avg)}
              stroke={c.ink2}
              strokeWidth={0.8}
              strokeDasharray="3 4"
              opacity={0.55}
            />

            {/* Y-axis labels: MIN at bottom, AVG inline with the line, MAX
                 at top. Mono numerals; no separate gridlines for min/max so
                 the chart breathes. */}
            <SvgText
              x={LEFT - 6}
              y={y(yMax) + 3}
              fontSize={9}
              fill={c.ink3}
              textAnchor="end"
              fontFamily="JetBrainsMono-Regular"
            >
              {formatValue(maxV)}
            </SvgText>
            <SvgText
              x={LEFT - 6}
              y={y(avg) + 3}
              fontSize={9}
              fill={c.ink2}
              textAnchor="end"
              fontFamily="JetBrainsMono-Regular"
            >
              {formatValue(avg)}
            </SvgText>
            <SvgText
              x={LEFT - 6}
              y={y(yMin) + 3}
              fontSize={9}
              fill={c.ink3}
              textAnchor="end"
              fontFamily="JetBrainsMono-Regular"
            >
              {formatValue(minV)}
            </SvgText>

            {/* The polyline — the actual data. */}
            <Path
              d={d}
              fill="none"
              stroke={stroke}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* End marker — one warm pop, on the final sample. */}
            <Circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r={3} fill={stroke} />

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
          <ChartTooltip
            series={data}
            left={LEFT}
            right={W - RIGHT}
            width={W}
            height={H}
            dotColor={stroke}
            pointY={(v) => y(v)}
            formatPrimary={(_v, idx) => {
              const sampleSec = (durationSec * idx) / Math.max(1, data.length - 1);
              return formatDuration(sampleSec);
            }}
            formatValue={(v) => `${formatValue(v)} ${unit}`}
          />
        </View>
      </View>

      {/* One quiet stats line. AVG label + value (rendered once — the chart
          already shows the dashed line at that height), drift if available,
          and total range so a runner can read variance at a glance. */}
      <View style={{ marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <Stat label="AVG" value={`${formatValue(avg)} ${unit}`} />
        <Sep />
        <Stat label="RANGE" value={formatValue(range)} />
        {driftCopy && (
          <>
            <Sep />
            <Stat label="DRIFT" value={`${driftCopy.sign}${driftCopy.mag} · ${driftCopy.verb}`} />
          </>
        )}
      </View>
    </Card>
  );
}

// Single inline stat — eyebrow caps + mono value side-by-side, not stacked
// in a tile. Reads as a sentence rather than a dashboard row.
function Stat({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
      <Eyebrow style={{ fontSize: 9, color: c.ink3, letterSpacing: 0.8 }}>{label}</Eyebrow>
      <TText variant="mono" style={{ fontSize: 11, color: c.ink }}>{value}</TText>
    </View>
  );
}

function Sep() {
  const c = useColors();
  return <TText style={{ fontSize: 11, color: c.ink3 }}>·</TText>;
}

// "0:00" / "12:34" / "1:32:08" — inlined so the chart owns its own number
// formatting and doesn't pull a circular dep on the data layer.
function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  return `${m}:${String(rest).padStart(2, '0')}`;
}
