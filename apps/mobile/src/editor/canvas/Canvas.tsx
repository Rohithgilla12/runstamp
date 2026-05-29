import React, { forwardRef, memo } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useColors } from '../../design/theme';
import { Icon } from '../../design/Icon';
import { PostmarkMark } from '../../design/SunMark';
import { TText } from '../../design/typography';
import { RouteMap } from '../../design/RouteMap';
import { DraggableSticker } from './DraggableSticker';
import type {
  Activity,
  Background,
  Layout,
  LiveStreams,
  StickerInstance,
} from '../layouts/types';

interface Props {
  run: Activity;
  layout: Layout;
  width: number;
  height: number;
  background: Background;
  photoUri: string | null;
  stickers: StickerInstance[];
  live: LiveStreams;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onScale: (id: string, s: number) => void;
  onRemove: (id: string) => void;
  onTapPickPhoto?: () => void;
  // Disable interactivity + hide empty-photo CTA. Used by LayoutThumbnail.
  frozen?: boolean;
  // Suppress watermark in editor preview; keep for export capture.
  hideWatermark?: boolean;
}

export const Canvas = memo(forwardRef<View, Props>(function Canvas(
  { run, layout, width, height, background, photoUri, stickers, live, selected,
    onSelect, onMove, onScale, onRemove, onTapPickPhoto, frozen, hideWatermark },
  ref,
) {
  const c = useColors();
  const Scaffolding = layout.Scaffolding;
  // A framed layout composes the card as backdrop → contained (inset) map →
  // scrim → decoration → stickers, so the map is a designed element rather than
  // a full-bleed wash. No frame (the 'none' option) keeps the legacy full-bleed.
  const f = layout.frame;
  const inset = f?.inset ?? 0;
  const bw = width - inset * 2;
  const bh = height - inset * 2;
  const mapStyle = f?.mapStyle ?? 'dark';
  const mapOpacity = f?.mapOpacity ?? 1;
  return (
    <View ref={ref} collapsable={false} style={{ width, height, borderRadius: 18, overflow: 'hidden', backgroundColor: f ? f.backdrop : c.ink, position: 'relative' }}>
      <View style={{ position: 'absolute', top: inset, left: inset, width: bw, height: bh, borderRadius: f?.radius ?? 0, overflow: 'hidden' }}>
        {background === 'map' && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: mapOpacity }}>
            <RouteMap points={run.route} rawLatLng={live.rawLatLng} width={bw} height={bh} style={mapStyle} accent={c.accent} routeStrokeWidth={4} animate={!frozen} />
          </View>
        )}
        {background === 'photo' && (
          photoUri ? (
            <Image source={{ uri: photoUri }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" />
          ) : (
            <Pressable
              onPress={frozen ? undefined : onTapPickPhoto}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}
            >
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#1a1714' }} />
              {!frozen && (
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Icon.cam size={28} color="rgba(243,237,226,0.55)" />
                  <TText variant="mono" style={{ fontSize: 11, color: 'rgba(243,237,226,0.55)' }}>TAP TO UPLOAD</TText>
                </View>
              )}
            </Pressable>
          )
        )}
        {background === 'solid' && <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.accent }} />}
        {f && f.scrim !== 'transparent' && (
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: f.scrim }} />
        )}
      </View>

      <Scaffolding width={width} height={height} surface="9:16" />

      {!hideWatermark && (
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 12, right: 12, alignItems: 'center' }}>
          <PostmarkMark size={36} color="rgba(243,237,226,0.55)" />
          <TText variant="mono" style={{ fontSize: 8, color: 'rgba(243,237,226,0.55)', marginTop: 2, letterSpacing: 1 }}>RUNSTAMP</TText>
        </View>
      )}

      {stickers.map((s) => (
        <DraggableSticker
          key={s.id}
          sticker={s}
          run={run}
          canvasW={width}
          canvasH={height}
          liveHr={live.hr}
          livePace={live.pace}
          liveRoute={live.route}
          liveSplits={live.splits}
          theme={layout.theme}
          isSelected={selected === s.id}
          onSelect={onSelect}
          onMove={onMove}
          onScale={onScale}
          onRemove={onRemove}
          frozen={frozen}
        />
      ))}

      <Pressable onPress={() => onSelect(null)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents={selected ? 'auto' : 'box-none'} />
    </View>
  );
}));
