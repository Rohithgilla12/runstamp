import React from 'react';
import { Image, Pressable, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tileUrl, type TileStyle } from '../../services/mapTiles';
import { FONT } from '../../design/fonts';
import { Icon } from '../../design/Icon';
import { useColors } from '../../design/theme';
import { Eyebrow, TText } from '../../design/typography';

export function Row({
  icon,
  label,
  value,
  onPress,
  chevron,
  danger,
  isLast
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  danger?: boolean;
  isLast?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [{
      flexDirection: 'row', alignItems: 'center', gap: 14,
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: isLast ? 0 : 1, borderBottomColor: c.line2,
      opacity: pressed && onPress ? 0.6 : 1
    }]}>
      <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <TText style={{ flex: 1, fontSize: 14, fontWeight: '500', color: danger ? '#c44a1e' : c.ink }}>{label}</TText>
      {value && <TText style={{ fontSize: 12, color: c.ink3 }}>{value}</TText>}
      {(chevron || onPress) && <Icon.chevR size={14} color={c.ink3} />}
    </Pressable>
  );
}

export function LabeledInput({ label, ...rest }: { label: string } & TextInputProps) {
  const c = useColors();
  return (
    <View style={{ gap: 4 }}>
      <Eyebrow style={{ color: c.ink3 }}>{label}</Eyebrow>
      <TextInput
        {...rest}
        style={{
          backgroundColor: c.paper, borderWidth: 1, borderColor: c.line,
          borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
          fontSize: 16, color: c.ink, fontFamily: FONT.mono,
        }}
        placeholderTextColor={c.ink3}
      />
    </View>
  );
}

export function ThemeSwatch({ dark, active, onPress, label }: { dark: boolean; active: boolean; onPress: () => void; label: string }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{
      flex: 1, padding: 14, borderRadius: 12,
      backgroundColor: dark ? '#0e0d0b' : '#f3ede2',
      borderWidth: 1.5, borderColor: active ? c.accent : c.line,
      opacity: pressed ? 0.85 : 1
    }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ width: 18, height: 18 }}>
          {dark ? <Icon.moon size={18} color="#f3ede2" /> : <Icon.sun size={18} color="#14110d" />}
        </View>
        {active && <Icon.check size={16} color={c.accent} />}
      </View>
      <TText style={{ marginTop: 8, fontSize: 12, fontWeight: '500', color: dark ? '#f3ede2' : '#14110d' }}>{label}</TText>
      <View style={{ marginTop: 6, flexDirection: 'row', gap: 3 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: dark ? 'rgba(243,237,226,0.2)' : 'rgba(20,17,13,0.15)' }} />
        ))}
      </View>
    </Pressable>
  );
}

// Small live preview chip. The thumbnail is a single tile fetched from
// CartoCDN at z=11/x=602/y=770 (≈ NYC midtown) — a globally recognisable
// mix of streets, water, parks, blocks so every style looks distinct in
// the picker even at 72×72. Same network image cache as the route maps,
// so picker thumbnails warm the cache for the actual map render.
export function TileStyleSwatch({
  styleKey, label, sub, active, onPress,
}: {
  styleKey: TileStyle;
  label: string;
  sub: string;
  active: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const thumbUrl = tileUrl(11, 602, 770, styleKey);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{
      width: 96, padding: 6, borderRadius: 12,
      backgroundColor: c.paper2,
      borderWidth: 1.5, borderColor: active ? c.accent : c.line,
      opacity: pressed ? 0.85 : 1,
    }]}>
      <View style={{ width: 84, height: 84, borderRadius: 8, overflow: 'hidden', backgroundColor: c.line }}>
        <Image source={{ uri: thumbUrl }} style={{ width: 84, height: 84 }} resizeMode="cover" />
      </View>
      <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {active && <Icon.check size={11} color={c.accent} />}
        <TText style={{ fontSize: 11, fontWeight: '500', color: c.ink }} numberOfLines={1}>{label}</TText>
      </View>
      <TText variant="mono" style={{ fontSize: 9, color: c.ink3, marginTop: 2 }} numberOfLines={1}>{sub}</TText>
    </Pressable>
  );
}

export function SubHeader({ back, title }: { back: () => void; title: string }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingHorizontal: 14, paddingTop: insets.top + 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={back} style={{ width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
        <Icon.back size={18} color={c.ink} />
      </Pressable>
      <Eyebrow>{title}</Eyebrow>
      <View style={{ width: 36 }} />
    </View>
  );
}

export function Toggle({
  label,
  sub,
  value,
  onChange,
  isLast
}: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  isLast?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable onPress={() => onChange(!value)} style={({ pressed }) => [{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: isLast ? 0 : 1, borderBottomColor: c.line2,
      opacity: pressed ? 0.7 : 1
    }]}>
      <View style={{ flex: 1 }}>
        <TText style={{ fontSize: 14, fontWeight: '500', color: c.ink }}>{label}</TText>
        {sub && <TText style={{ fontSize: 11, color: c.ink3, marginTop: 2 }}>{sub}</TText>}
      </View>
      <View style={{
        width: 46, height: 28, borderRadius: 14, padding: 2,
        backgroundColor: value ? c.accent : c.line, justifyContent: 'center'
      }}>
        <View style={{
          width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff',
          transform: [{ translateX: value ? 18 : 0 }]
        }} />
      </View>
    </Pressable>
  );
}
