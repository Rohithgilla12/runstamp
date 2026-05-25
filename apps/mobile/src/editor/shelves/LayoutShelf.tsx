import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useColors } from '../../design/theme';
import { TText } from '../../design/typography';
import { LAYOUTS } from '../layouts/registry';
import { LayoutThumbnail } from '../layouts/LayoutThumbnail';
import type { Activity, Background, LayoutId, LiveStreams } from '../layouts/types';

interface Props {
  run: Activity;
  live: LiveStreams;
  background: Background;
  photoUri: string | null;
  activeId: LayoutId;
  onSelect: (id: LayoutId) => void;
}

export function LayoutShelf({ run, live, background, photoUri, activeId, onSelect }: Props) {
  const c = useColors();
  const activeName = LAYOUTS.find((l) => l.id === activeId)?.name ?? '';
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14 }}>
        <TText variant="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: c.ink3 }}>LAYOUT</TText>
        <TText variant="mono" style={{ fontSize: 9, color: c.ink3 }}>{activeName.toLowerCase()}</TText>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 6, gap: 8, paddingBottom: 4 }}>
        {LAYOUTS.map((l) => {
          const active = l.id === activeId;
          return (
            <Pressable key={l.id} onPress={() => onSelect(l.id)}>
              <View style={{
                borderRadius: 7,
                padding: 1.5,
                borderWidth: 1.5,
                borderColor: active ? c.accent : 'transparent',
              }}>
                <LayoutThumbnail run={run} layout={l} background={background} photoUri={photoUri} live={live} />
              </View>
              <TText style={{ fontSize: 9, color: active ? c.ink : c.ink3, textAlign: 'center', marginTop: 2 }}>{l.name}</TText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
