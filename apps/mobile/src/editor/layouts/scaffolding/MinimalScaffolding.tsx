import React from 'react';
import { View } from 'react-native';
import type { Scaffolding } from '../types';

// Minimal: single 1px hairline frame, ink at ~15% alpha, inset 14pt.
// No run text. Canvas owns the background.
export const MinimalScaffolding: Scaffolding = ({ width, height }) => {
  const inset = 14;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      <View style={{
        position: 'absolute',
        top: inset, left: inset,
        width: width - inset * 2,
        height: height - inset * 2,
        borderWidth: 1,
        borderColor: 'rgba(20,17,13,0.15)',
        borderRadius: 1,
      }} />
    </View>
  );
};
