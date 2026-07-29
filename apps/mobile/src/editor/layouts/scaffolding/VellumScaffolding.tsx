import React from 'react';
import { View } from 'react-native';
import type { Scaffolding } from '../types';
import { RunstampMark } from '../../../design/RunstampMark';

const SOLAR = '#e85d2f';

// Vellum: a translucent cream panel pinned over the photo — the Share Aura
// frosted-overlay move, done as glassine paper. Stats seed onto the panel;
// a solar edge stripe is the one warm pop.
export const VellumScaffolding: Scaffolding = ({ width, height }) => {
  const px = width * 0.06;
  const py = height * 0.58;
  const pw = width * 0.88;
  const ph = height * 0.36;
  const tick = Math.max(8, width * 0.028);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      <View style={{
        position: 'absolute', left: px, top: py, width: pw, height: ph,
        backgroundColor: 'rgba(243,237,226,0.88)',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(20,17,13,0.18)',
        overflow: 'hidden',
      }}>
        <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: Math.max(3, width * 0.012), backgroundColor: SOLAR }} />
        <View style={{ position: 'absolute', top: 10, right: 12 }}>
          <RunstampMark tone="ink" opacity={0.4} />
        </View>
      </View>
      {/* Corner registration ticks. */}
      <View style={{ position: 'absolute', left: px, top: py, width: tick, height: 1.5, backgroundColor: 'rgba(243,237,226,0.95)' }} />
      <View style={{ position: 'absolute', left: px, top: py, width: 1.5, height: tick, backgroundColor: 'rgba(243,237,226,0.95)' }} />
      <View style={{ position: 'absolute', left: px + pw - tick, top: py + ph - 1.5, width: tick, height: 1.5, backgroundColor: 'rgba(243,237,226,0.95)' }} />
      <View style={{ position: 'absolute', left: px + pw - 1.5, top: py + ph - tick, width: 1.5, height: tick, backgroundColor: 'rgba(243,237,226,0.95)' }} />
    </View>
  );
};
