import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SHOES, STAMPS, distUnit } from '../data/sample';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../nav/types';
import { useAppState } from '../state/AppState';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { Card } from '../design/atoms';
import { Icon } from '../design/Icon';
import { SunMark } from '../design/SunMark';
import { SectionHeader } from './HomeScreen';
import type { TabProps } from '../nav/types';

type Sub = 'main' | 'shoes' | 'connections' | 'privacy';

export function SettingsScreen(_props: TabProps<'Profile'>) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { units, dark, setDark, setHasOnboarded } = useAppState();
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [sub, setSub] = useState<Sub>('main');
  const earnedStamps = STAMPS.filter((s) => !!s.earnedAt).length;

  if (sub === 'shoes') return <ShoesScreen back={() => setSub('main')} />;
  if (sub === 'connections') return <ConnectionsScreen back={() => setSub('main')} />;
  if (sub === 'privacy') return <PrivacyScreen back={() => setSub('main')} />;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: c.paper }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 24 }}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <Eyebrow>PROFILE</Eyebrow>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
        <Card style={{ backgroundColor: c.paper2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
              <LinearGradient colors={[c.accent, '#c44a1e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />
              <TText variant="serif" style={{ fontSize: 24, color: '#fff' }}>G</TText>
            </View>
            <View style={{ flex: 1 }}>
              <TText variant="serif" style={{ fontSize: 22, color: c.ink, lineHeight: 24, letterSpacing: -0.3 }}>Gilla</TText>
              <TText style={{ fontSize: 12, color: c.ink3, marginTop: 2 }}>Bangalore · joined Aug ’23</TText>
            </View>
            <Icon.more size={18} color={c.ink3} />
          </View>

          <View style={{ flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.line, gap: 12 }}>
            {[
              ['LIFETIME', '4,287', 'km'],
              ['RUNS',     '612',   undefined],
              ['STREAK',   '6',     'd']
            ].map(([l, v, u], i) => (
              <View key={i} style={{ flex: 1 }}>
                <Eyebrow style={{ fontSize: 9 }}>{l}</Eyebrow>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <TText variant="monoMedium" style={{ fontSize: 18, color: c.ink }}>{v}</TText>
                  {u && <TText style={{ fontSize: 11, color: c.ink3, marginLeft: 3 }}>{u}</TText>}
                </View>
              </View>
            ))}
          </View>
        </Card>
      </View>

      <SectionHeader title="Runstamp" />
      <View style={{ paddingHorizontal: 14 }}>
        <Card padded={false}>
          <Row icon={<Icon.spark size={18} color={c.accent} />} label="Stamps collection" value={`${earnedStamps} / ${STAMPS.length} earned`} onPress={() => rootNav.navigate('Stamps')} />
          <Row icon={<Icon.shoe size={18} color={c.ink2} />} label="Shoes" value="4 active" onPress={() => setSub('shoes')} />
          <Row icon={<Icon.share size={18} color={c.ink2} />} label="Connections" value="Strava · Apple Health" onPress={() => setSub('connections')} />
          <Row icon={<Icon.privacy size={18} color={c.ink2} />} label="Privacy" value="200 m blur · on" onPress={() => setSub('privacy')} />
          <Row icon={<Icon.ruler size={18} color={c.ink2} />} label="Units" value={units === 'km' ? 'Metric' : 'Imperial'} chevron />
          <Row icon={<Icon.cam size={18} color={c.ink2} />} label="Default share" value="9:16 · Magazine" chevron isLast />
        </Card>
      </View>

      <SectionHeader title="Theme" />
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', gap: 8 }}>
        <ThemeSwatch dark={false} active={!dark} onPress={() => setDark(false)} label="Light" />
        <ThemeSwatch dark={true}  active={dark}  onPress={() => setDark(true)}  label="Dark" />
      </View>

      <SectionHeader title="Data" />
      <View style={{ paddingHorizontal: 14 }}>
        <Card padded={false}>
          <Row icon={<Icon.download size={18} color={c.ink2} />} label="Export data" value="GPX zip · JSON" chevron />
          <Row icon={<Icon.github size={18} color={c.ink2} />} label="View source" value="github.com/gilla/runstamp" chevron />
          <Row icon={<Icon.bolt size={18} color={c.ink2} />} label="Replay onboarding" onPress={() => setHasOnboarded(false)} chevron />
          <Row icon={<Icon.trash size={18} color="#c44a1e" />} label="Delete account" danger chevron isLast />
        </Card>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 12, alignItems: 'center' }}>
        <SunMark size={22} />
        <TText variant="mono" style={{ fontSize: 11, color: c.ink3, marginTop: 8 }}>RUNSTAMP · v0.1.0 · AGPL-3.0</TText>
        <TText variant="serifItalic" style={{ fontSize: 11, color: c.ink3, marginTop: 4 }}>Open-source. Self-hostable. Yours.</TText>
      </View>
    </ScrollView>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  chevron,
  danger,
  isLast
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  danger?: boolean;
  isLast?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [{
      flexDirection: 'row', alignItems: 'center', gap: 14,
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: isLast ? 0 : 1, borderBottomColor: c.line2,
      opacity: pressed && onPress ? 0.6 : 1
    }]}>
      <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <TText style={{ flex: 1, fontSize: 14, fontWeight: '500', color: danger ? '#c44a1e' : c.ink }}>{label}</TText>
      {value && <TText style={{ fontSize: 12, color: c.ink3 }}>{value}</TText>}
      {(chevron || onPress) && <Icon.chevR size={14} color={c.ink3} />}
    </Pressable>
  );
}

function ThemeSwatch({ dark, active, onPress, label }: { dark: boolean; active: boolean; onPress: () => void; label: string }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{
      flex: 1, padding: 14, borderRadius: 12,
      backgroundColor: dark ? '#0e0d0b' : '#f3ede2',
      borderWidth: 1.5, borderColor: active ? c.accent : c.line,
      opacity: pressed ? 0.85 : 1
    }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ width: 18, height: 18 }}>
          {dark ? <Icon.moon size={18} color="#f3ede2" /> : <Icon.sun size={18} color="#14110d" />}
        </View>
        {active && <Icon.check size={16} color={c.accent} />}
      </View>
      <TText style={{ marginTop: 8, fontSize: 12, fontWeight: '500', color: dark ? '#f3ede2' : '#14110d' }}>{label}</TText>
      <View style={{ marginTop: 6, flexDirection: 'row', gap: 3 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: dark ? 'rgba(243,237,226,0.2)' : 'rgba(20,17,13,0.15)' }} />
        ))}
      </View>
    </Pressable>
  );
}

function SubHeader({ back, title }: { back: () => void; title: string }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingHorizontal: 14, paddingTop: insets.top + 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={back} style={{ width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
        <Icon.back size={18} color={c.ink} />
      </Pressable>
      <Eyebrow>{title}</Eyebrow>
      <View style={{ width: 36 }} />
    </View>
  );
}

function ShoesScreen({ back }: { back: () => void }) {
  const c = useColors();
  const { units } = useAppState();
  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, backgroundColor: c.paper }} contentContainerStyle={{ paddingBottom: 120 }}>
      <SubHeader back={back} title="SHOES" />
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <TText variant="serif" style={{ fontSize: 30, lineHeight: 32, letterSpacing: -0.6, color: c.ink }}>Four pairs in rotation.</TText>
        <TText style={{ fontSize: 13, color: c.ink3, marginTop: 4 }}>Total: 1,176 km across active shoes.</TText>
      </View>
      <View style={{ paddingHorizontal: 14, paddingTop: 18, gap: 10 }}>
        {SHOES.map((s) => {
          const pct = Math.min(s.km / s.cap, 1);
          const warn = pct > 0.85;
          return (
            <Card key={s.id}>
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
                <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: s.color, opacity: s.primary ? 1 : 0.85, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon.shoe size={26} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                    <TText style={{ fontSize: 15, fontWeight: '500', color: c.ink }}>{s.model}</TText>
                    {s.primary && <Eyebrow style={{ color: c.accent, fontSize: 9 }}>PRIMARY</Eyebrow>}
                    {s.race && <Eyebrow style={{ fontSize: 9 }}>RACE-DAY</Eyebrow>}
                  </View>
                  <TText style={{ fontSize: 12, color: c.ink3 }}>{s.brand} · since {s.since.slice(0, 7)}</TText>
                  <View style={{ marginTop: 10 }}>
                    <View style={{ height: 6, backgroundColor: c.line, borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ width: `${pct * 100}%`, height: 6, backgroundColor: warn ? c.warn : c.ink }} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                      <TText variant="mono" style={{ fontSize: 11, color: warn ? c.warn : c.ink2 }}>
                        {s.km} {distUnit(units)}{warn ? ' · replace soon' : ''}
                      </TText>
                      <TText variant="mono" style={{ fontSize: 11, color: c.ink3 }}>cap {s.cap}</TText>
                    </View>
                  </View>
                </View>
              </View>
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
}

function ConnectionsScreen({ back }: { back: () => void }) {
  const c = useColors();
  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, backgroundColor: c.paper }} contentContainerStyle={{ paddingBottom: 120 }}>
      <SubHeader back={back} title="CONNECTIONS" />
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <TText variant="serif" style={{ fontSize: 28, lineHeight: 30, letterSpacing: -0.6, color: c.ink }}>Where your runs come from.</TText>
      </View>
      <View style={{ paddingHorizontal: 14, paddingTop: 18, gap: 10 }}>
        <ConnCard
          bg="#fc4c02"
          iconNode={<Icon.strava size={28} color="#fff" />}
          name="Strava"
          status="Connected · canonical"
          sub="Webhook-driven · last sync 4m ago"
          counts={[['612', 'runs'], ['4,287', 'km'], ['—', 'errors']]}
        />
        <ConnCard
          bg="#fb466c"
          iconNode={<Icon.heart size={24} color="#fff" />}
          name="Apple Health"
          status="Connected · fallback"
          sub="Read-only · 14 deduped against Strava"
          counts={[['218', 'workouts'], ['8', 'dupes'], ['—', 'errors']]}
        />
        <View style={{ padding: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: c.line, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: c.paper2, alignItems: 'center', justifyContent: 'center' }}>
            <Icon.plus size={22} color={c.ink2} />
          </View>
          <View style={{ flex: 1 }}>
            <TText style={{ fontSize: 14, fontWeight: '500', color: c.ink }}>Garmin Connect</TText>
            <TText style={{ fontSize: 11, color: c.ink3 }}>Coming in M8 · roadmap</TText>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function ConnCard({
  bg,
  iconNode,
  name,
  status,
  sub,
  counts
}: {
  bg: string;
  iconNode: React.ReactNode;
  name: string;
  status: string;
  sub: string;
  counts: [string, string][];
}) {
  const c = useColors();
  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
          {iconNode}
        </View>
        <View style={{ flex: 1 }}>
          <TText style={{ fontSize: 16, fontWeight: '500', color: c.ink }}>{name}</TText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.moss }} />
            <Eyebrow style={{ color: c.moss }}>{status}</Eyebrow>
          </View>
          <TText style={{ fontSize: 11, color: c.ink3, marginTop: 6 }}>{sub}</TText>
        </View>
      </View>
      <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line, flexDirection: 'row', gap: 10 }}>
        {counts.map(([v, l], i) => (
          <View key={i} style={{ flex: 1 }}>
            <TText variant="monoMedium" style={{ fontSize: 18, color: c.ink }}>{v}</TText>
            <Eyebrow style={{ fontSize: 9 }}>{l}</Eyebrow>
          </View>
        ))}
      </View>
    </Card>
  );
}

function PrivacyScreen({ back }: { back: () => void }) {
  const c = useColors();
  const [zone, setZone] = useState(200);
  const [hideHome, setHideHome] = useState(true);
  const [hideWork, setHideWork] = useState(false);

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, backgroundColor: c.paper }} contentContainerStyle={{ paddingBottom: 120 }}>
      <SubHeader back={back} title="PRIVACY" />
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <TText variant="serif" style={{ fontSize: 28, lineHeight: 30, letterSpacing: -0.6, color: c.ink }}>Don’t show the world where you start.</TText>
        <TText style={{ fontSize: 13, color: c.ink3, marginTop: 6 }}>
          Runstamp defaults <TText style={{ color: c.ink }}>on</TText>. Strava defaults off.
        </TText>
      </View>

      <View style={{ paddingHorizontal: 14, paddingTop: 18 }}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Eyebrow>BLUR RADIUS</Eyebrow>
            <TText variant="monoMedium" style={{ fontSize: 18, color: c.ink }}>{zone} m</TText>
          </View>
          <BlurSlider value={zone} onChange={setZone} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <TText variant="mono" style={{ fontSize: 10, color: c.ink3 }}>OFF</TText>
            <TText variant="mono" style={{ fontSize: 10, color: c.ink3 }}>200</TText>
            <TText variant="mono" style={{ fontSize: 10, color: c.ink3 }}>500 M</TText>
          </View>
        </Card>
      </View>

      <View style={{ paddingHorizontal: 14, paddingTop: 14 }}>
        <Card padded={false}>
          <Toggle label="Hide home start" sub="2nd Cross, Jayanagar" value={hideHome} onChange={setHideHome} />
          <Toggle label="Hide office" sub="Indiranagar" value={hideWork} onChange={setHideWork} />
          <Toggle label="Hide route from screenshots" sub="Strip GPS from share cards" value={true} onChange={() => undefined} isLast />
        </Card>
      </View>
    </ScrollView>
  );
}

function BlurSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  // Tap-to-step segmented stand-in for a real slider; will swap to a gesture-driven
  // thumb once @react-native-community/slider is wired (M7 polish).
  const c = useColors();
  const steps = [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, height: 26 }}>
      {steps.map((s) => {
        const on = value >= s && s > 0;
        return (
          <Pressable key={s} onPress={() => onChange(s)} style={{ flex: 1, height: 4 }}>
            <View style={{ flex: 1, borderRadius: 2, backgroundColor: on ? c.accent : c.line }} />
          </Pressable>
        );
      })}
    </View>
  );
}

function Toggle({
  label,
  sub,
  value,
  onChange,
  isLast
}: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  isLast?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable onPress={() => onChange(!value)} style={({ pressed }) => [{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: isLast ? 0 : 1, borderBottomColor: c.line2,
      opacity: pressed ? 0.7 : 1
    }]}>
      <View style={{ flex: 1 }}>
        <TText style={{ fontSize: 14, fontWeight: '500', color: c.ink }}>{label}</TText>
        {sub && <TText style={{ fontSize: 11, color: c.ink3, marginTop: 2 }}>{sub}</TText>}
      </View>
      <View style={{
        width: 46, height: 28, borderRadius: 14, padding: 2,
        backgroundColor: value ? c.accent : c.line, justifyContent: 'center'
      }}>
        <View style={{
          width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff',
          transform: [{ translateX: value ? 18 : 0 }]
        }} />
      </View>
    </Pressable>
  );
}
