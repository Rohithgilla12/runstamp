import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import type { Activity } from '../../data/sample';
import { useColors } from '../../design/theme';
import { TText } from '../../design/typography';
import { useStamps } from '../../state/useStamps';

// PRD §6.2: "the headline metric of the whole app" — the one line a user
// quotes when explaining Runstamp to a friend. Quiet pill under the
// greeting; mono numerals carry the weight. Taps jump to Places.
export function StampCountChip({
  activities,
  onPress,
}: {
  activities: Activity[];
  onPress: () => void;
}) {
  const c = useColors();
  const { earned } = useStamps();
  const stamps = earned.length;
  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const a of activities) {
      const country = a.country?.trim();
      if (country) set.add(country);
    }
    return set.size;
  }, [activities]);

  // Nothing earned, nowhere traveled — hide the chip rather than show
  // "0 stamps · 0 countries", which sets the wrong first impression.
  if (stamps === 0 && countries === 0) return null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`${stamps} stamps and ${countries} countries — open Places`}
      style={({ pressed }) => ({
        marginHorizontal: 20,
        marginTop: 4,
        marginBottom: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: c.paper2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' }}>
        <TText variant="monoMedium" style={{ fontSize: 16, letterSpacing: -0.4, color: c.ink }}>{stamps}</TText>
        <TText style={{ fontSize: 12, color: c.ink2, marginLeft: 4 }}>{stamps === 1 ? 'stamp' : 'stamps'}</TText>
        <TText style={{ fontSize: 12, color: c.ink3, marginHorizontal: 8 }}>·</TText>
        <TText variant="monoMedium" style={{ fontSize: 16, letterSpacing: -0.4, color: c.ink }}>{countries}</TText>
        <TText style={{ fontSize: 12, color: c.ink2, marginLeft: 4 }}>{countries === 1 ? 'country' : 'countries'}</TText>
      </View>
      <TText variant="mono" style={{ fontSize: 11, color: c.ink3 }}>→</TText>
    </Pressable>
  );
}
