import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon } from '../../design/Icon';
import { useColors } from '../../design/theme';
import { Eyebrow, TText } from '../../design/typography';
import { connectStrava, disconnectStrava, getStravaStatus, type StravaStatus } from '../../services/strava';
import { STRAVA_ENABLED } from '../../config/features';
import { useAuth } from '../../state/AuthContext';
import { useHealth } from '../../state/HealthContext';
import type { RootStackParamList } from '../../nav/types';
import { ConnCard } from './conn-card';
import { MaintenanceActions } from './maintenance-actions';
import { SubHeader } from './bits';

export function ConnectionsScreen({ back }: { back: () => void }) {
  const c = useColors();
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { status: healthStatus, syncing, lastSyncAt, lastError: healthLastError, progress, resync, connect: connectHealth } = useHealth();
  const { getIdToken } = useAuth();

  const [stravaStatus, setStravaStatus] = useState<StravaStatus | null>(null);
  const [stravaBusy, setStravaBusy] = useState(false);

  const refreshStravaStatus = useCallback(async () => {
    if (!STRAVA_ENABLED) return;
    const idToken = await getIdToken();
    if (!idToken) return;
    try {
      const next = await getStravaStatus(idToken);
      setStravaStatus(next);
    } catch {
      setStravaStatus({ connected: false });
    }
  }, [getIdToken]);

  useEffect(() => {
    refreshStravaStatus();
  }, [refreshStravaStatus]);

  const stravaConnected = stravaStatus?.connected === true;

  const handleStravaPress = useCallback(async () => {
    if (stravaBusy) return;
    if (stravaConnected) {
      Alert.alert('Disconnect Strava?', 'Already-imported activities stay. Runstamp will stop receiving new runs from Strava.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setStravaBusy(true);
            try {
              const idToken = await getIdToken();
              await disconnectStrava(idToken);
              await refreshStravaStatus();
            } catch (e) {
              Alert.alert('Disconnect failed', e instanceof Error ? e.message : String(e));
            } finally {
              setStravaBusy(false);
            }
          },
        },
      ]);
      return;
    }
    setStravaBusy(true);
    try {
      const idToken = await getIdToken();
      if (!idToken) {
        Alert.alert('Not signed in', 'Sign out and back in to refresh your session.');
        return;
      }
      const result = await connectStrava(idToken);
      if (result.type === 'error') {
        Alert.alert('Couldn’t open Strava', `${result.reason}\n\nIf the in-app browser didn’t open, check that the Strava client_id is set on the backend.`);
      } else if (result.type === 'cancelled') {
        // No-op — user closed the sheet.
      } else {
        // Connected — refresh status.
      }
      await refreshStravaStatus();
    } catch (e) {
      // Most likely the POST /v1/strava/connect itself failed (server down,
      // no Strava credentials, network). Surface the underlying message so
      // we don't silently die.
      Alert.alert('Couldn’t reach Runstamp', e instanceof Error ? e.message : String(e));
    } finally {
      setStravaBusy(false);
    }
  }, [stravaBusy, stravaConnected, getIdToken, refreshStravaStatus]);

  const healthConnected = healthStatus === 'granted';

  const stravaStatusLabel = (() => {
    if (stravaStatus === null) return 'Checking…';
    if (stravaConnected) return 'Connected · canonical';
    return 'Not connected · tap to connect';
  })();

  const stravaSub = (() => {
    if (!stravaConnected) return 'Read-only · we never write to Strava';
    if (stravaStatus && stravaStatus.connected && stravaStatus.connectedAt) {
      const since = new Date(stravaStatus.connectedAt);
      const days = Math.max(1, Math.round((Date.now() - since.getTime()) / 86_400_000));
      return `Connected ${days}d ago · webhook-driven`;
    }
    return 'Webhook-driven';
  })();

  const healthStatusLabel = (() => {
    if (healthStatus === 'unavailable') return 'Unavailable on this device';
    if (healthStatus === 'denied') return 'Access denied · tap to fix';
    if (healthStatus === 'unknown') return 'Not connected · tap to connect';
    if (syncing) {
      if (progress) {
        if (progress.phase === 'listing') return 'Reading Apple Health…';
        if (progress.phase === 'fetching') {
          return `Fetching details · ${progress.current} / ${progress.total}`;
        }
        if (progress.phase === 'uploading') {
          return `Uploading · ${progress.current} / ${progress.total}`;
        }
      }
      return 'Syncing now…';
    }
    if (lastSyncAt) {
      const diffMin = Math.round((Date.now() - lastSyncAt.getTime()) / 60_000);
      return `Connected · last sync ${diffMin}m ago`;
    }
    return 'Connected';
  })();

  const progressFraction = (() => {
    if (!progress || progress.total <= 0) return null;
    if (progress.phase === 'listing') return 0.03;
    return Math.max(0.03, Math.min(progress.current / progress.total, 1));
  })();

  const healthSub = (() => {
    if (!healthConnected) return 'Read-only — tap to connect';
    return STRAVA_ENABLED
      ? 'Read-only · runs deduplicated against Strava'
      : 'Read-only · Apple Watch & iPhone workouts';
  })();

  const handleHealthPress = useCallback(async () => {
    if (syncing) return;
    if (!healthConnected) {
      try {
        const res = await connectHealth();
        if (res) {
          Alert.alert(
            'Apple Health connected',
            `Uploaded ${res.uploaded} workouts${res.skipped > 0 ? ` (${res.skipped} skipped)` : ''}.`,
          );
        }
      } catch (e) {
        Alert.alert(
          'Couldn’t sync Apple Health',
          (e instanceof Error ? e.message : String(e)) +
            '\n\nPermissions are granted but the upload failed. Pull to retry from Home.',
        );
      }
      return;
    }
    try {
      await resync();
    } catch (e) {
      Alert.alert('Re-sync failed', e instanceof Error ? e.message : String(e));
    }
  }, [syncing, healthConnected, connectHealth, resync]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, backgroundColor: c.paper }} contentContainerStyle={{ paddingBottom: 120 }}>
      <SubHeader back={back} title="CONNECTIONS" />
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <TText variant="serif" style={{ fontSize: 28, lineHeight: 30, letterSpacing: -0.6, color: c.ink }}>Where your runs come from.</TText>
      </View>
      <View style={{ paddingHorizontal: 14, paddingTop: 18, gap: 10 }}>
        {STRAVA_ENABLED && (stravaConnected ? (
          // Existing Strava-app-owner accounts keep their working tile until
          // they choose to disconnect — flip the gate below to re-enable for
          // everyone once Strava approves the athlete quota increase.
          <ConnCard
            bg="#fc4c02"
            iconNode={<Icon.strava size={28} color="#fff" />}
            name="Strava"
            status={stravaStatusLabel}
            statusConnected
            sub={stravaSub}
            busy={stravaBusy}
            action={
              <Pressable
                onPress={handleStravaPress}
                disabled={stravaBusy}
                style={({ pressed }) => [{
                  marginTop: 10, paddingTop: 10,
                  borderTopWidth: 1, borderTopColor: c.line2,
                  opacity: pressed || stravaBusy ? 0.5 : 1,
                }]}
              >
                <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>
                  {stravaBusy ? 'WORKING…' : 'DISCONNECT'}
                </TText>
              </Pressable>
            }
          />
        ) : (
          // Strava locked: free-tier API apps are capped at 1 connected
          // athlete. Until quota approval lands, surface a "Coming soon"
          // card instead of a live tap so we don't 403 every user.
          // Re-enable by deleting this branch and the conditional above.
          <ConnCard
            bg={c.paper2}
            iconNode={<Icon.strava size={28} color={c.ink3} />}
            name="Strava"
            status="Coming soon · quota approval pending"
            statusConnected={false}
            sub="Strava caps new developer apps at 1 athlete. We’ve applied for an increase — you’ll be able to connect as soon as Strava approves it."
          />
        ))}
        <ConnCard
          bg={healthConnected ? '#fb466c' : c.paper2}
          iconNode={<Icon.heart size={24} color={healthConnected ? '#fff' : c.ink2} />}
          name="Apple Health"
          status={healthStatusLabel}
          statusConnected={healthConnected}
          sub={healthSub}
          onPress={handleHealthPress}
          busy={syncing}
          action={
            <>
              {progressFraction !== null && (
                <View style={{ marginTop: 12 }}>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: c.line, overflow: 'hidden' }}>
                    <View style={{
                      height: 4, borderRadius: 2,
                      width: `${Math.round(progressFraction * 100)}%`,
                      backgroundColor: c.accent,
                    }} />
                  </View>
                </View>
              )}
              {/* Persistent "last sync failed" line. Stays until the next
                  successful sync clears HealthContext.lastError. Without
                  this, the only signal of a failure was the one-shot Alert
                  from pull-to-refresh — easy to dismiss and forget. */}
              {healthLastError && (
                <View style={{
                  marginTop: 10, padding: 10, borderRadius: 8,
                  backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line,
                }}>
                  <Eyebrow style={{ color: '#c44a1e', fontSize: 9 }}>LAST SYNC FAILED</Eyebrow>
                  <TText style={{ fontSize: 11, color: c.ink2, marginTop: 3, lineHeight: 14 }}>
                    {healthLastError}
                  </TText>
                </View>
              )}
              {healthConnected && (
                <View style={{
                  marginTop: 10, paddingTop: 10,
                  borderTopWidth: 1, borderTopColor: c.line2,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                }}>
                  <Pressable
                    onPress={handleHealthPress}
                    disabled={syncing}
                    style={({ pressed }) => [{ opacity: pressed || syncing ? 0.5 : 1 }]}
                  >
                    <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>
                      {syncing ? 'SYNCING…' : 'RE-SYNC NOW'}
                    </TText>
                  </Pressable>
                  <Pressable
                    onPress={() => rootNav.navigate('HealthRuns')}
                    style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                  >
                    <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>
                      BROWSE RUNS
                    </TText>
                    <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>
                      →
                    </TText>
                  </Pressable>
                </View>
              )}
            </>
          }
        />
        <View style={{ padding: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: c.line, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: c.paper2, alignItems: 'center', justifyContent: 'center' }}>
            <Icon.plus size={22} color={c.ink2} />
          </View>
          <View style={{ flex: 1 }}>
            <TText style={{ fontSize: 14, fontWeight: '500', color: c.ink }}>Garmin Connect</TText>
            <TText style={{ fontSize: 11, color: c.ink3 }}>Coming in M8 · roadmap</TText>
          </View>
        </View>
        <MaintenanceActions getIdToken={getIdToken} />
      </View>
    </ScrollView>
  );
}
