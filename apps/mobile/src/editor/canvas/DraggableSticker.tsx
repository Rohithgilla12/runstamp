import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { distUnit, fmtDist, fmtPace, fmtTime } from '../../data/sample';
import { useAppState } from '../../state/AppState';
import { useColors } from '../../design/theme';
import { Eyebrow, TText } from '../../design/typography';
import { Icon } from '../../design/Icon';
import { RouteMap } from '../../design/RouteMap';
import { StreamChart } from '../../design/charts';
import { applyTheme, type ResolvedStickerStyle } from '../stickers/themedSticker';
import type { StickerInstance, StickerTheme } from '../layouts/types';
import type { Activity, Point, Split } from '../../data/sample';

const STICKER_DEFAULTS: ResolvedStickerStyle = {
  container: {
    backgroundColor: 'rgba(20,17,13,0.55)',
    borderColor: 'rgba(243,237,226,0.2)',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  text: { color: '#f3ede2', fontFamily: 'monoMedium' },
  eyebrow: { color: 'rgba(243,237,226,0.55)' },
};

interface DraggableStickerProps {
  sticker: StickerInstance;
  run: Activity;
  canvasW: number;
  canvasH: number;
  liveHr: number[] | null;
  livePace: number[] | null;
  liveRoute: Point[] | null;
  liveSplits: Split[] | null;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onScale: (id: string, scale: number) => void;
  onRemove: (id: string) => void;
  theme: StickerTheme;
  frozen?: boolean;
}

function DraggableStickerImpl({
  sticker,
  run,
  canvasW,
  canvasH,
  liveHr,
  livePace,
  liveRoute,
  liveSplits,
  isSelected,
  onSelect,
  onMove,
  onScale,
  onRemove,
  theme,
  frozen = false,
}: DraggableStickerProps) {
  const c = useColors();
  const { units } = useAppState();
  const tx = useSharedValue(sticker.x * canvasW);
  const ty = useSharedValue(sticker.y * canvasH);
  const scale = useSharedValue(sticker.scale);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);
  // Measured box height so the sticker centres on its seed point (the box is
  // anchored by its own centre, not a fixed 120×60 guess).
  const [boxH, setBoxH] = useState(56);
  const onBoxLayout = useCallback((e: LayoutChangeEvent) => setBoxH(e.nativeEvent.layout.height), []);

  const style = applyTheme(STICKER_DEFAULTS, theme);

  const stickerId = sticker.id;

  const persist = useCallback(
    (xPx: number, yPx: number) => {
      onMove(stickerId, xPx / canvasW, yPx / canvasH);
    },
    [onMove, stickerId, canvasW, canvasH],
  );

  // Gestures and the worklet closures are rebuilt only when geometry or the
  // (now stable) callbacks change — not on every parent re-render, which would
  // otherwise force GestureDetector to reconfigure mid-interaction.
  const composed = useMemo(() => {
    const pan = Gesture.Pan()
      .onStart(() => {
        startX.value = tx.value;
        startY.value = ty.value;
        runOnJS(onSelect)(stickerId);
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
        runOnJS(onSelect)(stickerId);
      })
      .onUpdate((e) => {
        scale.value = Math.max(0.5, Math.min(2.2, startScale.value * e.scale));
      })
      .onEnd(() => {
        runOnJS(onScale)(stickerId, scale.value);
      });

    const tap = Gesture.Tap().onEnd(() => runOnJS(onSelect)(stickerId));
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd(() => runOnJS(onRemove)(stickerId));

    return Gesture.Race(doubleTap, Gesture.Simultaneous(pan, pinch, tap));
  }, [canvasW, canvasH, onSelect, onScale, onRemove, persist, stickerId, tx, ty, scale, startX, startY, startScale]);

  let body: React.ReactNode = null;
  let width = 120;
  switch (sticker.key) {
    case 'distance':
      width = 150;
      body = (
        <>
          <Eyebrow style={{ color: style.eyebrow.color, fontSize: 9 }}>DISTANCE</Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <TText variant="monoMedium" style={{ fontSize: 30, color: style.text.color, letterSpacing: -0.6 }}>{fmtDist(run.distance, units)}</TText>
            <TText style={{ fontSize: 11, color: 'rgba(243,237,226,0.6)', marginLeft: 4 }}>{distUnit(units)}</TText>
          </View>
        </>
      );
      break;
    case 'pace':
      body = (
        <>
          <Eyebrow style={{ color: style.eyebrow.color, fontSize: 9 }}>PACE</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 22, color: style.text.color }}>{fmtPace(run.pace, units)}</TText>
        </>
      );
      width = 90;
      break;
    case 'time':
      body = (
        <>
          <Eyebrow style={{ color: style.eyebrow.color, fontSize: 9 }}>TIME</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 22, color: style.text.color }}>{fmtTime(run.seconds)}</TText>
        </>
      );
      width = 110;
      break;
    case 'hr':
      body = (
        <>
          <Eyebrow style={{ color: style.eyebrow.color, fontSize: 9 }}>HEART RATE</Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon.heart size={14} color={c.accent} />
            <TText variant="monoMedium" style={{ fontSize: 22, color: style.text.color }}>{run.avgHr}</TText>
            <TText style={{ fontSize: 11, color: 'rgba(243,237,226,0.6)' }}>bpm</TText>
          </View>
        </>
      );
      width = 130;
      break;
    case 'elev':
      body = (
        <>
          <Eyebrow style={{ color: style.eyebrow.color, fontSize: 9 }}>ELEV</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 22, color: style.text.color }}>{run.elev} m</TText>
        </>
      );
      width = 90;
      break;
    case 'cal':
      body = (
        <>
          <Eyebrow style={{ color: style.eyebrow.color, fontSize: 9 }}>CALORIES</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 22, color: style.text.color }}>{run.cal}</TText>
        </>
      );
      width = 100;
      break;
    case 'cadence':
      body = (
        <>
          <Eyebrow style={{ color: style.eyebrow.color, fontSize: 9 }}>CADENCE</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 22, color: style.text.color }}>{run.cadence ?? '—'}</TText>
        </>
      );
      width = 100;
      break;
    case 'date': {
      const d = new Date(run.date);
      const monLabel = Number.isNaN(d.getTime())
        ? run.date
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
      body = (
        <>
          <Eyebrow style={{ color: style.eyebrow.color, fontSize: 9 }}>DATE</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 16, color: style.text.color }}>{run.day.toUpperCase()} · {monLabel}</TText>
        </>
      );
      width = 150;
      break;
    }
    case 'title':
      body = (
        <TText variant="serif" style={{ fontSize: 18, color: style.text.color, letterSpacing: -0.2 }}>{run.title}</TText>
      );
      width = 200;
      break;
    case 'place':
      body = (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon.pin size={12} color="rgba(243,237,226,0.7)" />
          <TText style={{ fontSize: 12, color: style.text.color }}>{run.city}</TText>
        </View>
      );
      width = 130;
      break;
    case 'hrChart': {
      const data = liveHr ?? run.streamHr ?? null;
      width = 180;
      body = (
        <>
          <Eyebrow style={{ color: style.eyebrow.color, fontSize: 9 }}>HEART RATE</Eyebrow>
          {data && data.length > 1 ? (
            <View style={{ height: 36, marginTop: 4 }}>
              <StreamChart data={data} color="#e85d2f" />
            </View>
          ) : (
            <TText variant="mono" style={{ fontSize: 11, color: style.eyebrow.color, marginTop: 6 }}>NO HR DATA</TText>
          )}
        </>
      );
      break;
    }
    case 'paceChart': {
      const data = livePace ?? run.streamPace ?? null;
      width = 180;
      body = (
        <>
          <Eyebrow style={{ color: style.eyebrow.color, fontSize: 9 }}>PACE</Eyebrow>
          {data && data.length > 1 ? (
            <View style={{ height: 36, marginTop: 4 }}>
              <StreamChart data={data} color={style.text.color ?? '#f3ede2'} />
            </View>
          ) : (
            <TText variant="mono" style={{ fontSize: 11, color: style.eyebrow.color, marginTop: 6 }}>NO PACE DATA</TText>
          )}
        </>
      );
      break;
    }
    case 'map': {
      const pts = (liveRoute && liveRoute.length > 1) ? liveRoute : run.route;
      width = 140;
      body = (
        <>
          <Eyebrow style={{ color: style.eyebrow.color, fontSize: 9 }}>ROUTE</Eyebrow>
          <View style={{ width: 120, height: 80, marginTop: 6, borderRadius: 6, overflow: 'hidden', backgroundColor: 'rgba(20,17,13,0.4)' }}>
            <RouteMap points={pts} width={120} height={80} style="dark" accent="#e85d2f" routeStrokeWidth={2.2} animate={false} flat />
          </View>
        </>
      );
      break;
    }
    case 'splits': {
      const splits = liveSplits ?? run.splits ?? [];
      width = 180;
      body = (
        <>
          <Eyebrow style={{ color: style.eyebrow.color, fontSize: 9 }}>SPLITS</Eyebrow>
          {splits.length > 0 ? (
            <View style={{ marginTop: 6, gap: 2 }}>
              {splits.slice(0, 5).map((s) => (
                <View key={s.k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <TText variant="mono" style={{ fontSize: 11, color: style.eyebrow.color }}>K{s.k}</TText>
                  <TText variant="mono" style={{ fontSize: 11, color: style.text.color }}>{fmtPace(s.sec, units)}</TText>
                </View>
              ))}
              {splits.length > 5 && (
                <TText variant="mono" style={{ fontSize: 9, color: 'rgba(243,237,226,0.4)', marginTop: 2 }}>+{splits.length - 5} more</TText>
              )}
            </View>
          ) : (
            <TText variant="mono" style={{ fontSize: 11, color: style.eyebrow.color, marginTop: 6 }}>NO SPLITS</TText>
          )}
        </>
      );
      break;
    }
    default:
      body = <TText style={{ color: style.text.color, fontSize: 12 }}>{sticker.key}</TText>;
  }

  // Anchor the box by its own centre on the seed point — width is known here,
  // height is measured via onLayout — so wide stickers no longer drift.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value - width / 2 },
      { translateY: ty.value - boxH / 2 },
      { scale: scale.value },
    ],
  }), [width, boxH]);

  if (frozen) {
    return (
      <Animated.View
        pointerEvents="none"
        onLayout={onBoxLayout}
        style={[
          {
            position: 'absolute',
            width,
            padding: style.container.paddingVertical,
            backgroundColor: style.container.backgroundColor,
            borderRadius: style.container.borderRadius,
            borderWidth: style.container.borderWidth,
            borderColor: style.container.borderColor,
          },
          animatedStyle,
        ]}
      >
        {body}
      </Animated.View>
    );
  }

  return (
    <GestureDetector gesture={composed}>
      <Animated.View onLayout={onBoxLayout} style={[
        {
          position: 'absolute',
          width,
          padding: style.container.paddingVertical,
          backgroundColor: style.container.backgroundColor,
          borderRadius: style.container.borderRadius,
          borderWidth: style.container.borderWidth,
          borderColor: isSelected ? c.accent : style.container.borderColor,
        },
        animatedStyle
      ]}>
        {body}
        {isSelected && (
          <Pressable
            onPress={() => onRemove(stickerId)}
            hitSlop={12}
            style={{
              position: 'absolute', top: -10, right: -10,
              width: 24, height: 24, borderRadius: 12,
              backgroundColor: c.accent,
              alignItems: 'center', justifyContent: 'center',
              boxShadow: '0px 1px 4px rgba(0,0,0,0.25)',
            }}
          >
            <TText variant="mono" style={{ fontSize: 13, lineHeight: 13, color: '#f3ede2', fontWeight: '700' }}>×</TText>
          </Pressable>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

export const DraggableSticker = memo(DraggableStickerImpl);
