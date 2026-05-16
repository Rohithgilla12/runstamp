import React from 'react';
import { View } from 'react-native';
import type { HistogramCell } from '../../analytics/histogram';
import { useColors } from '../theme';
import { TText } from '../typography';

interface Props {
  cells: HistogramCell[];
}

export function DistanceHistogram({ cells }: Props) {
  const c = useColors();
  const max = Math.max(1, ...cells.map((b) => b.count));
  return (
    <View style={{ gap: 6 }}>
      {cells.map((b) => {
        const w = (b.count / max) * 100;
        return (
          <View key={b.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TText variant="mono" style={{ width: 48, fontSize: 10, color: c.ink3 }}>{b.label}</TText>
            <View style={{ flex: 1, height: 12, backgroundColor: c.paper2, borderRadius: 6, overflow: 'hidden' }}>
              <View style={{ width: `${w}%`, height: '100%', backgroundColor: c.accent }} />
            </View>
            <TText variant="mono" style={{ width: 26, textAlign: 'right', fontSize: 11, color: c.ink }}>{b.count}</TText>
          </View>
        );
      })}
    </View>
  );
}
