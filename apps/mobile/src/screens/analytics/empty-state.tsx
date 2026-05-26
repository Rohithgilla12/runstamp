import React from 'react';
import { Card } from '../../design/atoms';
import { useColors } from '../../design/theme';
import { Eyebrow, TText } from '../../design/typography';

export function EmptyState({ loading }: { loading: boolean }) {
  const c = useColors();
  return (
    <Card style={{ backgroundColor: c.paper2, padding: 24 }}>
      <Eyebrow style={{ color: c.ink3 }}>{loading ? 'LOADING…' : 'NOT ENOUGH DATA'}</Eyebrow>
      <TText variant="serif" style={{ fontSize: 22, lineHeight: 26, color: c.ink, marginTop: 8, letterSpacing: -0.3 }}>
        Stats start appearing after your first run.
      </TText>
      <TText style={{ fontSize: 13, color: c.ink3, marginTop: 8, lineHeight: 18 }}>
        Connect Strava or Apple Health from Profile → Connections.
      </TText>
    </Card>
  );
}
