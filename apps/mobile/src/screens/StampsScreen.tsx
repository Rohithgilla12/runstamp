import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Stamp, type StampTier } from '../data/sample';
import { useStamps, type CatalogStamp } from '../state/useStamps';
import { StampShareModal } from './StampShareModal';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { Button, Card } from '../design/atoms';
import { Icon } from '../design/Icon';
import { StampBadge } from '../design/StampBadge';
import type { RootStackProps } from '../nav/types';

type Filter = 'all' | StampTier;

const TIER_ORDER: StampTier[] = ['common', 'rare', 'mythic'];

export function StampsScreen({ navigation }: RootStackProps<'Stamps'>) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('all');
  const { stamps, loading, refresh } = useStamps();
  const [refreshing, setRefreshing] = useState(false);
  const [sharing, setSharing] = useState<CatalogStamp | null>(null);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  }, [refresh]);

  const byTier = useMemo(() => {
    const out: Record<StampTier, { earned: number; total: number; stamps: CatalogStamp[] }> = {
      common: { earned: 0, total: 0, stamps: [] },
      rare:   { earned: 0, total: 0, stamps: [] },
      mythic: { earned: 0, total: 0, stamps: [] }
    };
    for (const s of stamps) {
      out[s.tier].total += 1;
      if (s.earnedAt) out[s.tier].earned += 1;
      out[s.tier].stamps.push(s);
    }
    return out;
  }, [stamps]);

  const totalEarned = stamps.filter((s) => !!s.earnedAt).length;
  const visible = filter === 'all' ? stamps : byTier[filter].stamps;
  const earnedFirst = [...visible].sort((a, b) => Number(!!b.earnedAt) - Number(!!a.earnedAt));

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: c.paper }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.ink2} />}
    >
      <View style={{ paddingHorizontal: 14 }}>
        <Pressable onPress={() => navigation.goBack()} style={{
          width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: c.line,
          alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon.back size={18} color={c.ink} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <Eyebrow>COLLECTION</Eyebrow>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', marginTop: 4 }}>
          <TText variant="serif" style={{ fontSize: 30, lineHeight: 32, letterSpacing: -0.6 }}>Stamps </TText>
          <TText variant="serifItalic" style={{ fontSize: 30, lineHeight: 32, letterSpacing: -0.6 }}>earned</TText>
          <TText variant="serif" style={{ fontSize: 30, lineHeight: 32, letterSpacing: -0.6 }}>.</TText>
        </View>
        <TText style={{ fontSize: 13, color: c.ink3, marginTop: 6 }}>
          What you’ve done — not what the app made you do.
        </TText>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 18, flexDirection: 'row', gap: 14 }}>
        <View style={{ flex: 1 }}>
          <Eyebrow>EARNED</Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <TText variant="monoMedium" style={{ fontSize: 36, lineHeight: 36, letterSpacing: -1, color: c.ink }}>{totalEarned}</TText>
            <TText style={{ fontSize: 14, color: c.ink3, marginLeft: 4 }}>/ {stamps.length}</TText>
          </View>
        </View>
        {TIER_ORDER.map((t) => (
          <View key={t} style={{ flex: 1 }}>
            <Eyebrow style={{ color: tierColor(t, c) }}>{t.toUpperCase()}</Eyebrow>
            <TText variant="monoMedium" style={{ fontSize: 18, color: c.ink }}>{byTier[t].earned}/{byTier[t].total}</TText>
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 18, flexDirection: 'row', gap: 6 }}>
        {(['all', 'common', 'rare', 'mythic'] as const).map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={{
            paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
            borderWidth: 1, borderColor: c.line,
            backgroundColor: filter === f ? c.ink : 'transparent'
          }}>
            <TText style={{ fontSize: 12, fontWeight: '500', color: filter === f ? c.paper : c.ink2, textTransform: 'capitalize' }}>{f}</TText>
          </Pressable>
        ))}
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 18, flexDirection: 'row', flexWrap: 'wrap' }}>
        {earnedFirst.map((s) => (
          <View key={s.id} style={{ width: '50%', padding: 4 }}>
            <StampRow stamp={s} onPress={s.earnedAt ? () => setSharing(s) : undefined} />
          </View>
        ))}
      </View>

      <StampShareModal stamp={sharing} onClose={() => setSharing(null)} />

      <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
        <Card style={{ backgroundColor: c.ink, borderColor: 'transparent', overflow: 'hidden' }}>
          <Eyebrow style={{ color: c.accent }}>YEAR IN STAMPS · DEC 15</Eyebrow>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', marginTop: 6 }}>
            <TText variant="serif" style={{ fontSize: 20, color: c.paper, lineHeight: 22 }}>Your </TText>
            <TText variant="serifItalic" style={{ fontSize: 20, color: c.paper, lineHeight: 22 }}>2026</TText>
            <TText variant="serif" style={{ fontSize: 20, color: c.paper, lineHeight: 22 }}> Runstamp Album.</TText>
          </View>
          <TText style={{ fontSize: 12, color: 'rgba(243,237,226,0.6)', marginTop: 4, lineHeight: 18 }}>
            A swipeable card stack for every stamp earned this year — drops Dec 15 so it lands before the holiday post window.
          </TText>
          <View style={{ marginTop: 12 }}>
            <Button kind="accent" full icon={<Icon.share size={16} color="#fff" />} onPress={() => navigation.navigate('YearInStamps')}>Preview the album</Button>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

function StampRow({ stamp, onPress }: { stamp: Stamp | CatalogStamp; onPress?: () => void }) {
  const c = useColors();
  const earned = !!stamp.earnedAt;
  const body = (
    <View style={{
      borderRadius: 16, padding: 12,
      backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line,
      alignItems: 'center',
    }}>
      <StampBadge id={stamp.id} name={stamp.name} tier={stamp.tier} earned={earned} size={92} />
      <TText style={{ fontSize: 13, fontWeight: '500', color: c.ink, marginTop: 8, textAlign: 'center' }}>{stamp.name}</TText>
      {earned ? (
        <TText variant="mono" style={{ fontSize: 10, color: c.ink3, marginTop: 2 }}>
          {stamp.earnedAt?.slice(0, 10)} · tap to share
        </TText>
      ) : (
        <TText variant="mono" style={{ fontSize: 10, color: c.ink3, marginTop: 2 }}>LOCKED</TText>
      )}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
        {body}
      </Pressable>
    );
  }
  return body;
}

function tierColor(t: StampTier, c: { accent: string; ink: string; moss: string }): string {
  if (t === 'mythic') return c.accent;
  if (t === 'rare') return c.ink;
  return c.moss;
}
