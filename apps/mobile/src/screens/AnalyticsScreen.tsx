import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { distUnit, fmtDist, fmtTime, type Activity } from '../data/sample';
import { useAppState } from '../state/AppState';
import { useActivities } from '../state/useActivities';
import { useBestEfforts } from '../state/useBestEfforts';
import type { BestEffort } from '../services/bestEfforts';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { Card } from '../design/atoms';
import { SunMark } from '../design/SunMark';
import { SectionHeader } from './HomeScreen';
import type { TabProps } from '../nav/types';
import { sortByDateAsc } from '../analytics/sortByDate';
import { buildHeatmap } from '../analytics/heatmap';
import { computeStreaks } from '../analytics/streaks';
import { buildLoadSeries, hasAnyHr } from '../analytics/trainingLoad';
import { distanceHistogram } from '../analytics/histogram';
import { HeatmapCalendar } from '../design/charts/HeatmapCalendar';
import { MonthlyBars } from '../design/charts/MonthlyBars';
import { DistanceHistogram } from '../design/charts/DistanceHistogram';
import { TrainingLoadCard } from '../design/charts/TrainingLoadCard';
import { DEFAULT_HR_MAX, DEFAULT_HR_RESTING } from '../analytics/hrZones';

type Scope = 'year' | 'month' | 'all';

export function AnalyticsScreen(_props: TabProps<'Stats'>) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState<Scope>('year');
  const { activities, loading, refresh } = useActivities();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  }, [refresh]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: c.paper }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.ink2} />}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <Eyebrow>STATISTICS</Eyebrow>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', marginTop: 2 }}>
          <TText variant="serif" style={{ fontSize: 30, lineHeight: 32, letterSpacing: -0.6 }}>The </TText>
          <TText variant="serifItalic" style={{ fontSize: 30, lineHeight: 32, letterSpacing: -0.6 }}>bigger</TText>
          <TText variant="serif" style={{ fontSize: 30, lineHeight: 32, letterSpacing: -0.6 }}> picture.</TText>
        </View>
      </View>

      <View style={{ paddingHorizontal: 14, paddingTop: 18 }}>
        <View style={{ flexDirection: 'row', backgroundColor: c.paper2, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: c.line }}>
          {(['year', 'month', 'all'] as const).map((id) => (
            <Pressable key={id} onPress={() => setScope(id)} style={{
              flex: 1, paddingVertical: 9, borderRadius: 9,
              backgroundColor: scope === id ? c.ink : 'transparent', alignItems: 'center'
            }}>
              <TText style={{ fontSize: 13, fontWeight: '500', color: scope === id ? c.paper : c.ink2 }}>
                {id === 'year' ? 'Year' : id === 'month' ? 'Month' : 'All-time'}
              </TText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
        {activities.length === 0 ? (
          <EmptyState loading={loading} />
        ) : (
          <StatsView scope={scope} activities={activities} />
        )}
      </View>
    </ScrollView>
  );
}

function EmptyState({ loading }: { loading: boolean }) {
  const c = useColors();
  return (
    <Card style={{ backgroundColor: c.paper2, padding: 24 }}>
      <Eyebrow style={{ color: c.ink3 }}>{loading ? 'LOADING…' : 'NOT ENOUGH DATA'}</Eyebrow>
      <TText variant="serif" style={{ fontSize: 22, lineHeight: 26, color: c.ink, marginTop: 8, letterSpacing: -0.3 }}>
        Stats start appearing after your first run.
      </TText>
      <TText style={{ fontSize: 13, color: c.ink3, marginTop: 8, lineHeight: 18 }}>
        Connect Strava or Apple Health from Profile → Connections.
      </TText>
    </Card>
  );
}

interface Aggregate {
  totalKm: number;
  runs: number;
  totalSec: number;
  elevM: number;
}

function aggregate(rows: Activity[]): Aggregate {
  let totalKm = 0, runs = 0, totalSec = 0, elevM = 0;
  for (const a of rows) {
    totalKm += a.distance;
    runs += 1;
    totalSec += a.seconds;
    elevM += a.elev;
  }
  return { totalKm, runs, totalSec, elevM };
}

function StatsView({ scope, activities }: { scope: Scope; activities: Activity[] }) {
  const c = useColors();
  const filtered = useMemo(() => filterByScope(activities, scope), [activities, scope]);
  const all = useMemo(() => aggregate(activities), [activities]);
  const scoped = useMemo(() => aggregate(filtered), [filtered]);
  const { efforts } = useBestEfforts();

  const ascending = useMemo(() => sortByDateAsc(activities), [activities]);
  const hrMax = DEFAULT_HR_MAX;
  const hrResting = DEFAULT_HR_RESTING;
  const heatmap = useMemo(() => buildHeatmap(
    ascending.map((a) => ({ date: a.date, distance: a.distance })),
  ), [ascending]);
  const streaks = useMemo(() => computeStreaks(ascending), [ascending]);
  const load = useMemo(() => buildLoadSeries(
    ascending.map((a) => ({ date: a.date, distance: a.distance, seconds: a.seconds, avgHr: a.avgHr })),
    new Date(),
    hrMax,
    hrResting,
  ), [ascending, hrMax, hrResting]);
  const hrBased = useMemo(() => hasAnyHr(ascending.map((a) => ({ avgHr: a.avgHr }))), [ascending]);
  const monthlyKm = useMemo(() => {
    const y = new Date().getFullYear();
    const out: number[] = Array(12).fill(0);
    for (const a of ascending) {
      const d = new Date(a.date);
      if (d.getFullYear() === y) out[d.getMonth()] += a.distance;
    }
    return out;
  }, [ascending]);
  const histogramCells = useMemo(() => distanceHistogram(filtered), [filtered]);

  return (
    <View>
      {scope !== 'all' ? <ScopedHero scope={scope} agg={scoped} /> : <LifetimeHero agg={all} />}
      {scope === 'year' && (
        <>
          <SectionHeader title="Activity heatmap" />
          <Card style={{ backgroundColor: c.paper2 }}>
            <HeatmapCalendar grid={heatmap} />
          </Card>
          <SectionHeader title="By month" />
          <Card style={{ backgroundColor: c.paper2 }}>
            <MonthlyBars values={monthlyKm} />
          </Card>
          <SectionHeader title="By distance" />
          <Card style={{ backgroundColor: c.paper2 }}>
            <DistanceHistogram cells={histogramCells} />
          </Card>
          <SectionHeader title="Streaks" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <StatTile label="CURRENT" value={`${streaks.current}d`} />
            <StatTile label="LONGEST" value={`${streaks.longest}d`} />
          </View>
          <View style={{ marginTop: 12 }}>
            <TrainingLoadCard
              series={load}
              isHrBased={hrBased}
              needsHrProfile={hrBased && hrMax === DEFAULT_HR_MAX && hrResting === DEFAULT_HR_RESTING}
            />
          </View>
        </>
      )}
      {efforts.length > 0 && (
        <>
          <SectionHeader title="Personal bests" />
          <View style={{ gap: 6 }}>
            {efforts.map((e) => <BestEffortRow key={e.label} effort={e} />)}
          </View>
        </>
      )}
      <SectionHeader title="Recent activity" />
      <View style={{ gap: 6 }}>
        {filtered.slice(0, 10).map((a) => <Row key={a.id} a={a} />)}
        {filtered.length === 0 && <NoneInScope scope={scope} />}
      </View>
    </View>
  );
}

function BestEffortRow({ effort }: { effort: BestEffort }) {
  const c = useColors();
  const date = new Date(effort.achievedAt);
  const dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <View style={{
      backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line,
      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
      flexDirection: 'row', alignItems: 'center', gap: 10,
    }}>
      <Eyebrow style={{ width: 88, color: c.ink3 }}>{effort.label.toUpperCase()}</Eyebrow>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <TText variant="monoMedium" style={{ fontSize: 18, color: c.ink, letterSpacing: -0.2 }}>{fmtTime(effort.timeSeconds)}</TText>
        <TText style={{ fontSize: 10, color: c.ink3 }}>{dateLabel}</TText>
      </View>
    </View>
  );
}

function filterByScope(rows: Activity[], scope: Scope): Activity[] {
  if (scope === 'all') return rows;
  const now = new Date();
  if (scope === 'year') {
    const y = now.getFullYear();
    return rows.filter((a) => new Date(a.date).getFullYear() === y);
  }
  // month
  const y = now.getFullYear(), m = now.getMonth();
  return rows.filter((a) => {
    const d = new Date(a.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });
}

function ScopedHero({ scope, agg }: { scope: Scope; agg: Aggregate }) {
  const c = useColors();
  const { units } = useAppState();
  const label = scope === 'year' ? `${new Date().getFullYear()}` : new Date().toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  return (
    <Card style={{ backgroundColor: c.paper2 }}>
      <Eyebrow>{label}</Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
        <TText variant="monoMedium" style={{ fontSize: 44, lineHeight: 44, letterSpacing: -1.4, color: c.ink }}>
          {fmtDist(agg.totalKm, units)}
        </TText>
        <TText style={{ fontSize: 14, color: c.ink3, marginLeft: 4 }}>{distUnit(units)}</TText>
      </View>
      <View style={{ flexDirection: 'row', gap: 18, marginTop: 10 }}>
        <Stat label="RUNS" value={String(agg.runs)} />
        <Stat label="TIME" value={fmtTime(agg.totalSec)} />
        <Stat label="ELEV" value={`${Math.round(agg.elevM).toLocaleString()} m`} />
      </View>
    </Card>
  );
}

function LifetimeHero({ agg }: { agg: Aggregate }) {
  const c = useColors();
  const { units } = useAppState();
  return (
    <Card style={{ backgroundColor: c.ink, borderColor: 'transparent', overflow: 'hidden' }}>
      <View style={{ position: 'absolute', right: -40, top: -40, opacity: 0.07 }}>
        <SunMark size={180} />
      </View>
      <Eyebrow style={{ color: 'rgba(243,237,226,0.5)' }}>LIFETIME</Eyebrow>
      <TText variant="monoMedium" style={{ fontSize: 60, lineHeight: 60, letterSpacing: -2.4, color: c.paper, marginTop: 6 }}>
        {Math.round(agg.totalKm).toLocaleString()}
      </TText>
      <Eyebrow style={{ color: 'rgba(243,237,226,0.5)', marginTop: 4 }}>{distUnit(units).toUpperCase()} TOTAL</Eyebrow>
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(243,237,226,0.12)' }}>
        <Stat dark label="RUNS" value={String(agg.runs)} />
        <Stat dark label="TIME" value={fmtTime(agg.totalSec)} />
        <Stat dark label="ELEV" value={`${Math.round(agg.elevM).toLocaleString()} m`} />
      </View>
    </Card>
  );
}

function Stat({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  const c = useColors();
  return (
    <View style={{ flex: 1 }}>
      <Eyebrow style={{ color: dark ? 'rgba(243,237,226,0.5)' : c.ink3 }}>{label}</Eyebrow>
      <TText variant="monoMedium" style={{ fontSize: 18, color: dark ? c.paper : c.ink }}>{value}</TText>
    </View>
  );
}

function Row({ a }: { a: Activity }) {
  const c = useColors();
  const { units } = useAppState();
  return (
    <View style={{
      backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line,
      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
      flexDirection: 'row', alignItems: 'center', gap: 10,
    }}>
      <View style={{ flex: 1 }}>
        <TText style={{ fontSize: 13, fontWeight: '500', color: c.ink }} numberOfLines={1}>{a.title}</TText>
        <TText style={{ fontSize: 10, color: c.ink3 }}>{a.date} · {a.day}</TText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <TText variant="monoMedium" style={{ fontSize: 14, color: c.ink }}>{fmtDist(a.distance, units)}</TText>
        <TText variant="mono" style={{ fontSize: 9, color: c.ink3 }}>{fmtTime(a.seconds)}</TText>
      </View>
    </View>
  );
}

function NoneInScope({ scope }: { scope: Scope }) {
  const c = useColors();
  return (
    <View style={{ paddingVertical: 18, alignItems: 'center' }}>
      <TText style={{ fontSize: 12, color: c.ink3 }}>No runs in this {scope}.</TText>
    </View>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line, borderRadius: 10, padding: 12 }}>
      <Eyebrow style={{ color: c.ink3 }}>{label}</Eyebrow>
      <TText variant="monoMedium" style={{ fontSize: 22, color: c.ink, marginTop: 4 }}>{value}</TText>
    </View>
  );
}
