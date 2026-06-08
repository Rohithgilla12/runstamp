import React from 'react';
import { View } from 'react-native';
import Svg, { G, Line, Path, Rect } from 'react-native-svg';
import type { Activity } from '../../data/models';
import { distUnit, fmtDist, fmtPace, fmtTime } from '../../lib/format';
import { useColors } from '../theme';
import { TText, Eyebrow } from '../typography';
import { RouteMap } from '../RouteMap';
import { EYEBROW_SIZE, PAD, formatLongDate, type Units } from './shared';
import { EditableField } from '../../editor/text/EditableField';
import { titleField } from '../../editor/text/EditFieldContext';

interface Props {
  run: Activity;
  width: number;
  height: number;
  background: 'map' | 'photo' | 'solid';
  units?: Units;
  photoUri?: string | null;
  rawLatLng?: ReadonlyArray<readonly [number, number]> | null;
  hideAttribution?: boolean;
}

// Seeded LCG — Mulberry32, deterministic. No Math.random() in render; seed
// derived from run.id so the contour field is stable across re-renders.
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = s + 0x6d2b79f5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 0xffffffff;
  };
}

function seedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Survey-grade coordinate eyebrow. Real lat/lon when present (DMS-style),
// else a generic profile label so the slot is never empty.
function surveyEyebrow(run: Activity): string {
  if (typeof run.startLat === 'number' && typeof run.startLon === 'number') {
    return `${dms(run.startLat, 'NS')}  ${dms(run.startLon, 'EW')}`;
  }
  return 'ELEVATION PROFILE';
}

function dms(value: number, axis: 'NS' | 'EW'): string {
  const hemi = value >= 0 ? axis[0] : axis[1];
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const min = Math.floor((abs - deg) * 60);
  return `${deg}°${String(min).padStart(2, '0')}′${hemi}`;
}

// TopographicTemplate
//
// Elevation-as-terrain, like a topographic survey-map stamp. A faint engraved
// field of stacked contour bands (density + curvature seeded from run.id)
// fills the card; the route sits inside a ruled survey frame; ELEVATION GAIN
// is the hero, set huge in JetBrains Mono. If the run has no elevation, the
// hero falls back to distance. Paper backdrop, ink contours, one solar pop on
// the benchmark contour line.
export function TopographicTemplate({ run, width, height, background, units = 'km', photoUri, rawLatLng, hideAttribution }: Props) {
  const c = useColors();

  const hasElev = run.elev > 0;
  const heroValue = hasElev ? `${run.elev}` : fmtDist(run.distance, units);
  const heroUnit = hasElev ? 'M' : distUnit(units).toUpperCase();
  const heroLabel = hasElev ? 'ELEVATION GAIN' : 'DISTANCE';
  const heroFont = Math.min(width * 0.34, 132);

  // The route inset is a contained backdrop element — a small survey window in
  // the upper band, never full-bleed. Letting the contours + type lead is the
  // whole point of this template.
  const frameX = PAD.xl;
  const frameW = width - PAD.xl * 2;
  const frameTop = PAD.xl + 30;
  const frameH = Math.min(height * 0.34, frameW * 0.62);

  // photoUri is part of the shared template contract; this template is a
  // paper-and-ink survey sheet and intentionally does not key off a photo.
  void photoUri;

  return (
    <View style={{ width, height, position: 'relative', backgroundColor: c.paper, overflow: 'hidden' }}>
      {/* Engraved contour field — faint ink hairlines across the whole sheet,
          one solar benchmark line. Density + curvature seeded from run.id. */}
      <ContourField
        width={width}
        height={height}
        seed={seedFromId(run.id)}
        inkLine={c.line}
        inkFaint={c.line2}
        accent={c.accent}
      />

      {/* Solid / map backgrounds tint the field rather than dominate it. */}
      {background === 'solid' && (
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0, backgroundColor: c.accent, opacity: 0.035 }} />
      )}

      {/* Top: survey coordinate eyebrow + serif title. */}
      <View style={{ paddingHorizontal: PAD.xl, paddingTop: PAD.xl + 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Eyebrow style={{ color: c.ink3, fontSize: EYEBROW_SIZE, flex: 1 }} numberOfLines={1}>
            {surveyEyebrow(run)}
          </Eyebrow>
          <Eyebrow style={{ color: c.ink3, fontSize: EYEBROW_SIZE, marginLeft: PAD.md }}>
            {formatLongDate(run.date)}
          </Eyebrow>
        </View>
        <EditableField field={titleField(run)}>
          <TText
            variant="serifItalic"
            style={{ fontSize: 22, color: c.ink, marginTop: 5, lineHeight: 26, letterSpacing: -0.3 }}
            numberOfLines={1}
          >
            {run.title}
          </TText>
        </EditableField>
      </View>

      {/* Contained route window — a ruled survey frame with corner ticks. */}
      <View style={{ position: 'absolute', left: frameX, top: frameTop, width: frameW, height: frameH }}>
        <View style={{ position: 'absolute', inset: 0, overflow: 'hidden', backgroundColor: c.paper2, opacity: 0.55 }}>
          {background === 'map' ? (
            <RouteMap
              rawLatLng={rawLatLng}
              width={frameW}
              height={frameH}
              style="light"
              accent={c.accent}
              routeStrokeWidth={2.5}
              animate={false}
              flat
            />
          ) : (
            <RouteMap
              width={frameW}
              height={frameH}
              style="light"
              accent={c.accent}
              routeStrokeWidth={2.5}
              animate={false}
              flat
            />
          )}
        </View>
        <SurveyFrame width={frameW} height={frameH} ink={c.ink2} />
        {/* Window label — survey-sheet caption in the corner. */}
        <View style={{ position: 'absolute', top: 6, left: 8 }}>
          <Eyebrow style={{ color: c.ink3, fontSize: EYEBROW_SIZE }}>
            {(run.place || run.city || 'PLOT').toUpperCase()}
          </Eyebrow>
        </View>
      </View>

      {/* Hero — elevation gain (or distance fallback) dominates the lower half. */}
      <View style={{ position: 'absolute', left: PAD.xl, right: PAD.xl, bottom: PAD.xl + 44 }}>
        <Eyebrow style={{ color: c.ink3, fontSize: EYEBROW_SIZE }}>{heroLabel}</Eyebrow>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
          <TText
            variant="monoSemi"
            style={{ fontSize: heroFont, lineHeight: heroFont, letterSpacing: -4, color: c.ink }}
          >
            {heroValue}
          </TText>
          <TText
            variant="mono"
            style={{ fontSize: 18, color: c.ink3, marginLeft: 8, letterSpacing: 1 }}
          >
            {heroUnit}
          </TText>
        </View>
      </View>

      {/* Quiet supporting row — distance / pace / time on a ruled baseline. */}
      <View style={{
        position: 'absolute', left: PAD.xl, right: PAD.xl, bottom: PAD.lg,
        flexDirection: 'row',
        borderTopWidth: 0.6, borderTopColor: c.line,
        paddingTop: PAD.sm,
        alignItems: 'flex-end',
      }}>
        {hasElev && (
          <>
            <SupportStat label="DIST" value={`${fmtDist(run.distance, units)}`} unit={distUnit(units)} ink={c.ink} sub={c.ink3} />
            <Tick ink={c.line} />
          </>
        )}
        <SupportStat label="PACE" value={fmtPace(run.pace, units)} unit={`/${distUnit(units)}`} ink={c.ink} sub={c.ink3} />
        <Tick ink={c.line} />
        <SupportStat label="TIME" value={fmtTime(run.seconds)} ink={c.ink} sub={c.ink3} />
        {!hasElev && (
          <>
            <Tick ink={c.line} />
            <SupportStat label="ELEV" value="0" unit="m" ink={c.ink3} sub={c.ink3} />
          </>
        )}
      </View>

      {/* Footer mark — paper-thin "RUNSTAMP" so the survey sheet is signed. */}
      {!hideAttribution && (
        <View style={{ position: 'absolute', bottom: 3, right: PAD.xl }}>
          <TText variant="mono" style={{ fontSize: 7, color: c.ink3, letterSpacing: 3, opacity: 0.55 }}>RUNSTAMP</TText>
        </View>
      )}
    </View>
  );
}

function SupportStat({ label, value, unit, ink, sub }: { label: string; value: string; unit?: string; ink: string; sub: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Eyebrow style={{ color: sub, fontSize: EYEBROW_SIZE }}>{label}</Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 3 }}>
        <TText variant="mono" style={{ fontSize: 15, color: ink, letterSpacing: -0.3 }}>{value}</TText>
        {unit && (
          <TText variant="mono" style={{ fontSize: 9, color: sub, marginLeft: 3, letterSpacing: 0.3 }}>{unit}</TText>
        )}
      </View>
    </View>
  );
}

function Tick({ ink }: { ink: string }) {
  return <View style={{ width: 0.6, height: 22, backgroundColor: ink, marginHorizontal: PAD.sm }} />;
}

// Ruled survey frame: hairline border with inset corner ticks, like the neat
// line on a topographic map sheet.
function SurveyFrame({ width, height, ink }: { width: number; height: number; ink: string }) {
  const t = 7;
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      <Rect x={0.6} y={0.6} width={width - 1.2} height={height - 1.2} fill="none" stroke={ink} strokeWidth={1} opacity={0.6} />
      {/* Corner ticks reaching inward. */}
      <G stroke={ink} strokeWidth={1} opacity={0.6}>
        <Line x1={0} y1={0} x2={t} y2={0} />
        <Line x1={0} y1={0} x2={0} y2={t} />
        <Line x1={width} y1={0} x2={width - t} y2={0} />
        <Line x1={width} y1={0} x2={width} y2={t} />
        <Line x1={0} y1={height} x2={t} y2={height} />
        <Line x1={0} y1={height} x2={0} y2={height - t} />
        <Line x1={width} y1={height} x2={width - t} y2={height} />
        <Line x1={width} y1={height} x2={width} y2={height - t} />
      </G>
    </Svg>
  );
}

interface ContourFieldProps {
  width: number;
  height: number;
  seed: number;
  inkLine: string;
  inkFaint: string;
  accent: string;
}

// Stacked smooth wavy horizontal bands — a faint engraved contour field. Each
// band is a cubic-smoothed sine ridge; amplitude, phase and curvature are
// seeded from run.id so two runs render distinct terrain but the same run is
// always identical. One band near the lower third is drawn in solar as the
// benchmark contour (the single warm pop).
function ContourField({ width, height, seed, inkLine, inkFaint, accent }: ContourFieldProps) {
  const rand = mulberry32(seed);

  // Band count scales with height; clamp so dense cards stay legible.
  const count = Math.max(14, Math.min(26, Math.round(height / 26)));
  const spacing = height / (count + 1);

  // Per-field wave character — two superimposed frequencies for organic ridges.
  const baseFreq = 1.4 + rand() * 1.6;
  const baseAmp = spacing * (0.42 + rand() * 0.4);
  const drift = rand() * Math.PI * 2;

  // Sample points across the width for the smoothed path.
  const samples = 12;
  const benchmarkIndex = Math.round(count * 0.64);

  const bands: { d: string; isBenchmark: boolean }[] = [];
  for (let b = 0; b < count; b++) {
    const baseY = spacing * (b + 1);
    // Each band gets its own phase + a slowly varying amplitude so ridges
    // wander down the sheet like real contour lines.
    const phase = drift + b * 0.55;
    const amp = baseAmp * (0.6 + 0.4 * Math.sin(b * 0.7 + drift));
    const freq = baseFreq * (0.85 + rand() * 0.3);

    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const x = -width * 0.06 + t * (width * 1.12);
      const y =
        baseY +
        amp * Math.sin(t * Math.PI * 2 * freq + phase) +
        amp * 0.35 * Math.sin(t * Math.PI * 2 * (freq * 2.3) + phase * 1.7);
      pts.push({ x, y });
    }
    bands.push({ d: smoothPath(pts), isBenchmark: b === benchmarkIndex });
  }

  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      {bands.map((band, i) => (
        <Path
          key={i}
          d={band.d}
          fill="none"
          stroke={band.isBenchmark ? accent : i % 3 === 0 ? inkLine : inkFaint}
          strokeWidth={band.isBenchmark ? 1.4 : 1}
          strokeLinecap="round"
          opacity={band.isBenchmark ? 0.5 : 1}
        />
      ))}
    </Svg>
  );
}

// Catmull-Rom → cubic Bézier smoothing so the contour bands read as flowing
// engraved lines rather than polylines.
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}
