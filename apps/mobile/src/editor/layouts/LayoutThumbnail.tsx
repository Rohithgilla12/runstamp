import React, { memo, useEffect, useRef, useState } from 'react';
import { Image, InteractionManager, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { Canvas } from '../canvas/Canvas';
import type { LayerStack } from '../layers';
import type { Activity, Layout, LiveStreams, StickerInstance } from './types';

const W = 44;
const H = 62;

const cache = new Map<string, string>();

function cacheKey(runId: string, layoutId: string, photo: string) {
  return `${runId}::${layoutId}::${photo}`;
}

interface Props {
  run: Activity;
  layout: Layout;
  layers: LayerStack;
  photoUri: string | null;
  live: LiveStreams;
}

export const LayoutThumbnail = memo(function LayoutThumbnail({ run, layout, layers, photoUri, live }: Props) {
  const ref = useRef<View>(null);
  const key = cacheKey(run.id, layout.id, photoUri ? '1' : '0');
  const [uri, setUri] = useState<string | null>(cache.get(key) ?? null);

  useEffect(() => {
    if (uri) return;
    const handle = InteractionManager.runAfterInteractions(() => {
      if (!ref.current) return;
      captureRef(ref, { format: 'png', quality: 0.6, result: 'tmpfile' })
        .then((file) => {
          cache.set(key, file);
          setUri(file);
        })
        .catch(() => {
          // Silent — thumbnail shows placeholder forever.
        });
    });
    return () => handle.cancel();
  }, [uri, key]);

  if (uri) {
    return <Image source={{ uri }} style={{ width: W, height: H, borderRadius: 6 }} />;
  }

  const seed: StickerInstance[] = (layout.seed ?? []).map((s, i) => ({
    id: `thumb-${layout.id}-${i}`,
    key: s.key,
    x: s.x,
    y: s.y,
    scale: (s.scale ?? 1) * 0.7,
  }));

  return (
    <View style={{ width: W, height: H, borderRadius: 6, overflow: 'hidden' }}>
      <Canvas
        ref={ref}
        run={run}
        layout={layout}
        width={W}
        height={H}
        layers={layers}
        photoUri={photoUri}
        stickers={seed}
        live={live}
        selected={null}
        onSelect={() => {}}
        onMove={() => {}}
        onScale={() => {}}
        onRemove={() => {}}
        frozen
        hideWatermark
      />
    </View>
  );
});
