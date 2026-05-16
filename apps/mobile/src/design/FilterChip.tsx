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
  return (
    <Pressable disabled={disabled} onPress={onPress} style={{
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
      backgroundColor: bg, borderWidth: 1, borderColor: selected ? c.ink : c.line,
      opacity: disabled ? 0.5 : 1,
    }}>
      <TText style={{ fontSize: 12, color: fg, fontWeight: selected ? '500' : '400' }}>{label}</TText>
    </Pressable>
  );
}
