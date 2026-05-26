import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Card } from '../../design/atoms';
import { useColors } from '../../design/theme';
import { Eyebrow, TText } from '../../design/typography';

export function ConnCard({
  bg,
  iconNode,
  name,
  status,
  statusConnected = true,
  sub,
  counts,
  action,
  onPress,
  busy,
}: {
  bg: string;
  iconNode: React.ReactNode;
  name: string;
  status: string;
  statusConnected?: boolean;
  sub: string;
  counts?: [string, string][];
  action?: React.ReactNode;
  onPress?: () => void;
  busy?: boolean;
}) {
  const c = useColors();
  const dotColor = statusConnected ? c.moss : c.ink3;
  const labelColor = statusConnected ? c.moss : c.ink3;
  const body = (
    <>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: statusConnected ? 0 : 1, borderColor: c.line }}>
          {iconNode}
        </View>
        <View style={{ flex: 1 }}>
          <TText style={{ fontSize: 16, fontWeight: '500', color: c.ink }}>{name}</TText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dotColor }} />
            <Eyebrow style={{ color: labelColor }}>{status}</Eyebrow>
          </View>
          <TText style={{ fontSize: 11, color: c.ink3, marginTop: 6 }}>{sub}</TText>
        </View>
        {busy ? <ActivityIndicator color={c.ink3} /> : null}
      </View>
      {counts && counts.length > 0 && (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line, flexDirection: 'row', gap: 10 }}>
          {counts.map(([v, l], i) => (
            <View key={i} style={{ flex: 1 }}>
              <TText variant="monoMedium" style={{ fontSize: 18, color: c.ink }}>{v}</TText>
              <Eyebrow style={{ fontSize: 9 }}>{l}</Eyebrow>
            </View>
          ))}
        </View>
      )}
      {action}
    </>
  );

  if (onPress && !statusConnected) {
    return (
      <Pressable onPress={onPress} disabled={busy} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        <Card>{body}</Card>
      </Pressable>
    );
  }
  return <Card>{body}</Card>;
}
