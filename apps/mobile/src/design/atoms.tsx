import React from 'react';
import { Pressable, StyleProp, View, ViewStyle, TextStyle, PressableProps } from 'react-native';
import { useColors } from './theme';
import { TText, Eyebrow } from './typography';
import { FONT } from './fonts';

export function Card({
  children,
  style,
  padded = true,
  onPress
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  onPress?: () => void;
}) {
  const c = useColors();
  const base: ViewStyle = {
    backgroundColor: c.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.line,
    padding: padded ? 16 : 0,
    overflow: 'hidden'
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.65 : 1 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

export function Stat({
  label,
  value,
  unit,
  sub,
  size = 'md',
  invert = false
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  invert?: boolean;
}) {
  const c = useColors();
  const sizes: Record<string, { v: number; s: number; l: number }> = {
    sm: { v: 24, s: 11, l: 9 },
    md: { v: 34, s: 12, l: 10 },
    lg: { v: 48, s: 13, l: 10 },
    xl: { v: 64, s: 14, l: 11 }
  };
  const z = sizes[size];
  const subtleColor = invert ? 'rgba(243,237,226,0.5)' : c.ink3;
  const mainColor = invert ? c.paper : c.ink;
  return (
    <View>
      <Eyebrow style={{ color: subtleColor, fontSize: z.l, marginBottom: 2 }}>{label}</Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <TText
          variant="monoMedium"
          style={{ fontSize: z.v, letterSpacing: -0.8, color: mainColor, lineHeight: Math.round(z.v * 1.17) }}
        >
          {value}
        </TText>
        {unit && (
          <TText style={{ fontSize: z.s, color: subtleColor, marginLeft: 4, marginBottom: 4 }}>{unit}</TText>
        )}
      </View>
      {sub && <TText style={{ fontSize: z.s, color: subtleColor, marginTop: 2 }}>{sub}</TText>}
    </View>
  );
}

type ButtonKind = 'primary' | 'accent' | 'ghost' | 'danger';

export function Button({
  children,
  kind = 'primary',
  onPress,
  full,
  icon,
  iconRight,
  disabled,
  style
}: {
  children: React.ReactNode;
  kind?: ButtonKind;
  onPress?: () => void;
  full?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const palettes: Record<ButtonKind, { bg: string; fg: string; bd: string }> = {
    primary: { bg: c.ink,      fg: c.paper, bd: c.ink },
    accent:  { bg: c.accent,   fg: '#ffffff', bd: c.accent },
    ghost:   { bg: 'transparent', fg: c.ink,    bd: c.line },
    danger:  { bg: 'transparent', fg: '#c44a1e', bd: c.line }
  };
  const p = palettes[kind];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          height: 48,
          paddingHorizontal: 18,
          borderRadius: 12,
          backgroundColor: p.bg,
          borderWidth: 1,
          borderColor: p.bd,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: full ? '100%' : undefined,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1
        } as ViewStyle,
        style
      ]}
    >
      {icon}
      {typeof children === 'string' ? (
        <TText style={{ color: p.fg, fontFamily: FONT.geistMedium, fontSize: 15 } as TextStyle}>{children}</TText>
      ) : (
        children
      )}
      {iconRight}
    </Pressable>
  );
}

export function Delta({ value, format }: { value: number; format?: (v: number) => string }) {
  const c = useColors();
  const flat = value === 0;
  const up = value > 0;
  const color = flat ? c.ink3 : up ? c.moss : c.warn;
  const arrow = flat ? '—' : up ? '▲' : '▼';
  const text = format ? format(Math.abs(value)) : String(Math.abs(value));
  return (
    <TText variant="monoMedium" style={{ color, fontSize: 11 }}>
      {arrow}  {text}
    </TText>
  );
}

export function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <TText variant="serif" style={{ fontSize: 22, lineHeight: 24, letterSpacing: -0.3 }}>{title}</TText>
      {right}
    </View>
  );
}

export function Sep() {
  const c = useColors();
  return <TText style={{ fontSize: 11, color: c.ink3 }}>·</TText>;
}

export function Chip({
  children,
  style
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 6,
          backgroundColor: c.paper2,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: c.line
        },
        style
      ]}
    >
      {children}
    </View>
  );
}
