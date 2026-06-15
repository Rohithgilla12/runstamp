import React from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { MapTilesLayer } from './MapTilesLayer';
import { useColors } from './theme';
import { pickZoom, centerOffsets, projectToCanvas, type BBox } from '../services/mapTiles';
import { cellBounds, type GridSpec } from '../lib/gridCoverage';

interface Props {
  bbox: BBox;
  cells: Set<string>;
  spec: GridSpec;
  width?: number;
  height?: number;
}

export function CityCoverageMap({ bbox, cells, spec, width = 340, height = 300 }: Props) {
  const c = useColors();
  const accent = c.accent;

  const z = pickZoom(bbox, width, height);
  const { offsetX, offsetY } = centerOffsets(bbox, z, width, height);

  return (
    <View style={{ width, height, borderRadius: 12, overflow: 'hidden' }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <MapTilesLayer bbox={bbox} width={width} height={height} style="light_nolabels" />
        {Array.from(cells).map((key) => {
          const sep = key.indexOf(':');
          const ix = parseInt(key.slice(0, sep), 10);
          const iy = parseInt(key.slice(sep + 1), 10);
          const b = cellBounds(ix, iy, spec);
          const p0 = projectToCanvas(b.minLat, b.minLng, z, offsetX, offsetY);
          const p1 = projectToCanvas(b.maxLat, b.maxLng, z, offsetX, offsetY);
          const x = Math.min(p0.x, p1.x);
          const y = Math.min(p0.y, p1.y);
          const w = Math.abs(p1.x - p0.x);
          const h = Math.abs(p1.y - p0.y);
          if (x + w < 0 || x > width || y + h < 0 || y > height) return null;
          return (
            <Rect
              key={key}
              x={x}
              y={y}
              width={w + 0.5}
              height={h + 0.5}
              fill={accent}
              fillOpacity={0.28}
            />
          );
        })}
      </Svg>
    </View>
  );
}
