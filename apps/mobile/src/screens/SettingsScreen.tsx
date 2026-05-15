import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
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
  const { signOut, user } = useAuth();
  const { activities } = useActivities();
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [sub, setSub] = useState<Sub>('main');
  const totalKm = activities.reduce((a, x) => a + x.distance, 0);
  const totalRuns = activities.length;
  const streak = computeStreak(activities.map((a) => a.date));
  const displayName = user?.displayName?.trim() || user?.email?.split('@')[0] || 'Runner';
  const initial = (displayName[0] ?? 'R').toUpperCase();
  const joinedLabel = formatJoined(user?.metadata?.creationTime);

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
              <TText variant="serif" style={{ fontSize: 22, color: c.ink, lineHeight: 24, letterSpacing: -0.3 }}>{displayName}</TText>
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
  const { status: healthStatus, syncing, lastSyncAt, resync, connect: connectHealth } = useHealth();
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
    if (syncing) return 'Syncing now…';
    if (lastSyncAt) {
      const diffMin = Math.round((Date.now() - lastSyncAt.getTime()) / 60_000);
      return `Connected · last sync ${diffMin}m ago`;
    }
    return 'Connected';
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
        <ConnCard
          bg={stravaConnected ? '#fc4c02' : c.paper2}
          iconNode={<Icon.strava size={28} color={stravaConnected ? '#fff' : c.ink2} />}
          name="Strava"
          status={stravaStatusLabel}
          statusConnected={stravaConnected}
          sub={stravaSub}
          onPress={handleStravaPress}
          busy={stravaBusy}
          action={stravaConnected ? (
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
          ) : undefined}
        />
        <ConnCard
          bg={healthConnected ? '#fb466c' : c.paper2}
          iconNode={<Icon.heart size={24} color={healthConnected ? '#fff' : c.ink2} />}
          name="Apple Health"
          status={healthStatusLabel}
          statusConnected={healthConnected}
          sub={healthSub}
          onPress={handleHealthPress}
          busy={syncing}
          action={healthConnected ? (
            <Pressable
              onPress={handleHealthPress}
              disabled={syncing}
              style={({ pressed }) => [{
                marginTop: 10, paddingTop: 10,
                borderTopWidth: 1, borderTopColor: c.line2,
                opacity: pressed || syncing ? 0.5 : 1,
              }]}
            >
              <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>
                {syncing ? 'SYNCING…' : 'RE-SYNC NOW'}
              </TText>
            </Pressable>
          ) : undefined}
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
          <Toggle label="Hide home start" sub="Default on" value={hideHome} onChange={setHideHome} />
          <Toggle label="Hide office" sub="Add a second blurred location" value={hideWork} onChange={setHideWork} />
          <Toggle label="Hide route from screenshots" sub="Strip GPS from share cards" value={true} onChange={() => undefined} isLast />
        </Card>
      </View>

      <DeleteAccountSection />
    </ScrollView>
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

