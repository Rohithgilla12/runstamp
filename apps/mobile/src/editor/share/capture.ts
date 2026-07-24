import { captureRef } from 'react-native-view-shot';
import { prefetchTiles, type TileStyle } from '../../services/mapTiles';
import type { LiveStreams } from '../layouts/types';
import type { LayerStack } from '../layers';
import type { RefObject } from 'react';
import type { View } from 'react-native';

interface CaptureArgs {
  canvasRef: RefObject<View | null>;
  layers: LayerStack;
  live: LiveStreams;
  canvasW: number;
  canvasH: number;
  tileStyle: TileStyle;
}

// Capture the canvas to a PNG tmpfile at retina scale. For map backgrounds,
// prefetches the full bbox of CartoCDN tiles into the RN image cache first.
export async function captureCanvas({
  canvasRef, layers, live, canvasW, canvasH, tileStyle,
}: CaptureArgs): Promise<string> {
  if (layers.map.enabled && live.rawLatLng != null && live.rawLatLng.length > 1) {
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const pt of live.rawLatLng) {
      if (pt[0] < minLat) minLat = pt[0];
      if (pt[0] > maxLat) maxLat = pt[0];
      if (pt[1] < minLng) minLng = pt[1];
      if (pt[1] > maxLng) maxLng = pt[1];
    }
    await prefetchTiles({ minLat, maxLat, minLng, maxLng }, canvasW, canvasH, tileStyle);
  }
  return captureRef(canvasRef, { format: 'png', quality: 1, result: 'tmpfile' });
}
