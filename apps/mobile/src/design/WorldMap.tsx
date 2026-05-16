import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { CITY_FALLBACK, CONTINENTS, toXY, type LonLat } from './worldGeometry';
import { useColors } from './theme';

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
}

// The world rendered as a vintage philately map. Continents are simplified
// outlines (see worldGeometry.ts), latitudes/longitudes are a faint dotted
// grid, and each visited city gets a small postmark glyph at its projected
// position. Cities without explicit coords fall back to a hand-curated
// city centroid map (also in worldGeometry.ts).
export function WorldMap({ cities, width, onCityPress }: Props) {
  const c = useColors();
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

        {/* City pins — each a small postmark dot */}
        {projected.map((p) => {
          const r = pinRadius(p.city.km);
          return (
            <G key={`${p.city.city}-${p.city.country}`}>
              <Circle cx={p.x} cy={p.y} r={r + 1.4} fill={c.paper} opacity={0.85} />
              <Circle cx={p.x} cy={p.y} r={r} fill={c.accent} />
              <Circle cx={p.x} cy={p.y} r={r + 2.6} fill="none" stroke={c.accent} strokeWidth={0.4} opacity={0.6} />
            </G>
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
