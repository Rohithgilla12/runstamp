import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { distUnit, type Activity } from '../data/sample';
import { useAppState } from '../state/AppState';
import { useActivities } from '../state/useActivities';
import { useAuth } from '../state/AuthContext';
import { backfillPlaces } from '../services/places';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { Card } from '../design/atoms';
import { Icon } from '../design/Icon';
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
  const { activities, loading, refresh } = useActivities();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  }, [refresh]);

  const places = useMemo(() => aggregatePlaces(activities), [activities]);
  const cities = places.length;
  const countries = new Set(places.map((p) => p.country)).size;
  const totalKm = places.reduce((a, p) => a + p.km, 0);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: c.paper }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.ink2} />}
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
        <EmptyPlaces loading={loading} hasActivities={activities.length > 0} onAfterBackfill={refresh} />
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

function EmptyPlaces({
  loading,
  hasActivities,
  onAfterBackfill,
}: {
  loading: boolean;
  hasActivities: boolean;
  onAfterBackfill: () => Promise<void>;
}) {
  const c = useColors();
  const { getIdToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const runBackfill = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const idToken = await getIdToken();
      const res = await backfillPlaces(idToken);
      const awarded = (res.awardedStamps ?? []).length;
      const parts = [`Geocoded ${res.updated} runs`];
      if (awarded > 0) parts.push(`+${awarded} stamps`);
      setStatus(parts.join(' · '));
      await onAfterBackfill();
    } catch (e) {
      setStatus(`Failed: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setBusy(false);
    }
  }, [busy, getIdToken, onAfterBackfill]);

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 32 }}>
      <Card style={{ backgroundColor: c.paper2, padding: 24 }}>
        <Eyebrow style={{ color: c.ink3 }}>
          {loading ? 'LOADING…' : hasActivities ? 'NEEDS GEOCODING' : 'EMPTY PASSPORT'}
        </Eyebrow>
        {!hasActivities ? (
          <TText style={{ fontSize: 14, color: c.ink2, marginTop: 12, lineHeight: 20 }}>
            No runs yet — connect Strava or Apple Health to start filling your passport.
          </TText>
        ) : (
          <>
            <TText style={{ fontSize: 14, color: c.ink2, marginTop: 12, lineHeight: 20 }}>
              Your runs are in, but they don’t have city names yet. Tap to look up
              each start point — Nominatim is rate-limited so we do up to 50 at a time.
            </TText>
            <Pressable
              onPress={runBackfill}
              disabled={busy}
              style={({ pressed }) => [{
                marginTop: 14, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
                backgroundColor: c.ink, alignSelf: 'flex-start',
                flexDirection: 'row', alignItems: 'center', gap: 8,
                opacity: pressed || busy ? 0.7 : 1,
              }]}
            >
              <Icon.pin size={14} color={c.paper} />
              <TText style={{ color: c.paper, fontSize: 13, fontWeight: '500' }}>
                {busy ? 'Looking up…' : 'Geocode my runs'}
              </TText>
            </Pressable>
            {status && (
              <TText style={{ fontSize: 11, color: c.ink3, marginTop: 8 }}>{status}</TText>
            )}
          </>
        )}
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
