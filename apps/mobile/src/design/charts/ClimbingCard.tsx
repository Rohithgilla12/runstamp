import React from 'react';
import { View } from 'react-native';
import type { Comparison } from '../../analytics/climbing';
import { Card } from '../atoms';
import { useColors } from '../theme';
import { Eyebrow, TText } from '../typography';
import { useAppState } from '../../state/AppState';

interface Props {
  totalM: number;
  everests: number;
  comparison: Comparison;
}

export function ClimbingCard({ totalM, everests, comparison }: Props) {
  const c = useColors();
  const { units } = useAppState();

  if (totalM <= 0) return null;

  const heroText =
    units === 'mi'
      ? `${Math.round(totalM * 3.28084).toLocaleString()} ft`
      : `${Math.round(totalM).toLocaleString()} m`;

  const evocative =
    everests >= 0.5
      ? `${everests.toFixed(1)} × Everest`
      : `${comparison.count.toFixed(1)} × ${comparison.label}`;

  return (
    <Card style={{ backgroundColor: c.paper2 }}>
      <Eyebrow>VERTICAL · CLIMBED</Eyebrow>
      <TText
        variant="monoMedium"
        style={{ fontSize: 36, lineHeight: 42, letterSpacing: -1, color: c.ink, marginTop: 4 }}
      >
        {heroText}
      </TText>
      <TText
        variant="serifItalic"
        style={{ fontSize: 15, color: c.accent, marginTop: 6 }}
      >
        {evocative}
      </TText>
    </Card>
  );
}
