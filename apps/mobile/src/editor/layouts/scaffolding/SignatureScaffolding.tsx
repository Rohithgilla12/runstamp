import React from 'react';
import { View } from 'react-native';
import type { Scaffolding } from '../types';
import { RunstampMark } from '../../../design/RunstampMark';

// Signature: the layer engine owns photo + route + bottom scrim. Scaffolding is
// deliberately quiet — just the watermark. Data comes from seeded stickers.
export const SignatureScaffolding: Scaffolding = ({ width, height }) => (
  <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
    <View style={{ position: 'absolute', bottom: 14, left: 0, right: 0, alignItems: 'center' }}>
      <RunstampMark tone="paper" opacity={0.4} />
    </View>
  </View>
);
