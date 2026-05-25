import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useColors } from '../../design/theme';
import { TText } from '../../design/typography';
import { Icon } from '../../design/Icon';
import { STICKER_LIBRARY, stickerHasValue } from '../stickers/stickerHasValue';
import type { Activity, LiveStreams, StickerInstance, StickerKey } from '../layouts/types';

interface Props {
  run: Activity;
  live: LiveStreams;
  stickers: StickerInstance[];
  onToggle: (key: StickerKey) => void;
}

export function StatsShelf({ run, live, stickers, onToggle }: Props) {
  const c = useColors();
  const available = STICKER_LIBRARY.filter((s) =>
    stickerHasValue(s.key, run, live.hr, live.pace, live.route, live.splits),
  );
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 }}>
        <TText variant="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: c.ink3 }}>STATS</TText>
        <TText variant="mono" style={{ fontSize: 9, color: c.ink3, opacity: 0.6 }}>tap to add · drag to place</TText>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 6, gap: 6 }}>
        {available.map((s) => {
          const placed = stickers.some((p) => p.key === s.key);
          return (
            <Pressable
              key={s.key}
              onPress={() => onToggle(s.key)}
              style={{
                paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
                backgroundColor: placed ? c.ink : c.paper2,
                borderWidth: 1, borderColor: placed ? c.ink : c.line,
                flexDirection: 'row', alignItems: 'center', gap: 5,
              }}
            >
              {placed
                ? <Icon.check size={11} color={c.paper} />
                : <TText style={{ fontSize: 12, color: c.ink3 }}>+</TText>}
              <TText style={{ fontSize: 12, color: placed ? c.paper : c.ink2 }}>{s.label}</TText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
