import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, View } from 'react-native';
import { fmtDist, type Activity } from '../../data/sample';
import { Icon } from '../../design/Icon';
import { useColors } from '../../design/theme';
import { TText } from '../../design/typography';
import { useAppState } from '../../state/AppState';
import { useAuth } from '../../state/AuthContext';
import { usePrivacyZones } from '../../state/usePrivacyZones';

// Minimal MVP picker. Lists recent GPS-tracked activities; tapping one
// fetches its streams, takes the first lat/lng, and posts a new zone at
// 200m default radius. No map preview, no current-location flow, no radius
// slider in v1 — small, focused, ships now. Power users can tap "Edit" on
// a zone later (future work).
export function AddZoneModal({
  visible,
  onClose,
  recentRuns,
}: {
  visible: boolean;
  onClose: () => void;
  recentRuns: Activity[];
}) {
  const c = useColors();
  const { units } = useAppState();
  const { add } = usePrivacyZones();
  const { getIdToken } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);

  // Only show runs that actually carry a GPS start. Cap at 20 — picker, not list.
  const candidates = useMemo(() => {
    return recentRuns
      .filter((r) => typeof r.startLat === 'number' && typeof r.startLon === 'number')
      .slice(0, 20);
  }, [recentRuns]);

  const handlePick = useCallback(
    async (run: Activity) => {
      if (busy) return;
      setBusy(run.id);
      try {
        // Use the activity's denormalised start point. It's the first GPS
        // sample from ingest, identical to what the route renders as
        // "start" — exactly the spot we want to mask.
        if (typeof run.startLat !== 'number' || typeof run.startLon !== 'number') {
          throw new Error('That run has no GPS start point.');
        }
        await add({ name: undefined, lat: run.startLat, lng: run.startLon, radiusM: 200 });
        onClose();
      } catch (e) {
        Alert.alert('Could not add zone', e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [busy, add, onClose],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: c.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 36, maxHeight: '85%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <TText variant="serif" style={{ fontSize: 22, color: c.ink, letterSpacing: -0.4 }}>Pick a start point</TText>
            <Pressable onPress={onClose} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' })}>
              <TText style={{ fontSize: 22, color: c.ink2, lineHeight: 22 }}>×</TText>
            </Pressable>
          </View>
          <TText style={{ fontSize: 12, color: c.ink3, marginBottom: 14, lineHeight: 17 }}>
            We’ll add a 200 m zone centred on this run’s start. Every future map will mask
            anything inside it.
          </TText>
          {candidates.length === 0 ? (
            <View style={{ padding: 16, borderRadius: 10, backgroundColor: c.paper2 }}>
              <TText style={{ fontSize: 12, color: c.ink2 }}>
                No GPS-tracked runs to pick from yet. Once you import a run with route data, it’ll
                show here.
              </TText>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              {candidates.map((run) => {
                const isBusy = busy === run.id;
                const distLabel = fmtDist(run.distance, units);
                return (
                  <Pressable
                    key={run.id}
                    onPress={() => handlePick(run)}
                    disabled={!!busy}
                    style={({ pressed }) => [{
                      paddingVertical: 12, paddingHorizontal: 12, marginBottom: 6,
                      borderRadius: 10, backgroundColor: c.paper2,
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      opacity: pressed || isBusy ? 0.65 : 1,
                    }]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                        <TText variant="monoMedium" style={{ fontSize: 14, color: c.ink }}>{distLabel}</TText>
                        <TText style={{ fontSize: 11, color: c.ink3 }}>· {run.date}</TText>
                      </View>
                      <TText variant="mono" style={{ fontSize: 10, color: c.ink3, marginTop: 3 }}>
                        {run.startLat?.toFixed(4)}, {run.startLon?.toFixed(4)}
                      </TText>
                    </View>
                    {isBusy ? <ActivityIndicator color={c.ink3} /> : <Icon.chevR size={14} color={c.ink3} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
