// MapTilesLayer — slippy raster tiles rendered as SVG <Image> elements.
//
// Sits inside RouteMap's <Svg> root, below the polyline. Tiles are clipped
// to the canvas rect so we never paint outside the route map's frame.
// react-native-svg's <Image> uses the platform's network image loader, which
// respects HTTP cache headers — CartoCDN serves long-lived caches so repeat
// renders are instant.
//
// We deliberately don't try to compose React Native's <Image> on top of SVG.
// Mixing the two flattens unpredictably during captureRef, and the tile
// alignment with the polyline has to be sub-pixel exact. Keeping everything
// inside one <Svg> means one coordinate system end-to-end.

import React from 'react';
import { Image as SvgImage, ClipPath, Defs, G, Rect } from 'react-native-svg';
import {
  TILE_SIZE,
  centerOffsets,
  pickZoom,
  tileUrl,
  tilesForBbox,
  type BBox,
  type TileStyle,
} from '../services/mapTiles';

interface Props {
  bbox: BBox;
  width: number;
  height: number;
  /** Optional opacity — lets the host darken tiles for high-contrast routes. */
  opacity?: number;
  /** Tile basemap style. Defaults to the app-state choice in RouteMap. */
  style?: TileStyle;
}

export function MapTilesLayer({ bbox, width, height, opacity = 1, style }: Props) {
  const z = pickZoom(bbox, width, height);
  const { offsetX, offsetY } = centerOffsets(bbox, z, width, height);
  const { x0, x1, y0, y1 } = tilesForBbox(bbox, z);

  const tiles: Array<{ x: number; y: number; url: string }> = [];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      tiles.push({ x, y, url: tileUrl(z, x, y, style) });
    }
  }

  const clipId = `mapclip-${width}-${height}`;
  return (
    <G opacity={opacity}>
      <Defs>
        <ClipPath id={clipId}>
          <Rect x={0} y={0} width={width} height={height} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        {tiles.map((t) => (
          <SvgImage
            key={`${t.x}-${t.y}`}
            href={t.url}
            x={t.x * TILE_SIZE + offsetX}
            y={t.y * TILE_SIZE + offsetY}
            width={TILE_SIZE}
            height={TILE_SIZE}
            preserveAspectRatio="xMidYMid slice"
          />
        ))}
      </G>
    </G>
  );
}
