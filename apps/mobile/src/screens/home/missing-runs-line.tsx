import React from 'react';
import { Pressable, View } from 'react-native';
import { useColors } from '../../design/theme';
import { TText } from '../../design/typography';

// One quiet inline line, not a bordered card. Solar dot + text, tappable.
// Earns the solar pop because it's an actionable signal ("a run is
// waiting"), not chrome.
export function MissingRunsLine({ count, onPress }: { count: number; onPress: () => void }) {
  const c = useColors();
  const label = count === 1
    ? '1 run in Apple Health isn’t imported yet'
    : `${count} runs in Apple Health aren’t imported yet`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Review and import HealthKit runs"
      style={({ pressed }) => [{
        marginHorizontal: 20, marginTop: 6, paddingVertical: 10,
        flexDirection: 'row', alignItems: 'center', gap: 10,
        opacity: pressed ? 0.6 : 1,
      }]}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent }} />
      <TText style={{ flex: 1, fontSize: 12, color: c.ink2 }}>{label}</TText>
      <TText variant="mono" style={{ fontSize: 11, color: c.accent }}>REVIEW →</TText>
    </Pressable>
  );
}
