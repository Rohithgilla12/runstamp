import React from 'react';
import { Pressable, View } from 'react-native';
import type { Activity } from '../../data/models';
import { fmtDist, fmtTime } from '../../lib/format';
import { useColors } from '../../design/theme';
import { Eyebrow, TText } from '../../design/typography';
import { useAppState } from '../../state/AppState';

// Short tail. One tap per row → Activity screen. Per-row share button is
// gone; share now lives inside the activity detail. Every row has one
// purpose; the list gets to breathe.
export function RecentRuns({
  activities,
  onOpenActivity,
  onOpenAllActivities,
}: {
  activities: Activity[];
  onOpenActivity: (id: string) => void;
  onOpenAllActivities: () => void;
}) {
  const c = useColors();
  const { units } = useAppState();
  const rows = activities.slice(0, 5);
  return (
    <>
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Eyebrow style={{ color: c.ink3 }}>RECENT RUNS</Eyebrow>
        {activities.length > 5 && (
          <Pressable onPress={onOpenAllActivities} hitSlop={6} accessibilityLabel="See all runs">
            <TText variant="mono" style={{ fontSize: 11, color: c.ink2 }}>SEE ALL →</TText>
          </Pressable>
        )}
      </View>
      <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
        {rows.map((a, idx) => (
          <Pressable
            key={a.id}
            onPress={() => onOpenActivity(a.id)}
            accessibilityLabel={`Open ${a.title}`}
            style={({ pressed }) => [{
              paddingVertical: 12,
              borderTopWidth: idx === 0 ? 0 : 1,
              borderTopColor: c.line2,
              flexDirection: 'row', alignItems: 'baseline', gap: 12,
              opacity: pressed ? 0.7 : 1,
            }]}
          >
            <View style={{ flex: 1 }}>
              <TText style={{ fontSize: 14, color: c.ink }} numberOfLines={1}>{a.title}</TText>
              <TText variant="mono" style={{ fontSize: 10, color: c.ink3, marginTop: 2 }}>
                {a.day.toUpperCase()} · {a.time}
              </TText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <TText variant="monoMedium" style={{ fontSize: 15, color: c.ink }}>{fmtDist(a.distance, units)}</TText>
              <TText variant="mono" style={{ fontSize: 10, color: c.ink3 }}>{fmtTime(a.seconds)}</TText>
            </View>
          </Pressable>
        ))}
      </View>
    </>
  );
}
