// PeriodShareCard
//
// One-tap shareable "summary card" for an analytics scope (week / month /
// year / all-time). Composed at a fixed 4:5 ratio (360 × 450 logical units;
// captureRef renders at the device pixel ratio for retina output). Used by
// AnalyticsScreen's hero share button — rendered off-screen via an absolute
// position, captured by ref, then handed to the OS share sheet.
//
// Design follows the brand brief in .impeccable.md: cream paper, ink text,
// one solar pop, "type carries the load." No fake decoration. The headline
// distance is the focal point; supporting stats are a single quiet row; the
// mini chart shows the shape of the period without competing with the
// number.

import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useColors } from './theme';
import { TText, Eyebrow } from './typography';
import { RunstampMark } from './RunstampMark';

export const PERIOD_SHARE_WIDTH = 360;
export const PERIOD_SHARE_HEIGHT = 450;

export interface PeriodSummary {
  scope: 'week' | 'month' | 'year' | 'all';
  /** Eyebrow label — "MAY 2026", "2026", "MAY 12 → 18", "LIFETIME". */
  label: string;
  totalKm: number;
  runs: number;
  totalSec: number;
  longestKm: number;
  streakDays: number;
  /** Mini visualization bars in chronological order (7 / 4-5 / 12 / N). */
  miniBars: number[];
  /** Caption under the mini chart — "by day", "by week", "by month". */
  miniCaption: string;
  units: 'km' | 'mi';
}

interface Props {
  summary: PeriodSummary;
}

const W = PERIOD_SHARE_WIDTH;
const H = PERIOD_SHARE_HEIGHT;
const PAD = 26;
const MINI_H = 70;

export function PeriodShareCard({ summary }: Props) {
  const c = useColors();
  const distLabel = formatDist(summary.totalKm, summary.units);
  const distUnit = summary.units === 'mi' ? 'mi' : 'km';
  const longestLabel = formatDist(summary.longestKm, summary.units);
  const durLabel = formatDuration(summary.totalSec);

  return (
    <View style={{ width: W, height: H, backgroundColor: c.paper, padding: PAD, position: 'relative' }}>
      {/* Top row: postmark circle + eyebrow on the right. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Postmark />
        <Eyebrow style={{ color: c.ink3, fontSize: 10, letterSpacing: 1.4 }}>VIA RUNSTAMP</Eyebrow>
      </View>

      <Eyebrow style={{ marginTop: 18, color: c.ink2, fontSize: 11, letterSpacing: 1.6 }}>
        {summary.label.toUpperCase()}
      </Eyebrow>

      {/* Headline distance — the focal point. */}
      <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'baseline' }}>
        <TText
          variant="monoMedium"
          style={{ fontSize: 92, lineHeight: 96, letterSpacing: -3, color: c.ink }}
        >
          {distLabel}
        </TText>
        <TText
          variant="serifItalic"
          style={{ fontSize: 30, color: c.ink2, marginLeft: 10, letterSpacing: -0.6 }}
        >
          {distUnit}
        </TText>
      </View>

      {/* Supporting stats — runs · time. Streak gets the solar pop. */}
      <View style={{ marginTop: 14, flexDirection: 'row', gap: 18 }}>
        <Stat label="RUNS" value={String(summary.runs)} />
        <Stat label="TIME" value={durLabel} />
        <Stat label="LONGEST" value={`${longestLabel} ${distUnit}`} />
      </View>
      {summary.streakDays > 1 && (
        <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent }} />
          <TText variant="mono" style={{ fontSize: 11, color: c.accent, letterSpacing: 0.5 }}>
            {summary.streakDays}-DAY STREAK
          </TText>
        </View>
      )}

      {/* Mini chart — chronological bars, normalized to the peak. Always 70pt
          tall so the card composition is stable across scopes. */}
      <View style={{ position: 'absolute', left: PAD, right: PAD, bottom: 52 }}>
        <MiniBars values={summary.miniBars} accent={c.accent} ink={c.ink} />
        <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Eyebrow style={{ color: c.ink3, fontSize: 9, letterSpacing: 1.2 }}>
            {summary.miniCaption.toUpperCase()}
          </Eyebrow>
          <Eyebrow style={{ color: c.ink3, fontSize: 9, letterSpacing: 1.2 }}>
            PEAK {formatDist(Math.max(...summary.miniBars, 0), summary.units)} {distUnit}
          </Eyebrow>
        </View>
      </View>

      {/* Footer lockup. */}
      <View style={{ position: 'absolute', left: PAD, right: PAD, bottom: PAD - 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <RunstampMark tone="ink" opacity={0.55} />
        <TText variant="mono" style={{ fontSize: 9, color: c.ink3, letterSpacing: 1.4 }}>
          {new Date().getFullYear()}
        </TText>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 2 }}>
      <Eyebrow style={{ color: c.ink3, fontSize: 9, letterSpacing: 1.2 }}>{label}</Eyebrow>
      <TText variant="monoMedium" style={{ fontSize: 15, color: c.ink, letterSpacing: -0.2 }}>
        {value}
      </TText>
    </View>
  );
}

function MiniBars({ values, accent, ink }: { values: number[]; accent: string; ink: string }) {
  const width = W - PAD * 2;
  const height = MINI_H;
  if (values.length === 0) {
    return <View style={{ width, height }} />;
  }
  const max = Math.max(...values, 0.0001);
  const gap = values.length > 14 ? 1 : 3;
  const barW = Math.max(2, (width - gap * (values.length - 1)) / values.length);
  // Solar pop only on the peak bar — "one warm pop per surface."
  const peakIdx = values.indexOf(max);
  return (
    <Svg width={width} height={height}>
      <Rect x={0} y={height - 1} width={width} height={1} fill={ink} opacity={0.15} />
      {values.map((v, i) => {
        const h = Math.max(2, (v / max) * (height - 6));
        const x = i * (barW + gap);
        const y = height - h - 1;
        const isPeak = i === peakIdx && v > 0;
        return (
          <Rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={h}
            rx={1.2}
            fill={isPeak ? accent : ink}
            opacity={isPeak ? 1 : 0.78}
          />
        );
      })}
    </Svg>
  );
}

// Postmark circle — a quiet brand motif that reads as "stamped" without
// shouting. ~36pt diameter; dashed outer ring + tiny crosshair, matching
// the postmark vocabulary from the editor templates.
function Postmark() {
  const c = useColors();
  const size = 38;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1} stroke={c.ink} strokeWidth={1} fill="none" opacity={0.7} />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 4}
        stroke={c.ink}
        strokeWidth={0.5}
        strokeDasharray="2 2"
        fill="none"
        opacity={0.55}
      />
      <SvgText
        x={size / 2}
        y={size / 2 + 4}
        textAnchor="middle"
        fontSize={10}
        fontWeight="600"
        fill={c.ink}
        opacity={0.8}
      >
        RS
      </SvgText>
      <Path d={`M${size / 2} 4 L${size / 2} 9`} stroke={c.ink} strokeWidth={0.5} opacity={0.5} />
      <Path d={`M${size / 2} ${size - 9} L${size / 2} ${size - 4}`} stroke={c.ink} strokeWidth={0.5} opacity={0.5} />
    </Svg>
  );
}

function formatDist(km: number, units: 'km' | 'mi'): string {
  const v = units === 'mi' ? km / 1.609 : km;
  if (v >= 1000) return v.toFixed(0);
  if (v >= 100) return v.toFixed(0);
  return v.toFixed(1).replace(/\.0$/, '');
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}
