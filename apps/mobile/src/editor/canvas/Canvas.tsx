import React, { forwardRef, memo, useMemo } from 'react';
import { Image, Pressable, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '../../design/theme';
import { useAppState } from '../../state/AppState';
import { Icon } from '../../design/Icon';
import { PostmarkMark } from '../../design/SunMark';
import { TText } from '../../design/typography';
import { RouteMap } from '../../design/RouteMap';
import { MapTilesLayer } from '../../design/MapTilesLayer';
import { DraggableSticker } from './DraggableSticker';
import { SPLIT_TOP_FRACTION, type LayerStack, type PhotoPlacement } from '../layers';
import type { BBox } from '../../services/mapTiles';
import type { Activity, Layout, LiveStreams, StickerInstance } from '../layouts/types';

interface Props {
  run: Activity;
  layout: Layout;
  width: number;
  height: number;
  layers: LayerStack;
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
  { run, layout, width, height, layers, photoUri, stickers, live, selected,
    onSelect, onMove, onScale, onRemove, onTapPickPhoto, frozen, hideWatermark },
  ref,
) {
  const c = useColors();
  const { tileStyle } = useAppState();
  const Scaffolding = layout.Scaffolding;
  const f = layout.frame;
  const inset = f?.inset ?? 0;
  const bw = width - inset * 2;
  const bh = height - inset * 2;

  const hasRoute = live.rawLatLng != null && live.rawLatLng.length > 1;
  const bbox = useMemo<BBox | null>(() => {
    if (!hasRoute || !live.rawLatLng) return null;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const p of live.rawLatLng) {
      if (p[0] < minLat) minLat = p[0];
      if (p[0] > maxLat) maxLat = p[0];
      if (p[1] < minLng) minLng = p[1];
      if (p[1] > maxLng) maxLng = p[1];
    }
    return { minLat, maxLat, minLng, maxLng };
  }, [hasRoute, live.rawLatLng]);

  const placement = layers.photo.placement;
  const pr = photoRegion(placement, bw, bh);
  const mr = mapRegion(placement, bw, bh);

  return (
    <View ref={ref} collapsable={false} style={{ width, height, borderRadius: 18, overflow: 'hidden', backgroundColor: f ? f.backdrop : c.ink, position: 'relative' }}>
      <View style={{ position: 'absolute', top: inset, left: inset, width: bw, height: bh, borderRadius: f?.radius ?? 0, overflow: 'hidden' }}>
        {/* base fill */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: baseColor(layers.base, c) }} />

        {/* photo — full or region-top band (inset Polaroid renders on top, later) */}
        {layers.photo.enabled && placement !== 'inset' && (
          photoUri ? (
            <Image source={{ uri: photoUri }} resizeMode="cover"
              style={{ position: 'absolute', top: pr.top, left: pr.left, width: pr.width, height: pr.height, opacity: layers.photo.opacity }} />
          ) : (!frozen && (
            <Pressable onPress={onTapPickPhoto}
              style={{ position: 'absolute', top: pr.top, left: pr.left, width: pr.width, height: pr.height, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1714' }}>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Icon.cam size={28} color="rgba(243,237,226,0.55)" />
                <TText variant="mono" style={{ fontSize: 11, color: 'rgba(243,237,226,0.55)' }}>TAP TO UPLOAD</TText>
              </View>
            </Pressable>
          ))
        )}

        {/* map tiles (no route line of their own) */}
        {layers.map.enabled && bbox && (
          <View style={{ position: 'absolute', top: mr.top, left: mr.left, width: mr.width, height: mr.height, opacity: layers.map.opacity }}>
            <Svg width={mr.width} height={mr.height} viewBox={`0 0 ${mr.width} ${mr.height}`}>
              <Rect x={0} y={0} width={mr.width} height={mr.height} fill={layers.map.style === 'dark' ? '#1d1a16' : '#e8e1d1'} />
              <MapTilesLayer bbox={bbox} width={mr.width} height={mr.height} opacity={layers.map.style === 'dark' ? 0.5 : 1} style={tileStyle} />
            </Svg>
          </View>
        )}

        {/* frame uniform scrim — preserves the existing 12 templates */}
        {f && f.scrim !== 'transparent' && (
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: f.scrim }} />
        )}

        {/* layer gradient scrim — new layouts */}
        {layers.scrim.mode !== 'none' && (
          <LinearGradient pointerEvents="none"
            colors={['transparent', `rgba(20,17,13,${layers.scrim.strength})`]}
            locations={scrimLocations(layers.scrim.mode)}
            {...(layers.scrim.mode === 'top' ? { start: { x: 0, y: 1 }, end: { x: 0, y: 0 } } : null)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        )}

        {/* route — drawn over photo/map with no tiles of its own */}
        {layers.route.enabled && hasRoute && (
          <View style={{ position: 'absolute', top: mr.top, left: mr.left, width: mr.width, height: mr.height, opacity: layers.route.opacity }}>
            <RouteMap rawLatLng={live.rawLatLng} showTiles={false} treatment={layers.route.treatment} pace={live.pace}
              width={mr.width} height={mr.height} accent={c.accent} routeStrokeWidth={4 * layers.route.strokeScale} animate={!frozen} flat />
          </View>
        )}

        {/* inset Polaroid photo — sits on top of the map (Passport window) */}
        {layers.photo.enabled && placement === 'inset' && (
          photoUri ? (
            <View style={{ position: 'absolute', top: bh * 0.06, right: bw * 0.05, width: bw * 0.36, transform: [{ rotate: '-3deg' }], backgroundColor: '#f3ede2', padding: 6, paddingBottom: 18, borderRadius: 2, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 8 } }}>
              <Image source={{ uri: photoUri }} resizeMode="cover" style={{ width: '100%', aspectRatio: 1, borderRadius: 1 }} />
            </View>
          ) : (!frozen && (
            <Pressable onPress={onTapPickPhoto} style={{ position: 'absolute', top: bh * 0.06, right: bw * 0.05, width: bw * 0.36, aspectRatio: 0.82, backgroundColor: 'rgba(20,17,13,0.5)', borderRadius: 2, alignItems: 'center', justifyContent: 'center' }}>
              <Icon.cam size={22} color="rgba(243,237,226,0.7)" />
            </Pressable>
          ))
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

function baseColor(base: LayerStack['base'], c: { paper: string; ink: string; accent: string }): string {
  switch (base) {
    case 'paper': return c.paper;
    case 'solar': return c.accent;
    case 'accent': return c.accent;
    case 'ink':
    default: return c.ink;
  }
}

// Photo region: 'full'/'inset' fill the frame; 'region-top' takes the top band.
function photoRegion(p: PhotoPlacement, w: number, h: number) {
  if (p === 'region-top') return { top: 0, left: 0, width: w, height: h * SPLIT_TOP_FRACTION };
  return { top: 0, left: 0, width: w, height: h };
}
// Map/route region: full frame, except 'region-top' pushes it to the bottom band.
function mapRegion(p: PhotoPlacement, w: number, h: number) {
  if (p === 'region-top') return { top: h * SPLIT_TOP_FRACTION, left: 0, width: w, height: h * (1 - SPLIT_TOP_FRACTION) };
  return { top: 0, left: 0, width: w, height: h };
}
function scrimLocations(mode: LayerStack['scrim']['mode']): [number, number] {
  if (mode === 'top') return [0, 0.34];
  if (mode === 'full') return [0, 1];
  return [0.62, 1];
}
