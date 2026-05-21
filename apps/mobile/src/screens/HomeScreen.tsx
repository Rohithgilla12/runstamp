// HomeScreen — redesigned per .impeccable.md.
//
// Home is an ARTIFACT surface (artifact-coded per the new Surface taxonomy):
// a keepsake-style page of a personal log book. The latest run is the hero,
// then a single quiet line of "this week," a rotating recap, recently
// earned stamps, and a short tail of recent runs. Perforated dividers
// (the postal-perforation motif from the brand) section the page without
// shouting at the user with section headers.
//
// What changed vs the previous Home:
//   • Drop the chip row at the top ({N} RUNS / {N} STAMPS) — that's status,
//     not action; took prime real estate to say what the user already knows.
//   • Cleaner post-run card: the big solar "Create share card" CTA is gone.
//     Tap the card → opens Activity (unchanged). Share is a quiet icon in
//     the corner. The card was already trying to do two things; now it's
//     a keepsake first, with share as an affordance.
//   • This-week summary collapses from a hero-metric card into one quiet
//     ledger line. Same numbers, less chrome.
//   • RecapCard becomes a single line of inline text instead of a card.
//   • Recent runs drop per-row share buttons; a single tap-open per row.
//   • Perforated dividers between sections instead of section headers
//     stacked on heavy padding. Eyebrows still announce each section
//     because runners ARE reading these.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useHealth } from '../state/HealthContext';
import { getRunningWorkoutsSince } from '../services/healthkit';
import { StampShareModal } from './StampShareModal';
import { StampBadge } from '../design/StampBadge';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { Icon } from '../design/Icon';
import { PostmarkMark } from '../design/SunMark';
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

  const missingHk = useMissingHealthKitRuns(activities);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      style={{ flex: 1, backgroundColor: c.paper }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.ink2} />}
    >
      {/* Page header — date as a postmark + serif italic greeting. The
          postmark replaces the previous SunMark to lean into the brand
          vocabulary on Home specifically. */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Eyebrow>{formatTodayEyebrow(new Date())}</Eyebrow>
          <TText variant="serif" style={{ fontSize: 28, lineHeight: 32, letterSpacing: -0.6, marginTop: 4 }}>{greeting},</TText>
          <TText variant="serifItalic" style={{ fontSize: 28, lineHeight: 32, color: c.ink }}>Runner.</TText>
        </View>
        <View style={{ marginTop: 4 }}>
          <PostmarkMark size={42} color={c.ink2} />
        </View>
      </View>

      <StampCountChip
        activities={activities}
        onPress={() => navigation.navigate('Places')}
      />

      {missingHk > 0 && (
        <MissingRunsLine
          count={missingHk}
          onPress={() => navigation.navigate('HealthRuns')}
        />
      )}

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
  const { units } = useAppState();
  const weekStats = computeWeekStats(activities, units === 'mi');
  const { earned } = useStamps();

  return (
    <>
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <PostRunCard
          run={latest}
          onOpen={() => onOpenActivity(latest.id)}
          onShare={() => onOpenEditor(latest.id)}
        />
      </View>

      <Perforation />

      <WeekLedger stats={weekStats} />

      <RecapLine activities={activities} earned={earned} />

      {earned.length > 0 && (
        <>
          <Perforation />
          <RecentlyEarned earned={earned} onOpenStamps={onOpenStamps} />
        </>
      )}

      <Perforation />

      <RecentRuns
        activities={activities}
        onOpenActivity={onOpenActivity}
        onOpenAllActivities={onOpenAllActivities}
      />
    </>
  );
}

// Perforation — the postal-perforation motif from .impeccable.md, used as
// a quiet section divider. A row of 1px dots spaced ~6px apart. Reads as
// "page tear-line" rather than a heavy hairline divider. Uses ink at low
// opacity so it sits firmly behind the type.
function Perforation() {
  const c = useColors();
  const dotCount = 36;
  return (
    <View style={{ paddingHorizontal: 20, paddingVertical: 22 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        {Array.from({ length: dotCount }).map((_, i) => (
          <View key={i} style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: c.ink, opacity: 0.18 }} />
        ))}
      </View>
    </View>
  );
}

// StampCountChip — PRD §6.2 calls this "the headline metric of the whole
// app": the one line a user quotes when explaining Runstamp to a friend.
// Quiet pill under the greeting; mono numerals carry the weight. Taps
// jump to the Places tab where the world map lives.
function StampCountChip({
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

  // Nothing earned, nowhere traveled — hide the chip rather than read
  // "0 stamps · 0 countries", which sets the wrong first impression for
  // a brand-new user.
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

// Missing-runs banner — one quiet inline line, not a bordered card. Solar
// dot + text, tappable. Earns the solar pop because it's an actionable
// signal ("a run is waiting") not chrome.
function MissingRunsLine({ count, onPress }: { count: number; onPress: () => void }) {
  const c = useColors();
  const label = count === 1
    ? '1 run in Apple Health isn’t imported yet'
    : `${count} runs in Apple Health aren’t imported yet`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Review and import HealthKit runs"
      style={({ pressed }) => [{
        marginHorizontal: 20, marginTop: 6, paddingVertical: 10,
        flexDirection: 'row', alignItems: 'center', gap: 10,
        opacity: pressed ? 0.6 : 1,
      }]}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent }} />
      <TText style={{ flex: 1, fontSize: 12, color: c.ink2 }}>{label}</TText>
      <TText variant="mono" style={{ fontSize: 11, color: c.accent }}>REVIEW →</TText>
    </Pressable>
  );
}

// WeekLedger — replaces the boxed WeekSummary card. One inline serif italic
// number plus a quiet mono detail line. No card backdrop, no border — the
// page is the surface, the type IS the chart.
function WeekLedger({ stats }: { stats: WeekStats }) {
  const c = useColors();
  const { units } = useAppState();
  const positive = stats.vsLastKm >= 0;
  const deltaTone = positive ? c.moss : c.ink3;
  const deltaSign = positive ? '+' : '−';
  const deltaMag = Math.abs(stats.vsLastKm).toFixed(1);
  return (
    <View style={{ paddingHorizontal: 20 }}>
      <Eyebrow style={{ color: c.ink3 }}>THIS WEEK</Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
        <TText variant="monoMedium" style={{ fontSize: 36, lineHeight: 42, letterSpacing: -1, color: c.ink }}>
          {fmtDist(stats.totalKm, units)}
        </TText>
        <TText style={{ fontSize: 13, color: c.ink3, marginLeft: 5 }}>{distUnit(units)}</TText>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 6 }}>
        <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>{stats.runs} runs</TText>
        <Sep />
        <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>{fmtTime(stats.totalSec)}</TText>
        <Sep />
        <TText variant="mono" style={{ fontSize: 11, color: deltaTone }}>
          {deltaSign}{deltaMag} {distUnit(units)} vs last
        </TText>
      </View>
    </View>
  );
}

// RecapLine — single inline serif-and-italic recap, no card. Quieter than
// the previous boxed RecapCard, so it reads as continuous page-flow.
function RecapLine({ activities, earned }: { activities: Activity[]; earned: CatalogStamp[] }) {
  const c = useColors();
  const { units } = useAppState();
  const fact = pickRecapFact(activities, earned, units);
  if (!fact) return null;
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
      <Eyebrow style={{ color: c.ink3 }}>{fact.eyebrow}</Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4, flexWrap: 'wrap' }}>
        <TText variant="serif" style={{ fontSize: 20, lineHeight: 26, letterSpacing: -0.2, color: c.ink }}>{fact.lead}</TText>
        {fact.italic ? (
          <TText variant="serifItalic" style={{ fontSize: 20, lineHeight: 26, letterSpacing: -0.2, color: c.ink }}>{fact.italic}</TText>
        ) : null}
        {fact.tail ? (
          <TText variant="serif" style={{ fontSize: 20, lineHeight: 26, letterSpacing: -0.2, color: c.ink }}>{fact.tail}</TText>
        ) : null}
      </View>
      {fact.detail ? (
        <TText style={{ fontSize: 12, color: c.ink3, marginTop: 6 }}>{fact.detail}</TText>
      ) : null}
    </View>
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
          <Pressable
            key={s.id}
            onPress={() => setSharing(s)}
            accessibilityLabel={`Share ${s.name} stamp`}
            style={({ pressed }) => [{
              alignItems: 'center', width: 96,
              opacity: pressed ? 0.7 : 1,
            }]}
          >
            {/* Bitmap-cache each badge — StampBadge is a multi-path SVG
                (rings, ticks, curved text), and we render up to 6 in a
                horizontal scroll. Without rasterization, every Home scroll
                frame recomposites all of them. */}
            <View collapsable={false} shouldRasterizeIOS renderToHardwareTextureAndroid>
              <StampBadge id={`home-${s.id}`} name={s.name} tier={s.tier} earned size={68} />
            </View>
            <TText style={{ fontSize: 10.5, color: c.ink2, marginTop: 6, textAlign: 'center' }} numberOfLines={2}>
              {s.name}
            </TText>
          </Pressable>
        ))}
      </ScrollView>
      <StampShareModal stamp={sharing} onClose={() => setSharing(null)} />
    </>
  );
}

// RecentRuns — short tail. One tap per row → Activity screen. The per-row
// share button is gone; share now lives inside the activity detail. Reduces
// every row to one purpose and lets the list breathe.
function RecentRuns({
  activities,
  onOpenActivity,
  onOpenAllActivities,
}: {
  activities: Activity[];
  onOpenActivity: (id: string) => void;
  onOpenAllActivities: () => void;
}) {
  const c = useColors();
  const { units } = useAppState();
  const rows = activities.slice(0, 5);
  return (
    <>
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Eyebrow style={{ color: c.ink3 }}>RECENT RUNS</Eyebrow>
        {activities.length > 5 && (
          <Pressable onPress={onOpenAllActivities} hitSlop={6} accessibilityLabel="See all runs">
            <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>SEE ALL →</TText>
          </Pressable>
        )}
      </View>
      <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
        {rows.map((a, idx) => (
          <Pressable
            key={a.id}
            onPress={() => onOpenActivity(a.id)}
            accessibilityLabel={`Open ${a.title}`}
            style={({ pressed }) => [{
              paddingVertical: 12,
              borderTopWidth: idx === 0 ? 0 : 1,
              borderTopColor: c.line2,
              flexDirection: 'row', alignItems: 'baseline', gap: 12,
              opacity: pressed ? 0.7 : 1,
            }]}
          >
            <View style={{ flex: 1 }}>
              <TText style={{ fontSize: 14, color: c.ink }} numberOfLines={1}>{a.title}</TText>
              <TText variant="mono" style={{ fontSize: 10, color: c.ink3, marginTop: 2 }}>
                {a.day.toUpperCase()} · {a.time}
              </TText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <TText variant="monoMedium" style={{ fontSize: 15, color: c.ink }}>{fmtDist(a.distance, units)}</TText>
              <TText variant="mono" style={{ fontSize: 10, color: c.ink3 }}>{fmtTime(a.seconds)}</TText>
            </View>
          </Pressable>
        ))}
      </View>
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
          <PostmarkMark size={200} color={c.paper} />
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

function Sep() {
  const c = useColors();
  return <TText style={{ fontSize: 11, color: c.ink3 }}>·</TText>;
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

// PostRunCard — the run is the artifact. Map backdrop with the route, run
// title + date as a postmark eyebrow, the headline metric row, and a
// secondary HR/elev/cal row. The big solar "Create share card" CTA is
// gone — share is a small icon in the top corner, tap-anywhere-else opens
// Activity. One purpose per surface.
function PostRunCard({ run, onOpen, onShare }: { run: Activity; onOpen: () => void; onShare: () => void }) {
  const c = useColors();
  const { units } = useAppState();
  const { route: realRoute, rawLatLng: realRawLatLng } = useActivityStreams(run.id);
  return (
    <Pressable onPress={onOpen} accessibilityLabel={`Open ${run.title}`} style={({ pressed }) => [{ borderRadius: 18, overflow: 'hidden', backgroundColor: c.ink, opacity: pressed ? 0.95 : 1 }]}>
      {/* shouldRasterizeIOS + renderToHardwareTextureAndroid: the RouteMap
          inside is a heavy SVG (raster tiles + polyline + gradient). Native
          rasterization caches the composed result as a bitmap after first
          paint so scrolling past doesn't recomposite SVG paths per frame.
          The press-state opacity sits on the parent Pressable, not on this
          view, so the cache stays valid across taps. collapsable=false
          stops RN's view-flattening from removing the rasterizing layer. */}
      <View
        collapsable={false}
        shouldRasterizeIOS
        renderToHardwareTextureAndroid
        style={{ position: 'relative', height: POST_RUN_HEIGHT }}
      >
        <View style={{ position: 'absolute', inset: 0, opacity: 0.85 }}>
          <RouteMap points={realRoute ?? run.route} rawLatLng={realRawLatLng} width={362} height={POST_RUN_HEIGHT} style="dark" accent={c.accent} />
        </View>
        <LinearGradient
          colors={['rgba(14,13,11,0.4)', 'rgba(14,13,11,0.1)', 'rgba(14,13,11,0.85)']}
          locations={[0, 0.35, 1]}
          style={{ position: 'absolute', inset: 0 }}
        />

        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Eyebrow style={{ color: c.accent, marginBottom: 4 }}>{run.day.toUpperCase()} · {run.time}</Eyebrow>
              <TText variant="serif" style={{ fontSize: 22, lineHeight: 24, color: c.paper, letterSpacing: -0.4 }}>{run.title}</TText>
              {!!run.place && run.place !== '—' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <Icon.pin size={12} color="rgba(243,237,226,0.6)" />
                  <TText style={{ fontSize: 12, color: c.onInk3 }}>{run.place}</TText>
                </View>
              )}
            </View>
            <Pressable
              onPress={(e) => { e.stopPropagation(); onShare(); }}
              accessibilityLabel={`Open share card editor for ${run.title}`}
              hitSlop={10}
              style={({ pressed }) => [{
                width: 38, height: 38, borderRadius: 12,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: 'rgba(243,237,226,0.18)',
                backgroundColor: 'rgba(14,13,11,0.45)',
                opacity: pressed ? 0.7 : 1,
              }]}
            >
              <Icon.share size={15} color={c.paper} />
            </Pressable>
          </View>

          <View style={{ flex: 1 }} />

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
            {/* DISTANCE flex bumped to 1.4 + adjustsFontSizeToFit so big
                 numbers ("18.31", "42.42") shrink to fit instead of wrapping
                 to a second line. Small numbers ("5.2") stay at 46pt.
                 numberOfLines=1 hard-locks against the wrap regardless of
                 what the auto-shrink decides. */}
            <View style={{ flex: 1.4 }}>
              <Eyebrow style={{ color: c.onInk3, fontSize: 9 }}>DISTANCE</Eyebrow>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <TText
                  variant="monoMedium"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                  style={{ fontSize: 46, lineHeight: 54, letterSpacing: -1.4, color: c.paper }}
                >
                  {fmtDist(run.distance, units)}
                </TText>
                <TText style={{ fontSize: 14, color: c.onInk3, marginLeft: 4 }}>{distUnit(units)}</TText>
              </View>
            </View>
            <View style={{ flex: 0.85 }}>
              <Eyebrow style={{ color: c.onInk3, fontSize: 9 }}>PACE</Eyebrow>
              <TText variant="monoMedium" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontSize: 22, color: c.paper, letterSpacing: -0.2 }}>{fmtPace(run.pace, units)}</TText>
              <TText style={{ fontSize: 10, color: c.onInk3 }}>/{distUnit(units)}</TText>
            </View>
            <View style={{ flex: 1.0 }}>
              <Eyebrow style={{ color: c.onInk3, fontSize: 9 }}>TIME</Eyebrow>
              <TText variant="monoMedium" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontSize: 22, color: c.paper, letterSpacing: -0.2 }}>{fmtTime(run.seconds)}</TText>
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

// Counts HealthKit running workouts that aren't on the server yet, used to
// drive the "X runs not imported" banner. Cheap by design: only queries HK
// for workouts since the latest already-imported activity (or 30 days back
// if there's nothing imported), then filters out anything already in the
// activities list by HK UUID. Skips entirely when Health permission isn't
// granted — no UI noise on signed-out / Android sessions.
function useMissingHealthKitRuns(activities: Activity[]): number {
  const { status } = useHealth();
  const [count, setCount] = useState(0);

  // Build the lookup set + the "fetch from" anchor outside the effect so
  // the dependency surface is stable.
  const importedAppleHkIds = useMemo(() => {
    const s = new Set<string>();
    for (const a of activities) {
      if (a.source === 'apple_health' && a.externalId) s.add(a.externalId);
    }
    return s;
  }, [activities]);

  const latestImportedTime = useMemo(() => {
    let t = 0;
    for (const a of activities) {
      const ts = new Date(a.date).getTime();
      if (Number.isFinite(ts) && ts > t) t = ts;
    }
    return t;
  }, [activities]);

  useEffect(() => {
    if (status !== 'granted') {
      setCount(0);
      return;
    }
    // Don't probe HealthKit for a fresh-install user with no activities —
    // they should connect via the proper flow first, not get a "missing
    // runs" banner.
    if (activities.length === 0) {
      setCount(0);
      return;
    }
    let cancelled = false;
    // 24h overlap before the latest imported timestamp so we don't miss
    // out-of-order arrivals (Apple Watch sometimes backdates workouts).
    const since = latestImportedTime > 0
      ? new Date(latestImportedTime - 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    (async () => {
      try {
        const runs = await getRunningWorkoutsSince(since);
        if (cancelled) return;
        let missing = 0;
        for (const w of runs) {
          if (w.distanceMeters > 0 && !importedAppleHkIds.has(w.uuid)) missing++;
        }
        setCount(missing);
      } catch {
        // Swallow HK errors here — the connectors tile / pull-to-refresh
        // already surface them. We just don't show the banner.
        if (!cancelled) setCount(0);
      }
    })();
    return () => { cancelled = true; };
  }, [status, activities.length, latestImportedTime, importedAppleHkIds]);

  return count;
}
