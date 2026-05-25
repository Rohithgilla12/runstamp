import React, { useMemo, useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useActivities } from '../state/useActivities';
import { useActivityStreams } from '../state/useActivityStreams';
import { useActivityDetail } from '../state/useActivityDetail';
import { parseValueStream } from '../analytics/streamData';
import { useAppState } from '../state/AppState';
import { useColors } from '../design/theme';
import { TText, Eyebrow } from '../design/typography';
import { Icon } from '../design/Icon';
import { Canvas } from './canvas/Canvas';
import { StatsShelf } from './shelves/StatsShelf';
import { LayoutShelf } from './shelves/LayoutShelf';
import { LAYOUTS, layoutById } from './layouts/registry';
import type { Background, LayoutId, LiveStreams, StickerInstance, StickerKey, Surface } from './layouts/types';
import { captureCanvas } from './share/capture';
import { ShareSheet } from './share/ShareSheet';
import type { RootStackProps } from '../nav/types';

const CANVAS_PADDING = 16;

export function EditorView({ route, navigation }: RootStackProps<'Editor'>) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { defaultSurface, tileStyle } = useAppState();
  const id = route.params?.id;
  const { activities, loading } = useActivities();
  const run = id ? activities.find((a) => a.id === id) : activities[0];
  const { route: realRoute, rawLatLng, streams } = useActivityStreams(run?.id ?? null);
  const { splits } = useActivityDetail(run?.id ?? null);
  const live: LiveStreams = useMemo(() => {
    const hr = parseValueStream(streams.heartrate?.data);
    const speed = parseValueStream(streams.speed?.data);
    const pace = speed ? speed.map((v) => (v > 0.1 ? 1000 / v : 0)) : null;
    return { hr, pace, route: realRoute, splits, rawLatLng };
  }, [streams, realRoute, splits, rawLatLng]);

  const [surface, setSurface] = useState<Surface>(defaultSurface);
  const [bg, setBg] = useState<Background>('map');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [layoutId, setLayoutId] = useState<LayoutId>('none');
  const [stickers, setStickers] = useState<StickerInstance[]>([
    { id: 's-distance', key: 'distance', x: 0.5, y: 0.18, scale: 1 },
    { id: 's-pace',     key: 'pace',     x: 0.2, y: 0.78, scale: 1 },
    { id: 's-time',     key: 'time',     x: 0.8, y: 0.78, scale: 1 },
  ]);
  const [selected, setSelected] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tmpUri, setTmpUri] = useState<string | null>(null);
  const [tmpSize, setTmpSize] = useState<number | null>(null);
  const canvasRef = useRef<View>(null);

  const layout = layoutById(layoutId) ?? LAYOUTS[0];

  const screenW = Dimensions.get('window').width;
  const canvasW = Math.min(screenW - CANVAS_PADDING * 2, 400);
  const ratio = surface === '9:16' ? 16 / 9 : surface === '1:1' ? 1 : 5 / 4;
  const canvasH = canvasW * ratio;

  if (!run) {
    return (
      <View style={{ flex: 1, backgroundColor: c.paper, paddingTop: insets.top + 8, alignItems: 'center', justifyContent: 'center' }}>
        <Eyebrow style={{ color: c.ink3 }}>{loading ? 'LOADING…' : 'NO RUN'}</Eyebrow>
      </View>
    );
  }

  const toggleSticker = (key: StickerKey) => {
    setStickers((cur) => {
      const existing = cur.find((s) => s.key === key);
      if (existing) return cur.filter((s) => s.key !== key);
      return [...cur, { id: `s-${key}-${Date.now()}`, key, x: 0.5, y: 0.5, scale: 1 }];
    });
  };
  const moveSticker = (id: string, x: number, y: number) =>
    setStickers((cur) => cur.map((s) => (s.id === id ? { ...s, x, y } : s)));
  const scaleSticker = (id: string, scale: number) =>
    setStickers((cur) => cur.map((s) => (s.id === id ? { ...s, scale } : s)));
  const removeSticker = (id: string) =>
    setStickers((cur) => cur.filter((s) => s.id !== id));

  const onPickLayout = (nextId: LayoutId) => {
    setLayoutId(nextId);
    if (stickers.length === 0) {
      const next = layoutById(nextId);
      if (next?.seed?.length) {
        setStickers(next.seed.map((s, i) => ({
          id: `s-${nextId}-${s.key}-${i}-${Date.now()}`,
          key: s.key,
          x: s.x,
          y: s.y,
          scale: s.scale ?? 1,
        })));
      }
    }
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setBg('photo');
    }
  };

  const onSaveAndShare = async () => {
    if (!canvasRef.current || exporting) return;
    setSelected(null);
    setExporting(true);
    try {
      const uri = await captureCanvas({ canvasRef, background: bg, live, canvasW, canvasH, tileStyle });
      let size: number | null = null;
      try {
        const info = await FileSystem.getInfoAsync(uri);
        size = info.exists && !info.isDirectory ? (info.size ?? null) : null;
      } catch {
        // Keep size null — display will just omit the size badge.
      }
      setTmpUri(uri);
      setTmpSize(size);
      setSheetOpen(true);
    } finally {
      setExporting(false);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.paper }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => navigation.goBack()} style={{ width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', backgroundColor: c.paper }}>
            <Icon.x size={18} color={c.ink} />
          </Pressable>
          <Eyebrow>EDITOR</Eyebrow>
          <View style={{ width: 38 }} />
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row', gap: 6 }}>
          {(['9:16', '1:1', '4:5'] as const).map((s) => (
            <Pressable key={s} onPress={() => setSurface(s)} style={{
              paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
              backgroundColor: surface === s ? c.ink : c.paper2,
              borderWidth: 1, borderColor: surface === s ? c.ink : c.line,
            }}>
              <TText variant="mono" style={{ fontSize: 10.5, color: surface === s ? c.paper : c.ink2 }}>{s}</TText>
            </Pressable>
          ))}
          <View style={{ flex: 1 }} />
          {(['map', 'photo', 'solid'] as const).map((b) => (
            <Pressable key={b} onPress={() => {
              if (b === 'photo' && !photoUri) { pickPhoto(); return; }
              setBg(b);
            }} style={{
              paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8,
              backgroundColor: bg === b ? c.paper3 : 'transparent',
              borderWidth: 1, borderColor: c.line,
            }}>
              <TText style={{ fontSize: 10.5, color: c.ink2 }}>{b}</TText>
            </Pressable>
          ))}
        </View>

        <View style={{ paddingHorizontal: CANVAS_PADDING, paddingTop: 14, alignItems: 'center' }}>
          <Canvas
            ref={canvasRef}
            run={run}
            layout={layout}
            width={canvasW}
            height={canvasH}
            background={bg}
            photoUri={photoUri}
            stickers={stickers}
            live={live}
            selected={selected}
            onSelect={setSelected}
            onMove={moveSticker}
            onScale={scaleSticker}
            onRemove={removeSticker}
            onTapPickPhoto={pickPhoto}
          />
        </View>

        <StatsShelf run={run} live={live} stickers={stickers} onToggle={toggleSticker} />

        <LayoutShelf
          run={run}
          live={live}
          background={bg}
          photoUri={photoUri}
          activeId={layoutId}
          onSelect={onPickLayout}
        />

        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 14 }}>
          <Pressable onPress={pickPhoto} style={({ pressed }) => [{
            flex: 1, height: 44, borderRadius: 10,
            borderWidth: 1, borderColor: c.line, backgroundColor: c.paper,
            alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1,
          }]}>
            <TText style={{ fontSize: 13, color: c.ink2 }}>Photo</TText>
          </Pressable>
          <Pressable onPress={onSaveAndShare} disabled={exporting} style={({ pressed }) => [{
            flex: 1.6, height: 44, borderRadius: 10, backgroundColor: c.ink,
            alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
            opacity: exporting ? 0.6 : pressed ? 0.85 : 1,
          }]}>
            <Icon.download size={15} color={c.paper} />
            <TText style={{ fontSize: 14, color: c.paper, fontWeight: '500' }}>{exporting ? 'Capturing…' : 'Save & Share'}</TText>
          </Pressable>
        </View>
      </ScrollView>

      <ShareSheet
        visible={sheetOpen}
        tmpUri={tmpUri}
        surface={surface}
        fileSizeBytes={tmpSize}
        fileName={`runstamp_${run.id.slice(0, 6)}_${run.date}.png`}
        onClose={() => setSheetOpen(false)}
      />
    </GestureHandlerRootView>
  );
}
