// One frame of the route flythrough film, as a pure function of `progress`.
// Used as VideoExportModal's renderFrame payload — no state, no animation,
// no data fetching. Frame N is identical whether rendered live or off-screen.

import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { distUnit, fmtPace, fmtTime, paceUnit } from '../lib/format';
import { useColors } from './theme';
import type { Units } from './theme';
import { Eyebrow, TText } from './typography';
import { choreograph, pointAtFrac, type Pt, type Transform } from '../analytics/routeFilmCamera';

const BASE_STROKE = 7; // on-screen px; divided by zoom so it stays constant
const PLAYHEAD_R = 9;

interface Props {
  progress: number;
  points: Pt[];
  cum: number[];
  fit: Transform;
  totalKm: number;
  units: Units;
  title: string;
  place: string;
  /** Total moving time in seconds — the clock ticks to this at full reveal. */
  seconds: number;
  /** Average pace (sec/km) — fallback when no per-point pace stream exists. */
  avgPace: number;
  /** Average HR (bpm) — fallback when no per-point HR stream exists. */
  avgHr: number;
  streamHr?: number[];
  streamPace?: number[];
  width: number;
  height: number;
}

function toPath(points: readonly Pt[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

// Sample an evenly-spaced series at fraction f∈[0,1] with linear interpolation.
function sampleAt(arr: number[], f: number): number {
  const n = arr.length;
  if (n === 1) return arr[0];
  const pos = Math.max(0, Math.min(1, f)) * (n - 1);
  const i = Math.floor(pos);
  const a = arr[i];
  const b = arr[Math.min(n - 1, i + 1)];
  return a + (b - a) * (pos - i);
}

export function RouteFilmFrame({
  progress,
  points,
  cum,
  fit,
  totalKm,
  units,
  title,
  place,
  seconds,
  avgPace,
  avgHr,
  streamHr,
  streamPace,
  width,
  height,
}: Props) {
  const c = useColors();
  const cam = choreograph(progress, fit, points, cum);
  const total = cum[cum.length - 1] || 1;
  const d = toPath(points);

  // Camera transform: translate so cam.center sits at viewport center, then scale.
  const tx = width / 2 - cam.center.x * cam.zoom;
  const ty = height / 2 - cam.center.y * cam.zoom;
  const stroke = BASE_STROKE / cam.zoom; // keep on-screen width ~constant

  // Playhead drawn in screen space (constant radius) at the trail tip.
  const head = pointAtFrac(points, cum, cam.trailFrac);
  const headX = width / 2 + (head.x - cam.center.x) * cam.zoom;
  const headY = height / 2 + (head.y - cam.center.y) * cam.zoom;

  // Counter ticks in the user's unit; 1 decimal reads cleaner than fmtDist's 2 for an animated number.
  const distTotal = units === 'mi' ? totalKm / 1.609 : totalKm;
  const value = (cam.trailFrac * distTotal).toFixed(1);
  const unitLabel = distUnit(units).toUpperCase();

  // Secondary metrics, ticking up with the trail. Pace/HR sample their per-point
  // stream when present, else hold the run average; a metric with neither is omitted.
  const hasPace = (streamPace?.length ?? 0) > 1 || avgPace > 0;
  const hasHr = (streamHr?.length ?? 0) > 1 || avgHr > 0;
  const paceNow = streamPace && streamPace.length > 1 ? sampleAt(streamPace, cam.trailFrac) : avgPace;
  const hrNow = streamHr && streamHr.length > 1 ? Math.round(sampleAt(streamHr, cam.trailFrac)) : avgHr;
  const stats: Array<{ label: string; value: string; unit?: string }> = [
    { label: 'TIME', value: fmtTime(seconds * cam.trailFrac) },
  ];
  if (hasPace) stats.push({ label: 'PACE', value: fmtPace(paceNow, units), unit: paceUnit(units) });
  if (hasHr) stats.push({ label: 'HR', value: String(hrNow), unit: 'BPM' });

  return (
    <View style={{ width, height, backgroundColor: c.paper, overflow: 'hidden' }}>
      <Svg width={width} height={height}>
        <G transform={`translate(${tx} ${ty}) scale(${cam.zoom})`}>
          {/* ghost full route */}
          <Path d={d} stroke={c.line} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* building trail (solar), revealed by dashoffset in path units */}
          <Path
            d={d}
            stroke={c.accent}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${total} ${total}`}
            strokeDashoffset={total * (1 - cam.trailFrac)}
          />
        </G>
        {cam.playheadVisible ? (
          <Circle cx={headX} cy={headY} r={PLAYHEAD_R} fill={c.ink} stroke={c.paper} strokeWidth={3} />
        ) : null}
      </Svg>

      {/* Screen-space text overlay (outside the camera transform). */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, padding: width * 0.06, justifyContent: 'space-between' }}
      >
        <View>
          <Eyebrow style={{ color: c.ink3, fontSize: width * 0.026, letterSpacing: 2 }}>
            {place.toUpperCase()}
          </Eyebrow>
          {/* serif title sits a hair larger (0.062) than the mono km figure (0.06) on purpose */}
          <TText variant="serifItalic" style={{ color: c.ink, fontSize: width * 0.062 }}>
            {title}
          </TText>
        </View>
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <TText variant="monoSemi" style={{ color: c.ink, fontSize: width * 0.06 }}>
              {value}
              <TText variant="mono" style={{ color: c.ink3, fontSize: width * 0.022 }}> {unitLabel}</TText>
            </TText>
            <Eyebrow style={{ color: c.ink3, fontSize: width * 0.022, letterSpacing: 1.5 }}>VIA RUNSTAMP</Eyebrow>
          </View>
          {/* Secondary stat strip: TIME · PACE · HR, in sync with the distance counter. */}
          <View style={{ flexDirection: 'row', marginTop: width * 0.035 }}>
            {stats.map((s, i) => (
              <View key={s.label} style={{ marginRight: i < stats.length - 1 ? width * 0.07 : 0 }}>
                <Eyebrow style={{ color: c.ink3, fontSize: width * 0.02, letterSpacing: 1.5 }}>{s.label}</Eyebrow>
                <TText variant="monoSemi" style={{ color: c.ink, fontSize: width * 0.038, marginTop: width * 0.008 }}>
                  {s.value}
                  {s.unit ? <TText variant="mono" style={{ color: c.ink3, fontSize: width * 0.018 }}> {s.unit}</TText> : null}
                </TText>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
