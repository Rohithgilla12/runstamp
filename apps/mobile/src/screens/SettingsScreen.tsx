import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fmtDist } from '../lib/format';
import { Card, SectionHeader } from '../design/atoms';
import { Icon } from '../design/Icon';
import { SunMark } from '../design/SunMark';
import { TILE_STYLES } from '../services/mapTiles';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { useAppState } from '../state/AppState';
import { useAuth } from '../state/AuthContext';
import { useAccount } from '../state/useAccount';
import { profileUrl } from '../editor/share/profileUrl';
import { useActivities } from '../state/useActivities';
import { useStamps } from '../state/useStamps';
import type { RootStackParamList } from '../nav/types';
import type { TabProps } from '../nav/types';
import { LabeledInput, Row, ThemeSwatch, TileStyleSwatch } from './settings/bits';
import { ConnectionsScreen } from './settings/connections-screen';
import { PrivacyScreen } from './settings/privacy-screen';
import { ProfileScreen } from './settings/profile-screen';
import { computeStreak, formatJoined, nextSurface, SURFACE_LABEL, type Sub } from './settings/helpers';
import { STRAVA_ENABLED } from '../config/features';

export function SettingsScreen(_props: TabProps<'Profile'>) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { units, setUnits, dark, setDark, setHasOnboarded, tileStyle, setTileStyle, defaultSurface, setDefaultSurface } = useAppState();
  const { signOut, user } = useAuth();
  const { activities } = useActivities();
  const { earned } = useStamps();
  const { me, save: saveAccount } = useAccount();
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      // JSON-only for now. GPX zip needs each activity's stream — that's a
      // backend endpoint (PRD §6.9), which is a follow-up. This export is
      // honest at this layer: the JSON contains the data Runstamp has *on
      // the client*, so the user can take it elsewhere today.
      const payload = {
        app: 'Runstamp',
        version: '0.1.0',
        exportedAt: new Date().toISOString(),
        user: { firebaseUid: user?.uid, email: user?.email ?? null },
        activities,
        stamps: earned,
      };
      const json = JSON.stringify(payload, null, 2);
      await Share.share({ message: json, title: 'Runstamp export' });
    } catch (e) {
      Alert.alert('Couldn’t export', e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  }, [exporting, activities, earned, user]);

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
  // Server-stored displayName beats the Firebase token's — users can
  // override their Apple/Google name in Runstamp without rewiring auth.
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

  if (sub === 'connections') return <ConnectionsScreen back={() => setSub('main')} />;
  if (sub === 'privacy') return <PrivacyScreen back={() => setSub('main')} />;
  if (sub === 'profile') return <ProfileScreen back={() => setSub('main')} />;

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
          <Row
            icon={<Icon.user size={18} color={c.ink2} />}
            label="Public profile"
            value={me?.profilePublic && me?.handle ? profileUrl(me.handle).replace('https://', '') : me?.handle ? 'Private' : 'Not claimed'}
            onPress={() => setSub('profile')}
          />
          <Row icon={<Icon.share size={18} color={c.ink2} />} label="Connections" value={STRAVA_ENABLED ? 'Strava · Apple Health' : 'Apple Health'} onPress={() => setSub('connections')} />
          <Row icon={<Icon.privacy size={18} color={c.ink2} />} label="Privacy" value="200 m blur · on" onPress={() => setSub('privacy')} />
          <Row
            icon={<Icon.ruler size={18} color={c.ink2} />}
            label="Units"
            value={units === 'km' ? 'Metric' : 'Imperial'}
            onPress={() => setUnits(units === 'km' ? 'mi' : 'km')}
          />
          <Row
            icon={<Icon.cam size={18} color={c.ink2} />}
            label="Default share"
            value={`${defaultSurface} · ${SURFACE_LABEL[defaultSurface]}`}
            onPress={() => setDefaultSurface(nextSurface(defaultSurface))}
            isLast
          />
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
          <Row
            icon={<Icon.download size={18} color={c.ink2} />}
            label="Export data"
            value={exporting ? 'Preparing…' : 'JSON · share'}
            onPress={handleExport}
          />
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
