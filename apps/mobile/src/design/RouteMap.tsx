import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
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

const STYLES = {
  light: { bg: '#e8e1d1', land: '#dfd6c0', park: '#cdd5b6', water: '#bcd4d8', road: '#f3ede2', roadLine: '#c9bea7' },
  dark:  { bg: '#1d1a16', land: '#26221c', park: '#2a2e22', water: '#1a2a30', road: '#2e2925', roadLine: '#3e362a' },
  sat:   { bg: '#222',    land: '#1f2a1a', park: '#2c3a22', water: '#1c2a36', road: '#3a3a36', roadLine: '#4a4a44' }
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

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={0} y={0} width={width} height={height} fill={s.bg} />
      <Ellipse cx={width * 0.55} cy={height * 0.45} rx={width * 0.25} ry={height * 0.28} fill={s.park} opacity={0.85} />
      <Ellipse cx={width * 0.18} cy={height * 0.7} rx={width * 0.18} ry={height * 0.18} fill={s.park} opacity={0.6} />
      <Path
        d={`M0 ${height * 0.78} Q${width * 0.3} ${height * 0.72} ${width * 0.6} ${height * 0.84} T${width} ${height * 0.82} L${width} ${height} L0 ${height}Z`}
        fill={s.water}
        opacity={0.85}
      />
      {[0.25, 0.55, 0.85].map((y, i) => (
        <Line key={`h${i}`} x1={0} y1={height * y} x2={width} y2={height * y} stroke={s.road} strokeWidth={i === 1 ? 6 : 3} />
      ))}
      {[0.2, 0.45, 0.7].map((x, i) => (
        <Line key={`v${i}`} x1={width * x} y1={0} x2={width * x} y2={height} stroke={s.road} strokeWidth={i === 1 ? 5 : 2.5} />
      ))}
      <Line x1={0} y1={height * 0.55} x2={width} y2={height * 0.55} stroke={s.roadLine} strokeWidth={0.5} strokeDasharray="4 6" />
      <Path d={d} fill="none" stroke={a} strokeWidth={routeStrokeWidth * 2} strokeLinecap="round" strokeLinejoin="round" opacity={0.18} />
      <Path d={d} fill="none" stroke={a} strokeWidth={routeStrokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={sx} cy={sy} r={6} fill="#fff" stroke={a} strokeWidth={2} />
      <Circle cx={sx} cy={sy} r={2.5} fill={a} />
      <Circle cx={ex} cy={ey} r={5} fill={a} />
      {!flat && (
        <G transform={`translate(${width - 26},20)`}>
          <SvgText x={0} y={0} fontSize={9} fill={resolvedStyle === 'dark' ? '#8a8170' : '#75695a'} textAnchor="middle">
            N
          </SvgText>
          <Path d="M0 4 L-3 10 L0 8 L3 10 Z" fill={resolvedStyle === 'dark' ? '#8a8170' : '#75695a'} />
        </G>
      )}
    </Svg>
  );
}
