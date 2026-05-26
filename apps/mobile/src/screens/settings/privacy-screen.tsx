import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { Icon } from '../../design/Icon';
import { useColors } from '../../design/theme';
import { Eyebrow, TText } from '../../design/typography';
import { useActivities } from '../../state/useActivities';
import { usePrivacyZones } from '../../state/usePrivacyZones';
import { AddZoneModal } from './add-zone-modal';
import { DeleteAccountSection } from './delete-account-section';
import { SubHeader } from './bits';

export function PrivacyScreen({ back }: { back: () => void }) {
  const c = useColors();
  const { zones, loading, remove } = usePrivacyZones();
  const { activities } = useActivities();
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleDelete = useCallback(
    (zoneId: string) => {
      Alert.alert(
        'Remove zone?',
        'Routes that started here will start showing the full polyline again.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await remove(zoneId);
              } catch (e) {
                Alert.alert('Could not remove', e instanceof Error ? e.message : String(e));
              }
            },
          },
        ],
      );
    },
    [remove],
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, backgroundColor: c.paper }} contentContainerStyle={{ paddingBottom: 120 }}>
      <SubHeader back={back} title="PRIVACY" />
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <TText variant="serif" style={{ fontSize: 28, lineHeight: 30, letterSpacing: -0.6, color: c.ink }}>Don’t show the world where you start.</TText>
        <TText style={{ fontSize: 13, color: c.ink3, marginTop: 8, lineHeight: 19 }}>
          Add a privacy zone around a sensitive location (home, work, gym). Runstamp will trim
          the route polyline inside that radius on every map and share card. Default radius is
          200 m, matching Strava.
        </TText>
      </View>

      <View style={{ paddingHorizontal: 14, paddingTop: 18 }}>
        <Eyebrow style={{ color: c.ink3, marginBottom: 8 }}>YOUR ZONES</Eyebrow>
        {loading && zones.length === 0 && (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <ActivityIndicator color={c.ink3} />
          </View>
        )}
        {!loading && zones.length === 0 && (
          <View style={{ padding: 16, borderRadius: 12, backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line, borderStyle: 'dashed' }}>
            <TText style={{ fontSize: 13, color: c.ink2 }}>No zones yet.</TText>
            <TText style={{ fontSize: 11, color: c.ink3, marginTop: 4, lineHeight: 16 }}>
              Tap “Add a zone” below and pick a recent run that started near a place you’d rather
              not pin on a public share card.
            </TText>
          </View>
        )}
        {zones.map((z) => (
          <View
            key={z.id}
            style={{
              padding: 14, marginBottom: 8, borderRadius: 12,
              backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line,
              flexDirection: 'row', alignItems: 'center', gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <TText variant="monoMedium" style={{ fontSize: 14, color: c.ink, letterSpacing: -0.2 }}>
                  {z.name?.trim() || `Zone ${zones.indexOf(z) + 1}`}
                </TText>
                <TText variant="mono" style={{ fontSize: 10, color: c.ink3 }}>
                  {z.radiusM} m
                </TText>
              </View>
              <TText variant="mono" style={{ fontSize: 10, color: c.ink3, marginTop: 4 }}>
                {z.lat.toFixed(4)}, {z.lng.toFixed(4)}
              </TText>
            </View>
            <Pressable
              onPress={() => handleDelete(z.id)}
              hitSlop={8}
              style={({ pressed }) => ({
                padding: 8, borderRadius: 8,
                opacity: pressed ? 0.5 : 1,
              })}
            >
              <Icon.trash size={16} color="#c44a1e" />
            </Pressable>
          </View>
        ))}

        <Pressable
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [{
            marginTop: zones.length === 0 ? 12 : 4,
            padding: 14, borderRadius: 12,
            backgroundColor: c.ink,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: pressed ? 0.85 : 1,
          }]}
        >
          <Icon.plus size={16} color={c.paper} />
          <TText style={{ fontSize: 13, color: c.paper, fontWeight: '500' }}>Add a zone</TText>
        </Pressable>

        <TText style={{ fontSize: 11, color: c.ink3, marginTop: 14, lineHeight: 16 }}>
          The raw GPS data still lives on your account so you can re-render or export later. The
          mask only affects what we draw — share cards, route maps, the route-map sticker.
        </TText>
      </View>

      <AddZoneModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        recentRuns={activities}
      />

      <DeleteAccountSection />
    </ScrollView>
  );
}
