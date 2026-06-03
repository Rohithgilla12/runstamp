import React, { memo, useMemo } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { Canvas } from '../canvas/Canvas';
import { seedToStickers } from './seed';
import type { Activity, Background, Layout, LiveStreams } from '../layouts/types';

interface Props {
  layout: Layout;
  run: Activity;
  live: LiveStreams;
  background: Background;
  photoUri: string | null;
  index: number;
  scrollX: SharedValue<number>;
  itemWidth: number;
  cardW: number;
  cardH: number;
  onPress: () => void;
}

export const DeckCard = memo(function DeckCard({
  layout, run, live, background, photoUri, index, scrollX, itemWidth, cardW, cardH, onPress,
}: Props) {
  // Same seed helper the franking capture uses, so the card and the export match.
  const stickers = useMemo(() => seedToStickers(layout, 'deck'), [layout]);

  // pos: -1 = one slot left of center, 0 = centered, 1 = one slot right.
  // Slots overlap (itemWidth < cardW) so neighbours tuck behind the centred
  // card — an Apple-Wallet stack, not a flat carousel.
  const aStyle = useAnimatedStyle(() => {
    const pos = scrollX.value / itemWidth - index;
    const dist = Math.min(Math.abs(pos), 1.4);
    return {
      opacity: interpolate(dist, [0, 1, 1.4], [1, 0.55, 0], Extrapolation.CLAMP),
      zIndex: Math.round(interpolate(dist, [0, 1], [20, 0], Extrapolation.CLAMP)),
      transform: [
        { scale: interpolate(pos, [-1, 0, 1], [0.82, 1, 0.82], Extrapolation.CLAMP) },
        { rotateZ: `${interpolate(pos, [-1, 0, 1], [6, 0, -6], Extrapolation.CLAMP)}deg` },
        { translateY: interpolate(pos, [-1, 0, 1], [16, 0, 16], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Animated.View style={[{ width: itemWidth, alignItems: 'center', justifyContent: 'center' }, aStyle]}>
      <Pressable onPress={onPress}>
        <Canvas
          run={run}
          layout={layout}
          width={cardW}
          height={cardH}
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
      </Pressable>
    </Animated.View>
  );
});
