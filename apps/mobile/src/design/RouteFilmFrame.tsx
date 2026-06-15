// One frame of the route flythrough film, as a pure function of `progress`.
// Used as VideoExportModal's renderFrame payload — no state, no animation,
// no data fetching. Frame N is identical whether rendered live or off-screen.

import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { useColors } from './theme';
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
  title: string;
  place: string;
  width: number;
  height: number;
}

function toPath(points: readonly Pt[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

export function RouteFilmFrame({ progress, points, cum, fit, totalKm, title, place, width, height }: Props) {
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

  const km = (cam.trailFrac * totalKm).toFixed(1);

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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <TText variant="monoSemi" style={{ color: c.ink, fontSize: width * 0.06 }}>
            {km}
            <TText variant="mono" style={{ color: c.ink3, fontSize: width * 0.022 }}> KM</TText>
          </TText>
          <Eyebrow style={{ color: c.ink3, fontSize: width * 0.022, letterSpacing: 1.5 }}>VIA RUNSTAMP</Eyebrow>
        </View>
      </View>
    </View>
  );
}
