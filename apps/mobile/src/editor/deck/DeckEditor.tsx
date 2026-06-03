import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Modal, NativeScrollEvent, NativeSyntheticEvent, Pressable, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { useActivities } from '../../state/useActivities';
import { useActivityStreams } from '../../state/useActivityStreams';
import { useActivityDetail } from '../../state/useActivityDetail';
import { parseValueStream } from '../../analytics/streamData';
import { useAppState } from '../../state/AppState';
import { useColors } from '../../design/theme';
import { Eyebrow, TText } from '../../design/typography';
import { Icon } from '../../design/Icon';
import { layoutById } from '../layouts/registry';
import { developOrder } from './develop';
import { DeckCard } from './DeckCard';
import { FrankingOverlay } from './FrankingOverlay';
import { TextEditSheet } from './TextEditSheet';
import { ShareSheet } from '../share/ShareSheet';
import type { Activity } from '../../data/models';
import type { Background, Layout, LiveStreams, Surface } from '../layouts/types';
import type { RootStackProps } from '../../nav/types';

export function DeckEditor({ route, navigation }: RootStackProps<'Editor'>) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { defaultSurface, tileStyle } = useAppState();
  const { width: screenW } = useWindowDimensions();

  const id = route.params?.id;
  const { activities, loading } = useActivities();
  const run = useMemo(() => (id ? activities.find((a) => a.id === id) : activities[0]), [activities, id]);

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
  const [centerIndex, setCenterIndex] = useState(0);
  const [franking, setFranking] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tmpUri, setTmpUri] = useState<string | null>(null);
  const [tmpSize, setTmpSize] = useState<number | null>(null);
  // Free-text overrides for the title / place slots. null = use the run's own
  // value; a string (incl. '') = the runner typed their own. Metrics stay
  // honest and are never editable.
  const [titleText, setTitleText] = useState<string | null>(null);
  const [placeText, setPlaceText] = useState<string | null>(null);
  const [textSheet, setTextSheet] = useState(false);

  // What the cards render: the run with any typed-in title/place applied.
  // Ordering still uses the raw run so the deck doesn't reshuffle while typing.
  const displayRun: Activity | undefined = useMemo(() => {
    if (!run) return undefined;
    return {
      ...run,
      title: titleText ?? run.title,
      city: placeText ?? run.city,
    };
  }, [run, titleText, placeText]);

  // Develop: order the deck best-first for this run, so index 0 (the resting
  // position) is the card most worth sharing. Re-derives as streams land.
  const ordered: Layout[] = useMemo(() => {
    if (!run) return [];
    return developOrder(run, live)
      .map((lid) => layoutById(lid))
      .filter((l): l is Layout => l != null);
  }, [run, live]);

  const ratio = surface === '9:16' ? 16 / 9 : surface === '1:1' ? 1 : 5 / 4;
  const cardW = Math.min(Math.round(screenW * 0.66), 268);
  const cardH = Math.round(cardW * ratio);
  const itemWidth = Math.round(cardW * 0.8); // slots overlap → stacked peek
  const sidePad = (screenW - itemWidth) / 2;
  const deckH = cardH + 44;

  const scrollX = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => { scrollX.value = e.contentOffset.x; });
  const listRef = useRef<Animated.FlatList<Layout>>(null);

  const onMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / itemWidth);
    setCenterIndex(Math.max(0, Math.min(ordered.length - 1, idx)));
  }, [itemWidth, ordered.length]);

  const goToCard = useCallback((index: number) => {
    setCenterIndex(index);
    listRef.current?.scrollToOffset({ offset: index * itemWidth, animated: true });
  }, [itemWidth]);

  const pickPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9, allowsEditing: false });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setBg('photo');
    }
  }, []);

  const selected = ordered[centerIndex] ?? ordered[0];

  if (!run || !selected) {
    return (
      <View style={{ flex: 1, backgroundColor: c.paper, paddingTop: insets.top + 8 }}>
        <View style={{ paddingHorizontal: 14 }}>
          <Pressable onPress={() => navigation.goBack()} style={{ width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
            <Icon.x size={18} color={c.ink} />
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Eyebrow style={{ color: c.ink3 }}>{loading ? 'LOADING…' : 'NO RUN'}</Eyebrow>
          <TText variant="serif" style={{ fontSize: 22, color: c.ink, marginTop: 8, textAlign: 'center' }}>
            {loading ? 'Fetching your run…' : 'Open a run to start editing.'}
          </TText>
        </View>
      </View>
    );
  }

  // run is defined past the guard; displayRun mirrors it. Cards + the franked
  // capture render this so typed-in text shows everywhere.
  const cardRun = displayRun ?? run;
  const textEdited = titleText != null || placeText != null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.paper }}>
      <View style={{ flex: 1, paddingTop: insets.top + 10 }}>
        {/* Top bar */}
        <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => navigation.goBack()} style={{ width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', backgroundColor: c.paper }}>
            <Icon.x size={18} color={c.ink} />
          </Pressable>
          <Eyebrow>EDITOR</Eyebrow>
          <View style={{ width: 38 }} />
        </View>

        {/* Surface + background chrome */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
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
            <Pressable key={b} onPress={() => { if (b === 'photo' && !photoUri) { pickPhoto(); return; } setBg(b); }} style={{
              paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8,
              backgroundColor: bg === b ? c.paper3 : 'transparent',
              borderWidth: 1, borderColor: c.line,
            }}>
              <TText style={{ fontSize: 10.5, color: c.ink2 }}>{b}</TText>
            </Pressable>
          ))}
        </View>

        {/* The deck */}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Animated.FlatList<Layout>
            ref={listRef}
            data={ordered}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            onMomentumScrollEnd={onMomentumEnd}
            snapToInterval={itemWidth}
            snapToAlignment="start"
            disableIntervalMomentum
            decelerationRate="fast"
            removeClippedSubviews={false}
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            windowSize={5}
            style={{ height: deckH, flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: sidePad, alignItems: 'center' }}
            getItemLayout={(_, index) => ({ length: itemWidth, offset: itemWidth * index, index })}
            renderItem={({ item, index }) => (
              <DeckCard
                layout={item}
                run={cardRun}
                live={live}
                background={bg}
                photoUri={photoUri}
                index={index}
                scrollX={scrollX}
                itemWidth={itemWidth}
                cardW={cardW}
                cardH={cardH}
                onPress={() => (index === centerIndex ? setTextSheet(true) : goToCard(index))}
              />
            )}
          />
        </View>

        {/* Caption + commit */}
        <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <TText variant="serifItalic" style={{ fontSize: 24, color: c.ink, letterSpacing: -0.3 }}>{selected.name}</TText>
            <TText variant="mono" style={{ fontSize: 11, color: c.ink3, letterSpacing: 0.5 }}>{centerIndex + 1} / {ordered.length}</TText>
          </View>
          <TText variant="mono" style={{ fontSize: 9.5, color: c.ink3, opacity: 0.7, letterSpacing: 0.5, marginTop: 3 }}>SWIPE TO FLIP · TAP CENTER CARD TO NAME IT</TText>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <Pressable
              accessibilityLabel="Edit title and place text"
              onPress={() => setTextSheet(true)}
              style={({ pressed }) => [{
                width: 52, height: 50, borderRadius: 12, borderWidth: 1,
                borderColor: textEdited ? c.accent : c.line, backgroundColor: c.paper,
                alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1,
              }]}
            >
              <TText variant="serifItalic" style={{ fontSize: 22, color: textEdited ? c.accent : c.ink2, lineHeight: 24 }}>Aa</TText>
            </Pressable>
            <Pressable accessibilityLabel="Add a photo background" onPress={pickPhoto} style={({ pressed }) => [{
              width: 52, height: 50, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: c.paper,
              alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1,
            }]}>
              <Icon.cam size={18} color={c.ink2} />
            </Pressable>
            <Pressable onPress={() => setFranking(true)} disabled={franking} style={({ pressed }) => [{
              flex: 1, height: 50, borderRadius: 12, backgroundColor: c.ink,
              alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7,
              opacity: franking ? 0.6 : pressed ? 0.85 : 1,
            }]}>
              <Icon.download size={16} color={c.paper} />
              <TText style={{ fontSize: 15, color: c.paper, fontWeight: '500' }}>Save &amp; Share</TText>
            </Pressable>
          </View>
        </View>
      </View>

      <Modal visible={franking} transparent animationType="fade" onRequestClose={() => setFranking(false)}>
        {franking && (
          <FrankingOverlay
            run={cardRun}
            layout={selected}
            background={bg}
            photoUri={photoUri}
            live={live}
            surface={surface}
            tileStyle={tileStyle}
            onCaptured={(uri, size) => { setTmpUri(uri); setTmpSize(size); setFranking(false); setSheetOpen(true); }}
            onError={() => setFranking(false)}
          />
        )}
      </Modal>

      <TextEditSheet
        visible={textSheet}
        titleValue={titleText ?? run.title}
        placeValue={placeText ?? (run.city === '—' ? '' : run.city)}
        titlePlaceholder={run.title || 'Morning run'}
        placePlaceholder={run.city && run.city !== '—' ? run.city : 'Add a place'}
        edited={textEdited}
        onChangeTitle={setTitleText}
        onChangePlace={setPlaceText}
        onReset={() => { setTitleText(null); setPlaceText(null); }}
        onClose={() => setTextSheet(false)}
      />

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
