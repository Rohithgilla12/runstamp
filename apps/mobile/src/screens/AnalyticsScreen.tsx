import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { type Period } from '../analytics/compare';
import { DEFAULT_HR_MAX, DEFAULT_HR_RESTING } from '../analytics/hrZones';
import { labelWeek, stepWeek, weekKeyFor, type WeekKey } from '../analytics/week';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { useActivities } from '../state/useActivities';
import { useFullRefresh } from '../state/useFullRefresh';
import { useAccount } from '../state/useAccount';
import type { TabProps } from '../nav/types';
import { AnalyticsFilters, DEFAULT_FILTERS, filtersAreActive, type Filters } from './analytics/filters';
import { StepperButton } from './analytics/atoms';
import { EmptyState } from './analytics/empty-state';
import { StatsView } from './analytics/stats-view';
import {
  defaultComparePeriod,
  labelPeriod,
  MONTH_NAMES,
  stepComparePeriod,
  type Scope,
} from './analytics/period';

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
  const { activities, loading } = useActivities();
  const fullRefresh = useFullRefresh();
  const { me } = useAccount();
  const nav = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await fullRefresh(); } finally { setRefreshing(false); }
  }, [fullRefresh]);

  useEffect(() => {
    // Compare-mode only makes sense for year + month — week windows are too
    // narrow to anchor a meaningful comparison, all-time has no second
    // period.
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
      removeClippedSubviews
      style={{ flex: 1, backgroundColor: c.paper }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.ink2} />}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <Eyebrow>STATISTICS</Eyebrow>
        {/* Single composed string with a nested italic span — the previous
            three-sibling layout could wrap mid-phrase under dynamic type. */}
        <TText variant="serif" style={{ fontSize: 30, lineHeight: 32, letterSpacing: -0.6, marginTop: 2 }}>
          The <TText variant="serifItalic" style={{ fontSize: 30, lineHeight: 32, letterSpacing: -0.6 }}>bigger</TText> picture.
        </TText>
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
            accessibilityLabel={compareOn ? 'Turn off compare' : 'Turn on compare with another period'}
            accessibilityState={{ selected: compareOn }}
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
              hitSlop={10}
              accessibilityLabel="Jump to current period"
              style={{ marginLeft: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line }}
            >
              {/* Ghost — solar is reserved for PRs / earned moments. Today
                   is navigation, not celebration. */}
              <TText style={{ fontSize: 12, color: c.ink, fontWeight: '500' }}>Today</TText>
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
        <Pressable
          onPress={() => setFiltersOpen((v) => !v)}
          accessibilityLabel={filtersOpen ? 'Hide filters' : 'Show filters'}
          accessibilityState={{ expanded: filtersOpen, selected: filtersAreActive(filters) }}
          style={{
            paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
            backgroundColor: filtersAreActive(filters) ? c.ink : c.paper2,
            borderWidth: 1, borderColor: filtersAreActive(filters) ? c.ink : c.line,
          }}
        >
          <TText style={{ fontSize: 12, color: filtersAreActive(filters) ? c.paper : c.ink }}>
            {filtersAreActive(filters) ? 'Filters active' : 'Filters'}
          </TText>
        </Pressable>
        {filtersAreActive(filters) && (
          <Pressable
            onPress={() => setFilters(DEFAULT_FILTERS)}
            accessibilityLabel="Clear filters"
            hitSlop={8}
            style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line }}
          >
            <TText style={{ fontSize: 12, color: c.ink3 }}>Clear</TText>
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
            birthYear={me?.birthYear}
            needsHrProfile={!me?.hrMax && !me?.hrResting}
            onTapProfile={() => nav.navigate('Profile' as never)}
          />
        )}
      </View>
    </ScrollView>
  );
}
