import React from 'react';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { Point } from '../data/sample';
import { useColors, useTheme } from './theme';
import { MapTilesLayer } from './MapTilesLayer';
import { useAppState } from '../state/AppState';
import {
  TILE_ATTRIBUTION,
  centerOffsets,
  pickZoom,
  projectToCanvas,
  type BBox,
} from '../services/mapTiles';

interface Props {
  /** Normalized [0..1] polyline. Used by the bare paper fallback path. */
  points: readonly Point[];
  /**
   * Privacy-masked raw lat/lng sequence. When provided, RouteMap renders
   * real OpenStreetMap tiles underneath and projects the polyline through
   * the same slippy projection so it aligns pixel-exact. Falls back to the
   * bare paper path when null/undefined (synthetic routes, treadmill runs,
   * the route-map sticker fallback).
   */
  rawLatLng?: ReadonlyArray<readonly [number, number]> | null;
  width?: number;
  height?: number;
  style?: 'light' | 'dark' | 'sat';
  flat?: boolean;
  accent?: string;
  routeStrokeWidth?: number;
}

// Two paths in this component:
//
// 1. `rawLatLng` present  → render CartoCDN raster tiles as the backdrop +
//    project the polyline through the same Web-Mercator slippy projection so
//    the line traces real streets. This is the share-card / Activity-hero
//    path where the user wants to see where they actually ran.
//
// 2. `rawLatLng` absent   → bare paper backdrop, project the normalized
//    polyline through a uniform [0..1] -> canvas fit. This is the path used
//    by synthetic routes (data/sample.ts seed) and the route-map sticker's
//    fallback for indoor / no-GPS runs.
//
// We deliberately don't show fake decoration on the bare path — fake parks
// and road grids at fixed positions had nothing to do with the actual run
// and looked off the moment real GPS rendered through here.
const STYLES = {
  light: { bg: '#e8e1d1' },
  dark:  { bg: '#1d1a16' },
  sat:   { bg: '#222'    },
} as const;

export function RouteMap({
  points,
  rawLatLng,
  width = 358,
  height = 200,
  style,
  flat = false,
  accent,
  routeStrokeWidth = 3
}: Props) {
  const c = useColors();
  const { dark } = useTheme();
  const { tileStyle } = useAppState();
  const resolvedStyle = style ?? (dark ? 'dark' : 'light');
  const s = STYLES[resolvedStyle];
  const a = accent ?? c.accent;
  const compassFill = resolvedStyle === 'dark' ? '#8a8170' : '#75695a';

  const useTiles = rawLatLng != null && rawLatLng.length > 1;

  let pathD: string;
  let sx: number, sy: number, ex: number, ey: number;
  let bbox: BBox | null = null;

  if (useTiles) {
    // Slippy projection — every polyline point shares the same z/offsets as
    // MapTilesLayer below, so they line up to the pixel.
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const pt of rawLatLng) {
      if (pt[0] < minLat) minLat = pt[0];
      if (pt[0] > maxLat) maxLat = pt[0];
      if (pt[1] < minLng) minLng = pt[1];
      if (pt[1] > maxLng) maxLng = pt[1];
    }
    bbox = { minLat, maxLat, minLng, maxLng };
    const z = pickZoom(bbox, width, height);
    const { offsetX, offsetY } = centerOffsets(bbox, z, width, height);
    const segs: string[] = [];
    for (let i = 0; i < rawLatLng.length; i++) {
      const pt = rawLatLng[i];
      const { x, y } = projectToCanvas(pt[0], pt[1], z, offsetX, offsetY);
      segs.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    pathD = segs.join(' ');
    const first = projectToCanvas(rawLatLng[0][0], rawLatLng[0][1], z, offsetX, offsetY);
    const last = projectToCanvas(rawLatLng[rawLatLng.length - 1][0], rawLatLng[rawLatLng.length - 1][1], z, offsetX, offsetY);
    sx = first.x; sy = first.y; ex = last.x; ey = last.y;
  } else {
    // Bare path — fit normalized [0..1] points into the canvas with letterboxing.
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
    pathD = points
      .map((p, i) => {
        const x = p[0] * scale + offX;
        const y = p[1] * scale + offY;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
    const start = points[0];
    const end = points[points.length - 1];
    sx = start[0] * scale + offX;
    sy = start[1] * scale + offY;
    ex = end[0] * scale + offX;
    ey = end[1] * scale + offY;
  }

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Backdrop fill always paints first — even when tiles are loading,
          users see paper, not a transparent rectangle. */}
      <Rect x={0} y={0} width={width} height={height} fill={s.bg} />
      {useTiles && bbox && (
        <MapTilesLayer
          bbox={bbox}
          width={width}
          height={height}
          opacity={resolvedStyle === 'dark' ? 0.5 : 1}
          style={tileStyle}
        />
      )}
      {/* Soft halo under the route so the polyline pops against any backdrop. */}
      <Path d={pathD} fill="none" stroke={a} strokeWidth={routeStrokeWidth * 2.4} strokeLinecap="round" strokeLinejoin="round" opacity={0.18} />
      <Path d={pathD} fill="none" stroke={a} strokeWidth={routeStrokeWidth} strokeLinecap="round" strokeLinejoin="round" />
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
      {/* Attribution — required by CartoCDN's terms. Tiny, bottom-left. Only
          shown when tiles are actually rendered (not on the bare path). */}
      {useTiles && (
        <SvgText
          x={6}
          y={height - 5}
          fontSize={7}
          fill={compassFill}
          opacity={0.7}
          fontFamily="System"
        >
          {TILE_ATTRIBUTION}
        </SvgText>
      )}
    </Svg>
  );
}
