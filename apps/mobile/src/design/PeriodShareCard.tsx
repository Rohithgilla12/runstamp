// PeriodShareCard
//
// One-tap shareable "summary card" for an analytics scope (week / month /
// year / all-time). Composed at a 4:5 ratio (360 × 450 logical units at
// scale=1; multiplied at the call site for higher-density renders). Used
// by AnalyticsScreen's hero share button — rendered off-screen via an
// absolute position, captured by ref, then handed to the OS share sheet.
//
// The `scale` prop exists because video exports go to Instagram Stories
// where the playback area is ~1080×1350 for 4:5 content. Rendering this
// card at 360×450 then upscaling produced blurry text on iPhone. Setting
// scale=3 at the call site re-renders the entire card (including SVG
// rasterization for the mini chart + postmark) at 3x dimensions, so
// captureRef can downsample-with-detail to the final encoded size.
//
// Design follows the brand brief in .impeccable.md: cream paper, ink text,
// one solar pop, "type carries the load." No fake decoration.

import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useColors } from './theme';
import { TText, Eyebrow } from './typography';
import { RunstampMark } from './RunstampMark';
import { easeInOut, staggeredT } from './charts/reveal';

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
  /**
   * 0..1 reveal progress. Undefined = static (current behavior, used in
   * still-PNG capture). When set, headline numbers tick up, mini-bars
   * stagger-rise, supporting stats fade in late. Drives video export.
   */
  progress?: number;
  /**
   * Linear scale factor for every spatial dimension (width, padding, font
   * size, etc.). Defaults to 1 for in-app rendering. Set to 3 for video
   * export so the resulting MP4 lands at 1080×1350 with crisp text/SVG.
   */
  scale?: number;
}

export function PeriodShareCard({ summary, progress, scale = 1 }: Props) {
  const c = useColors();
  const s = scale;
  const revealing = progress !== undefined;

  const W = PERIOD_SHARE_WIDTH * s;
  const H = PERIOD_SHARE_HEIGHT * s;
  const PAD = 26 * s;
  const MINI_H = 70 * s;

  // During reveal: headline number counts up over the first 60% of the
  // animation, supporting stats fade in 50–80%, mini-bars stagger across
  // 40–100%. Eased so it doesn't feel mechanical at the endpoints.
  const headlineT = revealing ? easeInOut(clamp01(progress / 0.6)) : 1;
  const statsT = revealing ? clamp01((progress - 0.5) / 0.3) : 1;
  const miniProgress = revealing ? clamp01((progress - 0.4) / 0.6) : undefined;

  const animatedKm = summary.totalKm * headlineT;
  const animatedRuns = Math.round(summary.runs * headlineT);
  const animatedSec = summary.totalSec * headlineT;
  const animatedLongest = summary.longestKm * headlineT;

  const distLabel = formatDist(revealing ? animatedKm : summary.totalKm, summary.units);
  const distUnit = summary.units === 'mi' ? 'mi' : 'km';
  const longestLabel = formatDist(revealing ? animatedLongest : summary.longestKm, summary.units);
  const durLabel = formatDuration(revealing ? animatedSec : summary.totalSec);
  const runsValue = revealing ? String(animatedRuns) : String(summary.runs);

  return (
    <View style={{ width: W, height: H, backgroundColor: c.paper, padding: PAD, position: 'relative' }}>
      {/* Top row: postmark circle + eyebrow on the right. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Postmark scale={s} />
        <Eyebrow style={{ color: c.ink3, fontSize: 10 * s, letterSpacing: 1.4 * s }}>VIA RUNSTAMP</Eyebrow>
      </View>

      <Eyebrow style={{ marginTop: 18 * s, color: c.ink2, fontSize: 11 * s, letterSpacing: 1.6 * s }}>
        {summary.label.toUpperCase()}
      </Eyebrow>

      {/* Headline distance — the focal point. */}
      <View style={{ marginTop: 6 * s, flexDirection: 'row', alignItems: 'baseline' }}>
        <TText
          variant="monoMedium"
          style={{ fontSize: 92 * s, lineHeight: 96 * s, letterSpacing: -3 * s, color: c.ink }}
        >
          {distLabel}
        </TText>
        <TText
          variant="serifItalic"
          style={{ fontSize: 30 * s, color: c.ink2, marginLeft: 10 * s, letterSpacing: -0.6 * s }}
        >
          {distUnit}
        </TText>
      </View>

      {/* Supporting stats — runs · time. Streak gets the solar pop. */}
      <View style={{ marginTop: 14 * s, flexDirection: 'row', gap: 18 * s, opacity: statsT }}>
        <Stat label="RUNS" value={runsValue} scale={s} />
        <Stat label="TIME" value={durLabel} scale={s} />
        <Stat label="LONGEST" value={`${longestLabel} ${distUnit}`} scale={s} />
      </View>
      {summary.streakDays > 1 && (
        <View style={{ marginTop: 10 * s, flexDirection: 'row', alignItems: 'center', gap: 6 * s, opacity: statsT }}>
          <View style={{ width: 6 * s, height: 6 * s, borderRadius: 3 * s, backgroundColor: c.accent }} />
          <TText variant="mono" style={{ fontSize: 11 * s, color: c.accent, letterSpacing: 0.5 * s }}>
            {summary.streakDays}-DAY STREAK
          </TText>
        </View>
      )}

      {/* Mini chart — chronological bars, normalized to the peak. Always
          MINI_H tall so the card composition is stable across scopes. */}
      <View style={{ position: 'absolute', left: PAD, right: PAD, bottom: 52 * s }}>
        <MiniBars
          values={summary.miniBars}
          accent={c.accent}
          ink={c.ink}
          progress={miniProgress}
          width={W - PAD * 2}
          height={MINI_H}
        />
        <View style={{ marginTop: 8 * s, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Eyebrow style={{ color: c.ink3, fontSize: 9 * s, letterSpacing: 1.2 * s }}>
            {summary.miniCaption.toUpperCase()}
          </Eyebrow>
          <Eyebrow style={{ color: c.ink3, fontSize: 9 * s, letterSpacing: 1.2 * s }}>
            PEAK {formatDist(Math.max(...summary.miniBars, 0), summary.units)} {distUnit}
          </Eyebrow>
        </View>
      </View>

      {/* Footer lockup. */}
      <View style={{ position: 'absolute', left: PAD, right: PAD, bottom: PAD - 6 * s, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <RunstampMark tone="ink" opacity={0.55} />
        <TText variant="mono" style={{ fontSize: 9 * s, color: c.ink3, letterSpacing: 1.4 * s }}>
          {new Date().getFullYear()}
        </TText>
      </View>
    </View>
  );
}

function Stat({ label, value, scale: s }: { label: string; value: string; scale: number }) {
  const c = useColors();
  return (
    <View style={{ gap: 2 * s }}>
      <Eyebrow style={{ color: c.ink3, fontSize: 9 * s, letterSpacing: 1.2 * s }}>{label}</Eyebrow>
      <TText variant="monoMedium" style={{ fontSize: 15 * s, color: c.ink, letterSpacing: -0.2 * s }}>
        {value}
      </TText>
    </View>
  );
}

function MiniBars({
  values, accent, ink, progress, width, height,
}: {
  values: number[]; accent: string; ink: string; progress?: number;
  width: number; height: number;
}) {
  if (values.length === 0) {
    return <View style={{ width, height }} />;
  }
  const max = Math.max(...values, 0.0001);
  // Scale gap proportionally to the available width — the visual ratio
  // stays the same as the static version (1px or 3px against ~308px).
  const gap = (values.length > 14 ? 1 : 3) * (width / 308);
  const barW = Math.max(2, (width - gap * (values.length - 1)) / values.length);
  // Solar pop only on the peak bar — "one warm pop per surface."
  const peakIdx = values.indexOf(max);
  const revealing = progress !== undefined;
  return (
    <Svg width={width} height={height}>
      <Rect x={0} y={height - 1} width={width} height={1} fill={ink} opacity={0.15} />
      {values.map((v, i) => {
        const tScale = revealing ? staggeredT(progress, i, values.length) : 1;
        const h = Math.max(2, (v / max) * (height - 6) * tScale);
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

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

// Postmark circle — a quiet brand motif that reads as "stamped" without
// shouting. Native size 38pt; multiplied by scale.
function Postmark({ scale: s }: { scale: number }) {
  const c = useColors();
  const size = 38 * s;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1 * s} stroke={c.ink} strokeWidth={1 * s} fill="none" opacity={0.7} />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 4 * s}
        stroke={c.ink}
        strokeWidth={0.5 * s}
        strokeDasharray={`${2 * s} ${2 * s}`}
        fill="none"
        opacity={0.55}
      />
      <SvgText
        x={size / 2}
        y={size / 2 + 4 * s}
        textAnchor="middle"
        fontSize={10 * s}
        fontWeight="600"
        fill={c.ink}
        opacity={0.8}
      >
        RS
      </SvgText>
      <Path d={`M${size / 2} ${4 * s} L${size / 2} ${9 * s}`} stroke={c.ink} strokeWidth={0.5 * s} opacity={0.5} />
      <Path d={`M${size / 2} ${size - 9 * s} L${size / 2} ${size - 4 * s}`} stroke={c.ink} strokeWidth={0.5 * s} opacity={0.5} />
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
