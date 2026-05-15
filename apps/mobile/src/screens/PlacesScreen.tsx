import React, { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { distUnit, type Activity } from '../data/sample';
import { useAppState } from '../state/AppState';
import { useActivities } from '../state/useActivities';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { Card } from '../design/atoms';
import { SectionHeader } from './HomeScreen';
import type { TabProps } from '../nav/types';

interface ComputedPlace {
  city: string;
  country: string;
  runs: number;
  km: number;
  first: string;
}

export function PlacesScreen(_props: TabProps<'Places'>) {
  const c = useColors();
  const { units } = useAppState();
  const insets = useSafeAreaInsets();
  const { activities, loading } = useActivities();

  const places = useMemo(() => aggregatePlaces(activities), [activities]);
  const cities = places.length;
  const countries = new Set(places.map((p) => p.country)).size;
  const totalKm = places.reduce((a, p) => a + p.km, 0);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: c.paper }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 24 }}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <Eyebrow>PLACES</Eyebrow>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', marginTop: 4 }}>
          <TText variant="serif" style={{ fontSize: 26, lineHeight: 28, letterSpacing: -0.6 }}>Every city, </TText>
          <TText variant="serifItalic" style={{ fontSize: 26, lineHeight: 28, letterSpacing: -0.6 }}>everywhere</TText>
          <TText variant="serif" style={{ fontSize: 26, lineHeight: 28, letterSpacing: -0.6 }}>.</TText>
        </View>
      </View>

      {places.length === 0 ? (
        <EmptyPlaces loading={loading} hasActivities={activities.length > 0} />
      ) : (
        <>
          <View style={{ paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', gap: 14 }}>
            <View style={{ flex: 1 }}>
              <Eyebrow>CITIES</Eyebrow>
              <TText variant="monoMedium" style={{ fontSize: 36, lineHeight: 36, letterSpacing: -1, color: c.ink }}>{cities}</TText>
            </View>
            <View style={{ flex: 1 }}>
              <Eyebrow>COUNTRIES</Eyebrow>
              <TText variant="monoMedium" style={{ fontSize: 24, lineHeight: 24, color: c.ink }}>{countries}</TText>
            </View>
            <View style={{ flex: 1 }}>
              <Eyebrow>{distUnit(units).toUpperCase()}</Eyebrow>
              <TText variant="monoMedium" style={{ fontSize: 24, lineHeight: 24, color: c.ink }}>{Math.round(totalKm).toLocaleString()}</TText>
            </View>
          </View>

          <SectionHeader title="By distance" />
          <View style={{ paddingHorizontal: 14 }}>
            <Card padded={false}>
              {[...places].sort((a, b) => b.km - a.km).map((p, i) => (
                <PlaceRow key={`${p.city}-${p.country}`} place={p} index={i + 1} hasBorder={i > 0} />
              ))}
            </Card>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function aggregatePlaces(activities: Activity[]): ComputedPlace[] {
  const map = new Map<string, ComputedPlace>();
  for (const a of activities) {
    const city = a.city?.trim();
    const country = a.country?.trim();
    if (!city) continue;
    const key = `${city}|${country ?? ''}`;
    const existing = map.get(key);
    if (existing) {
      existing.runs += 1;
      existing.km += a.distance;
      if (a.date < existing.first) existing.first = a.date;
    } else {
      map.set(key, { city, country: country ?? '', runs: 1, km: a.distance, first: a.date });
    }
  }
  return [...map.values()];
}

function EmptyPlaces({ loading, hasActivities }: { loading: boolean; hasActivities: boolean }) {
  const c = useColors();
  const message = loading
    ? 'Fetching your runs…'
    : hasActivities
      ? 'Your runs don’t have location info yet.\nStrava activities with GPS will populate this map.'
      : 'No runs yet — connect Strava or Apple Health to start filling your passport.';
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 32 }}>
      <Card style={{ backgroundColor: c.paper2, padding: 24 }}>
        <Eyebrow style={{ color: c.ink3 }}>{loading ? 'LOADING…' : 'EMPTY PASSPORT'}</Eyebrow>
        <TText style={{ fontSize: 14, color: c.ink2, marginTop: 12, lineHeight: 20 }}>{message}</TText>
      </Card>
    </View>
  );
}

function PlaceRow({ place, index, hasBorder }: { place: ComputedPlace; index: number; hasBorder: boolean }) {
  const c = useColors();
  const { units } = useAppState();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 14,
      borderTopWidth: hasBorder ? 1 : 0, borderTopColor: c.line2,
    }}>
      <TText variant="mono" style={{ fontSize: 11, color: c.ink3, width: 18 }}>{String(index).padStart(2, '0')}</TText>
      <View style={{ flex: 1 }}>
        <TText style={{ fontSize: 15, fontWeight: '500', color: c.ink }}>{place.city}</TText>
        <TText style={{ fontSize: 11, color: c.ink3 }}>{place.country || '—'} · since {place.first.slice(0, 7)}</TText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <TText variant="monoMedium" style={{ fontSize: 14, color: c.ink }}>{Math.round(place.km).toLocaleString()}</TText>
          <TText style={{ fontSize: 10, color: c.ink3, marginLeft: 2 }}>{distUnit(units)}</TText>
        </View>
        <TText variant="mono" style={{ fontSize: 10, color: c.ink3 }}>{place.runs} runs</TText>
      </View>
    </View>
  );
}
