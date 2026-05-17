import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { TILE_STYLES, tileUrl, type TileStyle } from '../services/mapTiles';
import type { TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { distUnit } from '../data/sample';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../nav/types';
import { useAppState } from '../state/AppState';
import { useAuth } from '../state/AuthContext';
import { useHealth } from '../state/HealthContext';
import { useActivities } from '../state/useActivities';
import { fmtDist } from '../data/sample';
import { connectStrava, disconnectStrava, getStravaStatus, type StravaStatus } from '../services/strava';
import { reevaluateStamps } from '../services/stamps';
import { backfillPlaces } from '../services/places';
import { deleteAccount } from '../services/account';
import { useAccount } from '../state/useAccount';
import { usePrivacyZones } from '../state/usePrivacyZones';
import type { Activity } from '../data/sample';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { Card } from '../design/atoms';
import { FONT } from '../design/fonts';
import { Icon } from '../design/Icon';
import { SunMark } from '../design/SunMark';
import { SectionHeader } from './HomeScreen';
import type { TabProps } from '../nav/types';

type Sub = 'main' | 'shoes' | 'connections' | 'privacy';

export function SettingsScreen(_props: TabProps<'Profile'>) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { units, dark, setDark, setHasOnboarded, tileStyle, setTileStyle } = useAppState();
  const { signOut, user } = useAuth();
  const { activities } = useActivities();
  const { me, save: saveAccount } = useAccount();
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [sub, setSub] = useState<Sub>('main');
  const [hrMax, setHrMax] = useState<string>('');
  const [hrResting, setHrResting] = useState<string>('');
  const [birthYear, setBirthYear] = useState<string>('');
  useEffect(() => {
    if (me) {
      setHrMax(me.hrMax ? String(me.hrMax) : '');
      setHrResting(me.hrResting ? String(me.hrResting) : '');
      setBirthYear(me.birthYear ? String(me.birthYear) : '');
    }
  }, [me]);
  const saveHr = useCallback(async () => {
    const hr = hrMax === '' ? null : Number(hrMax);
    const re = hrResting === '' ? null : Number(hrResting);
    if (hr !== null && (Number.isNaN(hr) || hr < 120 || hr > 230)) { Alert.alert('HR max must be 120–230'); return; }
    if (re !== null && (Number.isNaN(re) || re < 30 || re > 100)) { Alert.alert('Resting HR must be 30–100'); return; }
    try { await saveAccount({ hrMax: hr, hrResting: re }); }
    catch (e) { Alert.alert('Could not save', e instanceof Error ? e.message : String(e)); }
  }, [hrMax, hrResting, saveAccount]);
  const saveBirthYear = useCallback(async () => {
    const by = birthYear === '' ? null : Number(birthYear);
    const thisYear = new Date().getFullYear();
    if (by !== null && (Number.isNaN(by) || by < thisYear - 100 || by > thisYear - 10)) {
      Alert.alert(`Birth year must be between ${thisYear - 100} and ${thisYear - 10}`); return;
    }
    try { await saveAccount({ birthYear: by }); }
    catch (e) { Alert.alert('Could not save', e instanceof Error ? e.message : String(e)); }
  }, [birthYear, saveAccount]);
  const totalKm = activities.reduce((a, x) => a + x.distance, 0);
  const totalRuns = activities.length;
  const streak = computeStreak(activities.map((a) => a.date));
  // Server-stored displayName beats the Firebase token's — users can override
  // their Apple/Google name in Runstamp without rewiring their auth provider.
  const displayName = me?.displayName?.trim()
    || user?.displayName?.trim()
    || user?.email?.split('@')[0]
    || 'Runner';
  const initial = (displayName[0] ?? 'R').toUpperCase();
  const joinedLabel = formatJoined(user?.metadata?.creationTime);
  const handleEditName = useCallback(() => {
    Alert.prompt(
      'Edit name',
      'Shown on your share cards and recap.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (text?: string) => {
            const next = (text ?? '').trim();
            if (!next || next === displayName) return;
            if (next.length > 40) { Alert.alert('Too long', 'Keep it under 40 characters.'); return; }
            try {
              await saveAccount({ displayName: next });
            } catch (e) {
              Alert.alert('Couldn’t save', e instanceof Error ? e.message : String(e));
            }
          },
        },
      ],
      'plain-text',
      displayName,
    );
  }, [displayName, saveAccount]);

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
              <TText variant="serif" style={{ fontSize: 24, color: '#fff' }}>{initial}</TText>
            </View>
            <View style={{ flex: 1 }}>
              <Pressable
                onPress={handleEditName}
                onLongPress={handleEditName}
                delayLongPress={300}
                hitSlop={6}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, flexDirection: 'row', alignItems: 'baseline', gap: 8 })}
                accessibilityLabel="Edit name"
              >
                <TText variant="serif" style={{ fontSize: 22, color: c.ink, lineHeight: 24, letterSpacing: -0.3 }}>{displayName}</TText>
                <TText variant="mono" style={{ fontSize: 10, color: c.ink3, letterSpacing: 1.2, textTransform: 'uppercase' }}>Edit</TText>
              </Pressable>
              {joinedLabel && <TText style={{ fontSize: 12, color: c.ink3, marginTop: 2 }}>{joinedLabel}</TText>}
            </View>
          </View>

          <View style={{ flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.line, gap: 12 }}>
            {[
              ['LIFETIME', totalKm > 0 ? fmtDist(totalKm, units) : '—', units] as const,
              ['RUNS',     totalRuns > 0 ? String(totalRuns) : '—', undefined] as const,
              ['STREAK',   streak > 0 ? String(streak) : '—', streak > 0 ? 'd' : undefined] as const,
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

      <SectionHeader title="Heart rate profile" />
      <View style={{ paddingHorizontal: 20 }}>
        <Card style={{ backgroundColor: c.paper2, gap: 10 }}>
          <LabeledInput
            label="MAX HR (BPM)"
            placeholder="190"
            value={hrMax}
            keyboardType="number-pad"
            onChangeText={setHrMax}
            onBlur={saveHr}
          />
          <LabeledInput
            label="RESTING HR (BPM)"
            placeholder="60"
            value={hrResting}
            keyboardType="number-pad"
            onChangeText={setHrResting}
            onBlur={saveHr}
          />
          <LabeledInput
            label="BIRTH YEAR"
            placeholder="1990"
            value={birthYear}
            keyboardType="number-pad"
            onChangeText={setBirthYear}
            onBlur={saveBirthYear}
          />
          <TText style={{ fontSize: 11, color: c.ink3 }}>
            HR drives training load · birth year drives MAF aerobic ceiling. Defaults
            to 190 / 60 if HR unset.
          </TText>
        </Card>
      </View>

      <SectionHeader title="Runstamp" />
      <View style={{ paddingHorizontal: 14 }}>
        <Card padded={false}>
          <Row icon={<Icon.spark size={18} color={c.accent} />} label="Stamps collection" value="View catalog" onPress={() => rootNav.navigate('Stamps')} />
          <Row icon={<Icon.shoe size={18} color={c.ink2} />} label="Shoes" value="Coming soon" onPress={() => setSub('shoes')} />
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

      <SectionHeader title="Map style" />
      <View style={{ paddingLeft: 20 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 20 }}>
          {TILE_STYLES.map((s) => (
            <TileStyleSwatch
              key={s.key}
              styleKey={s.key}
              label={s.label}
              sub={s.sub}
              active={tileStyle === s.key}
              onPress={() => setTileStyle(s.key)}
            />
          ))}
        </ScrollView>
      </View>

      <SectionHeader title="Data" />
      <View style={{ paddingHorizontal: 14 }}>
        <Card padded={false}>
          <Row icon={<Icon.download size={18} color={c.ink2} />} label="Export data" value="GPX zip · JSON" chevron />
          <Row icon={<Icon.github size={18} color={c.ink2} />} label="View source" value="github.com/gilla/runstamp" chevron />
          <Row icon={<Icon.bolt size={18} color={c.ink2} />} label="Replay onboarding" onPress={() => setHasOnboarded(false)} chevron />
          <Row icon={<Icon.user size={18} color={c.ink2} />} label="Sign out" onPress={signOut} chevron isLast />
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

function LabeledInput({ label, ...rest }: { label: string } & TextInputProps) {
  const c = useColors();
  return (
    <View style={{ gap: 4 }}>
      <Eyebrow style={{ color: c.ink3 }}>{label}</Eyebrow>
      <TextInput
        {...rest}
        style={{
          backgroundColor: c.paper, borderWidth: 1, borderColor: c.line,
          borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
          fontSize: 16, color: c.ink, fontFamily: FONT.mono,
        }}
        placeholderTextColor={c.ink3}
      />
    </View>
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

// TileStyleSwatch — small live preview chip. The thumbnail is a single tile
// fetched from CartoCDN at z=11/x=605/y=771 (≈ NYC midtown) — a globally
// recognisable mix of streets, water, parks, blocks so every style looks
// distinct in the picker even at 72×72. Same network image cache as the
// route maps, so picker thumbnails warm the cache for the actual map render.
function TileStyleSwatch({
  styleKey, label, sub, active, onPress,
}: {
  styleKey: TileStyle;
  label: string;
  sub: string;
  active: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  // NYC midtown at z=11 — water + grid + green = visually varied thumbnail.
  const thumbUrl = tileUrl(11, 602, 770, styleKey);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{
      width: 96, padding: 6, borderRadius: 12,
      backgroundColor: c.paper2,
      borderWidth: 1.5, borderColor: active ? c.accent : c.line,
      opacity: pressed ? 0.85 : 1,
    }]}>
      <View style={{ width: 84, height: 84, borderRadius: 8, overflow: 'hidden', backgroundColor: c.line }}>
        <Image source={{ uri: thumbUrl }} style={{ width: 84, height: 84 }} resizeMode="cover" />
      </View>
      <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {active && <Icon.check size={11} color={c.accent} />}
        <TText style={{ fontSize: 11, fontWeight: '500', color: c.ink }} numberOfLines={1}>{label}</TText>
      </View>
      <TText variant="mono" style={{ fontSize: 9, color: c.ink3, marginTop: 2 }} numberOfLines={1}>{sub}</TText>
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
  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, backgroundColor: c.paper }} contentContainerStyle={{ paddingBottom: 120 }}>
      <SubHeader back={back} title="SHOES" />
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <TText variant="serif" style={{ fontSize: 30, lineHeight: 32, letterSpacing: -0.6, color: c.ink }}>Shoes are coming.</TText>
        <TText style={{ fontSize: 13, color: c.ink3, marginTop: 8, lineHeight: 18 }}>
          Track mileage per pair, retire shoes when they’re cooked, and tag every run with what you wore. We’re shipping this in M5.
        </TText>
      </View>
      <View style={{ paddingHorizontal: 14, paddingTop: 24 }}>
        <Card style={{ backgroundColor: c.paper2 }}>
          <Eyebrow style={{ color: c.ink3 }}>ROADMAP · M5</Eyebrow>
          <TText style={{ fontSize: 13, color: c.ink2, marginTop: 8 }}>
            Until then, your runs show without a shoe tag.
          </TText>
        </Card>
      </View>
    </ScrollView>
  );
}

function ConnectionsScreen({ back }: { back: () => void }) {
  const c = useColors();
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { status: healthStatus, syncing, lastSyncAt, lastError: healthLastError, progress, resync, connect: connectHealth } = useHealth();
  const { getIdToken } = useAuth();

  const [stravaStatus, setStravaStatus] = useState<StravaStatus | null>(null);
  const [stravaBusy, setStravaBusy] = useState(false);

  const refreshStravaStatus = useCallback(async () => {
    const idToken = await getIdToken();
    if (!idToken) return;
    try {
      const next = await getStravaStatus(idToken);
      setStravaStatus(next);
    } catch {
      setStravaStatus({ connected: false });
    }
  }, [getIdToken]);

  useEffect(() => {
    refreshStravaStatus();
  }, [refreshStravaStatus]);

  const stravaConnected = stravaStatus?.connected === true;

  const handleStravaPress = useCallback(async () => {
    if (stravaBusy) return;
    if (stravaConnected) {
      Alert.alert('Disconnect Strava?', 'Already-imported activities stay. Runstamp will stop receiving new runs from Strava.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setStravaBusy(true);
            try {
              const idToken = await getIdToken();
              await disconnectStrava(idToken);
              await refreshStravaStatus();
            } catch (e) {
              Alert.alert('Disconnect failed', e instanceof Error ? e.message : String(e));
            } finally {
              setStravaBusy(false);
            }
          },
        },
      ]);
      return;
    }
    setStravaBusy(true);
    try {
      const idToken = await getIdToken();
      if (!idToken) {
        Alert.alert('Not signed in', 'Sign out and back in to refresh your session.');
        return;
      }
      const result = await connectStrava(idToken);
      if (result.type === 'error') {
        Alert.alert('Couldn’t open Strava', `${result.reason}\n\nIf the in-app browser didn’t open, check that the Strava client_id is set on the backend.`);
      } else if (result.type === 'cancelled') {
        // No-op — user closed the sheet.
      } else {
        // Connected — refresh status.
      }
      await refreshStravaStatus();
    } catch (e) {
      // Most likely the POST /v1/strava/connect itself failed (server
      // down, no Strava credentials, network). Surface the underlying
      // message so we don't silently die.
      Alert.alert('Couldn’t reach Runstamp', e instanceof Error ? e.message : String(e));
    } finally {
      setStravaBusy(false);
    }
  }, [stravaBusy, stravaConnected, getIdToken, refreshStravaStatus]);

  const healthConnected = healthStatus === 'granted';

  const stravaStatusLabel = (() => {
    if (stravaStatus === null) return 'Checking…';
    if (stravaConnected) return 'Connected · canonical';
    return 'Not connected · tap to connect';
  })();

  const stravaSub = (() => {
    if (!stravaConnected) return 'Read-only · we never write to Strava';
    if (stravaStatus && stravaStatus.connected && stravaStatus.connectedAt) {
      const since = new Date(stravaStatus.connectedAt);
      const days = Math.max(1, Math.round((Date.now() - since.getTime()) / 86_400_000));
      return `Connected ${days}d ago · webhook-driven`;
    }
    return 'Webhook-driven';
  })();

  const healthStatusLabel = (() => {
    if (healthStatus === 'unavailable') return 'Unavailable on this device';
    if (healthStatus === 'denied') return 'Access denied · tap to fix';
    if (healthStatus === 'unknown') return 'Not connected · tap to connect';
    if (syncing) {
      if (progress) {
        if (progress.phase === 'listing') return 'Reading Apple Health…';
        if (progress.phase === 'fetching') {
          return `Fetching details · ${progress.current} / ${progress.total}`;
        }
        if (progress.phase === 'uploading') {
          return `Uploading · ${progress.current} / ${progress.total}`;
        }
      }
      return 'Syncing now…';
    }
    if (lastSyncAt) {
      const diffMin = Math.round((Date.now() - lastSyncAt.getTime()) / 60_000);
      return `Connected · last sync ${diffMin}m ago`;
    }
    return 'Connected';
  })();

  const progressFraction = (() => {
    if (!progress || progress.total <= 0) return null;
    if (progress.phase === 'listing') return 0.03;
    return Math.max(0.03, Math.min(progress.current / progress.total, 1));
  })();

  const healthSub = (() => {
    if (!healthConnected) return 'Read-only — tap to connect';
    return 'Read-only · runs deduplicated against Strava';
  })();

  const handleHealthPress = useCallback(async () => {
    if (syncing) return;
    if (!healthConnected) {
      try {
        const res = await connectHealth();
        if (res) {
          Alert.alert(
            'Apple Health connected',
            `Uploaded ${res.uploaded} workouts${res.skipped > 0 ? ` (${res.skipped} skipped)` : ''}.`,
          );
        }
      } catch (e) {
        Alert.alert(
          'Couldn’t sync Apple Health',
          (e instanceof Error ? e.message : String(e)) +
            '\n\nPermissions are granted but the upload failed. Pull to retry from Home.',
        );
      }
      return;
    }
    try {
      await resync();
    } catch (e) {
      Alert.alert('Re-sync failed', e instanceof Error ? e.message : String(e));
    }
  }, [syncing, healthConnected, connectHealth, resync]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, backgroundColor: c.paper }} contentContainerStyle={{ paddingBottom: 120 }}>
      <SubHeader back={back} title="CONNECTIONS" />
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <TText variant="serif" style={{ fontSize: 28, lineHeight: 30, letterSpacing: -0.6, color: c.ink }}>Where your runs come from.</TText>
      </View>
      <View style={{ paddingHorizontal: 14, paddingTop: 18, gap: 10 }}>
        {stravaConnected ? (
          // Existing Strava-app-owner accounts keep their working tile until
          // they choose to disconnect — flip the gate below to re-enable for
          // everyone once Strava approves the athlete quota increase.
          <ConnCard
            bg="#fc4c02"
            iconNode={<Icon.strava size={28} color="#fff" />}
            name="Strava"
            status={stravaStatusLabel}
            statusConnected
            sub={stravaSub}
            busy={stravaBusy}
            action={
              <Pressable
                onPress={handleStravaPress}
                disabled={stravaBusy}
                style={({ pressed }) => [{
                  marginTop: 10, paddingTop: 10,
                  borderTopWidth: 1, borderTopColor: c.line2,
                  opacity: pressed || stravaBusy ? 0.5 : 1,
                }]}
              >
                <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>
                  {stravaBusy ? 'WORKING…' : 'DISCONNECT'}
                </TText>
              </Pressable>
            }
          />
        ) : (
          // Strava locked: free-tier API apps are capped at 1 connected
          // athlete. Until quota approval lands, surface a "Coming soon"
          // card instead of a live tap so we don't 403 every user. Re-enable
          // by deleting this branch and the conditional above.
          <ConnCard
            bg={c.paper2}
            iconNode={<Icon.strava size={28} color={c.ink3} />}
            name="Strava"
            status="Coming soon · quota approval pending"
            statusConnected={false}
            sub="Strava caps new developer apps at 1 athlete. We’ve applied for an increase — you’ll be able to connect as soon as Strava approves it."
          />
        )}
        <ConnCard
          bg={healthConnected ? '#fb466c' : c.paper2}
          iconNode={<Icon.heart size={24} color={healthConnected ? '#fff' : c.ink2} />}
          name="Apple Health"
          status={healthStatusLabel}
          statusConnected={healthConnected}
          sub={healthSub}
          onPress={handleHealthPress}
          busy={syncing}
          action={
            <>
              {progressFraction !== null && (
                <View style={{ marginTop: 12 }}>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: c.line, overflow: 'hidden' }}>
                    <View style={{
                      height: 4, borderRadius: 2,
                      width: `${Math.round(progressFraction * 100)}%`,
                      backgroundColor: c.accent,
                    }} />
                  </View>
                </View>
              )}
              {/* Persistent "last sync failed" line. Stays until the next
                  successful sync clears HealthContext.lastError. Without
                  this the only signal of a failure was the one-shot Alert
                  from pull-to-refresh — easy to dismiss and forget. */}
              {healthLastError && (
                <View style={{
                  marginTop: 10, padding: 10, borderRadius: 8,
                  backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line,
                }}>
                  <Eyebrow style={{ color: '#c44a1e', fontSize: 9 }}>LAST SYNC FAILED</Eyebrow>
                  <TText style={{ fontSize: 11, color: c.ink2, marginTop: 3, lineHeight: 14 }}>
                    {healthLastError}
                  </TText>
                </View>
              )}
              {healthConnected && (
                <View style={{
                  marginTop: 10, paddingTop: 10,
                  borderTopWidth: 1, borderTopColor: c.line2,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                }}>
                  <Pressable
                    onPress={handleHealthPress}
                    disabled={syncing}
                    style={({ pressed }) => [{ opacity: pressed || syncing ? 0.5 : 1 }]}
                  >
                    <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>
                      {syncing ? 'SYNCING…' : 'RE-SYNC NOW'}
                    </TText>
                  </Pressable>
                  <Pressable
                    onPress={() => rootNav.navigate('HealthRuns')}
                    style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                  >
                    <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>
                      BROWSE RUNS
                    </TText>
                    <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>
                      →
                    </TText>
                  </Pressable>
                </View>
              )}
            </>
          }
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
        <MaintenanceActions getIdToken={getIdToken} />
      </View>
    </ScrollView>
  );
}

function MaintenanceActions({ getIdToken }: { getIdToken: (force?: boolean) => Promise<string | null> }) {
  const c = useColors();
  const [busy, setBusy] = useState<null | 'stamps' | 'places'>(null);
  const [status, setStatus] = useState<string | null>(null);

  const runStamps = useCallback(async () => {
    if (busy) return;
    setBusy('stamps');
    setStatus(null);
    try {
      const idToken = await getIdToken();
      const res = await reevaluateStamps(idToken);
      const count = (res.awarded ?? []).length;
      setStatus(count > 0 ? `Awarded ${count} new stamps.` : 'No new stamps.');
    } catch (e) {
      setStatus(`Failed: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setBusy(null);
    }
  }, [busy, getIdToken]);

  const runPlaces = useCallback(async () => {
    if (busy) return;
    setBusy('places');
    setStatus(null);
    try {
      const idToken = await getIdToken();
      const res = await backfillPlaces(idToken);
      const awardedCount = (res.awardedStamps ?? []).length;
      const parts = [`Geocoded ${res.updated} runs`];
      if (awardedCount > 0) parts.push(`+${awardedCount} new stamps`);
      setStatus(parts.join(' · '));
    } catch (e) {
      setStatus(`Failed: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setBusy(null);
    }
  }, [busy, getIdToken]);

  return (
    <View style={{ marginTop: 8, padding: 14, borderWidth: 1, borderColor: c.line, borderRadius: 14, gap: 10, backgroundColor: c.paper2 }}>
      <Eyebrow style={{ color: c.ink3 }}>MAINTENANCE</Eyebrow>
      <TText style={{ fontSize: 12, color: c.ink3, lineHeight: 16 }}>
        Imported activities from before stamps + places launched? Run these once.
        Nominatim is rate-limited to 1/sec — places backfill caps at 50 runs per tap.
      </TText>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={runStamps}
          disabled={!!busy}
          style={({ pressed }) => [{
            flex: 1, paddingVertical: 10, borderRadius: 10,
            backgroundColor: busy === 'stamps' ? c.paper3 : c.ink,
            alignItems: 'center', opacity: pressed || busy ? 0.85 : 1,
          }]}
        >
          <TText variant="mono" style={{ fontSize: 11, color: c.paper }}>
            {busy === 'stamps' ? 'WORKING…' : 'RE-EVAL STAMPS'}
          </TText>
        </Pressable>
        <Pressable
          onPress={runPlaces}
          disabled={!!busy}
          style={({ pressed }) => [{
            flex: 1, paddingVertical: 10, borderRadius: 10,
            backgroundColor: busy === 'places' ? c.paper3 : c.ink,
            alignItems: 'center', opacity: pressed || busy ? 0.85 : 1,
          }]}
        >
          <TText variant="mono" style={{ fontSize: 11, color: c.paper }}>
            {busy === 'places' ? 'WORKING…' : 'GEOCODE PLACES'}
          </TText>
        </Pressable>
      </View>
      {status && (
        <TText style={{ fontSize: 11, color: c.ink2, marginTop: 2 }}>{status}</TText>
      )}
    </View>
  );
}

function ConnCard({
  bg,
  iconNode,
  name,
  status,
  statusConnected = true,
  sub,
  counts,
  action,
  onPress,
  busy,
}: {
  bg: string;
  iconNode: React.ReactNode;
  name: string;
  status: string;
  statusConnected?: boolean;
  sub: string;
  counts?: [string, string][];
  action?: React.ReactNode;
  onPress?: () => void;
  busy?: boolean;
}) {
  const c = useColors();
  const dotColor = statusConnected ? c.moss : c.ink3;
  const labelColor = statusConnected ? c.moss : c.ink3;
  const body = (
    <>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: statusConnected ? 0 : 1, borderColor: c.line }}>
          {iconNode}
        </View>
        <View style={{ flex: 1 }}>
          <TText style={{ fontSize: 16, fontWeight: '500', color: c.ink }}>{name}</TText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dotColor }} />
            <Eyebrow style={{ color: labelColor }}>{status}</Eyebrow>
          </View>
          <TText style={{ fontSize: 11, color: c.ink3, marginTop: 6 }}>{sub}</TText>
        </View>
        {busy ? <ActivityIndicator color={c.ink3} /> : null}
      </View>
      {counts && counts.length > 0 && (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line, flexDirection: 'row', gap: 10 }}>
          {counts.map(([v, l], i) => (
            <View key={i} style={{ flex: 1 }}>
              <TText variant="monoMedium" style={{ fontSize: 18, color: c.ink }}>{v}</TText>
              <Eyebrow style={{ fontSize: 9 }}>{l}</Eyebrow>
            </View>
          ))}
        </View>
      )}
      {action}
    </>
  );

  if (onPress && !statusConnected) {
    return (
      <Pressable onPress={onPress} disabled={busy} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        <Card>{body}</Card>
      </Pressable>
    );
  }
  return <Card>{body}</Card>;
}

function PrivacyScreen({ back }: { back: () => void }) {
  const c = useColors();
  const { zones, loading, remove } = usePrivacyZones();
  const { activities } = useActivities();
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleDelete = useCallback(
    (zoneId: string) => {
      Alert.alert(
        'Remove zone?',
        'Routes that started here will start showing the full polyline again.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await remove(zoneId);
              } catch (e) {
                Alert.alert('Could not remove', e instanceof Error ? e.message : String(e));
              }
            },
          },
        ],
      );
    },
    [remove],
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, backgroundColor: c.paper }} contentContainerStyle={{ paddingBottom: 120 }}>
      <SubHeader back={back} title="PRIVACY" />
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <TText variant="serif" style={{ fontSize: 28, lineHeight: 30, letterSpacing: -0.6, color: c.ink }}>Don’t show the world where you start.</TText>
        <TText style={{ fontSize: 13, color: c.ink3, marginTop: 8, lineHeight: 19 }}>
          Add a privacy zone around a sensitive location (home, work, gym). Runstamp will trim
          the route polyline inside that radius on every map and share card. Default radius is
          200 m, matching Strava.
        </TText>
      </View>

      <View style={{ paddingHorizontal: 14, paddingTop: 18 }}>
        <Eyebrow style={{ color: c.ink3, marginBottom: 8 }}>YOUR ZONES</Eyebrow>
        {loading && zones.length === 0 && (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <ActivityIndicator color={c.ink3} />
          </View>
        )}
        {!loading && zones.length === 0 && (
          <View style={{ padding: 16, borderRadius: 12, backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line, borderStyle: 'dashed' }}>
            <TText style={{ fontSize: 13, color: c.ink2 }}>No zones yet.</TText>
            <TText style={{ fontSize: 11, color: c.ink3, marginTop: 4, lineHeight: 16 }}>
              Tap “Add a zone” below and pick a recent run that started near a place you’d rather
              not pin on a public share card.
            </TText>
          </View>
        )}
        {zones.map((z) => (
          <View
            key={z.id}
            style={{
              padding: 14, marginBottom: 8, borderRadius: 12,
              backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line,
              flexDirection: 'row', alignItems: 'center', gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <TText variant="monoMedium" style={{ fontSize: 14, color: c.ink, letterSpacing: -0.2 }}>
                  {z.name?.trim() || `Zone ${zones.indexOf(z) + 1}`}
                </TText>
                <TText variant="mono" style={{ fontSize: 10, color: c.ink3 }}>
                  {z.radiusM} m
                </TText>
              </View>
              <TText variant="mono" style={{ fontSize: 10, color: c.ink3, marginTop: 4 }}>
                {z.lat.toFixed(4)}, {z.lng.toFixed(4)}
              </TText>
            </View>
            <Pressable
              onPress={() => handleDelete(z.id)}
              hitSlop={8}
              style={({ pressed }) => ({
                padding: 8, borderRadius: 8,
                opacity: pressed ? 0.5 : 1,
              })}
            >
              <Icon.trash size={16} color="#c44a1e" />
            </Pressable>
          </View>
        ))}

        <Pressable
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [{
            marginTop: zones.length === 0 ? 12 : 4,
            padding: 14, borderRadius: 12,
            backgroundColor: c.ink,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: pressed ? 0.85 : 1,
          }]}
        >
          <Icon.plus size={16} color={c.paper} />
          <TText style={{ fontSize: 13, color: c.paper, fontWeight: '500' }}>Add a zone</TText>
        </Pressable>

        <TText style={{ fontSize: 11, color: c.ink3, marginTop: 14, lineHeight: 16 }}>
          The raw GPS data still lives on your account so you can re-render or export later. The
          mask only affects what we draw — share cards, route maps, the route-map sticker.
        </TText>
      </View>

      <AddZoneModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        recentRuns={activities}
      />

      <DeleteAccountSection />
    </ScrollView>
  );
}

// AddZoneModal — minimal MVP picker. Lists recent GPS-tracked activities;
// tapping one fetches its streams, takes the first lat/lng, and posts a new
// zone at 200m default radius. No map preview, no current-location flow,
// no radius slider in v1 — small, focused, ships now. Power users can tap
// "Edit" on a zone later (future work).
function AddZoneModal({
  visible,
  onClose,
  recentRuns,
}: {
  visible: boolean;
  onClose: () => void;
  recentRuns: Activity[];
}) {
  const c = useColors();
  const { units } = useAppState();
  const { add } = usePrivacyZones();
  const { getIdToken } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);

  // Only show runs that actually carry a GPS start. Cap at 20 — picker, not list.
  const candidates = useMemo(() => {
    return recentRuns
      .filter((r) => typeof r.startLat === 'number' && typeof r.startLon === 'number')
      .slice(0, 20);
  }, [recentRuns]);

  const handlePick = useCallback(
    async (run: Activity) => {
      if (busy) return;
      setBusy(run.id);
      try {
        // Use the activity's denormalised start point. It's the first GPS
        // sample from ingest, identical to what the route renders as "start"
        // — exactly the spot we want to mask.
        if (typeof run.startLat !== 'number' || typeof run.startLon !== 'number') {
          throw new Error('That run has no GPS start point.');
        }
        await add({ name: undefined, lat: run.startLat, lng: run.startLon, radiusM: 200 });
        onClose();
      } catch (e) {
        Alert.alert('Could not add zone', e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [busy, add, onClose],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: c.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 36, maxHeight: '85%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <TText variant="serif" style={{ fontSize: 22, color: c.ink, letterSpacing: -0.4 }}>Pick a start point</TText>
            <Pressable onPress={onClose} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' })}>
              <TText style={{ fontSize: 22, color: c.ink2, lineHeight: 22 }}>×</TText>
            </Pressable>
          </View>
          <TText style={{ fontSize: 12, color: c.ink3, marginBottom: 14, lineHeight: 17 }}>
            We’ll add a 200 m zone centred on this run’s start. Every future map will mask
            anything inside it.
          </TText>
          {candidates.length === 0 ? (
            <View style={{ padding: 16, borderRadius: 10, backgroundColor: c.paper2 }}>
              <TText style={{ fontSize: 12, color: c.ink2 }}>
                No GPS-tracked runs to pick from yet. Once you import a run with route data, it’ll
                show here.
              </TText>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              {candidates.map((run) => {
                const isBusy = busy === run.id;
                const distLabel = fmtDist(run.distance, units);
                return (
                  <Pressable
                    key={run.id}
                    onPress={() => handlePick(run)}
                    disabled={!!busy}
                    style={({ pressed }) => [{
                      paddingVertical: 12, paddingHorizontal: 12, marginBottom: 6,
                      borderRadius: 10, backgroundColor: c.paper2,
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      opacity: pressed || isBusy ? 0.65 : 1,
                    }]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                        <TText variant="monoMedium" style={{ fontSize: 14, color: c.ink }}>{distLabel}</TText>
                        <TText style={{ fontSize: 11, color: c.ink3 }}>· {run.date}</TText>
                      </View>
                      <TText variant="mono" style={{ fontSize: 10, color: c.ink3, marginTop: 3 }}>
                        {run.startLat?.toFixed(4)}, {run.startLon?.toFixed(4)}
                      </TText>
                    </View>
                    {isBusy ? <ActivityIndicator color={c.ink3} /> : <Icon.chevR size={14} color={c.ink3} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function DeleteAccountSection() {
  const c = useColors();
  const { getIdToken, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete account?',
      'This hard-deletes your account, every imported run, every earned stamp, and your encrypted Strava tokens. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'Really delete?',
              'Last chance. Tap Delete forever again to confirm.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete forever',
                  style: 'destructive',
                  onPress: async () => {
                    setBusy(true);
                    try {
                      const idToken = await getIdToken();
                      await deleteAccount(idToken);
                      await signOut();
                    } catch (e) {
                      Alert.alert('Couldn’t delete account', e instanceof Error ? e.message : 'unknown');
                    } finally {
                      setBusy(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, [getIdToken, signOut]);

  return (
    <View style={{ paddingHorizontal: 14, paddingTop: 28 }}>
      <Eyebrow style={{ color: c.ink3, paddingLeft: 6, marginBottom: 8 }}>DANGER ZONE</Eyebrow>
      <Pressable
        onPress={handleDelete}
        disabled={busy}
        style={({ pressed }) => [{
          padding: 14, borderRadius: 14, borderWidth: 1, borderColor: c.warn ?? '#c34a2c',
          backgroundColor: c.paper2,
          opacity: pressed || busy ? 0.7 : 1,
        }]}
      >
        <TText style={{ fontSize: 14, fontWeight: '500', color: c.warn ?? '#c34a2c' }}>
          {busy ? 'Deleting…' : 'Delete my account'}
        </TText>
        <TText style={{ fontSize: 11, color: c.ink3, marginTop: 4 }}>
          Hard-deletes everything. Cascades through runs, stamps, Strava tokens.
        </TText>
      </Pressable>
    </View>
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

// Streak: number of consecutive *days* up to and including today that contain
// at least one run. A 'rest day' breaks the streak.
function computeStreak(isoDates: string[]): number {
  if (isoDates.length === 0) return 0;
  const set = new Set(isoDates);
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 730; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (set.has(key)) {
      streak += 1;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function formatJoined(creationTime?: string): string | null {
  if (!creationTime) return null;
  const d = new Date(creationTime);
  if (Number.isNaN(d.getTime())) return null;
  return `Joined ${d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`;
}


