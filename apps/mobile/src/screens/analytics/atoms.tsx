import React from 'react';
import { Pressable, View } from 'react-native';
import { fmtDist, fmtTime, type Activity } from '../../data/sample';
import { useColors } from '../../design/theme';
import { Eyebrow, TText } from '../../design/typography';
import { useAppState } from '../../state/AppState';
import { formatRowDate, type Scope } from './period';

export function Stat({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  const c = useColors();
  return (
    <View style={{ flex: 1 }}>
      <Eyebrow style={{ color: dark ? c.onInk3 : c.ink3 }}>{label}</Eyebrow>
      <TText variant="monoMedium" style={{ fontSize: 18, color: dark ? c.paper : c.ink }}>{value}</TText>
    </View>
  );
}

export function StatTile({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line, borderRadius: 10, padding: 12 }}>
      <Eyebrow style={{ color: c.ink3 }}>{label}</Eyebrow>
      <TText variant="monoMedium" style={{ fontSize: 22, color: c.ink, marginTop: 4 }}>{value}</TText>
    </View>
  );
}

export function StepperButton({ onPress, label, accessibilityLabel }: { onPress: () => void; label: string; accessibilityLabel: string }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
        backgroundColor: pressed ? c.paper3 : c.paper2,
        borderWidth: 1, borderColor: c.line,
      })}
    >
      <TText style={{ fontSize: 20, lineHeight: 20, color: c.ink, marginTop: -2 }}>{label}</TText>
    </Pressable>
  );
}

export function Row({ a }: { a: Activity }) {
  const c = useColors();
  const { units } = useAppState();
  return (
    <View style={{
      backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line,
      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
      flexDirection: 'row', alignItems: 'center', gap: 10,
    }}>
      <View style={{ flex: 1 }}>
        <TText style={{ fontSize: 13, fontWeight: '500', color: c.ink }} numberOfLines={1}>{a.title}</TText>
        <TText style={{ fontSize: 10, color: c.ink3 }}>{formatRowDate(new Date(a.date))}</TText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <TText variant="monoMedium" style={{ fontSize: 14, color: c.ink }}>{fmtDist(a.distance, units)}</TText>
        <TText variant="mono" style={{ fontSize: 9, color: c.ink3 }}>{fmtTime(a.seconds)}</TText>
      </View>
    </View>
  );
}

export function NoneInScope({ scope }: { scope: Scope }) {
  const c = useColors();
  return (
    <View style={{ paddingVertical: 18, alignItems: 'center' }}>
      <TText style={{ fontSize: 12, color: c.ink3 }}>No runs in this {scope}.</TText>
    </View>
  );
}
