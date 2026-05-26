import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { StampBadge } from '../../design/StampBadge';
import { useColors } from '../../design/theme';
import { Eyebrow, TText } from '../../design/typography';
import { type CatalogStamp } from '../../state/useStamps';
import { StampShareModal } from '../StampShareModal';

// EarnedStampSlot — extracted + memo'd so the multi-path StampBadge SVG
// only re-renders when its own props change. Without this, a context update
// upstream (useActivities refresh, useAccount.me hydration, etc.) would
// re-render every badge in the carousel.
const EarnedStampSlot = React.memo(function EarnedStampSlot({
  stamp,
  inkColor,
  onPress,
}: {
  stamp: CatalogStamp;
  inkColor: string;
  onPress: (s: CatalogStamp) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(stamp)}
      accessibilityLabel={`Share ${stamp.name} stamp`}
      style={({ pressed }) => [{
        alignItems: 'center', width: 96,
        opacity: pressed ? 0.7 : 1,
      }]}
    >
      <View collapsable={false} shouldRasterizeIOS renderToHardwareTextureAndroid>
        <StampBadge id={`home-${stamp.id}`} name={stamp.name} tier={stamp.tier} earned size={68} />
      </View>
      <TText style={{ fontSize: 10.5, color: inkColor, marginTop: 6, textAlign: 'center' }} numberOfLines={2}>
        {stamp.name}
      </TText>
    </Pressable>
  );
});

export function RecentlyEarned({ earned, onOpenStamps }: { earned: CatalogStamp[]; onOpenStamps: () => void }) {
  const c = useColors();
  const [sharing, setSharing] = useState<CatalogStamp | null>(null);
  const recent = useMemo(
    () => [...earned]
      .sort((a, b) => (b.earnedAt ?? '').localeCompare(a.earnedAt ?? ''))
      .slice(0, 6),
    [earned],
  );
  // Stable onPress reference for the memo'd slot. Without this, every
  // render passes a new fn and the memo defeats itself.
  const handleSlotPress = useCallback((s: CatalogStamp) => setSharing(s), []);

  return (
    <>
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Eyebrow style={{ color: c.ink3 }}>RECENTLY EARNED</Eyebrow>
        <Pressable onPress={onOpenStamps} hitSlop={6} accessibilityLabel="Open stamps">
          <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>SEE ALL →</TText>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, gap: 10 }}
      >
        {recent.map((s) => (
          <EarnedStampSlot key={s.id} stamp={s} inkColor={c.ink2} onPress={handleSlotPress} />
        ))}
      </ScrollView>
      <StampShareModal stamp={sharing} onClose={() => setSharing(null)} />
    </>
  );
}
