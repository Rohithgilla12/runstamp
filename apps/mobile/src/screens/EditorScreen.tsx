import React, { useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Share, View, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { distUnit, fmtDist, fmtPace, fmtTime, type Activity } from '../data/sample';
import { useActivities } from '../state/useActivities';
import { useAppState } from '../state/AppState';
import { useColors, useTheme } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { Button, Card } from '../design/atoms';
import { Icon } from '../design/Icon';
import { PostmarkMark, SunMark } from '../design/SunMark';
import { RouteMap } from '../design/RouteMap';
import { PostageTemplate } from '../design/templates/PostageTemplate';
import { PostmarkTemplate } from '../design/templates/PostmarkTemplate';
import { BoardingPassTemplate } from '../design/templates/BoardingPassTemplate';
import { PassportTemplate } from '../design/templates/PassportTemplate';
import { CustomsTemplate } from '../design/templates/CustomsTemplate';
import { EngravedTemplate } from '../design/templates/EngravedTemplate';
import { WaxSealTemplate } from '../design/templates/WaxSealTemplate';
import type { RootStackProps } from '../nav/types';

type Surface = '9:16' | '1:1' | '4:5';
type Background = 'map' | 'photo' | 'solid';
type Template = 'stickers' | 'postage' | 'postmark' | 'boarding' | 'passport' | 'customs' | 'engraved' | 'wax' | 'magazine' | 'minimal' | 'brutalist' | 'track' | 'newsprint' | 'topo';
type TabKey = 'templates' | 'photo' | 'stats' | 'export';

const CANVAS_PADDING = 24;

interface StickerInstance {
  id: string;
  key: StickerKey;
  x: number;
  y: number;
  scale: number;
}

type StickerKey =
  | 'distance' | 'pace' | 'time' | 'hr' | 'elev' | 'cal'
  | 'cadence' | 'splits' | 'hrChart' | 'paceChart'
  | 'map' | 'date' | 'title' | 'place';
// `shoe` sticker removed from the library until shoe tracking ships (PRD §M5
// / settings/Shoes is a roadmap placeholder right now). It previously
// hardcoded "Saucony Endorphin" which looked like every other user's share
// card. Add it back when CRUD + per-activity shoe lookup is wired.

const STICKER_LIBRARY: { key: StickerKey; label: string }[] = [
  { key: 'distance',  label: 'Distance'  },
  { key: 'pace',      label: 'Pace'      },
  { key: 'time',      label: 'Time'      },
  { key: 'hr',        label: 'HR'        },
  { key: 'elev',      label: 'Elev'      },
  { key: 'cal',       label: 'Calories'  },
  { key: 'cadence',   label: 'Cadence'   },
  { key: 'splits',    label: 'Splits'    },
  { key: 'hrChart',   label: 'HR chart'  },
  { key: 'paceChart', label: 'Pace chart' },
  { key: 'map',       label: 'Route map' },
  { key: 'date',      label: 'Date'      },
  { key: 'title',     label: 'Title'     },
  { key: 'place',     label: 'Place'     }
];

export function EditorScreen({ route, navigation }: RootStackProps<'Editor'>) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { units } = useAppState();
  const id = route.params?.id;
  const { activities, loading } = useActivities();
  const run = id ? activities.find((a) => a.id === id) : activities[0];

  const [surface, setSurface] = useState<Surface>('9:16');
  const [bg, setBg] = useState<Background>('map');
  const [template, setTemplate] = useState<Template>('stickers');
  const [tab, setTab] = useState<TabKey>('templates');
  const [selected, setSelected] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const canvasRef = useRef<View>(null);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [stickers, setStickers] = useState<StickerInstance[]>([
    { id: 's-distance', key: 'distance', x: 0.5, y: 0.18, scale: 1 },
    { id: 's-pace',     key: 'pace',     x: 0.2, y: 0.78, scale: 1 },
    { id: 's-time',     key: 'time',     x: 0.8, y: 0.78, scale: 1 }
  ]);

  const handleExport = async (mode: ExportMode) => {
    if (!run || !canvasRef.current || exporting) return;
    setSelected(null);
    setExporting(true);
    try {
      // Capture at 2x for retina quality. Output PNG so the transparent
      // watermark area composites cleanly.
      const uri = await captureRef(canvasRef, { format: 'png', quality: 1, result: 'tmpfile' });
      let savedAssetUri: string | undefined;
      let permissionDenied = false;
      if (mode === 'save' || mode === 'stories') {
        const perm = await MediaLibrary.requestPermissionsAsync(true);
        if (perm.granted) {
          const asset = await MediaLibrary.createAssetAsync(uri);
          savedAssetUri = asset.uri;
        } else {
          permissionDenied = true;
        }
      }
      if (mode === 'sheet') {
        await Share.share({ url: uri, message: `My ${run.title} via Runstamp` });
      }
      setExportResult({ mode, tmpUri: uri, savedAssetUri, permissionDenied });
    } catch (err) {
      setExportResult({ mode, tmpUri: '', error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setExporting(false);
    }
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: false
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setBg('photo');
    }
  };

  const screenW = Dimensions.get('window').width;
  const canvasW = Math.min(screenW - CANVAS_PADDING * 2, 360);
  const ratio = surface === '9:16' ? 16 / 9 : surface === '1:1' ? 1 : 5 / 4;
  const canvasH = canvasW * ratio;

  if (!run) {
    return (
      <View style={{ flex: 1, backgroundColor: c.paper, paddingTop: insets.top + 8 }}>
        <View style={{ paddingHorizontal: 14, flexDirection: 'row' }}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              width: 38, height: 38, borderRadius: 12, backgroundColor: c.paper2,
              borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon.back size={20} color={c.ink} />
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

  const toggleSticker = (key: StickerKey) => {
    setStickers((current) => {
      const existing = current.find((s) => s.key === key);
      if (existing) return current.filter((s) => s.key !== key);
      return [...current, { id: `s-${key}-${Date.now()}`, key, x: 0.5, y: 0.5, scale: 1 }];
    });
  };

  const updateStickerPosition = (id: string, x: number, y: number) => {
    setStickers((current) => current.map((s) => (s.id === id ? { ...s, x, y } : s)));
  };

  const updateStickerScale = (id: string, scale: number) => {
    setStickers((current) => current.map((s) => (s.id === id ? { ...s, scale } : s)));
  };

  const removeSticker = (id: string) => {
    setStickers((current) => current.filter((s) => s.id !== id));
    if (selected === id) setSelected(null);
  };

  const removeSelected = () => {
    if (!selected) return;
    removeSticker(selected);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.paper }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 36 }} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => navigation.goBack()} style={{
            width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: c.line,
            alignItems: 'center', justifyContent: 'center', backgroundColor: c.paper
          }}>
            <Icon.x size={18} color={c.ink} />
          </Pressable>
          <Eyebrow>EDITOR</Eyebrow>
          <Pressable
            onPress={() => handleExport('save')}
            disabled={exporting}
            style={({ pressed }) => [{
              paddingHorizontal: 12, height: 38, borderRadius: 10, backgroundColor: c.ink,
              alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
              opacity: exporting ? 0.6 : pressed ? 0.85 : 1
            }]}
          >
            <Icon.download size={14} color={c.paper} />
            <TText style={{ fontSize: 13, color: c.paper, fontWeight: '500' }}>{exporting ? 'Saving…' : 'Save'}</TText>
          </Pressable>
        </View>

        {/* Surface selector */}
        <View style={{ paddingHorizontal: 20, paddingTop: 18, flexDirection: 'row', gap: 6 }}>
          {(['9:16', '1:1', '4:5'] as const).map((s) => (
            <Pressable key={s} onPress={() => setSurface(s)} style={{
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
              backgroundColor: surface === s ? c.ink : c.paper2,
              borderWidth: 1, borderColor: surface === s ? c.ink : c.line
            }}>
              <TText variant="mono" style={{ fontSize: 11, color: surface === s ? c.paper : c.ink2, fontWeight: '500' }}>{s}</TText>
            </Pressable>
          ))}
          <View style={{ flex: 1 }} />
          {(['map', 'photo', 'solid'] as const).map((b) => (
            <Pressable key={b} onPress={() => setBg(b)} style={{
              paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
              backgroundColor: bg === b ? c.paper3 : 'transparent',
              borderWidth: 1, borderColor: c.line
            }}>
              <TText style={{ fontSize: 11, color: c.ink2, fontWeight: '500' }}>{b}</TText>
            </Pressable>
          ))}
        </View>

        {/* Canvas */}
        <View style={{ paddingHorizontal: CANVAS_PADDING, paddingTop: 20, alignItems: 'center' }}>
          <View ref={canvasRef} collapsable={false} style={{ width: canvasW, height: canvasH }}>
          {template === 'postage' ? (
            <View style={{ width: canvasW, height: canvasH }}>
              <PostageTemplate run={run} width={canvasW} height={canvasH} background={bg} units={units} />
            </View>
          ) : template === 'postmark' ? (
            <View style={{ width: canvasW, height: canvasH }}>
              <PostmarkTemplate run={run} width={canvasW} height={canvasH} background={bg} units={units} />
            </View>
          ) : template === 'boarding' ? (
            <View style={{ width: canvasW, height: canvasH }}>
              <BoardingPassTemplate run={run} width={canvasW} height={canvasH} background={bg} units={units} />
            </View>
          ) : template === 'passport' ? (
            <View style={{ width: canvasW, height: canvasH }}>
              <PassportTemplate run={run} width={canvasW} height={canvasH} background={bg} units={units} />
            </View>
          ) : template === 'customs' ? (
            <View style={{ width: canvasW, height: canvasH }}>
              <CustomsTemplate run={run} width={canvasW} height={canvasH} background={bg} units={units} />
            </View>
          ) : template === 'engraved' ? (
            <View style={{ width: canvasW, height: canvasH }}>
              <EngravedTemplate run={run} width={canvasW} height={canvasH} background={bg} units={units} />
            </View>
          ) : template === 'wax' ? (
            <View style={{ width: canvasW, height: canvasH }}>
              <WaxSealTemplate run={run} width={canvasW} height={canvasH} background={bg} units={units} />
            </View>
          ) : (
          <Pressable onPress={() => setSelected(null)} style={{
            width: canvasW, height: canvasH, borderRadius: 18, overflow: 'hidden',
            backgroundColor: c.ink, position: 'relative'
          }}>
            {/* Background layer */}
            {bg === 'map' && <RouteMap points={run.route} width={canvasW} height={canvasH} style="dark" accent={c.accent} routeStrokeWidth={4} />}
            {bg === 'photo' && (
              photoUri ? (
                <Image source={{ uri: photoUri }} style={{ position: 'absolute', inset: 0 }} resizeMode="cover" />
              ) : (
                <Pressable onPress={pickPhoto} style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ position: 'absolute', inset: 0, backgroundColor: '#1a1714' }} />
                  {Array.from({ length: 18 }).map((_, i) => (
                    <View key={i} style={{ position: 'absolute', top: i * 28 - 80, left: -20, width: canvasW + 40, height: 14, backgroundColor: 'rgba(243,237,226,0.04)', transform: [{ rotate: '-12deg' }] }} />
                  ))}
                  <View style={{ alignItems: 'center', gap: 6 }}>
                    <Icon.cam size={28} color="rgba(243,237,226,0.55)" />
                    <TText variant="mono" style={{ fontSize: 11, color: 'rgba(243,237,226,0.55)' }}>TAP TO UPLOAD</TText>
                  </View>
                </Pressable>
              )
            )}
            {bg === 'solid' && <View style={{ position: 'absolute', inset: 0, backgroundColor: c.accent }} />}

            {/* Vignette */}
            <View pointerEvents="none" style={{ position: 'absolute', inset: 0, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }} />

            {/* Watermark — the marketing "Runstamp" postmark on every export */}
            <View style={{ position: 'absolute', bottom: 12, right: 12, alignItems: 'center' }}>
              <PostmarkMark size={36} color="rgba(243,237,226,0.55)" />
              <TText variant="mono" style={{ fontSize: 8, color: 'rgba(243,237,226,0.55)', marginTop: 2, letterSpacing: 1 }}>RUNSTAMP</TText>
            </View>

            {/* Stickers */}
            {stickers.map((s) => (
              <DraggableSticker
                key={s.id}
                sticker={s}
                run={run}
                canvasW={canvasW}
                canvasH={canvasH}
                isSelected={selected === s.id}
                onSelect={() => setSelected(s.id)}
                onMove={(x, y) => updateStickerPosition(s.id, x, y)}
                onScale={(scale) => updateStickerScale(s.id, scale)}
                onRemove={() => removeSticker(s.id)}
              />
            ))}
          </Pressable>
          )}
          </View>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingTop: 20, gap: 4 }}>
          {(['templates', 'photo', 'stats', 'export'] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={{
              flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10,
              backgroundColor: tab === t ? c.paper2 : 'transparent',
              borderWidth: 1, borderColor: tab === t ? c.line : 'transparent'
            }}>
              <TText style={{ fontSize: 12, fontWeight: '500', color: tab === t ? c.ink : c.ink3, textTransform: 'capitalize' }}>{t}</TText>
            </Pressable>
          ))}
        </View>

        {/* Panel */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          {tab === 'templates' && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {([
                ['stickers',  'Stickers'],
                ['postage',   'Postage'],
                ['postmark',  'Postmark'],
                ['boarding',  'Boarding'],
                ['passport',  'Passport'],
                ['customs',   'Customs'],
                ['engraved',  'Engraved'],
                ['wax',       'Wax seal'],
                ['magazine',  'Magazine'],
                ['minimal',   'Minimal'],
                ['brutalist', 'Brutalist'],
                ['track',     'Track meet'],
                ['newsprint', 'Newsprint'],
                ['topo',      'Topo']
              ] as const).map(([t, label]) => {
                const active = template === t;
                const ready = t === 'stickers' || t === 'postage' || t === 'postmark' || t === 'boarding'
                  || t === 'passport' || t === 'customs' || t === 'engraved' || t === 'wax';
                return (
                  <Pressable key={t} onPress={() => setTemplate(t)} style={{
                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                    backgroundColor: active ? c.ink : c.paper2,
                    borderWidth: 1, borderColor: active ? c.ink : c.line,
                    opacity: ready ? 1 : 0.55,
                    flexDirection: 'row', alignItems: 'center', gap: 5
                  }}>
                    <TText style={{ fontSize: 12, color: active ? c.paper : c.ink2, fontWeight: '500' }}>{label}</TText>
                    {!ready && <TText variant="mono" style={{ fontSize: 8, color: active ? 'rgba(243,237,226,0.55)' : c.ink3 }}>SOON</TText>}
                  </Pressable>
                );
              })}
            </View>
          )}

          {tab === 'photo' && (
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Eyebrow>PHOTOS</Eyebrow>
                {photoUri && (
                  <Pressable onPress={() => setPhotoUri(null)}>
                    <TText variant="mono" style={{ fontSize: 11, color: c.ink3 }}>CLEAR</TText>
                  </Pressable>
                )}
              </View>

              <Pressable onPress={pickPhoto} style={{
                marginTop: 10, padding: 14, borderRadius: 12,
                backgroundColor: c.ink,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8
              }}>
                <Icon.cam size={16} color={c.paper} />
                <TText style={{ color: c.paper, fontSize: 14, fontWeight: '500' }}>
                  {photoUri ? 'Replace photo' : 'Upload from Photos'}
                </TText>
              </Pressable>

              {photoUri && (
                <View style={{ marginTop: 12, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: c.line }}>
                  <Image source={{ uri: photoUri }} style={{ width: '100%', height: 160 }} resizeMode="cover" />
                </View>
              )}

              <TText style={{ fontSize: 11, color: c.ink3, marginTop: 10, lineHeight: 16 }}>
                We never upload your photos. Composing happens on-device; only the final share image is exported.
              </TText>
            </Card>
          )}

          {tab === 'stats' && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {STICKER_LIBRARY.map((s) => {
                const placed = stickers.some((p) => p.key === s.key);
                return (
                  <Pressable key={s.key} onPress={() => toggleSticker(s.key)} style={{
                    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8,
                    backgroundColor: placed ? c.ink : c.paper2,
                    borderWidth: 1, borderColor: placed ? c.ink : c.line,
                    flexDirection: 'row', alignItems: 'center', gap: 6
                  }}>
                    {placed && <Icon.check size={12} color={c.paper} />}
                    <TText style={{ fontSize: 12, color: placed ? c.paper : c.ink2 }}>{s.label}</TText>
                  </Pressable>
                );
              })}
            </View>
          )}

          {tab === 'export' && (
            <Card>
              <Eyebrow style={{ marginBottom: 12 }}>SHARE</Eyebrow>
              {([
                { mode: 'save'    as const, label: 'Save to camera roll',     desc: 'PNG · captured at retina scale' },
                { mode: 'stories' as const, label: 'Instagram Stories',       desc: 'Saves to roll, opens Instagram' },
                { mode: 'sheet'   as const, label: 'WhatsApp / X / Messages', desc: 'System share sheet' }
              ]).map((e, i) => (
                <Pressable
                  key={e.label}
                  onPress={() => handleExport(e.mode)}
                  disabled={exporting}
                  style={({ pressed }) => [{
                    paddingVertical: 14,
                    borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.line2,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    opacity: exporting ? 0.6 : pressed ? 0.7 : 1
                  }]}
                >
                  <View style={{ flex: 1 }}>
                    <TText style={{ fontSize: 14, fontWeight: '500', color: c.ink }}>{e.label}</TText>
                    <TText variant="mono" style={{ fontSize: 10.5, color: c.ink3, marginTop: 2 }}>{e.desc}</TText>
                  </View>
                  <Icon.chevR size={14} color={c.ink3} />
                </Pressable>
              ))}
            </Card>
          )}
        </View>

        {selected && (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <Pressable onPress={removeSelected} style={{
              padding: 14, borderRadius: 12, borderWidth: 1, borderColor: c.line,
              backgroundColor: c.paper2,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8
            }}>
              <Icon.trash size={16} color="#c44a1e" />
              <TText style={{ fontSize: 13, color: '#c44a1e', fontWeight: '500' }}>Remove selected sticker</TText>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <Modal visible={!!exportResult} transparent animationType="slide" onRequestClose={() => setExportResult(null)}>
        {exportResult && <ExportResultSheet result={exportResult} onClose={() => setExportResult(null)} onShareAgain={() => handleExport('sheet')} />}
      </Modal>
    </GestureHandlerRootView>
  );
}

type ExportMode = 'save' | 'stories' | 'sheet';
interface ExportResult {
  mode: ExportMode;
  tmpUri: string;
  savedAssetUri?: string;
  permissionDenied?: boolean;
  error?: string;
}

function ExportResultSheet({
  result,
  onClose,
  onShareAgain
}: {
  result: ExportResult;
  onClose: () => void;
  onShareAgain: () => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();

  const title = result.error
    ? 'Export failed'
    : result.permissionDenied
      ? 'Photo permission denied'
      : result.savedAssetUri
        ? 'Saved to camera roll'
        : 'Ready to share';

  const subtitle = result.error
    ? result.error
    : result.permissionDenied
      ? 'Enable Photos access in Settings → Runstamp to save share cards directly.'
      : result.savedAssetUri
        ? 'PNG written. Post it to Instagram, WhatsApp, or X.'
        : 'Your share card was passed to the system share sheet.';

  return (
    <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(14,13,11,0.65)', justifyContent: 'flex-end' }}>
      <Pressable
        onPress={(e) => e.stopPropagation()}
        style={{
          backgroundColor: c.paper,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          paddingHorizontal: 20,
          paddingTop: 18,
          paddingBottom: insets.bottom + 24
        }}
      >
        <View style={{ width: 36, height: 4, backgroundColor: c.line, borderRadius: 2, alignSelf: 'center', marginBottom: 18 }} />
        <Eyebrow style={{ color: result.error ? c.warn : c.accent }}>{result.error ? 'ERROR' : 'EXPORT'}</Eyebrow>
        <TText variant="serif" style={{ fontSize: 28, lineHeight: 30, letterSpacing: -0.6, color: c.ink, marginTop: 4 }}>{title}</TText>
        <TText style={{ fontSize: 13, color: c.ink3, marginTop: 6, lineHeight: 18 }}>{subtitle}</TText>

        {result.tmpUri && !result.error && (
          <View style={{
            marginTop: 16,
            alignSelf: 'center',
            width: '60%',
            aspectRatio: 9 / 16,
            borderRadius: 14,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: c.line,
            backgroundColor: c.paper2
          }}>
            <Image source={{ uri: result.tmpUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
          <View style={{ flex: 1 }}>
            <Button kind="ghost" full onPress={onClose}>Done</Button>
          </View>
          {!result.error && (
            <View style={{ flex: 1 }}>
              <Button kind="primary" full onPress={onShareAgain} icon={<Icon.share size={16} color={c.paper} />}>Share again</Button>
            </View>
          )}
        </View>

        <TText variant="mono" style={{ fontSize: 10, color: c.ink3, textAlign: 'center', marginTop: 14 }}>
          {result.tmpUri ? `${Platform.OS === 'ios' ? 'iOS' : 'Android'} · view-shot · expo-media-library` : ''}
        </TText>
      </Pressable>
    </Pressable>
  );
}

function DraggableSticker({
  sticker,
  run,
  canvasW,
  canvasH,
  isSelected,
  onSelect,
  onMove,
  onScale,
  onRemove
}: {
  sticker: StickerInstance;
  run: Activity;
  canvasW: number;
  canvasH: number;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onScale: (scale: number) => void;
  onRemove: () => void;
}) {
  const c = useColors();
  const { units } = useAppState();
  const tx = useSharedValue(sticker.x * canvasW);
  const ty = useSharedValue(sticker.y * canvasH);
  const scale = useSharedValue(sticker.scale);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);

  const persist = (xPx: number, yPx: number) => {
    onMove(xPx / canvasW, yPx / canvasH);
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = tx.value;
      startY.value = ty.value;
      runOnJS(onSelect)();
    })
    .onUpdate((e) => {
      tx.value = Math.max(20, Math.min(canvasW - 20, startX.value + e.translationX));
      ty.value = Math.max(20, Math.min(canvasH - 20, startY.value + e.translationY));
    })
    .onEnd(() => {
      runOnJS(persist)(tx.value, ty.value);
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
      runOnJS(onSelect)();
    })
    .onUpdate((e) => {
      scale.value = Math.max(0.5, Math.min(2.2, startScale.value * e.scale));
    })
    .onEnd(() => {
      runOnJS(onScale)(scale.value);
    });

  const tap = Gesture.Tap().onEnd(() => runOnJS(onSelect)());
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => runOnJS(onRemove)());

  const composed = Gesture.Race(doubleTap, Gesture.Simultaneous(pan, pinch, tap));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value - 60 },
      { translateY: ty.value - 30 },
      { scale: scale.value }
    ]
  }));

  let body: React.ReactNode = null;
  let width = 120;
  switch (sticker.key) {
    case 'distance':
      width = 150;
      body = (
        <>
          <Eyebrow style={{ color: 'rgba(243,237,226,0.55)', fontSize: 9 }}>DISTANCE</Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <TText variant="monoMedium" style={{ fontSize: 30, color: '#f3ede2', letterSpacing: -0.6 }}>{fmtDist(run.distance, units)}</TText>
            <TText style={{ fontSize: 11, color: 'rgba(243,237,226,0.6)', marginLeft: 4 }}>{distUnit(units)}</TText>
          </View>
        </>
      );
      break;
    case 'pace':
      body = (
        <>
          <Eyebrow style={{ color: 'rgba(243,237,226,0.55)', fontSize: 9 }}>PACE</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 22, color: '#f3ede2' }}>{fmtPace(run.pace, units)}</TText>
        </>
      );
      width = 90;
      break;
    case 'time':
      body = (
        <>
          <Eyebrow style={{ color: 'rgba(243,237,226,0.55)', fontSize: 9 }}>TIME</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 22, color: '#f3ede2' }}>{fmtTime(run.seconds)}</TText>
        </>
      );
      width = 110;
      break;
    case 'hr':
      body = (
        <>
          <Eyebrow style={{ color: 'rgba(243,237,226,0.55)', fontSize: 9 }}>HEART RATE</Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon.heart size={14} color={c.accent} />
            <TText variant="monoMedium" style={{ fontSize: 22, color: '#f3ede2' }}>{run.avgHr}</TText>
            <TText style={{ fontSize: 11, color: 'rgba(243,237,226,0.6)' }}>bpm</TText>
          </View>
        </>
      );
      width = 130;
      break;
    case 'elev':
      body = (
        <>
          <Eyebrow style={{ color: 'rgba(243,237,226,0.55)', fontSize: 9 }}>ELEV</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 22, color: '#f3ede2' }}>{run.elev} m</TText>
        </>
      );
      width = 90;
      break;
    case 'cal':
      body = (
        <>
          <Eyebrow style={{ color: 'rgba(243,237,226,0.55)', fontSize: 9 }}>CALORIES</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 22, color: '#f3ede2' }}>{run.cal}</TText>
        </>
      );
      width = 100;
      break;
    case 'cadence':
      body = (
        <>
          <Eyebrow style={{ color: 'rgba(243,237,226,0.55)', fontSize: 9 }}>CADENCE</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 22, color: '#f3ede2' }}>{run.cadence ?? '—'}</TText>
        </>
      );
      width = 100;
      break;
    case 'date': {
      // Avoid hardcoded "MAY 17" — derive from run.date (yyyy-mm-dd) so the
      // sticker reflects the actual run.
      const d = new Date(run.date);
      const monLabel = Number.isNaN(d.getTime())
        ? run.date
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
      body = (
        <>
          <Eyebrow style={{ color: 'rgba(243,237,226,0.55)', fontSize: 9 }}>DATE</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 16, color: '#f3ede2' }}>{run.day.toUpperCase()} · {monLabel}</TText>
        </>
      );
      width = 150;
      break;
    }
    case 'title':
      body = (
        <TText variant="serif" style={{ fontSize: 18, color: '#f3ede2', letterSpacing: -0.2 }}>{run.title}</TText>
      );
      width = 200;
      break;
    case 'place':
      body = (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon.pin size={12} color="rgba(243,237,226,0.7)" />
          <TText style={{ fontSize: 12, color: '#f3ede2' }}>{run.city}</TText>
        </View>
      );
      width = 130;
      break;
    default:
      body = <TText style={{ color: '#f3ede2', fontSize: 12 }}>{sticker.key}</TText>;
  }

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[
        {
          position: 'absolute', width, padding: 10, borderRadius: 10,
          backgroundColor: 'rgba(20,17,13,0.55)',
          borderWidth: 1.5, borderColor: isSelected ? c.accent : 'rgba(243,237,226,0.2)'
        },
        animatedStyle
      ]}>
        {body}
      </Animated.View>
    </GestureDetector>
  );
}
