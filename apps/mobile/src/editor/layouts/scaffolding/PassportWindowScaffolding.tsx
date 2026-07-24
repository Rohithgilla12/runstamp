import React from 'react';
import { View } from 'react-native';
import type { Scaffolding } from '../types';
import { RunstampMark } from '../../../design/RunstampMark';

// Passport window: the map leads and the photo Polaroid is drawn by the Canvas
// photo layer (inset placement, added in a later task). Scaffolding draws only
// the watermark; stats come from seeded stickers on a paper band.
export const PassportWindowScaffolding: Scaffolding = ({ width, height }) => (
  <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
    <View style={{ position: 'absolute', bottom: 12, right: 12 }}>
      <RunstampMark tone="ink" opacity={0.4} />
    </View>
  </View>
);
