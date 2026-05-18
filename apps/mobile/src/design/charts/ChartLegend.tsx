// LegendChip — small key for chart-series identification. Solid colored
// dot for the primary series; a dashed mark for compare/secondary series
// so the bullet matches whatever stroke style the chart actually paints.
// Used by every chart that surfaces more than one series at once
// (CumulativeChart compare, MonthlyBars compare, WeeklyBars compare).
//
// Different from charts/FormChartCard's `Legend` which carries a numeric
// reading next to the label — this one is purely a colour key.

import React from 'react';
import { View } from 'react-native';
import { useColors } from '../theme';
import { TText } from '../typography';

interface Props {
  color: string;
  label: string;
  /** Render the mark as a dashed line instead of a filled dot. */
  dashed?: boolean;
  /** Render the mark as an outlined square instead of a filled dot (matches
   *  "stroke-only" compare bars on MonthlyBars / WeeklyBars). */
  outline?: boolean;
}

export function LegendChip({ color, label, dashed, outline }: Props) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {dashed ? (
        <View style={{ width: 14, height: 0, borderTopWidth: 1.5, borderTopColor: color, borderStyle: 'dashed' }} />
      ) : outline ? (
        <View style={{ width: 8, height: 8, borderRadius: 2, borderWidth: 1, borderColor: color }} />
      ) : (
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      )}
      <TText variant="mono" style={{ fontSize: 9, color: c.ink3, letterSpacing: 0.5 }}>
        {label.toUpperCase()}
      </TText>
    </View>
  );
}

// LegendRow — small wrapper for one or more LegendChips so callers can just
// hand it a list. Renders as a horizontal row above (or below) the chart.
export function LegendRow({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 6 }}>
      {children}
    </View>
  );
}
