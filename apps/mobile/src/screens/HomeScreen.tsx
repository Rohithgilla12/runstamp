import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  distUnit, fmtDist, fmtPace, fmtTime,
  type Activity
} from '../data/sample';
import { useAppState } from '../state/AppState';
import { useActivities } from '../state/useActivities';
import { useActivityStreams } from '../state/useActivityStreams';
import { useStamps, type CatalogStamp } from '../state/useStamps';
import { useFullRefresh } from '../state/useFullRefresh';
import { StampShareModal } from './StampShareModal';
import { StampBadge } from '../design/StampBadge';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { Delta } from '../design/atoms';
import { Icon } from '../design/Icon';
import { SunMark } from '../design/SunMark';
import { RouteMap } from '../design/RouteMap';
import type { TabProps } from '../nav/types';

export function HomeScreen({ navigation }: TabProps<'Home'>) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { activities, loading } = useActivities();
  const fullRefresh = useFullRefresh({ withStamps: true });
  const latest: Activity | undefined = activities[0];
  const greeting = greetingForHour(new Date().getHours());
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await fullRefresh(); } finally { setRefreshing(false); }
  }, [fullRefresh]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: c.paper }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.ink2} />}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Eyebrow>{formatTodayEyebrow(new Date())}</Eyebrow>
          <TText variant="serif" style={{ fontSize: 28, lineHeight: 32, letterSpacing: -0.6, marginTop: 4 }}>{greeting},</TText>
          <TText variant="serifItalic" style={{ fontSize: 28, lineHeight: 32, color: c.ink }}>Runner.</TText>
        </View>
        <View style={{ marginTop: 4 }}>
          <SunMark size={32} />
        </View>
      </View>

      {latest ? (
        <ConnectedHome
          activities={activities}
          latest={latest}
          onOpenActivity={(id) => navigation.navigate('Activity', { id })}
          onOpenEditor={(id) => navigation.navigate('Editor', { id })}
          onOpenStamps={() => navigation.navigate('Stamps')}
          onOpenAllActivities={() => navigation.navigate('Activities')}
        />
      ) : (
        <EmptyHome loading={loading} onConnect={() => navigation.navigate('Profile')} />
      )}
    </ScrollView>
  );
}

function ConnectedHome({
  activities,
  latest,
  onOpenActivity,
  onOpenEditor,
  onOpenStamps,
  onOpenAllActivities,
}: {
  activities: Activity[];
  latest: Activity;
  onOpenActivity: (id: string) => void;
  onOpenEditor: (id: string) => void;
  onOpenStamps: () => void;
  onOpenAllActivities: () => void;
}) {
  const c = useColors();
  const { units } = useAppState();
  const weekStats = computeWeekStats(activities, units === 'mi');
  const { earned } = useStamps();

  return (
    <>
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
            backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line
          }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.moss }} />
            <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>{activities.length} RUNS</TText>
          </View>
          {earned.length > 0 && (
            <Pressable
              onPress={onOpenStamps}
              style={({ pressed }) => [{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
                backgroundColor: c.ink, opacity: pressed ? 0.85 : 1,
              }]}
            >
              <Icon.spark size={12} color={c.accent} />
              <TText variant="mono" style={{ fontSize: 11, color: c.paper }}>{earned.length} STAMPS</TText>
            </Pressable>
          )}
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <PostRunCard
          run={latest}
          onOpen={() => onOpenActivity(latest.id)}
          onShare={() => onOpenEditor(latest.id)}
        />
      </View>

      <SectionHeader title="This week" />
      <View style={{ paddingHorizontal: 20 }}>
        <WeekSummary stats={weekStats} />
      </View>

      <RecapCard activities={activities} earned={earned} />

      {earned.length > 0 && <RecentlyEarned earned={earned} onOpenStamps={onOpenStamps} />}

      <SectionHeader
        title="Recent runs"
        right={
          activities.length > 5 ? (
            <Pressable onPress={onOpenAllActivities} hitSlop={8}>
              <TText style={{ fontSize: 13, color: c.ink2 }}>See all  ›</TText>
            </Pressable>
          ) : null
        }
      />
      <View style={{ paddingHorizontal: 20, gap: 8 }}>
        {activities.slice(0, 5).map((a) => (
          <Pressable
            key={a.id}
            onPress={() => onOpenActivity(a.id)}
            style={({ pressed }) => [{
              backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line,
              borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
              flexDirection: 'row', alignItems: 'center', gap: 12,
              opacity: pressed ? 0.85 : 1,
            }]}
          >
            <View style={{ flex: 1 }}>
              <TText style={{ fontSize: 14, fontWeight: '500', color: c.ink }} numberOfLines={1}>{a.title}</TText>
              <TText style={{ fontSize: 11, color: c.ink3, marginTop: 2 }}>{a.day} · {a.time}</TText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <TText variant="monoMedium" style={{ fontSize: 16, color: c.ink }}>{fmtDist(a.distance, units)}</TText>
              <TText variant="mono" style={{ fontSize: 10, color: c.ink3 }}>{fmtTime(a.seconds)}</TText>
            </View>
            <Pressable
              onPress={() => onOpenEditor(a.id)}
              hitSlop={8}
              accessibilityLabel={`Share ${a.title}`}
              style={({ pressed }) => [{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
              }]}
            >
              <Icon.share size={14} color={c.paper} />
            </Pressable>
          </Pressable>
        ))}
        {activities.length > 5 && (
          <Pressable
            onPress={onOpenAllActivities}
            hitSlop={8}
            style={({ pressed }) => [{
              alignItems: 'center', paddingVertical: 12, marginTop: 4,
              borderRadius: 12, borderWidth: 1, borderColor: c.line,
              backgroundColor: 'transparent', opacity: pressed ? 0.85 : 1,
            }]}
          >
            <TText style={{ fontSize: 13, color: c.ink2 }}>
              See all {activities.length} runs  ›
            </TText>
          </Pressable>
        )}
      </View>
    </>
  );
}

// PRD §6.2 — a rotating recap card. Pick one of several candidate facts
// based on the day, so it stays stable through a session and rotates day
// to day. Surfaces what's most interesting from real data — silently hides
// when no fact is meaningful enough to show.
function RecapCard({ activities, earned }: { activities: Activity[]; earned: CatalogStamp[] }) {
  const c = useColors();
  const { units } = useAppState();
  const fact = pickRecapFact(activities, earned, units);
  if (!fact) return null;
  return (
    <>
      <SectionHeader title="Recap" />
      <View style={{ paddingHorizontal: 20 }}>
        <View
          style={{
            backgroundColor: c.paper2,
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 14,
            padding: 16,
          }}
        >
          <Eyebrow style={{ color: c.ink3 }}>{fact.eyebrow}</Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4, flexWrap: 'wrap' }}>
            <TText variant="serif" style={{ fontSize: 22, lineHeight: 26, letterSpacing: -0.3, color: c.ink }}>{fact.lead}</TText>
            {fact.italic ? (
              <TText variant="serifItalic" style={{ fontSize: 22, lineHeight: 26, letterSpacing: -0.3, color: c.ink }}>{fact.italic}</TText>
            ) : null}
            {fact.tail ? (
              <TText variant="serif" style={{ fontSize: 22, lineHeight: 26, letterSpacing: -0.3, color: c.ink }}>{fact.tail}</TText>
            ) : null}
          </View>
          {fact.detail ? (
            <TText style={{ fontSize: 12, color: c.ink3, marginTop: 8 }}>{fact.detail}</TText>
          ) : null}
        </View>
      </View>
    </>
  );
}

interface RecapFact { eyebrow: string; lead: string; italic?: string; tail?: string; detail?: string }

function pickRecapFact(activities: Activity[], earned: CatalogStamp[], units: 'km' | 'mi'): RecapFact | null {
  const candidates: RecapFact[] = [];

  // Cities this month
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-`;
  const monthRuns = activities.filter((a) => a.date.startsWith(monthPrefix));
  const monthCities = new Set(monthRuns.map((a) => a.city?.trim()).filter(Boolean));
  if (monthCities.size >= 2) {
    candidates.push({
      eyebrow: 'THIS MONTH',
      lead: 'You ran in ',
      italic: `${monthCities.size}`,
      tail: ` cities.`,
      detail: [...monthCities].slice(0, 4).join(' · '),
    });
  }

  // Lifetime distance milestone proximity (next round number)
  const lifetimeKm = activities.reduce((a, r) => a + r.distance, 0);
  const milestones = [100, 250, 500, 1000, 2500, 5000, 10000];
  const nextMs = milestones.find((m) => m > lifetimeKm);
  if (nextMs && nextMs - lifetimeKm < 250) {
    candidates.push({
      eyebrow: 'NEXT MILESTONE',
      lead: 'You’re ',
      italic: `${Math.round(nextMs - lifetimeKm)}`,
      tail: ` ${units === 'mi' ? 'mi' : 'km'} from ${nextMs.toLocaleString()}.`,
      detail: `Lifetime: ${Math.round(lifetimeKm).toLocaleString()} ${units === 'mi' ? 'mi' : 'km'}.`,
    });
  }

  // Recently-earned stamp
  const lastEarned = [...earned].sort((a, b) => (b.earnedAt ?? '').localeCompare(a.earnedAt ?? ''))[0];
  if (lastEarned?.earnedAt) {
    const days = daysAgo(lastEarned.earnedAt);
    if (days <= 7) {
      candidates.push({
        eyebrow: 'STAMPED',
        lead: 'Earned ',
        italic: `${lastEarned.name}`,
        tail: days === 0 ? ' today.' : days === 1 ? ' yesterday.' : ` ${days} days ago.`,
        detail: lastEarned.description,
      });
    }
  }

  // Country count
  const countries = new Set(activities.map((a) => a.country?.trim()).filter(Boolean));
  if (countries.size >= 2) {
    candidates.push({
      eyebrow: 'PASSPORT',
      lead: 'You’ve run in ',
      italic: `${countries.size}`,
      tail: ` countries.`,
    });
  }

  // Number of stamps total
  if (earned.length >= 3) {
    candidates.push({
      eyebrow: 'COLLECTION',
      lead: '',
      italic: `${earned.length}`,
      tail: ` stamps earned. Keep going.`,
    });
  }

  if (candidates.length === 0) return null;
  // Stable rotation: hash today's date into the candidate index.
  const idx = (now.getFullYear() * 372 + now.getMonth() * 31 + now.getDate()) % candidates.length;
  return candidates[idx];
}

function daysAgo(iso: string): number {
  const earned = new Date(iso);
  const today = new Date();
  const days = Math.floor((today.getTime() - earned.getTime()) / 86_400_000);
  return Math.max(0, days);
}

function RecentlyEarned({ earned, onOpenStamps }: { earned: CatalogStamp[]; onOpenStamps: () => void }) {
  const c = useColors();
  const [sharing, setSharing] = useState<CatalogStamp | null>(null);
  const recent = [...earned]
    .sort((a, b) => (b.earnedAt ?? '').localeCompare(a.earnedAt ?? ''))
    .slice(0, 6);
  return (
    <>
      <SectionHeader
        title="Recently earned"
        right={
          <Pressable onPress={onOpenStamps}>
            <TText style={{ fontSize: 13, color: c.ink2 }}>See all  ›</TText>
          </Pressable>
        }
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
      >
        {recent.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => setSharing(s)}
            style={({ pressed }) => [{
              alignItems: 'center', width: 110,
              backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line, borderRadius: 14,
              paddingVertical: 12, paddingHorizontal: 6,
              opacity: pressed ? 0.85 : 1,
            }]}
          >
            <StampBadge id={`home-${s.id}`} name={s.name} tier={s.tier} earned size={64} />
            <TText style={{ fontSize: 11, fontWeight: '500', color: c.ink, marginTop: 6, textAlign: 'center' }} numberOfLines={2}>
              {s.name}
            </TText>
          </Pressable>
        ))}
      </ScrollView>
      <StampShareModal stamp={sharing} onClose={() => setSharing(null)} />
    </>
  );
}

function EmptyHome({ loading, onConnect }: { loading: boolean; onConnect: () => void }) {
  const c = useColors();
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 32, gap: 24 }}>
      <View style={{
        borderRadius: 18, padding: 24, backgroundColor: c.ink,
        alignItems: 'flex-start', overflow: 'hidden', position: 'relative',
      }}>
        <View style={{ position: 'absolute', right: -40, top: -40, opacity: 0.12 }}>
          <SunMark size={200} />
        </View>
        <Eyebrow style={{ color: c.accent, marginBottom: 8 }}>{loading ? 'CHECKING…' : 'NO RUNS YET'}</Eyebrow>
        <TText variant="serif" style={{ fontSize: 26, lineHeight: 28, color: c.paper, letterSpacing: -0.4 }}>
          Connect a source to{'\n'}stamp your first run.
        </TText>
        <TText style={{ fontSize: 13, color: c.onInk2, marginTop: 10, lineHeight: 18 }}>
          Runstamp reads from Strava or Apple Health. Read-only — we never write back.
        </TText>
        <Pressable
          onPress={onConnect}
          style={({ pressed }) => [{
            marginTop: 18, height: 44, paddingHorizontal: 20, borderRadius: 12,
            backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', gap: 8, opacity: pressed ? 0.85 : 1,
          }]}
        >
          <Icon.share size={14} color="#fff" />
          <TText style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>Open connections</TText>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 4, gap: 12 }}>
        <BulletRow icon="strava" label="Strava — fastest path. Pulls your whole history once you connect." color="#fc4c02" />
        <BulletRow icon="health" label="Apple Health — Apple Watch users. 90-day backfill on first sync." color="#fb466c" />
      </View>
    </View>
  );
}

function BulletRow({ icon, label, color }: { icon: 'strava' | 'health'; label: string; color: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
        {icon === 'strava' ? <Icon.strava size={16} color="#fff" /> : <Icon.heart size={14} color="#fff" />}
      </View>
      <TText style={{ flex: 1, fontSize: 13, lineHeight: 18, color: c.ink2 }}>{label}</TText>
    </View>
  );
}

interface WeekStats {
  totalKm: number;
  runs: number;
  totalSec: number;
  vsLastKm: number;
}

function computeWeekStats(activities: Activity[], _isMi: boolean): WeekStats {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfWeek.getDate() - 7);

  let thisKm = 0;
  let lastKm = 0;
  let runs = 0;
  let totalSec = 0;
  for (const a of activities) {
    const d = new Date(a.date);
    if (d >= startOfWeek) {
      thisKm += a.distance;
      runs += 1;
      totalSec += a.seconds;
    } else if (d >= startOfLastWeek) {
      lastKm += a.distance;
    }
  }
  return { totalKm: thisKm, runs, totalSec, vsLastKm: thisKm - lastKm };
}

function WeekSummary({ stats }: { stats: WeekStats }) {
  const c = useColors();
  const { units } = useAppState();
  return (
    <View style={{ backgroundColor: c.paper2, borderRadius: 14, borderWidth: 1, borderColor: c.line, padding: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <TText variant="monoMedium" style={{ fontSize: 42, lineHeight: 50, letterSpacing: -0.8, color: c.ink }}>
              {fmtDist(stats.totalKm, units)}
            </TText>
            <TText style={{ fontSize: 14, color: c.ink3, marginLeft: 4 }}>{distUnit(units)}</TText>
          </View>
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
            <TText variant="mono" style={{ fontSize: 12, color: c.ink3 }}>{stats.runs} runs</TText>
            <TText variant="mono" style={{ fontSize: 12, color: c.ink3 }}>{fmtTime(stats.totalSec)}</TText>
            <Delta value={stats.vsLastKm} format={(v) => `${v.toFixed(1)} ${distUnit(units)}`} />
          </View>
        </View>
      </View>
    </View>
  );
}

export function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <TText variant="serif" style={{ fontSize: 22, lineHeight: 24, letterSpacing: -0.3 }}>{title}</TText>
      {right}
    </View>
  );
}

const POST_RUN_HEIGHT = 380;

function PostRunCard({ run, onOpen, onShare }: { run: Activity; onOpen: () => void; onShare: () => void }) {
  const c = useColors();
  const { units } = useAppState();
  const { route: realRoute } = useActivityStreams(run.id);
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [{ borderRadius: 18, overflow: 'hidden', backgroundColor: c.ink, opacity: pressed ? 0.95 : 1 }]}>
      <View style={{ position: 'relative', height: POST_RUN_HEIGHT }}>
        <View style={{ position: 'absolute', inset: 0, opacity: 0.85 }}>
          <RouteMap points={realRoute ?? run.route} width={362} height={POST_RUN_HEIGHT} style="dark" accent={c.accent} />
        </View>
        <LinearGradient
          colors={['rgba(14,13,11,0.4)', 'rgba(14,13,11,0.1)', 'rgba(14,13,11,0.85)']}
          locations={[0, 0.35, 1]}
          style={{ position: 'absolute', inset: 0 }}
        />

        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Eyebrow style={{ color: c.accent, marginBottom: 4 }}>{run.day.toUpperCase()} · {run.time}</Eyebrow>
              <TText variant="serif" style={{ fontSize: 22, lineHeight: 24, color: c.paper, letterSpacing: -0.4 }}>{run.title}</TText>
              {!!run.place && run.place !== '—' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <Icon.pin size={12} color="rgba(243,237,226,0.6)" />
                  <TText style={{ fontSize: 12, color: c.onInk3 }}>{run.place}</TText>
                </View>
              )}
            </View>
          </View>

          <View style={{ flex: 1 }} />

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
            <View style={{ flex: 1.2 }}>
              <Eyebrow style={{ color: c.onInk3, fontSize: 9 }}>DISTANCE</Eyebrow>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <TText variant="monoMedium" style={{ fontSize: 46, lineHeight: 54, letterSpacing: -1.4, color: c.paper }}>
                  {fmtDist(run.distance, units)}
                </TText>
                <TText style={{ fontSize: 14, color: c.onInk3, marginLeft: 4 }}>{distUnit(units)}</TText>
              </View>
            </View>
            <View style={{ flex: 0.9 }}>
              <Eyebrow style={{ color: c.onInk3, fontSize: 9 }}>PACE</Eyebrow>
              <TText variant="monoMedium" style={{ fontSize: 22, color: c.paper, letterSpacing: -0.2 }}>{fmtPace(run.pace, units)}</TText>
              <TText style={{ fontSize: 10, color: c.onInk3 }}>/{distUnit(units)}</TText>
            </View>
            <View style={{ flex: 1.1 }}>
              <Eyebrow style={{ color: c.onInk3, fontSize: 9 }}>TIME</Eyebrow>
              <TText variant="monoMedium" style={{ fontSize: 22, color: c.paper, letterSpacing: -0.2 }}>{fmtTime(run.seconds)}</TText>
              <TText style={{ fontSize: 10, color: c.onInk3 }}>h:m:s</TText>
            </View>
          </View>

          {(run.avgHr > 0 || run.elev > 0 || run.cal > 0) && (
            <View style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.onInkDivider
            }}>
              {run.avgHr > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Icon.heart size={12} color={c.accent} />
                  <TText variant="mono" style={{ fontSize: 11, color: c.onInk2 }}>{run.avgHr} avg · {run.maxHr} max</TText>
                </View>
              )}
              {run.elev > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Icon.mountain size={12} color="rgba(243,237,226,0.7)" />
                  <TText variant="mono" style={{ fontSize: 11, color: c.onInk2 }}>{run.elev} m</TText>
                </View>
              )}
              {run.cal > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Icon.flame size={12} color="rgba(243,237,226,0.7)" />
                  <TText variant="mono" style={{ fontSize: 11, color: c.onInk2 }}>{run.cal} kcal</TText>
                </View>
              )}
            </View>
          )}

          <Pressable
            onPress={(e) => { e.stopPropagation(); onShare(); }}
            style={({ pressed }) => [{
              marginTop: 14, height: 46, borderRadius: 12, backgroundColor: c.accent,
              alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
              opacity: pressed ? 0.85 : 1
            }]}
          >
            <Icon.share size={16} color="#fff" />
            <TText style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>Create share card</TText>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function greetingForHour(h: number): string {
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatTodayEyebrow(d: Date): string {
  const dow = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  return `${dow} · ${mon} ${d.getDate()} · ${d.getFullYear()}`;
}
