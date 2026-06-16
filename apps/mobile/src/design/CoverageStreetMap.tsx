import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { MapTilesLayer } from './MapTilesLayer';
import { useColors } from './theme';
import { TILE_ATTRIBUTION, pickZoom, centerOffsets, projectToCanvas, type BBox } from '../services/mapTiles';
import { useAppState } from '../state/AppState';

interface Props {
  covered: Array<Array<[number, number]>>;
  uncovered: Array<Array<[number, number]>>;
  width?: number;
  height?: number;
}

export function CoverageStreetMap({ covered, uncovered, width = 340, height = 300 }: Props) {
  const c = useColors();
  const { tileStyle } = useAppState();

  const allPolylines = [...covered, ...uncovered];
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const poly of allPolylines) {
    for (const [lat, lng] of poly) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
  }

  if (!isFinite(minLat)) return null;

  const bbox: BBox = { minLat, maxLat, minLng, maxLng };
  const z = pickZoom(bbox, width, height);
  const { offsetX, offsetY } = centerOffsets(bbox, z, width, height);

  function toPath(poly: Array<[number, number]>): string {
    if (poly.length < 2) return '';
    const segs: string[] = [];
    for (let i = 0; i < poly.length; i++) {
      const { x, y } = projectToCanvas(poly[i][0], poly[i][1], z, offsetX, offsetY);
      segs.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return segs.join(' ');
  }

  return (
    <View style={{ width, height, borderRadius: 12, overflow: 'hidden' }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <MapTilesLayer bbox={bbox} width={width} height={height} style={tileStyle} />
        {uncovered.map((poly, i) => {
          const d = toPath(poly);
          if (!d) return null;
          return (
            <Path
              key={`u-${i}`}
              d={d}
              fill="none"
              stroke={c.ink3}
              strokeOpacity={0.35}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
        {covered.map((poly, i) => {
          const d = toPath(poly);
          if (!d) return null;
          return (
            <Path
              key={`c-${i}`}
              d={d}
              fill="none"
              stroke={c.accent}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
        <SvgText
          x={6}
          y={height - 5}
          fontSize={7}
          fill="#75695a"
          opacity={0.7}
          fontFamily="System"
        >
          {TILE_ATTRIBUTION}
        </SvgText>
      </Svg>
    </View>
  );
}
