import React from 'react';
import { View } from 'react-native';
import { fmtTime } from '../../lib/format';
import type { BestEffort } from '../../services/bestEfforts';
import { useColors } from '../../design/theme';
import { Eyebrow, TText } from '../../design/typography';
import { formatRowDate } from './period';

export function BestEffortRow({ effort }: { effort: BestEffort }) {
  const c = useColors();
  const date = new Date(effort.achievedAt);
  // Same "Wed · 14 May" shape as the Recent-activity rows so PRs and runs
  // read as one timeline rather than two date dialects on the same screen.
  // Older achievements (different year) carry the year suffix.
  const dateLabel = formatRowDate(date, { withYear: date.getFullYear() !== new Date().getFullYear() });
  return (
    <View style={{
      backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line,
      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
      flexDirection: 'row', alignItems: 'center', gap: 10,
    }}>
      <Eyebrow style={{ width: 88, color: c.ink3 }}>{effort.label.toUpperCase()}</Eyebrow>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <TText variant="monoMedium" style={{ fontSize: 18, color: c.ink, letterSpacing: -0.2 }}>{fmtTime(effort.timeSeconds)}</TText>
        <TText style={{ fontSize: 10, color: c.ink3 }}>{dateLabel}</TText>
      </View>
    </View>
  );
}
