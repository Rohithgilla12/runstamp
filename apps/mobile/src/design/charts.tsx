import React from 'react';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { simplifyPath } from '../analytics/simplifyPath';
import { useColors } from './theme';
import type { Palette } from './theme';

// Sub-pixel vertices in a value-series line are invisible but still cost an SVG
// node per point on every render. Collapse them while keeping spikes (RDP keeps
// high-deviation points, so HR/pace peaks survive).
const SERIES_SIMPLIFY_EPSILON = 0.6;

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color,
  fill = true,
  strokeWidth = 1.5
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  strokeWidth?: number;
}) {
  const c = useColors();
  const stroke = color ?? c.accent;
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(max - min, 1);
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - ((v - min) / range) * (height - 4) - 2] as const);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return (
    <Svg width={width} height={height}>
      {fill && <Path d={`${d} L${width} ${height} L0 ${height} Z`} fill={stroke} opacity={0.12} />}
      <Path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function BarChart<T extends Record<string, any>>({
  data,
  width = 320,
  height = 120,
  valKey = 'km' as keyof T,
  labelKey = 'w' as keyof T,
  highlight
}: {
  data: T[];
  width?: number;
  height?: number;
  valKey?: keyof T;
  labelKey?: keyof T;
  highlight?: (d: T, i: number) => boolean;
}) {
  const c = useColors();
  const max = Math.max(...data.map((d) => Number(d[valKey]) || 0)) * 1.1;
  const barW = (width - 24) / data.length - 4;
  return (
    <Svg width={width} height={height + 24}>
      {[0.25, 0.5, 0.75, 1].map((p, i) => (
        <Line key={i} x1={0} y1={height * (1 - p)} x2={width} y2={height * (1 - p)} stroke={c.line2} />
      ))}
      {data.map((d, i) => {
        const h = ((Number(d[valKey]) || 0) / max) * (height - 8);
        const x = i * (barW + 4) + 8;
        const y = height - h;
        const isHi = highlight ? highlight(d, i) : false;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={h} rx={2} fill={isHi ? c.accent : c.ink2} opacity={isHi ? 1 : 0.85} />
            <SvgText x={x + barW / 2} y={height + 14} fontSize={9} fill={c.ink3} textAnchor="middle">
              {String(d[labelKey])}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

export function StreamChart({
  data,
  width = 358,
  height = 160,
  color
}: {
  data: number[];
  width?: number;
  height?: number;
  color: string;
}) {
  const c = useColors();
  const pad = 12;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = (width - pad * 2) / (data.length - 1);
  const y = (v: number) => pad + (height - pad * 2) - ((v - min) / range) * (height - pad * 2);
  const pts = simplifyPath(
    data.map((v, i) => ({ x: pad + i * step, y: y(v) })),
    SERIES_SIMPLIFY_EPSILON,
  );
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return (
    <Svg width={width} height={height}>
      {[0.25, 0.5, 0.75].map((p, i) => (
        <Line key={i} x1={pad} y1={pad + (height - pad * 2) * p} x2={width - pad} y2={pad + (height - pad * 2) * p} stroke={c.line2} />
      ))}
      <Path d={`${d} L${width - pad} ${height - pad} L${pad} ${height - pad} Z`} fill={color} opacity={0.1} />
      <Path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function heatColor(v: number, c: Palette): string {
  if (v === 0) return c.line2;
  if (v === 1) return c.paper3;
  if (v === 2) return c.ink3;
  if (v === 3) return c.ink2;
  return c.accent;
}

export function Heatmap({ data }: { data: number[][] }) {
  const c = useColors();
  const cell = 5;
  const gap = 1.5;
  const w = 52 * (cell + gap);
  const h = 7 * (cell + gap);
  return (
    <Svg width={w} height={h}>
      {data.map((week, wi) =>
        week.map((v, di) => (
          <Rect
            key={`${wi}-${di}`}
            x={wi * (cell + gap)}
            y={di * (cell + gap)}
            width={cell}
            height={cell}
            rx={0.8}
            fill={heatColor(v, c)}
          />
        ))
      )}
    </Svg>
  );
}

export function MiniWorldMap({
  height = 120,
  places
}: {
  height?: number;
  places: { lat: number; lon: number; runs: number; city: string }[];
}) {
  const c = useColors();
  const W = 320;
  const H = height;
  const proj = (lat: number, lon: number) => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H] as const;
  const dots: React.ReactNode[] = [];
  for (let col = 0; col < 28; col++) {
    for (let row = 0; row < 12; row++) {
      const x = (col + 0.5) * (W / 28);
      const y = (row + 0.5) * (H / 12);
      const lat = 90 - (y / H) * 180;
      const lon = (x / W) * 360 - 180;
      const land =
        (lat > 20 && lat < 70 && lon > -130 && lon < -60) ||
        (lat > -55 && lat < 10 && lon > -80 && lon < -35) ||
        (lat > 35 && lat < 70 && lon > -10 && lon < 40) ||
        (lat > -35 && lat < 35 && lon > -15 && lon < 50) ||
        (lat > 5 && lat < 55 && lon > 50 && lon < 140) ||
        (lat > -45 && lat < -10 && lon > 110 && lon < 155);
      if (land) {
        dots.push(<Circle key={`${col}-${row}`} cx={x} cy={y} r={1.4} fill={c.ink3} opacity={0.35} />);
      }
    }
  }
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      {dots}
      {places.map((p, i) => {
        const [x, y] = proj(p.lat, p.lon);
        const r = Math.min(2 + Math.log10(Math.max(p.runs, 1)) * 3, 8);
        return (
          <G key={i}>
            <Circle cx={x} cy={y} r={r + 4} fill={c.accent} opacity={0.18} />
            <Circle cx={x} cy={y} r={r} fill={c.accent} />
          </G>
        );
      })}
    </Svg>
  );
}
