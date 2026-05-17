import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { distUnit, fmtDist, fmtPace, fmtTime, paceUnit, type Activity } from '../data/sample';
import { useAppState } from '../state/AppState';
import { useAuth } from '../state/AuthContext';
import { useActivities } from '../state/useActivities';
import { useActivityStreams } from '../state/useActivityStreams';
import { renameActivity } from '../services/activityEdit';
import { useColors, useTheme } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { Button, Card, Chip } from '../design/atoms';
import { Icon } from '../design/Icon';
import { RouteMap } from '../design/RouteMap';
import { StreamChart } from '../design/charts';
import type { RootStackProps } from '../nav/types';

type Tab = 'splits' | 'hr' | 'pace';

export function ActivityScreen({ route, navigation }: RootStackProps<'Activity'>) {
  const c = useColors();
  const { dark } = useTheme();
  const { units } = useAppState();
  const insets = useSafeAreaInsets();
  const id = route.params?.id;
  const { activities, loading, refresh: refreshActivities } = useActivities();
  const run = id ? activities.find((a) => a.id === id) : activities[0];
  const { route: realRoute, rawLatLng: realRawLatLng, streams } = useActivityStreams(run?.id ?? null);
  const { getIdToken } = useAuth();
  const handleRename = useCallback(() => {
    if (!run) return;
    Alert.prompt(
      'Rename run',
      'Override the title from Strava / Apple Health. This stays on Runstamp.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (text?: string) => {
            const next = (text ?? '').trim();
            if (!next || next === run.title) return;
            try {
              const idToken = await getIdToken();
              await renameActivity(run.id, next, idToken);
              await refreshActivities();
            } catch (e) {
              Alert.alert('Couldn’t rename', e instanceof Error ? e.message : 'unknown');
            }
          },
        },
      ],
      'plain-text',
      run.title,
    );
  }, [run, getIdToken, refreshActivities]);
  const liveHr = parseNumberStream(streams.heartrate?.data);
  const liveVelocity = parseNumberStream(streams.velocity?.data);
  // Strava velocity is m/s. Convert to seconds-per-km for the pace chart so
  // the y-axis means "slower = worse" like a runner expects.
  const livePace = liveVelocity ? liveVelocity.map((v) => (v > 0.1 ? 1000 / v : 0)) : null;
  const [tab, setTab] = useState<Tab>('splits');

  if (!run) {
    return (
      <View style={{ flex: 1, backgroundColor: c.paper, paddingTop: insets.top + 8 }}>
        <View style={{ paddingHorizontal: 14, flexDirection: 'row' }}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              width: 38, height: 38, borderRadius: 12, backgroundColor: c.paper2,
              borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center'
            }}
          >
            <Icon.back size={20} color={c.ink} />
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Eyebrow style={{ color: c.ink3 }}>{loading ? 'LOADING…' : 'NOT FOUND'}</Eyebrow>
          <TText variant="serif" style={{ fontSize: 24, color: c.ink, marginTop: 8, textAlign: 'center' }}>
            {loading ? 'Fetching your run…' : 'This run isn’t here yet.'}
          </TText>
          {!loading && (
            <TText style={{ fontSize: 13, color: c.ink3, marginTop: 8, textAlign: 'center' }}>
              It might still be syncing from Strava or Apple Health.
            </TText>
          )}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: c.paper }}
      contentContainerStyle={{ paddingBottom: 36 }}
    >
      {/* Hero map */}
      <View style={{ height: 340, position: 'relative' }}>
        <RouteMap points={realRoute ?? run.route} rawLatLng={realRawLatLng} width={402} height={340} style={dark ? 'dark' : 'light'} accent={c.accent} />
        <LinearGradient
          colors={[`${c.paper}cc`, 'transparent', 'transparent', `${c.paper}f0`]}
          locations={[0, 0.25, 0.65, 1]}
          style={{ position: 'absolute', inset: 0 }}
        />
        <View style={{ position: 'absolute', top: insets.top + 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14 }}>
          <Pressable onPress={() => navigation.goBack()} style={{
            width: 38, height: 38, borderRadius: 12, backgroundColor: c.paper,
            borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon.back size={20} color={c.ink} />
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.paper, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
              <Icon.heart size={18} color={c.ink2} />
            </View>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.paper, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
              <Icon.more size={18} color={c.ink2} />
            </View>
          </View>
        </View>
        <View style={{ position: 'absolute', bottom: 14, left: 20, right: 20 }}>
          <Eyebrow style={{ color: c.accent }}>{run.day.toUpperCase()} · {run.date} · {run.time}</Eyebrow>
          <Pressable onLongPress={handleRename} delayLongPress={350}>
            <TText variant="serif" style={{ fontSize: 30, lineHeight: 32, letterSpacing: -0.6, color: c.ink, marginTop: 4 }}>{run.title}</TText>
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Icon.pin size={12} color={c.ink3} />
            <TText style={{ fontSize: 12, color: c.ink3 }}>{run.place}</TText>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', gap: 14, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: c.line }}>
          <View style={{ flex: 1.2 }}>
            <Eyebrow>DISTANCE</Eyebrow>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <TText variant="monoMedium" style={{ fontSize: 42, lineHeight: 50, letterSpacing: -1.2, color: c.ink }}>
                {fmtDist(run.distance, units)}
              </TText>
              <TText style={{ fontSize: 13, color: c.ink3, marginLeft: 4 }}>{distUnit(units)}</TText>
            </View>
          </View>
          <View style={{ flex: 0.9 }}>
            <Eyebrow>PACE</Eyebrow>
            <TText variant="monoMedium" style={{ fontSize: 22, color: c.ink }}>{fmtPace(run.pace, units)}</TText>
            <TText style={{ fontSize: 10, color: c.ink3 }}>{paceUnit(units)}</TText>
            {run.gapPace && Math.abs(run.gapPace - run.pace) >= 3 ? (
              <TText variant="mono" style={{ fontSize: 10, color: c.accent, marginTop: 2 }}>
                GAP {fmtPace(run.gapPace, units)}
              </TText>
            ) : null}
          </View>
          <View style={{ flex: 1.1 }}>
            <Eyebrow>TIME</Eyebrow>
            <TText variant="monoMedium" style={{ fontSize: 22, color: c.ink }}>{fmtTime(run.seconds)}</TText>
            <TText style={{ fontSize: 10, color: c.ink3 }}>h:m:s</TText>
          </View>
        </View>

        <View style={{ flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.line }}>
          {[
            { l: 'HR',   v: String(run.avgHr),    u: 'avg',  col: c.accent },
            { l: 'Max',  v: String(run.maxHr),    u: 'bpm' },
            { l: 'Elev', v: String(run.elev),     u: 'm' },
            { l: 'Cal',  v: String(run.cal),      u: 'kcal' }
          ].map((s, i) => (
            <View key={i} style={{ flex: 1, borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: c.line, paddingLeft: i > 0 ? 14 : 0 }}>
              <Eyebrow style={{ color: s.col ?? c.ink3 }}>{s.l}</Eyebrow>
              <TText variant="monoMedium" style={{ fontSize: 18, color: c.ink }}>{s.v}</TText>
              <TText style={{ fontSize: 10, color: c.ink3 }}>{s.u}</TText>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 14, flexWrap: 'wrap' }}>
          {run.weather.w !== '—' && (
            <Chip>
              <Icon.fog size={14} color={c.ink2} />
              <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>{run.weather.t}° · {run.weather.w}</TText>
            </Chip>
          )}
          {run.cadence !== undefined && run.cadence > 0 && (
            <Chip>
              <Icon.bolt size={12} color={c.accent} />
              <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>{run.cadence} spm</TText>
            </Chip>
          )}
          {run.vo2max !== undefined && (
            <Chip>
              <Icon.heart size={12} color={c.accent} />
              <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>VO₂ {run.vo2max}</TText>
            </Chip>
          )}
          {run.power !== undefined && (
            <Chip>
              <Icon.bolt size={12} color={c.ink2} />
              <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>{run.power} W</TText>
            </Chip>
          )}
        </View>

        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.line, marginTop: 12 }}>
          {(['splits', 'hr', 'pace'] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={{
              paddingHorizontal: 14, paddingVertical: 10,
              borderBottomWidth: 2, borderBottomColor: tab === t ? c.accent : 'transparent', marginBottom: -1
            }}>
              <TText style={{ fontSize: 13, fontWeight: '500', color: tab === t ? c.ink : c.ink3 }}>
                {t === 'splits' ? 'Splits' : t === 'hr' ? 'Heart rate' : 'Pace'}
              </TText>
            </Pressable>
          ))}
        </View>

        <View style={{ paddingTop: 16 }}>
          {tab === 'splits' && <SplitsTable run={run} />}
          {tab === 'hr' && ((liveHr ?? run.streamHr) ? <StreamChart data={(liveHr ?? run.streamHr)!} color={c.accent} /> : <Empty text="No HR data." />)}
          {tab === 'pace' && ((livePace ?? run.streamPace ?? run.streamHr) ? <StreamChart data={(livePace ?? run.streamPace ?? run.streamHr)!} color={c.ink} /> : <Empty text="No pace data." />)}
        </View>

        <View style={{ paddingTop: 20 }}>
          <Eyebrow style={{ marginBottom: 8 }}>SOURCE</Eyebrow>
          <SourceCard source={run.source} />
        </View>

        <View style={{ paddingTop: 20 }}>
          <Button
            kind="accent"
            full
            onPress={() => navigation.navigate('Editor', { id: run.id })}
            icon={<Icon.share size={18} color="#fff" />}
          >
            Create share card
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

function SplitsTable({ run }: { run: Activity }) {
  const c = useColors();
  const { units } = useAppState();
  const splits = run.splits ?? [];
  if (!splits.length) return <Empty text="No splits available." />;
  const minSec = Math.min(...splits.map((s) => s.sec));
  const maxSec = Math.max(...splits.map((s) => s.sec));
  return (
    <View>
      <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.line }}>
        <View style={{ width: 30 }}><Eyebrow>KM</Eyebrow></View>
        <View style={{ width: 56 }}><Eyebrow>PACE</Eyebrow></View>
        <View style={{ flex: 1 }}><Eyebrow>RELATIVE</Eyebrow></View>
        <View style={{ width: 50 }}><Eyebrow style={{ textAlign: 'right' }}>HR</Eyebrow></View>
      </View>
      {splits.map((s, i) => {
        const denom = (maxSec - minSec) || 1;
        const pct = (s.sec - minSec) / denom;
        const fast = s.sec === minSec;
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.line2 }}>
            <View style={{ width: 30 }}><TText variant="mono" style={{ fontSize: 13, color: c.ink3 }}>{s.k}</TText></View>
            <View style={{ width: 56 }}><TText variant={fast ? 'monoMedium' : 'mono'} style={{ fontSize: 13, color: fast ? c.accent : c.ink }}>{fmtPace(s.sec, units)}</TText></View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={{ height: 6, backgroundColor: c.line2, borderRadius: 3 }}>
                <View style={{
                  width: `${30 + (1 - pct) * 70}%`,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: fast ? c.accent : c.ink2,
                  opacity: 0.85
                }} />
              </View>
            </View>
            <View style={{ width: 50 }}><TText variant="mono" style={{ fontSize: 11, color: c.ink3, textAlign: 'right' }}>{s.hr}</TText></View>
          </View>
        );
      })}
    </View>
  );
}

function Empty({ text }: { text: string }) {
  const c = useColors();
  return <TText style={{ fontSize: 13, color: c.ink3, textAlign: 'center', padding: 20 }}>{text}</TText>;
}

// Source card — reads run.source so a HealthKit-imported run doesn't
// silently masquerade as Strava (previous bug). Falls back to neutral
// "Manual" rendering if source is missing on legacy rows.
function SourceCard({ source }: { source?: 'strava' | 'apple_health' | 'manual' }) {
  const c = useColors();
  const cfg = source === 'strava'
    ? { label: 'Strava', bg: '#fc4c02', Glyph: Icon.strava, fg: '#fff' as const }
    : source === 'apple_health'
      ? { label: 'Apple Health', bg: '#fb466c', Glyph: Icon.heart, fg: '#fff' as const }
      : { label: 'Manual entry', bg: c.paper3, Glyph: Icon.plus, fg: c.ink2 as string };
  return (
    <View style={{
      paddingHorizontal: 12, paddingVertical: 10,
      backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line,
      borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
    }}>
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: cfg.bg, alignItems: 'center', justifyContent: 'center' }}>
        <cfg.Glyph size={18} color={cfg.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <TText style={{ fontSize: 13, fontWeight: '500', color: c.ink }}>{cfg.label}</TText>
        <TText variant="mono" style={{ fontSize: 11, color: c.ink3 }}>
          {source === 'apple_health' ? 'via HKWorkoutSession' : source === 'strava' ? 'via Strava API' : 'on-device'}
        </TText>
      </View>
      <Eyebrow style={{ color: c.ink3 }}>CANONICAL</Eyebrow>
    </View>
  );
}

// Strava streams arrive as `number[]`. Sanity-check the shape and drop
// non-finite values so the chart doesn't choke on a stray null.
function parseNumberStream(data: unknown): number[] | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  const out: number[] = [];
  for (const v of data) {
    if (typeof v === 'number' && Number.isFinite(v)) out.push(v);
  }
  return out.length > 0 ? out : null;
}
