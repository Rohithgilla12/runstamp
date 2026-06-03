import React, { useEffect, useMemo, useRef } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { File } from 'expo-file-system';
import type { TileStyle } from '../../services/mapTiles';
import { useColors } from '../../design/theme';
import { TText } from '../../design/typography';
import { Canvas } from '../canvas/Canvas';
import { captureCanvas } from '../share/capture';
import { seedToStickers } from './seed';
import { surfaceRatio } from './geometry';
import type { Activity, Background, Layout, LiveStreams, Surface } from '../layouts/types';

interface Props {
  run: Activity;
  layout: Layout;
  background: Background;
  photoUri: string | null;
  live: LiveStreams;
  surface: Surface;
  tileStyle: TileStyle;
  onCaptured: (uri: string, sizeBytes: number | null) => void;
  onError: (err: unknown) => void;
}

const PRESS_MS = 240;
const BLEED_MS = 420;
const SETTLE_MS = 720;
// Watchdog: a tile prefetch can hang on a flaky network, and captureRef gives
// no timeout of its own — bail rather than leave "Sealing…" stuck forever.
const CAPTURE_TIMEOUT_MS = 12000;

// The commit moment: the captured card sits under a stamp + ink bleed that are
// SIBLINGS of the captured view, so the exported PNG stays clean.
export function FrankingOverlay({ run, layout, background, photoUri, live, surface, tileStyle, onCaptured, onError }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const canvasRef = useRef<View>(null);

  const exportW = Math.min(screenW - 32, 380);
  const exportH = Math.round(exportW * surfaceRatio(surface));
  const stickers = useMemo(() => seedToStickers(layout, 'frank'), [layout]);

  const press = useSharedValue(0);
  const bleed = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    press.value = withTiming(1, { duration: PRESS_MS, easing: Easing.out(Easing.quad) });
    bleed.value = withDelay(PRESS_MS, withTiming(1, { duration: BLEED_MS, easing: Easing.out(Easing.cubic) }));

    const thunk = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), PRESS_MS);
    const grab = setTimeout(async () => {
      try {
        const uri = await Promise.race([
          captureCanvas({ canvasRef, background, live, canvasW: exportW, canvasH: exportH, tileStyle }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('capture timed out')), CAPTURE_TIMEOUT_MS)),
        ]);
        let size: number | null = null;
        try {
          // expo-file-system v19: the legacy getInfoAsync throws — use the File API.
          const file = new File(uri);
          size = file.exists ? file.size ?? null : null;
        } catch {
          // File-size badge is optional — leave null on any FS error.
        }
        if (!cancelled) onCaptured(uri, size);
      } catch (err) {
        if (!cancelled) onError(err);
      }
    }, SETTLE_MS);

    return () => { cancelled = true; clearTimeout(thunk); clearTimeout(grab); };
    // Plays once per mount — the parent remounts this overlay per commit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stampStyle = useAnimatedStyle(() => ({
    opacity: press.value,
    transform: [{ scale: 1.6 - press.value * 0.6 }, { translateY: -28 * (1 - press.value) }, { rotateZ: '-7deg' }],
  }));
  const bleedStyle = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - bleed.value),
    transform: [{ scale: 0.3 + bleed.value * 1.5 }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(14,13,11,0.82)', alignItems: 'center', justifyContent: 'center', paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <TText variant="mono" style={{ fontSize: 11, letterSpacing: 3, color: 'rgba(243,237,226,0.65)', marginBottom: 22 }}>FRANKING</TText>

      <View style={{ width: exportW, height: exportH }}>
        <View ref={canvasRef} collapsable={false}>
          <Canvas
            run={run}
            layout={layout}
            width={exportW}
            height={exportH}
            background={background}
            photoUri={photoUri}
            stickers={stickers}
            live={live}
            selected={null}
            onSelect={() => {}}
            onMove={() => {}}
            onScale={() => {}}
            onRemove={() => {}}
            frozen
          />
        </View>

        {/* Ink bleed + stamp — siblings of the captured view, never baked in. */}
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: exportH * 0.5 - 70, left: exportW * 0.5 - 70, width: 140, height: 140, borderRadius: 70, backgroundColor: c.accent }, bleedStyle]} />

        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: exportH * 0.5 - 56, left: exportW * 0.5 - 56, width: 112, height: 112 }, stampStyle]}>
          <Postmark size={112} color={c.accent} />
        </Animated.View>
      </View>

      <TText variant="serifItalic" style={{ fontSize: 26, color: c.paper, marginTop: 26, letterSpacing: -0.3 }}>Sealing…</TText>
    </View>
  );
}

function Postmark({ size, color }: { size: number; color: string }) {
  const r = size / 2;
  const outer = r - 3;
  const inner = outer - 11;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={r} cy={r} r={outer} fill="none" stroke={color} strokeWidth={2} strokeDasharray="3 3" />
      <Circle cx={r} cy={r} r={inner} fill="none" stroke={color} strokeWidth={1.4} />
      <Line x1={r - inner * 0.8} y1={r - inner * 0.3} x2={r + inner * 0.8} y2={r - inner * 0.3} stroke={color} strokeWidth={1} opacity={0.8} />
      <Line x1={r - inner * 0.8} y1={r + inner * 0.42} x2={r + inner * 0.8} y2={r + inner * 0.42} stroke={color} strokeWidth={1} opacity={0.65} />
    </Svg>
  );
}
