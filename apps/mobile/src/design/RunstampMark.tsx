import React from 'react';
import { View } from 'react-native';
import { TText } from './typography';

interface Props {
  /** ink: dark text on a light card. paper: light text on a dark card. */
  tone?: 'ink' | 'paper';
  /** 0–1 opacity multiplier. Defaults to subtle but legible. */
  opacity?: number;
}

// RunstampMark — subtle "via Runstamp" attribution at the bottom of every
// share surface (share cards + analytics share cards). Sized so it reads as
// a publisher mark, not a watermark — quiet over loud per .impeccable.md.
//
// Renders a small dot, the word "via Runstamp" in mono caps, and that's it.
// One warm pop allowed: a single solar pixel for the dot.
export function RunstampMark({ tone = 'paper', opacity = 0.55 }: Props) {
  const textColor = tone === 'paper' ? 'rgba(243,237,226,1)' : 'rgba(20,17,13,1)';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, opacity }}>
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#e85d2f' }} />
      <TText variant="mono" style={{ fontSize: 8, color: textColor, letterSpacing: 1.6 }}>
        VIA RUNSTAMP
      </TText>
    </View>
  );
}
