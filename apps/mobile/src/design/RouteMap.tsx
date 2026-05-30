import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import type { Point } from '../data/models';
import { simplifyPath } from '../analytics/simplifyPath';
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
  points?: readonly Point[];
  /**
   * Privacy-masked raw lat/lng sequence. When provided, RouteMap renders
   * real OpenStreetMap tiles underneath and projects the polyline through
   * the same slippy projection so it aligns pixel-exact. Falls back to the
   * bare paper path when null/undefined (the route-map sticker's normalized
   * polyline, or the honest empty state for routeless runs).
   */
  rawLatLng?: ReadonlyArray<readonly [number, number]> | null;
  width?: number;
  height?: number;
  style?: 'light' | 'dark' | 'sat';
  flat?: boolean;
  accent?: string;
  routeStrokeWidth?: number;
  /**
   * When true (default), the polyline draws itself on mount with an
   * ink-trace animation. Set false for share-card captures or any surface
   * where the final frame is what matters.
   */
  animate?: boolean;
}

// Two paths in this component:
//
// 1. `rawLatLng` present  → render CartoCDN raster tiles as the backdrop +
//    project the polyline through the same Web-Mercator slippy projection so
//    the line traces real streets. This is the share-card / Activity-hero
//    path where the user wants to see where they actually ran.
//
// 2. `rawLatLng` absent   → bare paper backdrop, project the normalized
//    polyline (from useActivityStreams) through a uniform [0..1] -> canvas fit.
//    Used by the route-map sticker; when there's no polyline either, the
//    component renders an honest "no route" state instead of a fake curve.
const STYLES = {
  light: { bg: '#e8e1d1' },
  dark:  { bg: '#1d1a16' },
  sat:   { bg: '#222'    },
} as const;

// Drop polyline vertices that sit within this many pixels of the simplified
// line. Below ~1px the detail is sub-pixel; 0.75 keeps the route visually
// identical while collapsing full-resolution GPS tracks to a light SVG path.
const ROUTE_SIMPLIFY_EPSILON = 0.75;

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function RouteMap({
  points,
  rawLatLng,
  width = 358,
  height = 200,
  style,
  flat = false,
  accent,
  routeStrokeWidth = 3,
  animate = true,
}: Props) {
  const c = useColors();
  const { dark } = useTheme();
  const { tileStyle } = useAppState();
  const resolvedStyle = style ?? (dark ? 'dark' : 'light');
  const s = STYLES[resolvedStyle];
  const a = accent ?? c.accent;
  const compassFill = resolvedStyle === 'dark' ? '#8a8170' : '#75695a';

  const pts = points ?? [];
  const useTiles = rawLatLng != null && rawLatLng.length > 1;
  // No tiles and no usable polyline = a routeless run (treadmill/indoor/manual).
  // Render an honest "no route" mark, never a fabricated curve.
  const isEmpty = !useTiles && pts.length < 2;

  const { pathD, sx, sy, ex, ey, bbox, pathLen } = useMemo(() => {
    if (isEmpty) {
      return { pathD: '', sx: 0, sy: 0, ex: 0, ey: 0, bbox: null as BBox | null, pathLen: 0 };
    }
    if (useTiles && rawLatLng) {
      let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
      for (const pt of rawLatLng) {
        if (pt[0] < minLat) minLat = pt[0];
        if (pt[0] > maxLat) maxLat = pt[0];
        if (pt[1] < minLng) minLng = pt[1];
        if (pt[1] > maxLng) maxLng = pt[1];
      }
      const bb: BBox = { minLat, maxLat, minLng, maxLng };
      const z = pickZoom(bb, width, height);
      const { offsetX, offsetY } = centerOffsets(bb, z, width, height);
      const projected: { x: number; y: number }[] = new Array(rawLatLng.length);
      for (let i = 0; i < rawLatLng.length; i++) {
        projected[i] = projectToCanvas(rawLatLng[i][0], rawLatLng[i][1], z, offsetX, offsetY);
      }
      const canvasPts = simplifyPath(projected, ROUTE_SIMPLIFY_EPSILON);
      const segs: string[] = [];
      let len = 0;
      for (let i = 0; i < canvasPts.length; i++) {
        const p = canvasPts[i];
        segs.push(`${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
        if (i > 0) {
          const dx = p.x - canvasPts[i - 1].x;
          const dy = p.y - canvasPts[i - 1].y;
          len += Math.sqrt(dx * dx + dy * dy);
        }
      }
      const first = canvasPts[0];
      const last = canvasPts[canvasPts.length - 1];
      return {
        pathD: segs.join(' '),
        sx: first.x, sy: first.y, ex: last.x, ey: last.y,
        bbox: bb,
        pathLen: len,
      };
    }

    const pad = 18;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rangeX = Math.max(maxX - minX, 0.01);
    const rangeY = Math.max(maxY - minY, 0.01);
    const scale = Math.min((width - pad * 2) / rangeX, (height - pad * 2) / rangeY);
    const offX = (width - rangeX * scale) / 2 - minX * scale;
    const offY = (height - rangeY * scale) / 2 - minY * scale;
    const projected: { x: number; y: number }[] = new Array(pts.length);
    for (let i = 0; i < pts.length; i++) {
      projected[i] = {
        x: pts[i][0] * scale + offX,
        y: pts[i][1] * scale + offY,
      };
    }
    const canvasPts = simplifyPath(projected, ROUTE_SIMPLIFY_EPSILON);
    const segs: string[] = [];
    let len = 0;
    for (let i = 0; i < canvasPts.length; i++) {
      const p = canvasPts[i];
      segs.push(`${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
      if (i > 0) {
        const dx = p.x - canvasPts[i - 1].x;
        const dy = p.y - canvasPts[i - 1].y;
        len += Math.sqrt(dx * dx + dy * dy);
      }
    }
    const first = canvasPts[0];
    const last = canvasPts[canvasPts.length - 1];
    return {
      pathD: segs.join(' '),
      sx: first.x, sy: first.y, ex: last.x, ey: last.y,
      bbox: null as BBox | null,
      pathLen: len,
    };
  }, [isEmpty, useTiles, rawLatLng, pts, width, height]);

  // Honor the system Reduce Motion toggle — flipping it in Settings should
  // affect routes currently on screen.
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      setReduceMotion(v);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const progress = useSharedValue(0);
  const endDotOpacity = useSharedValue(0);
  const shouldAnimate = animate && !reduceMotion && pathLen > 0;

  useEffect(() => {
    if (!shouldAnimate) {
      progress.value = 1;
      endDotOpacity.value = 1;
      return;
    }
    progress.value = 0;
    endDotOpacity.value = 0;
    progress.value = withTiming(1, {
      duration: 1100,
      // Fast start, gentle settle — like a pen losing pressure as it lands.
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
    // Land the dot as the ink completes (~92% of the duration).
    endDotOpacity.value = withDelay(
      1010,
      withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) }),
    );
  }, [pathD, shouldAnimate, progress, endDotOpacity]);

  // dasharray = full length, dashoffset = unrevealed portion. As progress
  // goes 0 → 1, the offset shrinks and the line draws.
  const lineAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: pathLen * (1 - progress.value),
  }));
  const endDotAnimatedProps = useAnimatedProps(() => ({
    opacity: endDotOpacity.value,
  }));

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
      {isEmpty && (
        <SvgText
          x={width / 2}
          y={height / 2}
          fontSize={10}
          fill={compassFill}
          textAnchor="middle"
          opacity={0.7}
          letterSpacing={1}
          fontFamily="System"
        >
          Indoor · no route
        </SvgText>
      )}
      {!isEmpty && (
        <>
          {/* Soft halo under the route so the polyline pops against any backdrop. */}
          <AnimatedPath
            d={pathD}
            fill="none"
            stroke={a}
            strokeWidth={routeStrokeWidth * 2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.18}
            strokeDasharray={`${pathLen} ${pathLen}`}
            animatedProps={lineAnimatedProps}
          />
          <AnimatedPath
            d={pathD}
            fill="none"
            stroke={a}
            strokeWidth={routeStrokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${pathLen} ${pathLen}`}
            animatedProps={lineAnimatedProps}
          />
          <Circle cx={sx} cy={sy} r={6} fill="#fff" stroke={a} strokeWidth={2} />
          <Circle cx={sx} cy={sy} r={2.5} fill={a} />
          <AnimatedCircle cx={ex} cy={ey} r={5} fill={a} animatedProps={endDotAnimatedProps} />
        </>
      )}
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
