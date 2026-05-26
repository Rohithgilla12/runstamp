import React from 'react';
import { View } from 'react-native';
import { useColors } from '../../design/theme';

// Postal-perforation motif from .impeccable.md, used as a quiet section
// divider. A row of 1px dots spaced ~6px apart — reads as "page tear-line"
// rather than a heavy hairline divider.
export function Perforation() {
  const c = useColors();
  const dotCount = 36;
  return (
    <View style={{ paddingHorizontal: 20, paddingVertical: 22 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        {Array.from({ length: dotCount }).map((_, i) => (
          <View key={i} style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: c.ink, opacity: 0.18 }} />
        ))}
      </View>
    </View>
  );
}
