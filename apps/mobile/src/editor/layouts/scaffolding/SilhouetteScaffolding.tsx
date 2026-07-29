import React from 'react';
import { View } from 'react-native';
import type { Scaffolding } from '../types';
import { RunstampMark } from '../../../design/RunstampMark';

const SOLAR = '#e85d2f';

// Silhouette: Share Aura's classic — full-bleed photo, signature route over a
// deep bottom fade, one short solar rule keying the hero distance. Scaffolding
// stays quiet so the route + stickers do the work.
export const SilhouetteScaffolding: Scaffolding = ({ width, height }) => (
  <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
    <View style={{ position: 'absolute', top: height * 0.62, left: width * 0.42, width: width * 0.16, height: 2, backgroundColor: SOLAR }} />
    <View style={{ position: 'absolute', bottom: 12, left: 0, right: 0, alignItems: 'center' }}>
      <RunstampMark tone="paper" opacity={0.4} />
    </View>
  </View>
);
