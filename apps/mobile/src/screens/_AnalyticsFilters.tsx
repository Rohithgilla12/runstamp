import React from 'react';
import { ScrollView, View } from 'react-native';
import { FilterChip } from '../design/FilterChip';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';

export interface Filters {
  minKm: number;
  maxKm: number;
  zones: Set<1 | 2 | 3 | 4 | 5>;
}

export const DEFAULT_FILTERS: Filters = { minKm: 0, maxKm: 100, zones: new Set() };

export function filtersAreActive(f: Filters): boolean {
  return f.minKm > 0 || f.maxKm < 100 || f.zones.size > 0;
}

interface Props {
  value: Filters;
  onChange: (next: Filters) => void;
}

const RANGE_OPTIONS: Array<{ label: string; min: number; max: number }> = [
  { label: 'All', min: 0, max: 100 },
  { label: '< 5 km', min: 0, max: 5 },
  { label: '5–10', min: 5, max: 10 },
  { label: '10–20', min: 10, max: 20 },
  { label: '20–30', min: 20, max: 30 },
  { label: '30+', min: 30, max: 100 },
];

export function AnalyticsFilters({ value, onChange }: Props) {
  const c = useColors();
  const toggleZone = (z: 1 | 2 | 3 | 4 | 5) => {
    const next = new Set(value.zones);
    if (next.has(z)) next.delete(z); else next.add(z);
    onChange({ ...value, zones: next });
  };
  const matchesRange = (opt: typeof RANGE_OPTIONS[number]) =>
    value.minKm === opt.min && value.maxKm === opt.max;

  return (
    <View style={{ gap: 10, paddingTop: 14 }}>
      <View>
        <Eyebrow style={{ color: c.ink3, marginBottom: 6 }}>DISTANCE</Eyebrow>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {RANGE_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.label}
              label={opt.label}
              selected={matchesRange(opt)}
              onPress={() => onChange({ ...value, minKm: opt.min, maxKm: opt.max })}
            />
          ))}
        </ScrollView>
      </View>
      <View>
        <Eyebrow style={{ color: c.ink3, marginBottom: 6 }}>HR ZONE</Eyebrow>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {([1, 2, 3, 4, 5] as const).map((z) => (
            <FilterChip key={z} label={`Z${z}`} selected={value.zones.has(z)} onPress={() => toggleZone(z)} />
          ))}
        </ScrollView>
      </View>
      {value.zones.size === 0 ? null : (
        <TText style={{ fontSize: 10, color: c.ink3 }}>Filtering by avg HR zone.</TText>
      )}
    </View>
  );
}
