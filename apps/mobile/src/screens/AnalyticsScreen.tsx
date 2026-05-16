import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { distUnit, fmtDist, fmtTime, type Activity } from '../data/sample';
import { filterByPeriod, delta, type Period } from '../analytics/compare';
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
import { ShareableChartCard } from '../design/ShareableChartCard';
import { MonthlyBars } from '../design/charts/MonthlyBars';
import { DistanceHistogram } from '../design/charts/DistanceHistogram';
import { TrainingLoadCard } from '../design/charts/TrainingLoadCard';
import { classifyAvgHr, DEFAULT_HR_MAX, DEFAULT_HR_RESTING } from '../analytics/hrZones';
import { dailyKmForWeek, filterByWeek, labelWeek, stepWeek, weekKeyFor, type WeekKey } from '../analytics/week';
import { currentVo2, deltaVo2, vo2Series } from '../analytics/vo2max';
import { Vo2MaxCard } from '../design/charts/Vo2MaxCard';
import { cadenceSeries, currentCadence, deltaCadence } from '../analytics/cadence';
import { CadenceCard } from '../design/charts/CadenceCard';
import { buildRacePredictor } from '../analytics/racePredictor';
import { RacePredictorCard } from '../design/charts/RacePredictorCard';
import { DailyBars } from '../design/charts/DailyBars';
import { monthlyCumulative } from '../analytics/cumulative';
import { CumulativeChart } from '../design/charts/CumulativeChart';
import { MonthCalendarDots } from '../design/charts/MonthCalendarDots';
import { WeeklyBars } from '../design/charts/WeeklyBars';
import { AnalyticsFilters, DEFAULT_FILTERS, filtersAreActive, type Filters } from './_AnalyticsFilters';
import { useAccount } from '../state/useAccount';
import { useNavigation } from '@react-navigation/native';

type Scope = 'week' | 'month' | 'year' | 'all';

export function AnalyticsScreen(_props: TabProps<'Stats'>) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const today = useMemo(() => new Date(), []);
  const [scope, setScope] = useState<Scope>('year');
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);
  const [selectedWeek, setSelectedWeek] = useState<WeekKey>(() => weekKeyFor(today));
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compareOn, setCompareOn] = useState(false);
  const [comparePeriod, setComparePeriod] = useState<Period | null>(null);
  const { activities, loading, refresh } = useActivities();
  const { me } = useAccount();
  const nav = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  }, [refresh]);

  useEffect(() => {
    // Compare-mode only makes sense for year + month — week windows are too
    // narrow to anchor a meaningful comparison, all-time has no second period.
    if (scope === 'all' || scope === 'week') { setCompareOn(false); setComparePeriod(null); }
  }, [scope]);

  const todayWeek = useMemo(() => weekKeyFor(today), [today]);
  const isToday = scope === 'year'
    ? selectedYear === today.getFullYear()
    : scope === 'month'
      ? selectedYear === today.getFullYear() && selectedMonth === today.getMonth() + 1
      : scope === 'week'
        ? selectedWeek.isoYear === todayWeek.isoYear && selectedWeek.isoWeek === todayWeek.isoWeek
        : true;

  const stepPrimary = (dir: 1 | -1) => {
    if (scope === 'year') {
      setSelectedYear((y) => y + dir);
    } else if (scope === 'month') {
      let m = selectedMonth + dir;
      let y = selectedYear;
      if (m < 1) { m = 12; y -= 1; }
      else if (m > 12) { m = 1; y += 1; }
      setSelectedYear(y);
      setSelectedMonth(m);
    } else if (scope === 'week') {
      setSelectedWeek((w) => stepWeek(w, dir));
    }
    setComparePeriod(null);
    setCompareOn(false);
  };
  const jumpToToday = () => {
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth() + 1);
    setSelectedWeek(todayWeek);
  };
  const primaryLabel = scope === 'year'
    ? String(selectedYear)
    : scope === 'month'
      ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
      : scope === 'week'
        ? labelWeek(selectedWeek)
        : '';

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

      <View style={{ paddingHorizontal: 14, paddingTop: 18, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.paper2, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: c.line }}>
          {(['week', 'month', 'year', 'all'] as const).map((id) => (
            <Pressable
              key={id}
              onPress={() => setScope(id)}
              hitSlop={4}
              style={{
                flex: 1, paddingVertical: 11, borderRadius: 9,
                backgroundColor: scope === id ? c.ink : 'transparent', alignItems: 'center',
              }}
            >
              <TText style={{ fontSize: 12, fontWeight: '500', color: scope === id ? c.paper : c.ink2 }}>
                {id === 'week' ? 'Week' : id === 'month' ? 'Month' : id === 'year' ? 'Year' : 'All-time'}
              </TText>
            </Pressable>
          ))}
        </View>
        {(scope === 'year' || scope === 'month') && (
          <Pressable
            onPress={() => {
              const next = !compareOn;
              setCompareOn(next);
              if (next && !comparePeriod) setComparePeriod(defaultComparePeriod(scope, selectedYear, selectedMonth));
            }}
            style={{
              paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
              backgroundColor: compareOn ? c.ink : c.paper2,
              borderWidth: 1, borderColor: compareOn ? c.ink : c.line,
            }}
          >
            <TText style={{ fontSize: 12, color: compareOn ? c.paper : c.ink }}>Compare</TText>
          </Pressable>
        )}
      </View>
      {(scope === 'year' || scope === 'month' || scope === 'week') && (
        <View style={{ paddingHorizontal: 14, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <StepperButton onPress={() => stepPrimary(-1)} label="‹" accessibilityLabel="Previous period" />
          <View style={{ minWidth: 128, paddingHorizontal: 8, alignItems: 'center' }}>
            <TText variant="monoMedium" style={{ fontSize: 14, color: c.ink }}>
              {primaryLabel}
            </TText>
          </View>
          <StepperButton onPress={() => stepPrimary(1)} label="›" accessibilityLabel="Next period" />
          {!isToday && (
            <Pressable
              onPress={jumpToToday}
              hitSlop={8}
              style={{ marginLeft: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line }}
            >
              <TText style={{ fontSize: 12, color: c.accent, fontWeight: '500' }}>Today</TText>
            </Pressable>
          )}
        </View>
      )}
      {compareOn && comparePeriod && (scope === 'year' || scope === 'month') && (
        <View style={{ paddingHorizontal: 14, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TText style={{ fontSize: 12, color: c.ink3, marginRight: 4 }}>vs</TText>
          <StepperButton onPress={() => setComparePeriod(stepComparePeriod(comparePeriod, -1))} label="‹" accessibilityLabel="Previous compare period" />
          <View style={{ minWidth: 128, paddingHorizontal: 8, alignItems: 'center' }}>
            <TText variant="monoMedium" style={{ fontSize: 14, color: c.ink }}>
              {labelPeriod(comparePeriod)}
            </TText>
          </View>
          <StepperButton onPress={() => setComparePeriod(stepComparePeriod(comparePeriod, 1))} label="›" accessibilityLabel="Next compare period" />
        </View>
      )}

      <View style={{ paddingHorizontal: 14, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Pressable onPress={() => setFiltersOpen((v) => !v)} style={{
          paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
          backgroundColor: filtersAreActive(filters) ? c.ink : c.paper2,
          borderWidth: 1, borderColor: filtersAreActive(filters) ? c.ink : c.line,
        }}>
          <TText style={{ fontSize: 12, color: filtersAreActive(filters) ? c.paper : c.ink }}>
            {filtersAreActive(filters) ? 'Filters active' : 'Filters'}
          </TText>
        </Pressable>
        {filtersAreActive(filters) && (
          <Pressable onPress={() => setFilters(DEFAULT_FILTERS)}>
            <TText style={{ fontSize: 12, color: c.ink3, textDecorationLine: 'underline' }}>Clear</TText>
          </Pressable>
        )}
      </View>
      {filtersOpen && (
        <View style={{ paddingHorizontal: 14 }}>
          <AnalyticsFilters value={filters} onChange={setFilters} />
        </View>
      )}

      <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
        {activities.length === 0 ? (
          <EmptyState loading={loading} />
        ) : (
          <StatsView
            scope={scope}
            activities={activities}
            filters={filters}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            selectedWeek={selectedWeek}
            comparePeriod={compareOn ? comparePeriod : null}
            hrMax={me?.hrMax ?? DEFAULT_HR_MAX}
            hrResting={me?.hrResting ?? DEFAULT_HR_RESTING}
            needsHrProfile={!me?.hrMax && !me?.hrResting}
            onTapProfile={() => nav.navigate('Profile' as never)}
          />
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

function StatsView({ scope, activities, filters, selectedYear, selectedMonth, selectedWeek, comparePeriod, hrMax, hrResting, needsHrProfile, onTapProfile }: {
  scope: Scope;
  activities: Activity[];
  filters: Filters;
  selectedYear: number;
  selectedMonth: number;
  selectedWeek: WeekKey;
  comparePeriod: Period | null;
  hrMax: number;
  hrResting: number;
  needsHrProfile: boolean;
  onTapProfile: () => void;
}) {
  const c = useColors();
  const { units } = useAppState();
  const filtered = useMemo(() => filterByScope(activities, scope, selectedYear, selectedMonth, selectedWeek), [activities, scope, selectedYear, selectedMonth, selectedWeek]);
  const all = useMemo(() => aggregate(activities), [activities]);
  const scoped = useMemo(() => aggregate(filtered), [filtered]);
  const { efforts } = useBestEfforts();
  const today = useMemo(() => new Date(), []);

  const ascending = useMemo(() => sortByDateAsc(activities), [activities]);
  const filteredByLens = useMemo(() => {
    const inRange = (km: number) => km >= filters.minKm && (filters.maxKm >= 100 ? true : km <= filters.maxKm);
    return ascending.filter((a) => {
      if (!inRange(a.distance)) return false;
      if (filters.zones.size > 0) {
        const z = classifyAvgHr(a.avgHr || undefined);
        if (z === null || !filters.zones.has(z)) return false;
      }
      return true;
    });
  }, [ascending, filters]);
  const filteredInScope = useMemo(() => filterByScope(filteredByLens, scope, selectedYear, selectedMonth, selectedWeek), [filteredByLens, scope, selectedYear, selectedMonth, selectedWeek]);
  const heatmap = useMemo(() => buildHeatmap(
    filteredByLens.map((a) => ({ date: a.date, distance: a.distance })),
    selectedYear,
    today,
  ), [filteredByLens, selectedYear, today]);
  const streaks = useMemo(() => computeStreaks(filteredByLens), [filteredByLens]);
  const load = useMemo(() => buildLoadSeries(
    filteredByLens.map((a) => ({ date: a.date, distance: a.distance, seconds: a.seconds, avgHr: a.avgHr })),
    today,
    hrMax,
    hrResting,
  ), [filteredByLens, today, hrMax, hrResting]);
  const hrBased = useMemo(() => hasAnyHr(ascending.map((a) => ({ avgHr: a.avgHr }))), [ascending]);
  const monthlyKm = useMemo(() => {
    const out: number[] = Array(12).fill(0);
    for (const a of filteredByLens) {
      const d = new Date(a.date);
      if (d.getFullYear() === selectedYear) out[d.getMonth()] += a.distance;
    }
    return out;
  }, [filteredByLens, selectedYear]);
  const histogramCells = useMemo(() => distanceHistogram(filteredInScope), [filteredInScope]);
  const kmByDate = useMemo(() => {
    const out: Record<string, number> = {};
    for (const a of filteredByLens) out[a.date] = (out[a.date] ?? 0) + a.distance;
    return out;
  }, [filteredByLens]);
  const weeklyKm = useMemo(() => {
    if (scope !== 'month') return [] as number[];
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const weeks: number[] = [];
    for (let day = 1; day <= daysInMonth; day += 7) {
      let sum = 0;
      for (let i = day; i < day + 7 && i <= daysInMonth; i++) {
        const key = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        sum += kmByDate[key] ?? 0;
      }
      weeks.push(sum);
    }
    return weeks;
  }, [scope, kmByDate, selectedYear, selectedMonth]);
  const longestRunKm = useMemo(() => {
    let max = 0;
    for (const a of filteredByLens) if (a.distance > max) max = a.distance;
    return max;
  }, [filteredByLens]);
  const scopedEfforts = useMemo(() => {
    if (scope === 'month') return [];
    if (scope === 'year') {
      const prefix = `${selectedYear}-`;
      return efforts.filter((e) => e.achievedAt.startsWith(prefix));
    }
    return efforts;
  }, [efforts, scope, selectedYear]);
  const cumulative = useMemo(() =>
    monthlyCumulative(filteredByLens.map((a) => ({ date: a.date, distance: a.distance })))
  , [filteredByLens]);

  // Week scope: 7-day km buckets for the selected week.
  const dailyKmThisWeek = useMemo(
    () => dailyKmForWeek(filteredByLens.map((a) => ({ date: a.date, distance: a.distance })), selectedWeek),
    [filteredByLens, selectedWeek],
  );

  // VO₂ max trend — computed against full history (filtered by lens), not
  // scope-windowed. The card hides itself when no measurements exist.
  const vo2Trend = useMemo(
    () => vo2Series(filteredByLens.map((a) => ({ date: a.date, vo2max: a.vo2max }))),
    [filteredByLens],
  );
  const vo2Now = useMemo(() => currentVo2(vo2Trend), [vo2Trend]);
  const vo2Delta = useMemo(() => deltaVo2(vo2Trend), [vo2Trend]);
  const hasVo2 = vo2Trend.length > 0;

  // Cadence trend — same lens-filtered, full-history shape as VO₂. Hides
  // itself when no readings exist.
  const cadenceTrend = useMemo(
    () => cadenceSeries(filteredByLens.map((a) => ({ date: a.date, cadence: a.cadence }))),
    [filteredByLens],
  );
  const cadenceNow = useMemo(() => currentCadence(cadenceTrend), [cadenceTrend]);
  const cadenceDeltaV = useMemo(() => deltaCadence(cadenceTrend), [cadenceTrend]);
  const hasCadence = cadenceTrend.length > 0;

  // Race predictor — picks highest-VDOT effort as anchor, projects equivalent
  // times via Daniels VDOT + Riegel, adds Tanda marathon estimate from the
  // 8-week training summary.
  const racePredictor = useMemo(() => buildRacePredictor(
    efforts.map((e) => ({ distanceM: e.distanceM, timeSeconds: e.timeSeconds, achievedAt: e.achievedAt })),
    ascending.map((a) => ({ date: a.date, distance: a.distance, seconds: a.seconds })),
    today,
  ), [efforts, ascending, today]);

  const periodB = useMemo(() => {
    if (!comparePeriod) return null;
    return filterByPeriod(filteredByLens, comparePeriod);
  }, [filteredByLens, comparePeriod]);

  const aggB = useMemo(() => periodB ? aggregate(periodB) : null, [periodB]);

  const heatmapB = useMemo(() => {
    // Heatmap card only renders for year scope, so month compares need no ghost.
    if (!periodB || !comparePeriod || comparePeriod.kind !== 'year') return null;
    return buildHeatmap(
      periodB.map((a) => ({ date: a.date, distance: a.distance })),
      comparePeriod.year,
      today,
    );
  }, [periodB, comparePeriod, today]);

  const monthlyKmB = useMemo(() => {
    if (!periodB || !comparePeriod || comparePeriod.kind !== 'year') return undefined;
    const out: number[] = Array(12).fill(0);
    for (const a of periodB) {
      const d = new Date(a.date);
      if (d.getFullYear() === comparePeriod.year) out[d.getMonth()] += a.distance;
    }
    return out;
  }, [periodB, comparePeriod]);

  const weeklyKmB = useMemo(() => {
    if (!periodB || !comparePeriod || comparePeriod.kind !== 'month') return undefined;
    const daysInMonth = new Date(comparePeriod.year, comparePeriod.month, 0).getDate();
    const weeks: number[] = [];
    const kmByDateB: Record<string, number> = {};
    for (const a of periodB) kmByDateB[a.date] = (kmByDateB[a.date] ?? 0) + a.distance;
    for (let day = 1; day <= daysInMonth; day += 7) {
      let sum = 0;
      for (let i = day; i < day + 7 && i <= daysInMonth; i++) {
        const key = `${comparePeriod.year}-${String(comparePeriod.month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        sum += kmByDateB[key] ?? 0;
      }
      weeks.push(sum);
    }
    return weeks;
  }, [periodB, comparePeriod]);

  return (
    <View>
      {comparePeriod && aggB ? (
        <Card style={{ backgroundColor: c.paper2 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Eyebrow style={{ color: c.ink3 }}>
                {scope === 'year' ? String(selectedYear) : `${MONTH_NAMES[selectedMonth - 1].toUpperCase()} ${selectedYear}`}
              </Eyebrow>
              <TText variant="monoMedium" style={{ fontSize: 30, lineHeight: 36, color: c.ink, letterSpacing: -0.8 }}>{fmtDist(scoped.totalKm, units)}</TText>
              <TText style={{ fontSize: 10, color: c.ink3 }}>{scoped.runs} runs · {fmtTime(scoped.totalSec)}</TText>
            </View>
            <View style={{ flex: 1 }}>
              <Eyebrow style={{ color: c.ink3 }}>{labelPeriod(comparePeriod).toUpperCase()}</Eyebrow>
              <TText variant="monoMedium" style={{ fontSize: 30, lineHeight: 36, color: c.ink2, letterSpacing: -0.8 }}>{fmtDist(aggB.totalKm, units)}</TText>
              <TText style={{ fontSize: 10, color: c.ink3 }}>{aggB.runs} runs · {fmtTime(aggB.totalSec)}</TText>
              {(() => {
                const d = delta(scoped.totalKm, aggB.totalKm);
                const sign = d.abs >= 0 ? '+' : '';
                const tone = d.abs >= 0 ? c.moss : c.accent;
                return (
                  <TText variant="mono" style={{ fontSize: 10, color: tone, marginTop: 2 }}>
                    {sign}{Math.round(d.abs)} km{d.pct === null ? '' : ` · ${sign}${d.pct}%`}
                  </TText>
                );
              })()}
            </View>
          </View>
        </Card>
      ) : scope !== 'all' ? <ScopedHero scope={scope} agg={scoped} year={selectedYear} month={selectedMonth} week={selectedWeek} /> : <LifetimeHero agg={all} />}
      {scope === 'week' && (
        <>
          <View style={{ marginTop: 24 }}>
            <ShareableChartCard
              title="By day"
              subtitle={`${labelWeek(selectedWeek)} · ${scoped.runs} runs · ${fmtDist(scoped.totalKm, units)} ${distUnit(units)}`}
            >
              <DailyBars values={dailyKmThisWeek} />
            </ShareableChartCard>
          </View>
          {hasVo2 && (
            <View style={{ marginTop: 12 }}>
              <Vo2MaxCard series={vo2Trend} current={vo2Now ?? 0} delta28d={vo2Delta} />
            </View>
          )}
          {hasCadence && (
            <View style={{ marginTop: 12 }}>
              <CadenceCard series={cadenceTrend} current={cadenceNow ?? 0} delta28d={cadenceDeltaV} />
            </View>
          )}
          <View style={{ marginTop: 12 }}>
            <TrainingLoadCard
              series={load}
              isHrBased={hrBased}
              needsHrProfile={hrBased && needsHrProfile}
              onTapProfile={onTapProfile}
            />
          </View>
        </>
      )}
      {scope === 'year' && (
        <>
          <View style={{ marginTop: 24 }}>
            <ShareableChartCard
              title="Activity heatmap"
              subtitle={`${selectedYear} · ${scoped.runs} runs · ${fmtDist(scoped.totalKm, units)} ${distUnit(units)}`}
            >
              <HeatmapCalendar grid={heatmap} ghost={comparePeriod ? (heatmapB ?? undefined) : undefined} />
            </ShareableChartCard>
          </View>
          <View style={{ marginTop: 12 }}>
            <ShareableChartCard
              title="By month"
              subtitle={`${selectedYear} · monthly distance`}
            >
              <MonthlyBars values={monthlyKm} compare={comparePeriod ? monthlyKmB : undefined} />
            </ShareableChartCard>
          </View>
          <View style={{ marginTop: 12 }}>
            <ShareableChartCard
              title="By distance"
              subtitle={`${selectedYear} · distance buckets`}
            >
              <DistanceHistogram cells={histogramCells} />
            </ShareableChartCard>
          </View>
          <SectionHeader title="Streaks" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <StatTile label="CURRENT" value={`${streaks.current}d`} />
            <StatTile label="LONGEST" value={`${streaks.longest}d`} />
          </View>
          {racePredictor && (
            <View style={{ marginTop: 12 }}>
              <RacePredictorCard result={racePredictor} />
            </View>
          )}
          {hasVo2 && (
            <View style={{ marginTop: 12 }}>
              <Vo2MaxCard series={vo2Trend} current={vo2Now ?? 0} delta28d={vo2Delta} />
            </View>
          )}
          {hasCadence && (
            <View style={{ marginTop: 12 }}>
              <CadenceCard series={cadenceTrend} current={cadenceNow ?? 0} delta28d={cadenceDeltaV} />
            </View>
          )}
          <View style={{ marginTop: 12 }}>
            <TrainingLoadCard
              series={load}
              isHrBased={hrBased}
              needsHrProfile={hrBased && needsHrProfile}
              onTapProfile={onTapProfile}
            />
          </View>
        </>
      )}
      {scope === 'month' && (
        <>
          <View style={{ marginTop: 24 }}>
            <ShareableChartCard
              title={MONTH_NAMES[selectedMonth - 1] + ' ' + selectedYear}
              subtitle={`${scoped.runs} runs · ${fmtDist(scoped.totalKm, units)} ${distUnit(units)}`}
            >
              <MonthCalendarDots year={selectedYear} month={selectedMonth} kmByDate={kmByDate} />
            </ShareableChartCard>
          </View>
          <View style={{ marginTop: 12 }}>
            <ShareableChartCard
              title="By week"
              subtitle={`${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`}
            >
              <WeeklyBars values={weeklyKm} compare={comparePeriod ? weeklyKmB : undefined} />
            </ShareableChartCard>
          </View>
          {hasVo2 && (
            <View style={{ marginTop: 12 }}>
              <Vo2MaxCard series={vo2Trend} current={vo2Now ?? 0} delta28d={vo2Delta} />
            </View>
          )}
          {hasCadence && (
            <View style={{ marginTop: 12 }}>
              <CadenceCard series={cadenceTrend} current={cadenceNow ?? 0} delta28d={cadenceDeltaV} />
            </View>
          )}
          <View style={{ marginTop: 12 }}>
            <TrainingLoadCard
              series={load}
              isHrBased={hrBased}
              needsHrProfile={hrBased && needsHrProfile}
              onTapProfile={onTapProfile}
            />
          </View>
        </>
      )}

      {scope === 'all' && (
        <>
          <View style={{ marginTop: 24 }}>
            <ShareableChartCard
              title="Cumulative distance"
              subtitle={`Lifetime · ${fmtDist(all.totalKm, units)} ${distUnit(units)} across ${all.runs} runs`}
            >
              <CumulativeChart series={cumulative} />
            </ShareableChartCard>
          </View>
          <SectionHeader title="Lifetime records" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <StatTile label="LONGEST RUN" value={fmtDist(longestRunKm, units) + ' ' + distUnit(units)} />
            <StatTile label="LONGEST STREAK" value={`${streaks.longest}d`} />
          </View>
          {racePredictor && (
            <View style={{ marginTop: 12 }}>
              <RacePredictorCard result={racePredictor} />
            </View>
          )}
          {hasVo2 && (
            <View style={{ marginTop: 12 }}>
              <Vo2MaxCard series={vo2Trend} current={vo2Now ?? 0} delta28d={vo2Delta} />
            </View>
          )}
          {hasCadence && (
            <View style={{ marginTop: 12 }}>
              <CadenceCard series={cadenceTrend} current={cadenceNow ?? 0} delta28d={cadenceDeltaV} />
            </View>
          )}
          <View style={{ marginTop: 12 }}>
            <TrainingLoadCard
              series={load}
              isHrBased={hrBased}
              needsHrProfile={hrBased && needsHrProfile}
              onTapProfile={onTapProfile}
            />
          </View>
        </>
      )}

      {scopedEfforts.length > 0 && (
        <>
          <SectionHeader title={scope === 'all' ? 'Personal bests' : `PRs set in ${selectedYear}`} />
          <View style={{ gap: 6 }}>
            {scopedEfforts.map((e) => <BestEffortRow key={e.label} effort={e} />)}
          </View>
        </>
      )}
      <SectionHeader title="Recent activity" />
      <View style={{ gap: 6 }}>
        {filteredInScope.slice(0, 10).map((a) => <Row key={a.id} a={a} />)}
        {filteredInScope.length === 0 && <NoneInScope scope={scope} />}
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

function filterByScope(rows: Activity[], scope: Scope, year: number, month: number, week: WeekKey): Activity[] {
  if (scope === 'all') return rows;
  if (scope === 'year') {
    return rows.filter((a) => new Date(a.date).getFullYear() === year);
  }
  if (scope === 'month') {
    return rows.filter((a) => {
      const d = new Date(a.date);
      return d.getFullYear() === year && d.getMonth() === month - 1;
    });
  }
  // week
  return filterByWeek(rows, week);
}

function ScopedHero({ scope, agg, year, month, week }: { scope: Scope; agg: Aggregate; year: number; month: number; week: WeekKey }) {
  const c = useColors();
  const { units } = useAppState();
  const label = scope === 'year'
    ? String(year)
    : scope === 'month'
      ? `${MONTH_NAMES[month - 1].toUpperCase()} ${year}`
      : labelWeek(week).toUpperCase();
  return (
    <Card style={{ backgroundColor: c.paper2 }}>
      <Eyebrow>{label}</Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
        <TText variant="monoMedium" style={{ fontSize: 44, lineHeight: 52, letterSpacing: -1.4, color: c.ink }}>
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
      <Eyebrow style={{ color: c.onInk3 }}>LIFETIME</Eyebrow>
      <TText variant="monoMedium" style={{ fontSize: 60, lineHeight: 70, letterSpacing: -2.4, color: c.paper, marginTop: 6 }}>
        {Math.round(agg.totalKm).toLocaleString()}
      </TText>
      <Eyebrow style={{ color: c.onInk3, marginTop: 4 }}>{distUnit(units).toUpperCase()} TOTAL</Eyebrow>
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.onInkDivider }}>
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
      <Eyebrow style={{ color: dark ? c.onInk3 : c.ink3 }}>{label}</Eyebrow>
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

function StepperButton({ onPress, label, accessibilityLabel }: { onPress: () => void; label: string; accessibilityLabel: string }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
        backgroundColor: pressed ? c.paper3 : c.paper2,
        borderWidth: 1, borderColor: c.line,
      })}
    >
      <TText style={{ fontSize: 20, lineHeight: 20, color: c.ink, marginTop: -2 }}>{label}</TText>
    </Pressable>
  );
}

function defaultComparePeriod(scope: Scope, year: number, month: number): Period {
  if (scope === 'year') return { kind: 'year', year: year - 1 };
  let m = month - 1;
  let y = year;
  if (m < 1) { m = 12; y -= 1; }
  return { kind: 'month', year: y, month: m };
}

function stepComparePeriod(p: Period, dir: 1 | -1): Period {
  if (p.kind === 'year') return { kind: 'year', year: p.year + dir };
  let m = p.month + dir;
  let y = p.year;
  if (m < 1) { m = 12; y -= 1; }
  else if (m > 12) { m = 1; y += 1; }
  return { kind: 'month', year: y, month: m };
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;

function labelPeriod(p: Period): string {
  if (p.kind === 'year') return String(p.year);
  return `${MONTH_NAMES[p.month - 1]} ${p.year}`;
}
