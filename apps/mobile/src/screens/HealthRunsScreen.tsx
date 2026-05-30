// HealthRunsScreen — power-user screen reached from Settings → Connections →
// Apple Health → BROWSE RUNS, or deep-linked from the "missing runs" banner
// on Home. Lists every running workout HealthKit has on this device, flagged
// as imported or not, with a one-tap retry for the not-imported ones. Useful
// when the auto-sync misses a workout (Apple Watch sync lag, permission
// glitch, a known-broken stretch like the cold-launch trap a8b1f63 fixed).

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fmtDist } from '../lib/format';
import { useAuth } from '../state/AuthContext';
import { useAppState } from '../state/AppState';
import { useActivities } from '../state/useActivities';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { Icon } from '../design/Icon';
import { getRunningWorkoutsSince, type HKRunWorkout } from '../services/healthkit';
import { importHealthKitWorkout } from '../services/healthSync';
import type { RootStackProps } from '../nav/types';

export function HealthRunsScreen({ navigation }: RootStackProps<'HealthRuns'>) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { getIdToken } = useAuth();
  const { units } = useAppState();
  const { activities, refresh: refreshActivities } = useActivities();
  const [hkRuns, setHkRuns] = useState<HKRunWorkout[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [importing, setImporting] = useState<Record<string, 'idle' | 'busy' | 'failed'>>({});

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const runs = await getRunningWorkoutsSince(new Date(0));
      setHkRuns(runs);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
      setHkRuns([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Build a Set of HK UUIDs already on the server. Includes duplicates that
  // got flipped (Strava-canonical) — we don't show those rows, but we still
  // want them flagged as imported so the user doesn't pointlessly re-import.
  const importedUuids = useMemo(() => {
    const s = new Set<string>();
    for (const a of activities) {
      if (a.source === 'apple_health' && a.externalId) s.add(a.externalId);
    }
    return s;
  }, [activities]);

  const handleImport = useCallback(
    async (uuid: string) => {
      if (importing[uuid] === 'busy') return;
      setImporting((prev) => ({ ...prev, [uuid]: 'busy' }));
      try {
        const idToken = await getIdToken();
        const res = await importHealthKitWorkout(idToken, uuid);
        if (res.uploaded === 0 && res.duplicates === 0) {
          setImporting((prev) => ({ ...prev, [uuid]: 'failed' }));
          Alert.alert('Import skipped', 'The backend received the workout but skipped it (bad distance or parse error).');
          return;
        }
        await refreshActivities();
        setImporting((prev) => {
          const next = { ...prev };
          delete next[uuid];
          return next;
        });
      } catch (e) {
        setImporting((prev) => ({ ...prev, [uuid]: 'failed' }));
        Alert.alert('Import failed', e instanceof Error ? e.message : String(e));
      }
    },
    [importing, getIdToken, refreshActivities],
  );

  const totalCount = hkRuns?.length ?? 0;
  const importedCount = (hkRuns ?? []).filter((w) => importedUuids.has(w.uuid)).length;
  const missingCount = totalCount - importedCount;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: c.paper }}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <View style={{ paddingHorizontal: 14, paddingTop: insets.top + 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon.back size={18} color={c.ink} />
        </Pressable>
        <Eyebrow>HEALTHKIT RUNS</Eyebrow>
        <View style={{ width: 36 }} />
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <TText variant="serif" style={{ fontSize: 28, lineHeight: 30, letterSpacing: -0.6, color: c.ink }}>
          What HealthKit has.
        </TText>
        <TText style={{ fontSize: 12, color: c.ink3, marginTop: 6, lineHeight: 17 }}>
          Every running workout on this device. Tap{' '}
          <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>IMPORT</TText>{' '}
          to add anything the auto-sync missed.
        </TText>
      </View>

      <View style={{ paddingHorizontal: 14, paddingTop: 16 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Stat label="TOTAL" value={hkRuns == null ? '—' : String(totalCount)} c={c} />
          <Stat label="IMPORTED" value={hkRuns == null ? '—' : String(importedCount)} c={c} />
          <Stat
            label="MISSING"
            value={hkRuns == null ? '—' : String(missingCount)}
            accent={missingCount > 0}
            c={c}
          />
        </View>
      </View>

      {loadError && (
        <View style={{ marginHorizontal: 14, marginTop: 14, padding: 12, borderRadius: 10, backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line }}>
          <Eyebrow style={{ color: '#c44' }}>HEALTHKIT ERROR</Eyebrow>
          <TText style={{ fontSize: 12, color: c.ink2, marginTop: 4 }}>{loadError}</TText>
        </View>
      )}

      {hkRuns == null && !loadError && (
        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
          <ActivityIndicator color={c.ink3} />
        </View>
      )}

      {hkRuns != null && hkRuns.length === 0 && !loadError && (
        <View style={{ marginHorizontal: 14, marginTop: 14, padding: 16, borderRadius: 10, backgroundColor: c.paper2 }}>
          <TText style={{ fontSize: 13, color: c.ink2 }}>
            HealthKit returned 0 running workouts. Open the Apple Health app to confirm your runs are recorded there.
          </TText>
        </View>
      )}

      {hkRuns != null && hkRuns.length > 0 && (
        <View style={{ paddingHorizontal: 14, paddingTop: 14, gap: 8 }}>
          {hkRuns.map((w) => {
            const isImported = importedUuids.has(w.uuid);
            const state = importing[w.uuid] ?? 'idle';
            return (
              <HKRunRow
                key={w.uuid}
                workout={w}
                imported={isImported}
                state={state}
                units={units}
                onImport={() => handleImport(w.uuid)}
                c={c}
              />
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function Stat({ label, value, accent, c }: { label: string; value: string; accent?: boolean; c: ReturnType<typeof useColors> }) {
  return (
    <View style={{
      flex: 1, padding: 12, borderRadius: 12, backgroundColor: c.paper2,
      borderWidth: accent ? 1 : 0, borderColor: accent ? c.accent : 'transparent',
    }}>
      <Eyebrow style={{ fontSize: 9, color: accent ? c.accent : c.ink3 }}>{label}</Eyebrow>
      <TText variant="monoMedium" style={{ fontSize: 20, color: accent ? c.accent : c.ink, marginTop: 4 }}>
        {value}
      </TText>
    </View>
  );
}

function HKRunRow({
  workout,
  imported,
  state,
  units,
  onImport,
  c,
}: {
  workout: HKRunWorkout;
  imported: boolean;
  state: 'idle' | 'busy' | 'failed';
  units: 'km' | 'mi';
  onImport: () => void;
  c: ReturnType<typeof useColors>;
}) {
  const distKm = workout.distanceMeters / 1000;
  const distLabel = fmtDist(distKm, units);
  const durMin = Math.round(workout.duration / 60);
  const durLabel = durMin >= 60
    ? `${Math.floor(durMin / 60)}h${String(durMin % 60).padStart(2, '0')}`
    : `${durMin}m`;
  const dateLabel = workout.startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const timeLabel = workout.startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: 14, borderRadius: 12, backgroundColor: c.paper2,
    }}>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
          <TText variant="monoMedium" style={{ fontSize: 17, color: c.ink }}>{distLabel}</TText>
          <TText style={{ fontSize: 13, color: c.ink2 }}>· {durLabel}</TText>
        </View>
        <TText style={{ fontSize: 11, color: c.ink3 }}>{dateLabel} · {timeLabel}</TText>
      </View>
      {imported ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.moss }} />
          <Eyebrow style={{ fontSize: 9, color: c.moss }}>IMPORTED</Eyebrow>
        </View>
      ) : (
        <Pressable
          onPress={onImport}
          disabled={state === 'busy'}
          style={({ pressed }) => [{
            paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
            backgroundColor: state === 'failed' ? c.paper3 : c.ink,
            opacity: pressed || state === 'busy' ? 0.7 : 1,
            minWidth: 86, alignItems: 'center',
          }]}
        >
          {state === 'busy' ? (
            <ActivityIndicator size="small" color={c.paper} />
          ) : (
            <TText variant="mono" style={{ fontSize: 11, color: state === 'failed' ? c.ink2 : c.paper }}>
              {state === 'failed' ? 'RETRY' : 'IMPORT'}
            </TText>
          )}
        </Pressable>
      )}
    </View>
  );
}
