import React from 'react';
import { View } from 'react-native';
import type { Activity } from '../../data/models';
import { useColors } from '../../design/theme';
import { Eyebrow, TText } from '../../design/typography';
import { useAppState } from '../../state/AppState';
import { type CatalogStamp } from '../../state/useStamps';
import { pickRecapFact } from './week-stats';

// Single inline serif-and-italic recap, no card. Quieter than the previous
// boxed RecapCard — reads as continuous page-flow.
export function RecapLine({ activities, earned }: { activities: Activity[]; earned: CatalogStamp[] }) {
  const c = useColors();
  const { units } = useAppState();
  const fact = pickRecapFact(activities, earned, units);
  if (!fact) return null;
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
      <Eyebrow style={{ color: c.ink3 }}>{fact.eyebrow}</Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4, flexWrap: 'wrap' }}>
        <TText variant="serif" style={{ fontSize: 20, lineHeight: 26, letterSpacing: -0.2, color: c.ink }}>{fact.lead}</TText>
        {fact.italic ? (
          <TText variant="serifItalic" style={{ fontSize: 20, lineHeight: 26, letterSpacing: -0.2, color: c.ink }}>{fact.italic}</TText>
        ) : null}
        {fact.tail ? (
          <TText variant="serif" style={{ fontSize: 20, lineHeight: 26, letterSpacing: -0.2, color: c.ink }}>{fact.tail}</TText>
        ) : null}
      </View>
      {fact.detail ? (
        <TText style={{ fontSize: 12, color: c.ink3, marginTop: 6 }}>{fact.detail}</TText>
      ) : null}
    </View>
  );
}
