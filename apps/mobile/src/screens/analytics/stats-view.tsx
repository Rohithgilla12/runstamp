import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, View } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { distUnit, fmtDist, fmtTime, type Activity } from '../../data/sample';
import { delta, filterByPeriod, type Period } from '../../analytics/compare';
import { sortByDateAsc } from '../../analytics/sortByDate';
import { buildHeatmap } from '../../analytics/heatmap';
import { computeStreaks } from '../../analytics/streaks';
import { buildLoadSeries, hasAnyHr } from '../../analytics/trainingLoad';
import { distanceHistogram } from '../../analytics/histogram';
import { classifyAvgHr } from '../../analytics/hrZones';
import { dailyKmForWeek, labelWeek, type WeekKey } from '../../analytics/week';
import { currentVo2, deltaVo2, vo2Series } from '../../analytics/vo2max';
import { cadenceSeries, currentCadence, deltaCadence } from '../../analytics/cadence';
import { buildRacePredictor } from '../../analytics/racePredictor';
import { decouplingSeries, recentAvg } from '../../analytics/decoupling';
import { currentStride, deltaStride, strideSeries } from '../../analytics/strideLength';
import { mafHr, mafImprovementSec, mafPaceSeries } from '../../analytics/maf';
import { gapTaxSeries, lifetimeAvgTax } from '../../analytics/gap';
import { monthlyCumulative } from '../../analytics/cumulative';
import { Card, SectionHeader } from '../../design/atoms';
import { HeatmapCalendar } from '../../design/charts/HeatmapCalendar';
import { ShareableChartCard } from '../../design/ShareableChartCard';
import { MonthlyBars } from '../../design/charts/MonthlyBars';
import { DistanceHistogram } from '../../design/charts/DistanceHistogram';
import { Vo2MaxCard } from '../../design/charts/Vo2MaxCard';
import { CadenceCard } from '../../design/charts/CadenceCard';
import { RacePredictorCard } from '../../design/charts/RacePredictorCard';
import { DecouplingCard } from '../../design/charts/DecouplingCard';
import { StrideLengthCard } from '../../design/charts/StrideLengthCard';
import { FormChartCard } from '../../design/charts/FormChartCard';
import { MafPaceCard } from '../../design/charts/MafPaceCard';
import { ClimbingTaxCard } from '../../design/charts/ClimbingTaxCard';
import { DailyBars } from '../../design/charts/DailyBars';
import { CumulativeChart } from '../../design/charts/CumulativeChart';
import { MonthCalendarDots } from '../../design/charts/MonthCalendarDots';
import { WeeklyBars } from '../../design/charts/WeeklyBars';
import { PERIOD_SHARE_HEIGHT, PERIOD_SHARE_WIDTH, PeriodShareCard, type PeriodSummary } from '../../design/PeriodShareCard';
import { CHART_SHARE_FRAME_HEIGHT, CHART_SHARE_FRAME_WIDTH, ChartShareFrame } from '../../design/ChartShareFrame';
import { VideoExportModal } from '../share/VideoExportModal';
import { shareExportedVideo } from '../../services/videoExport';
import { Icon } from '../../design/Icon';
import { useColors } from '../../design/theme';
import { Eyebrow, TText } from '../../design/typography';
import { useAppState } from '../../state/AppState';
import { useBestEfforts } from '../../state/useBestEfforts';
import { NoneInScope, Row, StatTile } from './atoms';
import { BestEffortRow } from './best-effort-row';
import { type Filters } from './filters';
import { LifetimeHero, ScopedHero } from './hero';
import { aggregate, filterByScope, labelPeriod, MONTH_NAMES, type Aggregate, type Scope } from './period';

export function StatsView({ scope, activities, filters, selectedYear, selectedMonth, selectedWeek, comparePeriod, hrMax, hrResting, birthYear, needsHrProfile, onTapProfile }: {
  scope: Scope;
  activities: Activity[];
  filters: Filters;
  selectedYear: number;
  selectedMonth: number;
  selectedWeek: WeekKey;
  comparePeriod: Period | null;
  hrMax: number;
  hrResting: number;
  birthYear?: number;
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

  // Aerobic decoupling — per-run Pa:HR from splits halves. Falls back to
  // empty when no run in scope has splits.
  const decoupling = useMemo(() => decouplingSeries(
    filteredByLens.map((a) => ({ date: a.date, splits: a.splits })),
  ), [filteredByLens]);
  const decouplingRecent = useMemo(() => recentAvg(decoupling, 4), [decoupling]);
  const hasDecoupling = decoupling.length > 0;

  const strideTrend = useMemo(
    () => strideSeries(filteredByLens.map((a) => ({
      date: a.date, distance: a.distance, seconds: a.seconds, cadence: a.cadence,
    }))),
    [filteredByLens],
  );
  const strideNow = useMemo(() => currentStride(strideTrend), [strideTrend]);
  const strideDelta = useMemo(() => deltaStride(strideTrend), [strideTrend]);
  const hasStride = strideTrend.length > 0;

  // MAF aerobic-test trend — monthly average pace of all sub-MAF-HR runs.
  // Needs birth year to compute MAF HR; empty state prompts the user to
  // add it. Adjustment defaults to 0 (assumes consistent training).
  const mafHrCap = useMemo(() => birthYear ? mafHr(birthYear, 0, today) : null, [birthYear, today]);
  const mafTrend = useMemo(() => {
    if (!mafHrCap) return [];
    return mafPaceSeries(
      filteredByLens.map((a) => ({ date: a.date, pace: a.pace, avgHr: a.avgHr || undefined, distance: a.distance })),
      mafHrCap,
    );
  }, [filteredByLens, mafHrCap]);
  const mafImprovement = useMemo(() => mafImprovementSec(mafTrend), [mafTrend]);
  const needsBirthYear = !birthYear;
  const showMaf = (scope === 'year' || scope === 'all') && (mafTrend.length > 0 || needsBirthYear);

  // Climbing tax — monthly raw-vs-GAP pace gap. Reads from a.gapPace which
  // is populated server-side from altitude streams (Strava). Hidden when no
  // activities have GAP yet (empty for non-Strava sources).
  const gapTrend = useMemo(
    () => gapTaxSeries(filteredByLens.map((a) => ({ date: a.date, pace: a.pace, gapPace: a.gapPace, distance: a.distance }))),
    [filteredByLens],
  );
  const gapLifetimeAvg = useMemo(() => lifetimeAvgTax(gapTrend), [gapTrend]);
  const showGap = (scope === 'year' || scope === 'all') && gapTrend.length > 0;

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

  // Period share card — builds a single PeriodSummary for whatever scope is
  // active, used to render the off-screen share card. Each scope picks its
  // own mini-chart shape:
  //   week  → 7 daily bars
  //   month → daily bars across the month
  //   year  → 12 monthly bars
  //   all   → up to last 24 months of monthly totals
  const shareSummary = useMemo<PeriodSummary>(() => {
    let label: string;
    let miniBars: number[];
    let miniCaption: string;
    let streakDays: number;
    let totals: Aggregate;

    if (scope === 'week') {
      label = labelWeek(selectedWeek);
      miniBars = dailyKmThisWeek;
      miniCaption = 'By day';
      streakDays = streaks.current;
      totals = scoped;
    } else if (scope === 'month') {
      label = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      const out: number[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const key = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        out.push(kmByDate[key] ?? 0);
      }
      miniBars = out;
      miniCaption = 'By day';
      streakDays = streaks.longest;
      totals = scoped;
    } else if (scope === 'year') {
      label = String(selectedYear);
      miniBars = monthlyKm;
      miniCaption = 'By month';
      streakDays = streaks.longest;
      totals = scoped;
    } else {
      label = 'Lifetime';
      // Last 24 months of cumulative-source totals (monthly buckets),
      // trimmed to the first non-zero so a runner with 14 months of
      // history doesn't get 10 leading empty bars.
      const monthlyTotals = new Map<string, number>();
      for (const a of filteredByLens) {
        const d = new Date(a.date);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyTotals.set(k, (monthlyTotals.get(k) ?? 0) + a.distance);
      }
      const sortedKeys = Array.from(monthlyTotals.keys()).sort();
      const recent = sortedKeys.slice(-24);
      miniBars = recent.map((k) => monthlyTotals.get(k) ?? 0);
      miniCaption = 'By month';
      streakDays = streaks.longest;
      totals = all;
    }

    return {
      scope,
      label,
      totalKm: totals.totalKm,
      runs: totals.runs,
      totalSec: totals.totalSec,
      longestKm: longestRunKm,
      streakDays,
      miniBars,
      miniCaption,
      units,
    };
  }, [
    scope, selectedYear, selectedMonth, selectedWeek,
    scoped, all, monthlyKm, dailyKmThisWeek, kmByDate,
    streaks, longestRunKm, filteredByLens, units,
  ]);

  const shareCardRef = useRef<View>(null);
  const [sharingSummary, setSharingSummary] = useState(false);
  const [videoExporting, setVideoExporting] = useState(false);
  // The encoder records at the card's logical pt dimensions. captureRef
  // on iOS auto-scales by the device pixel ratio for crisp text, so a
  // 360×450 logical capture becomes ~1080×1350 native on a 3x device.
  // The native encoder receives that resolution and matches it.
  const VIDEO_W = PERIOD_SHARE_WIDTH;
  const VIDEO_H = PERIOD_SHARE_HEIGHT;
  const handleShareSummary = useCallback(async () => {
    if (sharingSummary || !shareCardRef.current) return;
    setSharingSummary(true);
    try {
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      try {
        const perm = await MediaLibrary.requestPermissionsAsync(true);
        if (perm.granted) await MediaLibrary.createAssetAsync(uri);
      } catch {
        // ignore camera-roll save failure; share sheet still works.
      }
      const distLabel = `${fmtDist(shareSummary.totalKm, units)} ${distUnit(units)}`;
      await Share.share({
        url: uri,
        message: `${shareSummary.label}: ${distLabel} via Runstamp`,
      });
    } catch (e) {
      Alert.alert("Couldn’t share", e instanceof Error ? e.message : String(e));
    } finally {
      setSharingSummary(false);
    }
  }, [sharingSummary, shareSummary, units]);

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
                const positive = d.abs >= 0;
                const sign = positive ? '+' : '';
                // Positive deltas keep moss; negative deltas go ink2 with
                // a "↓" — solar is for earned moments only, not for "this
                // period was worse."
                const tone = positive ? c.moss : c.ink2;
                const arrow = positive ? '' : '↓ ';
                return (
                  <TText variant="mono" style={{ fontSize: 10, color: tone, marginTop: 2 }}>
                    {arrow}{sign}{Math.round(d.abs)} km{d.pct === null ? '' : ` · ${sign}${d.pct}%`}
                  </TText>
                );
              })()}
            </View>
          </View>
        </Card>
      ) : scope !== 'all' ? <ScopedHero scope={scope} agg={scoped} year={selectedYear} month={selectedMonth} week={selectedWeek} /> : <LifetimeHero agg={all} />}

      {scoped.runs > 0 && (
        <View style={{ flexDirection: 'row', marginTop: 14, gap: 8 }}>
          <Pressable
            onPress={handleShareSummary}
            disabled={sharingSummary || videoExporting}
            style={({ pressed }) => [{
              flex: 1, padding: 12, borderRadius: 12,
              backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line,
              flexDirection: 'row', alignItems: 'center', gap: 10,
              opacity: pressed || sharingSummary ? 0.6 : 1,
            }]}
          >
            {sharingSummary ? (
              <ActivityIndicator size="small" color={c.ink2} />
            ) : (
              <Icon.share size={14} color={c.ink2} />
            )}
            <View style={{ flex: 1 }}>
              <TText style={{ fontSize: 13, color: c.ink, fontWeight: '500' }}>
                Share {shareSummary.scope === 'all' ? 'lifetime' : shareSummary.label.toLowerCase()}
              </TText>
              <TText variant="mono" style={{ fontSize: 10, color: c.ink3, marginTop: 2, letterSpacing: 0.4 }}>
                {fmtDist(shareSummary.totalKm, units)} {distUnit(units)} · {shareSummary.runs} RUNS
              </TText>
            </View>
          </Pressable>
          <Pressable
            onPress={() => setVideoExporting(true)}
            disabled={sharingSummary || videoExporting}
            accessibilityLabel="Export as video"
            style={({ pressed }) => [{
              paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
              backgroundColor: c.ink, borderWidth: 1, borderColor: c.ink,
              flexDirection: 'row', alignItems: 'center', gap: 8,
              opacity: pressed || videoExporting ? 0.6 : 1,
            }]}
          >
            <Icon.play size={13} color={c.paper} />
            <TText style={{ fontSize: 13, color: c.paper, fontWeight: '500' }}>Video</TText>
          </Pressable>
        </View>
      )}

      {/* Gated on videoExporting — see note in ShareableChartCard. The
          off-screen PeriodShareCard would otherwise paint on every
          re-render of StatsView (scope changes, scroll, filter etc.). */}
      {videoExporting && (
        <VideoExportModal
          visible
          dims={{ width: VIDEO_W, height: VIDEO_H }}
          renderFrame={(p) => <PeriodShareCard summary={shareSummary} progress={p} />}
          onCancel={() => setVideoExporting(false)}
          onComplete={async (uri) => {
            setVideoExporting(false);
            try {
              const distLabel = `${fmtDist(shareSummary.totalKm, units)} ${distUnit(units)}`;
              await shareExportedVideo(uri, `${shareSummary.label}: ${distLabel} via Runstamp`);
            } catch (e) {
              Alert.alert("Couldn’t share", e instanceof Error ? e.message : String(e));
            }
          }}
        />
      )}

      {/* Off-screen render of the share card. position:absolute + left:-10000
          keeps it out of layout flow and invisible to the user, but it's
          still in the native view tree so captureRef can read it. */}
      <View style={{ position: 'absolute', left: -10000, top: 0 }} pointerEvents="none">
        <View ref={shareCardRef} collapsable={false}>
          <PeriodShareCard summary={shareSummary} />
        </View>
      </View>

      {scope === 'week' && (
        <>
          <View style={{ marginTop: 24 }}>
            <ShareableChartCard
              title="By day"
              subtitle={`${labelWeek(selectedWeek)} · ${scoped.runs} runs · ${fmtDist(scoped.totalKm, units)} ${distUnit(units)}`}
              explanation="Kilometres logged each day of the selected ISO week (Monday → Sunday)."
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
          {hasStride && (
            <View style={{ marginTop: 12 }}>
              <StrideLengthCard series={strideTrend} current={strideNow ?? 0} delta28d={strideDelta} />
            </View>
          )}
          {hasDecoupling && (
            <View style={{ marginTop: 12 }}>
              <DecouplingCard series={decoupling} recent={decouplingRecent} />
            </View>
          )}
          {showMaf && (
            <View style={{ marginTop: 12 }}>
              <MafPaceCard
                series={mafTrend}
                mafHrThreshold={mafHrCap ?? 0}
                improvementSec={mafImprovement}
                needsBirthYear={needsBirthYear}
                onTapProfile={onTapProfile}
              />
            </View>
          )}
          {showGap && (
            <View style={{ marginTop: 12 }}>
              <ClimbingTaxCard series={gapTrend} lifetimeAvgSec={gapLifetimeAvg} />
            </View>
          )}
          <View style={{ marginTop: 12 }}>
            <FormChartCard
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
              explanation="One cell per day. Colour intensity scales with distance run that day. Reads like GitHub's contribution graph, except the streak that matters runs through your shoes."
              videoDims={{ width: CHART_SHARE_FRAME_WIDTH, height: CHART_SHARE_FRAME_HEIGHT }}
              videoFrame={(p) => (
                <ChartShareFrame
                  title={`${selectedYear}\nin one square.`}
                  subtitle={`${scoped.runs} runs · ${fmtDist(scoped.totalKm, units)} ${distUnit(units)}`}
                  progress={p}
                  renderChart={(cp) => <HeatmapCalendar grid={heatmap} progress={cp} />}
                />
              )}
            >
              <HeatmapCalendar grid={heatmap} ghost={comparePeriod ? (heatmapB ?? undefined) : undefined} />
            </ShareableChartCard>
          </View>
          <View style={{ marginTop: 12 }}>
            <ShareableChartCard
              title="By month"
              subtitle={`${selectedYear} · monthly distance`}
              explanation="Total kilometres run in each calendar month of the selected year. Useful for spotting build/taper patterns."
            >
              <MonthlyBars values={monthlyKm} compare={comparePeriod ? monthlyKmB : undefined} />
            </ShareableChartCard>
          </View>
          <View style={{ marginTop: 12 }}>
            <ShareableChartCard
              title="By distance"
              subtitle={`${selectedYear} · distance buckets`}
              explanation="How your runs distribute across distance ranges (e.g. 0–5 km, 5–10 km, …). A short-and-easy diet looks very different from one with regular long runs."
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
          {hasStride && (
            <View style={{ marginTop: 12 }}>
              <StrideLengthCard series={strideTrend} current={strideNow ?? 0} delta28d={strideDelta} />
            </View>
          )}
          {hasDecoupling && (
            <View style={{ marginTop: 12 }}>
              <DecouplingCard series={decoupling} recent={decouplingRecent} />
            </View>
          )}
          {showMaf && (
            <View style={{ marginTop: 12 }}>
              <MafPaceCard
                series={mafTrend}
                mafHrThreshold={mafHrCap ?? 0}
                improvementSec={mafImprovement}
                needsBirthYear={needsBirthYear}
                onTapProfile={onTapProfile}
              />
            </View>
          )}
          {showGap && (
            <View style={{ marginTop: 12 }}>
              <ClimbingTaxCard series={gapTrend} lifetimeAvgSec={gapLifetimeAvg} />
            </View>
          )}
          <View style={{ marginTop: 12 }}>
            <FormChartCard
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
              explanation="Calendar layout of the month. Each filled dot is a run; dot size scales with distance."
            >
              <MonthCalendarDots year={selectedYear} month={selectedMonth} kmByDate={kmByDate} />
            </ShareableChartCard>
          </View>
          <View style={{ marginTop: 12 }}>
            <ShareableChartCard
              title="By week"
              subtitle={`${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`}
              explanation="Total kilometres for each rolling 7-day window within the month."
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
          {hasStride && (
            <View style={{ marginTop: 12 }}>
              <StrideLengthCard series={strideTrend} current={strideNow ?? 0} delta28d={strideDelta} />
            </View>
          )}
          {hasDecoupling && (
            <View style={{ marginTop: 12 }}>
              <DecouplingCard series={decoupling} recent={decouplingRecent} />
            </View>
          )}
          {showMaf && (
            <View style={{ marginTop: 12 }}>
              <MafPaceCard
                series={mafTrend}
                mafHrThreshold={mafHrCap ?? 0}
                improvementSec={mafImprovement}
                needsBirthYear={needsBirthYear}
                onTapProfile={onTapProfile}
              />
            </View>
          )}
          {showGap && (
            <View style={{ marginTop: 12 }}>
              <ClimbingTaxCard series={gapTrend} lifetimeAvgSec={gapLifetimeAvg} />
            </View>
          )}
          <View style={{ marginTop: 12 }}>
            <FormChartCard
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
              explanation="Running total of every kilometre logged across your full history, month by month. The slope is your training rate; flat stretches are breaks or injuries."
              videoDims={{ width: CHART_SHARE_FRAME_WIDTH, height: CHART_SHARE_FRAME_HEIGHT }}
              videoFrame={(p) => (
                <ChartShareFrame
                  title="Every kilometre,\nstacked."
                  subtitle={`Lifetime · ${fmtDist(all.totalKm, units)} ${distUnit(units)} · ${all.runs} runs`}
                  progress={p}
                  renderChart={(cp) => <CumulativeChart series={cumulative} progress={cp} />}
                />
              )}
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
          {hasStride && (
            <View style={{ marginTop: 12 }}>
              <StrideLengthCard series={strideTrend} current={strideNow ?? 0} delta28d={strideDelta} />
            </View>
          )}
          {hasDecoupling && (
            <View style={{ marginTop: 12 }}>
              <DecouplingCard series={decoupling} recent={decouplingRecent} />
            </View>
          )}
          {showMaf && (
            <View style={{ marginTop: 12 }}>
              <MafPaceCard
                series={mafTrend}
                mafHrThreshold={mafHrCap ?? 0}
                improvementSec={mafImprovement}
                needsBirthYear={needsBirthYear}
                onTapProfile={onTapProfile}
              />
            </View>
          )}
          {showGap && (
            <View style={{ marginTop: 12 }}>
              <ClimbingTaxCard series={gapTrend} lifetimeAvgSec={gapLifetimeAvg} />
            </View>
          )}
          <View style={{ marginTop: 12 }}>
            <FormChartCard
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
