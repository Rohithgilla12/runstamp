import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { distUnit, fmtDist, fmtTime, type Activity, type ActivitySource } from '../data/sample';
import { useAppState } from '../state/AppState';
import { useActivities } from '../state/useActivities';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { FilterChip } from '../design/FilterChip';
import { Icon } from '../design/Icon';
import type { RootStackProps } from '../nav/types';

type SourceFilter = ActivitySource | 'all';

interface Range { label: string; min: number; max: number }

const RANGES: Range[] = [
  { label: 'Any distance', min: 0, max: Infinity },
  { label: '< 5 km', min: 0, max: 5 },
  { label: '5–10', min: 5, max: 10 },
  { label: '10–20', min: 10, max: 20 },
  { label: '20+', min: 20, max: Infinity },
];

const SOURCES: { label: string; value: SourceFilter }[] = [
  { label: 'All sources', value: 'all' },
  { label: 'Strava', value: 'strava' },
  { label: 'Apple Health', value: 'apple_health' },
  { label: 'Manual', value: 'manual' },
];

type ListItem =
  | { kind: 'header'; key: string; label: string; count: number; km: number }
  | { kind: 'row'; key: string; activity: Activity };

export function ActivitiesScreen({ navigation }: RootStackProps<'Activities'>) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { units } = useAppState();
  const { activities, loading, refresh } = useActivities();

  const [search, setSearch] = useState('');
  const [year, setYear] = useState<number | 'all'>('all');
  const [rangeIdx, setRangeIdx] = useState(0);
  const [source, setSource] = useState<SourceFilter>('all');
  const [moreOpen, setMoreOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  }, [refresh]);

  const years = useMemo(() => {
    const ys = new Set<number>();
    for (const a of activities) {
      const y = Number(a.date.slice(0, 4));
      if (!Number.isNaN(y)) ys.add(y);
    }
    return [...ys].sort((a, b) => b - a);
  }, [activities]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const r = RANGES[rangeIdx];
    return activities.filter((a) => {
      if (year !== 'all' && Number(a.date.slice(0, 4)) !== year) return false;
      if (source !== 'all' && a.source !== source) return false;
      if (a.distance < r.min || a.distance >= r.max) return false;
      if (q && !`${a.title} ${a.place}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activities, search, year, rangeIdx, source]);

  const items = useMemo<ListItem[]>(() => {
    const out: ListItem[] = [];
    const grouped = new Map<string, Activity[]>();
    for (const a of filtered) {
      const ym = a.date.slice(0, 7);
      const arr = grouped.get(ym) ?? [];
      arr.push(a);
      grouped.set(ym, arr);
    }
    const keys = [...grouped.keys()].sort((a, b) => b.localeCompare(a));
    for (const k of keys) {
      const arr = grouped.get(k)!;
      const km = arr.reduce((acc, a) => acc + a.distance, 0);
      out.push({ kind: 'header', key: `h-${k}`, label: monthLabel(k), count: arr.length, km });
      for (const a of arr) out.push({ kind: 'row', key: `r-${a.id}`, activity: a });
    }
    return out;
  }, [filtered]);

  const totals = useMemo(() => {
    let km = 0; let sec = 0;
    for (const a of filtered) { km += a.distance; sec += a.seconds; }
    return { km, sec, n: filtered.length };
  }, [filtered]);

  const filtersActive =
    year !== 'all' || rangeIdx !== 0 || source !== 'all' || search.trim() !== '';

  const reset = () => {
    setSearch(''); setYear('all'); setRangeIdx(0); setSource('all');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 14, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={8}
            accessibilityLabel="Back"
            style={{
              width: 38, height: 38, borderRadius: 12, backgroundColor: c.paper2,
              borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon.back size={20} color={c.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Eyebrow>
              {filtersActive ? `${totals.n} OF ${activities.length} RUNS` : `${activities.length} RUNS`}
            </Eyebrow>
            <TText variant="serif" style={{ fontSize: 24, lineHeight: 26, letterSpacing: -0.4, color: c.ink, marginTop: 2 }}>
              All runs
            </TText>
          </View>
        </View>

        <View style={{
          marginTop: 12, height: 40, borderRadius: 12, backgroundColor: c.paper2,
          borderWidth: 1, borderColor: c.line,
          flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8,
        }}>
          <Icon.filter size={14} color={c.ink3} />
          <TextInput
            placeholder="Search title or place"
            placeholderTextColor={c.ink3}
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, fontSize: 13, color: c.ink, paddingVertical: 0 }}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Icon.x size={14} color={c.ink3} />
            </Pressable>
          )}
        </View>

        <View style={{ paddingTop: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            <FilterChip label="All years" selected={year === 'all'} onPress={() => setYear('all')} />
            {years.map((y) => (
              <FilterChip key={y} label={String(y)} selected={year === y} onPress={() => setYear(y)} />
            ))}
          </ScrollView>
        </View>

        <View style={{
          paddingTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Pressable
            onPress={() => setMoreOpen((v) => !v)}
            hitSlop={6}
            style={{
              paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14,
              backgroundColor: filtersActive && (rangeIdx !== 0 || source !== 'all') ? c.ink : c.paper2,
              borderWidth: 1, borderColor: filtersActive && (rangeIdx !== 0 || source !== 'all') ? c.ink : c.line,
              flexDirection: 'row', alignItems: 'center', gap: 6,
            }}
          >
            <Icon.sliders size={12} color={filtersActive && (rangeIdx !== 0 || source !== 'all') ? c.paper : c.ink} />
            <TText style={{ fontSize: 12, color: filtersActive && (rangeIdx !== 0 || source !== 'all') ? c.paper : c.ink }}>
              {moreOpen ? 'Hide filters' : 'More filters'}
            </TText>
          </Pressable>
          {filtersActive && (
            <Pressable onPress={reset} hitSlop={8}>
              <TText style={{ fontSize: 12, color: c.ink3, textDecorationLine: 'underline' }}>Reset</TText>
            </Pressable>
          )}
        </View>

        {moreOpen && (
          <View style={{ paddingTop: 12, gap: 10 }}>
            <View>
              <Eyebrow style={{ color: c.ink3, marginBottom: 6 }}>DISTANCE</Eyebrow>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {RANGES.map((r, i) => (
                  <FilterChip key={r.label} label={r.label} selected={rangeIdx === i} onPress={() => setRangeIdx(i)} />
                ))}
              </ScrollView>
            </View>
            <View>
              <Eyebrow style={{ color: c.ink3, marginBottom: 6 }}>SOURCE</Eyebrow>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {SOURCES.map((s) => (
                  <FilterChip key={s.value} label={s.label} selected={source === s.value} onPress={() => setSource(s.value)} />
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {filtersActive && totals.n > 0 && (
          <View style={{ paddingTop: 10 }}>
            <TText variant="mono" style={{ fontSize: 11, color: c.ink3 }}>
              {fmtDist(totals.km, units)} {distUnit(units)} · {fmtTime(totals.sec)}
            </TText>
          </View>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.key}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.ink2} />}
        ListEmptyComponent={
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <Eyebrow style={{ color: c.ink3 }}>
              {loading ? 'LOADING…' : filtersActive ? 'NO MATCHES' : 'NO RUNS'}
            </Eyebrow>
            <TText style={{ fontSize: 13, color: c.ink3, marginTop: 8, textAlign: 'center' }}>
              {loading
                ? 'Fetching your runs…'
                : filtersActive
                  ? 'Try widening your filters.'
                  : 'Connect Strava or Apple Health to sync.'}
            </TText>
            {filtersActive && (
              <Pressable onPress={reset} hitSlop={8} style={{ marginTop: 12 }}>
                <TText style={{ fontSize: 13, color: c.accent }}>Reset filters</TText>
              </Pressable>
            )}
          </View>
        }
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return (
              <View style={{
                paddingTop: 18, paddingBottom: 8,
                flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
              }}>
                <TText variant="serif" style={{ fontSize: 18, color: c.ink, letterSpacing: -0.2 }}>{item.label}</TText>
                <Eyebrow style={{ color: c.ink3 }}>
                  {item.count} {item.count === 1 ? 'RUN' : 'RUNS'} · {fmtDist(item.km, units)} {distUnit(units)}
                </Eyebrow>
              </View>
            );
          }
          return (
            <ActivityRow
              activity={item.activity}
              onOpen={() => navigation.navigate('Activity', { id: item.activity.id })}
              onShare={() => navigation.navigate('Editor', { id: item.activity.id })}
            />
          );
        }}
      />
    </View>
  );
}

function ActivityRow({ activity, onOpen, onShare }: { activity: Activity; onOpen: () => void; onShare: () => void }) {
  const c = useColors();
  const { units } = useAppState();
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [{
        backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line,
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
        flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8,
        opacity: pressed ? 0.85 : 1,
      }]}
    >
      <View style={{ flex: 1 }}>
        <TText style={{ fontSize: 14, fontWeight: '500', color: c.ink }} numberOfLines={1}>{activity.title}</TText>
        <TText style={{ fontSize: 11, color: c.ink3, marginTop: 2 }} numberOfLines={1}>
          {activity.day} · {activity.date.slice(5).replace('-', '/')} · {activity.place}
        </TText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <TText variant="monoMedium" style={{ fontSize: 16, color: c.ink }}>{fmtDist(activity.distance, units)}</TText>
        <TText variant="mono" style={{ fontSize: 10, color: c.ink3 }}>{fmtTime(activity.seconds)}</TText>
      </View>
      <Pressable
        onPress={onShare}
        hitSlop={8}
        accessibilityLabel={`Share ${activity.title}`}
        style={({ pressed }) => [{
          width: 38, height: 38, borderRadius: 10,
          backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
        }]}
      >
        <Icon.share size={16} color={c.paper} />
      </Pressable>
    </Pressable>
  );
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
