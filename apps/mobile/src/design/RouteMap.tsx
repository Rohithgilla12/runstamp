import React from 'react';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { Point } from '../data/sample';
import { useColors, useTheme } from './theme';

interface Props {
  points: readonly Point[];
  width?: number;
  height?: number;
  style?: 'light' | 'dark' | 'sat';
  flat?: boolean;
  accent?: string;
  routeStrokeWidth?: number;
}

// We dropped the fake parks / water / road-grid decoration that used to sit
// under the route. It looked decorative on the seeded synthetic routes in
// the data/sample.ts era, but the moment we started rendering real GPS
// polylines it became visual noise — fake "roads" at fixed positions that
// had nothing to do with where the user actually ran. The map is now just
// a paper backdrop + the route, with start/end markers and a compass.
const STYLES = {
  light: { bg: '#e8e1d1' },
  dark:  { bg: '#1d1a16' },
  sat:   { bg: '#222'    },
} as const;

export function RouteMap({
  points,
  width = 358,
  height = 200,
  style,
  flat = false,
  accent,
  routeStrokeWidth = 3
}: Props) {
  const c = useColors();
  const { dark } = useTheme();
  const resolvedStyle = style ?? (dark ? 'dark' : 'light');
  const s = STYLES[resolvedStyle];
  const a = accent ?? c.accent;

  const pad = 18;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = Math.max(maxX - minX, 0.01);
  const rangeY = Math.max(maxY - minY, 0.01);
  const scale = Math.min((width - pad * 2) / rangeX, (height - pad * 2) / rangeY);
  const offX = (width - rangeX * scale) / 2 - minX * scale;
  const offY = (height - rangeY * scale) / 2 - minY * scale;

  const d = points
    .map((p, i) => {
      const x = p[0] * scale + offX;
      const y = p[1] * scale + offY;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  const start = points[0];
  const end = points[points.length - 1];
  const sx = start[0] * scale + offX;
  const sy = start[1] * scale + offY;
  const ex = end[0] * scale + offX;
  const ey = end[1] * scale + offY;
  const compassFill = resolvedStyle === 'dark' ? '#8a8170' : '#75695a';

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={0} y={0} width={width} height={height} fill={s.bg} />
      {/* Soft halo under the route so the polyline pops against paper at any tint. */}
      <Path d={d} fill="none" stroke={a} strokeWidth={routeStrokeWidth * 2.4} strokeLinecap="round" strokeLinejoin="round" opacity={0.14} />
      <Path d={d} fill="none" stroke={a} strokeWidth={routeStrokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={sx} cy={sy} r={6} fill="#fff" stroke={a} strokeWidth={2} />
      <Circle cx={sx} cy={sy} r={2.5} fill={a} />
      <Circle cx={ex} cy={ey} r={5} fill={a} />
      {!flat && (
        <G transform={`translate(${width - 26},20)`}>
          <SvgText x={0} y={0} fontSize={9} fill={compassFill} textAnchor="middle">
            N
          </SvgText>
          <Path d="M0 4 L-3 10 L0 8 L3 10 Z" fill={compassFill} />
        </G>
      )}
    </Svg>
  );
}
