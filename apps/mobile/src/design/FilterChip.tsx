import React from 'react';
import { Pressable } from 'react-native';
import { useColors } from './theme';
import { TText } from './typography';

interface Props {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}

export function FilterChip({ label, selected, disabled, onPress }: Props) {
  const c = useColors();
  const bg = disabled ? c.paper2 : selected ? c.ink : c.paper2;
  const fg = disabled ? c.ink3 : selected ? c.paper : c.ink;
  // hitSlop keeps the chip visually compact while the touch region clears 44pt.
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      hitSlop={10}
      style={{
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16,
        backgroundColor: bg, borderWidth: 1, borderColor: selected ? c.ink : c.line,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <TText style={{ fontSize: 12, color: fg, fontWeight: selected ? '500' : '400' }}>{label}</TText>
    </Pressable>
  );
}
