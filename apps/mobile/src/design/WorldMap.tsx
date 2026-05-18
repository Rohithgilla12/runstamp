import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { CITY_FALLBACK, CONTINENTS, toXY, type LonLat } from './worldGeometry';
import { useColors } from './theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const PIN_EASE = Easing.bezier(0.22, 1, 0.36, 1);

export interface MapCity {
  city: string;
  country: string;
  runs: number;
  km: number;
  first: string;        // ISO yyyy-mm-dd
  lat?: number;
  lon?: number;
}

interface Props {
  /** Cities to plot. Each one gets a small postmark dot. */
  cities: MapCity[];
  /** Width of the rendered map. Height auto-derived from 2:1 aspect. */
  width: number;
  /** Optional tap handler — fires with the tapped city. */
  onCityPress?: (city: MapCity) => void;
  /**
   * When true (default), pins fade in one by one on mount. Set false for
   * view-shot captures where the final frame is what matters.
   */
  animate?: boolean;
}

// The world rendered as a vintage philately map. Continents are simplified
// outlines (see worldGeometry.ts), latitudes/longitudes are a faint dotted
// grid, and each visited city gets a small postmark glyph at its projected
// position. Cities without explicit coords fall back to a hand-curated
// city centroid map (also in worldGeometry.ts).
export function WorldMap({ cities, width, onCityPress, animate = true }: Props) {
  const c = useColors();

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (mounted) setReduceMotion(v); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduceMotion(v));
    return () => { mounted = false; sub.remove(); };
  }, []);
  // Equirectangular projection: viewBox 360×180. Aspect ratio is 2:1.
  const height = width * 0.5;

  const projected = useMemo(() => {
    return cities
      .map((city) => {
        let lat = city.lat;
        let lon = city.lon;
        if ((lat === undefined || lon === undefined) && CITY_FALLBACK[city.city]) {
          lat = CITY_FALLBACK[city.city].lat;
          lon = CITY_FALLBACK[city.city].lon;
        }
        if (lat === undefined || lon === undefined) return null;
        const [x, y] = toXY({ lat, lon });
        return { city, x, y };
      })
      .filter((p): p is { city: MapCity; x: number; y: number } => p !== null);
  }, [cities]);

  // Dotted-line route in chronological order — the "shipping route" trace.
  const routePath = useMemo(() => {
    const ordered = [...projected].sort((a, b) => (a.city.first < b.city.first ? -1 : 1));
    if (ordered.length < 2) return '';
    return ordered.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, [projected]);

  // Continent path strings
  const continentPaths = useMemo(() => {
    return CONTINENTS.flatMap((cont) =>
      cont.paths.map((points) => {
        return points.map((p, i) => {
          const [x, y] = toXY(p);
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
        }).join(' ') + ' Z';
      })
    );
  }, []);

  // Pin sizing by km — gentle log curve so a 4000km city doesn't dwarf a 20km one
  const pinRadius = (km: number) => {
    const log = Math.log(km + 1);   // log(1) = 0 → 0
    return Math.min(2 + log * 0.45, 5);
  };

  return (
    <View style={{ width, height, position: 'relative' }}>
      <Svg width={width} height={height} viewBox="0 0 360 180">
        {/* Ocean / canvas */}
        <Rect x={0} y={0} width={360} height={180} fill={c.paper2} />

        {/* Latitude grid lines (equator + tropics + arctic-ish) */}
        <G stroke={c.line2} strokeWidth={0.4} strokeDasharray="0.8 1.6">
          {[30, 60, 90, 120, 150].map((y, i) => (
            <Line key={i} x1={0} y1={y} x2={360} y2={y} />
          ))}
        </G>
        {/* Longitude grid lines */}
        <G stroke={c.line2} strokeWidth={0.4} strokeDasharray="0.8 1.6">
          {[60, 120, 180, 240, 300].map((x, i) => (
            <Line key={i} x1={x} y1={0} x2={x} y2={180} />
          ))}
        </G>

        {/* Continents as filled paper3-coloured land */}
        <G fill={c.paper3} stroke={c.line} strokeWidth={0.5} strokeLinejoin="round">
          {continentPaths.map((d, i) => (
            <Path key={i} d={d} />
          ))}
        </G>

        {/* Dotted route trace connecting cities chronologically */}
        {routePath && (
          <Path d={routePath} fill="none" stroke={c.ink3} strokeWidth={0.6} strokeDasharray="1.4 1.4" />
        )}

        {/* City pins — each a small postmark dot. Staggered drop-in on mount. */}
        {projected.map((p, i) => {
          const r = pinRadius(p.city.km);
          return (
            <Pin
              key={`${p.city.city}-${p.city.country}`}
              x={p.x}
              y={p.y}
              r={r}
              accent={c.accent}
              paper={c.paper}
              index={i}
              shouldAnimate={animate && !reduceMotion}
            />
          );
        })}

        {/* Cardinal labels (subtle) */}
        <G fill={c.ink3} fontSize={4.5} fontFamily="JetBrainsMono-Regular" opacity={0.5}>
          <SvgText x={180} y={4.5} textAnchor="middle">N</SvgText>
          <SvgText x={180} y={178.5} textAnchor="middle">S</SvgText>
          <SvgText x={3} y={92} textAnchor="start">W</SvgText>
          <SvgText x={357} y={92} textAnchor="end">E</SvgText>
        </G>
      </Svg>

      {/* Hit-test layer — invisible Pressables for each city. RN-svg's onPress
          works but using overlay Views is more reliable across SVG nestings. */}
      {onCityPress && (
        <View style={{ position: 'absolute', top: 0, left: 0, width, height }} pointerEvents="box-none">
          {projected.map((p) => (
            <View
              key={`hit-${p.city.city}-${p.city.country}`}
              style={{
                position: 'absolute',
                left: (p.x / 360) * width - 14,
                top: (p.y / 180) * height - 14,
                width: 28,
                height: 28,
              }}
              onTouchEnd={() => onCityPress(p.city)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// One pin = three concentric circles (paper halo, accent dot, outer ring).
// Stagger via withDelay keyed on index, so pins drop in roughly west-to-east
// in the order projected returns them.
function Pin({
  x,
  y,
  r,
  accent,
  paper,
  index,
  shouldAnimate,
}: {
  x: number;
  y: number;
  r: number;
  accent: string;
  paper: string;
  index: number;
  shouldAnimate: boolean;
}) {
  const progress = useSharedValue(shouldAnimate ? 0 : 1);

  useEffect(() => {
    if (!shouldAnimate) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(index * 55, withTiming(1, { duration: 360, easing: PIN_EASE }));
  }, [shouldAnimate, index, progress]);

  // Halo / dot grow from 0 → final r. Outer ring grows from r+2.6 → r+2.6
  // but only becomes visible at the end so it reads as a final "settled" mark.
  const haloProps = useAnimatedProps(() => ({
    r: (r + 1.4) * progress.value,
    opacity: 0.85 * Math.min(1, progress.value * 1.5),
  }));
  const dotProps = useAnimatedProps(() => ({
    r: r * progress.value,
    opacity: progress.value,
  }));
  const ringProps = useAnimatedProps(() => ({
    r: (r + 2.6) * progress.value,
    opacity: 0.6 * Math.max(0, progress.value - 0.55) / 0.45,
  }));

  return (
    <G>
      <AnimatedCircle cx={x} cy={y} fill={paper} animatedProps={haloProps} />
      <AnimatedCircle cx={x} cy={y} fill={accent} animatedProps={dotProps} />
      <AnimatedCircle cx={x} cy={y} fill="none" stroke={accent} strokeWidth={0.4} animatedProps={ringProps} />
    </G>
  );
}
