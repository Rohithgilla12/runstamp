import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, Pressable, RefreshControl, ScrollView, View } from 'react-native';
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
import { WorldMap, type MapCity } from '../design/WorldMap';
import { countContinents } from '../design/worldGeometry';
import { PlacesShareModal } from './PlacesShareModal';
import type { TabProps } from '../nav/types';

interface ComputedPlace {
  city: string;
  country: string;
  runs: number;
  km: number;
  first: string;
  lat?: number;
  lon?: number;
}

export function PlacesScreen(_props: TabProps<'Places'>) {
  const c = useColors();
  const { units } = useAppState();
  const insets = useSafeAreaInsets();
  const { activities, loading, refresh } = useActivities();
  const [refreshing, setRefreshing] = useState(false);
  const [sharing, setSharing] = useState(false);
  // 'all' = lifetime, year number = constrained to that year.
  const [scope, setScope] = useState<'all' | number>('all');
  const currentYear = new Date().getFullYear();
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  }, [refresh]);

  const scopedActivities = useMemo(() => {
    if (scope === 'all') return activities;
    const prefix = `${scope}-`;
    return activities.filter((a) => a.date.startsWith(prefix));
  }, [activities, scope]);

  const places = useMemo(() => aggregatePlaces(scopedActivities), [scopedActivities]);
  const cities = places.length;
  const countries = new Set(places.map((p) => p.country).filter(Boolean)).size;
  const continents = useMemo(
    () => countContinents(places.map((p) => p.country).filter(Boolean) as string[]),
    [places],
  );
  const totalKm = places.reduce((a, p) => a + p.km, 0);
  const ungeocoded = useMemo(
    () => activities.filter((a) => (a.route?.length ?? 0) > 0 && !a.city?.trim()).length,
    [activities],
  );
  // Years a user has activities in — at most 6 most recent for the picker.
  const availableYears = useMemo(() => {
    const ys = new Set<number>();
    for (const a of activities) {
      const y = Number(a.date.slice(0, 4));
      if (y >= 1900 && y <= 9999) ys.add(y);
    }
    return [...ys].sort((a, b) => b - a).slice(0, 6);
  }, [activities]);
  const screenW = Dimensions.get('window').width;
  const mapW = screenW - 28;
  const mapCities: MapCity[] = useMemo(
    () => places.map((p) => ({ city: p.city, country: p.country, runs: p.runs, km: p.km, first: p.first, lat: p.lat, lon: p.lon })),
    [places],
  );

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

      {availableYears.length > 1 && (
        <View style={{ paddingTop: 14 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14, gap: 6 }}
          >
            <ScopePill label="Lifetime" active={scope === 'all'} onPress={() => setScope('all')} />
            {availableYears.map((y) => (
              <ScopePill
                key={y}
                label={String(y)}
                active={scope === y}
                onPress={() => setScope(y)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {places.length === 0 ? (
        <EmptyPlaces loading={loading} hasActivities={activities.length > 0} onAfterBackfill={refresh} />
      ) : (
        <>
          <View style={{ paddingHorizontal: 14, paddingTop: 18 }}>
            <Card padded={false} style={{ overflow: 'hidden', padding: 0 }}>
              <WorldMap cities={mapCities} width={mapW - 2} />
              <View style={{ padding: 14, gap: 10 }}>
                <View style={{ flexDirection: 'row', gap: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Eyebrow style={{ color: c.ink3 }}>STAMPS</Eyebrow>
                    <TText variant="monoMedium" style={{ fontSize: 28, lineHeight: 34, letterSpacing: -0.8, color: c.ink }}>{cities}</TText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Eyebrow style={{ color: c.ink3 }}>COUNTRIES</Eyebrow>
                    <TText variant="monoMedium" style={{ fontSize: 28, lineHeight: 34, letterSpacing: -0.8, color: c.ink }}>{countries}</TText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Eyebrow style={{ color: c.ink3 }}>CONTINENTS</Eyebrow>
                    <TText variant="monoMedium" style={{ fontSize: 28, lineHeight: 34, letterSpacing: -0.8, color: c.ink }}>{continents}</TText>
                  </View>
                </View>
                <Pressable
                  onPress={() => setSharing(true)}
                  style={({ pressed }) => ({
                    marginTop: 4, paddingVertical: 12, borderRadius: 12,
                    backgroundColor: c.ink, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Icon.share size={14} color={c.paper} />
                  <TText style={{ fontSize: 13, color: c.paper, fontWeight: '500' }}>
                    Share My {new Date().getFullYear()} Runstamps
                  </TText>
                </Pressable>
              </View>
            </Card>
          </View>

          {ungeocoded > 0 && (
            <View style={{ paddingHorizontal: 14, marginTop: 16 }}>
              <BackfillBanner count={ungeocoded} onAfterBackfill={refresh} />
            </View>
          )}

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
      <PlacesShareModal
        visible={sharing}
        cities={mapCities}
        stats={{ cities, countries, continents, totalKm }}
        onClose={() => setSharing(false)}
      />
    </ScrollView>
  );
}

function ScopePill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14,
        backgroundColor: active ? c.ink : c.paper2,
        borderWidth: 1, borderColor: active ? c.ink : c.line,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <TText style={{ fontSize: 13, fontWeight: '500', color: active ? c.paper : c.ink }}>{label}</TText>
    </Pressable>
  );
}

function aggregatePlaces(activities: Activity[]): ComputedPlace[] {
  const map = new Map<string, ComputedPlace & { latSum: number; lonSum: number; coordCount: number }>();
  for (const a of activities) {
    const city = a.city?.trim();
    const country = a.country?.trim();
    if (!city) continue;
    const key = `${city}|${country ?? ''}`;
    const hasCoords = typeof a.startLat === 'number' && typeof a.startLon === 'number';
    const existing = map.get(key);
    if (existing) {
      existing.runs += 1;
      existing.km += a.distance;
      if (a.date < existing.first) existing.first = a.date;
      if (hasCoords) {
        existing.latSum += a.startLat!;
        existing.lonSum += a.startLon!;
        existing.coordCount += 1;
      }
    } else {
      map.set(key, {
        city,
        country: country ?? '',
        runs: 1,
        km: a.distance,
        first: a.date,
        latSum: hasCoords ? a.startLat! : 0,
        lonSum: hasCoords ? a.startLon! : 0,
        coordCount: hasCoords ? 1 : 0,
      });
    }
  }
  return [...map.values()].map((p) => ({
    city: p.city,
    country: p.country,
    runs: p.runs,
    km: p.km,
    first: p.first,
    lat: p.coordCount > 0 ? p.latSum / p.coordCount : undefined,
    lon: p.coordCount > 0 ? p.lonSum / p.coordCount : undefined,
  }));
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

function BackfillBanner({
  count,
  onAfterBackfill,
}: {
  count: number;
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
    <Card style={{ backgroundColor: c.paper2, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <TText style={{ fontSize: 13, color: c.ink2, lineHeight: 18 }}>
          {count} {count === 1 ? 'run' : 'runs'} without a city — tap to look up (up to 50 per tap).
        </TText>
        {status && (
          <TText style={{ fontSize: 11, color: c.ink3, marginTop: 4 }}>{status}</TText>
        )}
      </View>
      <Pressable
        onPress={runBackfill}
        disabled={busy}
        style={({ pressed }) => [{
          paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
          backgroundColor: c.ink, flexDirection: 'row', alignItems: 'center', gap: 6,
          opacity: pressed || busy ? 0.7 : 1,
        }]}
      >
        <Icon.pin size={12} color={c.paper} />
        <TText style={{ color: c.paper, fontSize: 12, fontWeight: '500' }}>
          {busy ? '…' : 'Look up'}
        </TText>
      </Pressable>
    </Card>
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
