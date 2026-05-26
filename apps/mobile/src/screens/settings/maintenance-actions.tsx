import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useColors } from '../../design/theme';
import { Eyebrow, TText } from '../../design/typography';
import { reevaluateStamps } from '../../services/stamps';
import { backfillPlaces } from '../../services/places';

export function MaintenanceActions({ getIdToken }: { getIdToken: (force?: boolean) => Promise<string | null> }) {
  const c = useColors();
  const [busy, setBusy] = useState<null | 'stamps' | 'places'>(null);
  const [status, setStatus] = useState<string | null>(null);

  const runStamps = useCallback(async () => {
    if (busy) return;
    setBusy('stamps');
    setStatus(null);
    try {
      const idToken = await getIdToken();
      const res = await reevaluateStamps(idToken);
      const count = (res.awarded ?? []).length;
      setStatus(count > 0 ? `Awarded ${count} new stamps.` : 'No new stamps.');
    } catch (e) {
      setStatus(`Failed: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setBusy(null);
    }
  }, [busy, getIdToken]);

  const runPlaces = useCallback(async () => {
    if (busy) return;
    setBusy('places');
    setStatus(null);
    try {
      const idToken = await getIdToken();
      const res = await backfillPlaces(idToken);
      const awardedCount = (res.awardedStamps ?? []).length;
      const parts = [`Geocoded ${res.updated} runs`];
      if (awardedCount > 0) parts.push(`+${awardedCount} new stamps`);
      setStatus(parts.join(' · '));
    } catch (e) {
      setStatus(`Failed: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setBusy(null);
    }
  }, [busy, getIdToken]);

  return (
    <View style={{ marginTop: 8, padding: 14, borderWidth: 1, borderColor: c.line, borderRadius: 14, gap: 10, backgroundColor: c.paper2 }}>
      <Eyebrow style={{ color: c.ink3 }}>MAINTENANCE</Eyebrow>
      <TText style={{ fontSize: 12, color: c.ink3, lineHeight: 16 }}>
        Imported activities from before stamps + places launched? Run these once.
        Nominatim is rate-limited to 1/sec — places backfill caps at 50 runs per tap.
      </TText>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={runStamps}
          disabled={!!busy}
          style={({ pressed }) => [{
            flex: 1, paddingVertical: 10, borderRadius: 10,
            backgroundColor: busy === 'stamps' ? c.paper3 : c.ink,
            alignItems: 'center', opacity: pressed || busy ? 0.85 : 1,
          }]}
        >
          <TText variant="mono" style={{ fontSize: 11, color: c.paper }}>
            {busy === 'stamps' ? 'WORKING…' : 'RE-EVAL STAMPS'}
          </TText>
        </Pressable>
        <Pressable
          onPress={runPlaces}
          disabled={!!busy}
          style={({ pressed }) => [{
            flex: 1, paddingVertical: 10, borderRadius: 10,
            backgroundColor: busy === 'places' ? c.paper3 : c.ink,
            alignItems: 'center', opacity: pressed || busy ? 0.85 : 1,
          }]}
        >
          <TText variant="mono" style={{ fontSize: 11, color: c.paper }}>
            {busy === 'places' ? 'WORKING…' : 'GEOCODE PLACES'}
          </TText>
        </Pressable>
      </View>
      {status && (
        <TText style={{ fontSize: 11, color: c.ink2, marginTop: 2 }}>{status}</TText>
      )}
    </View>
  );
}
