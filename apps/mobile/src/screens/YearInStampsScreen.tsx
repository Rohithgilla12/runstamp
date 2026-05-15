// Year-in-Stamps recap carousel — full 9-card design ships in M7 once stamp
// awarding + per-year aggregates land. The original prototype hardcoded mock
// PRs, places, and shoes, so it was misleading on real installs. For tonight
// it's a clean "coming soon" surface that respects the same modal entry.

import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { SunMark } from '../design/SunMark';
import { Icon } from '../design/Icon';
import type { RootStackProps } from '../nav/types';

export function YearInStampsScreen({ navigation }: RootStackProps<'YearInStamps'>) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const year = new Date().getFullYear();

  return (
    <View style={{ flex: 1, backgroundColor: c.ink }}>
      <LinearGradient
        colors={['rgba(232,93,47,0.18)', 'rgba(14,13,11,1)']}
        locations={[0, 0.55]}
        style={{ position: 'absolute', inset: 0 }}
      />
      <View style={{ position: 'absolute', right: -60, top: 80, opacity: 0.08 }}>
        <SunMark size={320} />
      </View>

      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 36, height: 36, borderRadius: 12,
            backgroundColor: 'rgba(243,237,226,0.08)',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon.x size={16} color={c.paper} />
        </Pressable>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }}>
        <Eyebrow style={{ color: c.accent }}>{year} · YEAR IN STAMPS</Eyebrow>
        <View style={{ marginTop: 10 }}>
          <TText variant="serif" style={{ fontSize: 42, lineHeight: 44, letterSpacing: -1, color: c.paper }}>
            Your year, stamped.
          </TText>
          <TText variant="serifItalic" style={{ fontSize: 42, lineHeight: 44, letterSpacing: -1, color: c.paper }}>
            Coming soon.
          </TText>
        </View>
        <TText style={{ fontSize: 14, lineHeight: 20, color: 'rgba(243,237,226,0.7)', marginTop: 18 }}>
          We’re building a 9-card recap of your runs, PRs, new cities, and stamps earned this year.
          Connect Strava or Apple Health so we have your full history ready when this ships.
        </TText>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [{
            marginTop: 26, paddingHorizontal: 18, height: 46, borderRadius: 12,
            backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center',
            alignSelf: 'flex-start', opacity: pressed ? 0.85 : 1,
          }]}
        >
          <TText style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>Got it</TText>
        </Pressable>
      </View>
    </View>
  );
}
