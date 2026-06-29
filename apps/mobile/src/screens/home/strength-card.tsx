import React from 'react';
import { Pressable, View } from 'react-native';
import { useColors } from '../../design/theme';
import { Eyebrow, TText } from '../../design/typography';
import { Icon } from '../../design/Icon';

// Evergreen entry to the strength library. Quiet row, shows in both the
// connected and empty Home states — the work is worth doing either way.
export function StrengthCard({ onPress }: { onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Open strength training for runners"
      style={({ pressed }) => ({
        marginHorizontal: 20,
        marginTop: 8,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: c.paper2,
        borderWidth: 1,
        borderColor: c.line,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{
        width: 40, height: 40, borderRadius: 10, backgroundColor: c.paper3,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon.dumbbell size={22} color={c.ink2} />
      </View>
      <View style={{ flex: 1 }}>
        <Eyebrow>TRAINING</Eyebrow>
        <TText style={{ fontSize: 14, fontWeight: '500', color: c.ink, marginTop: 2 }}>Strength for runners</TText>
        <TText style={{ fontSize: 12, color: c.ink3, marginTop: 1 }}>Stay injury-free, run the hills, find your speed.</TText>
      </View>
      <Icon.chevR size={16} color={c.ink3} />
    </Pressable>
  );
}
