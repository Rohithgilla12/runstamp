import React from 'react';
import { View } from 'react-native';
import type { Scaffolding } from '../types';
import { RunstampMark } from '../../../design/RunstampMark';

const SOLAR = '#e85d2f';

// Poster: the photo and one enormous number do all the work. Scaffolding is a
// single solar rule keying the hero block, plus the mark.
export const PosterScaffolding: Scaffolding = ({ width, height }) => (
  <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
    <View style={{ position: 'absolute', top: height * 0.655, left: width * 0.41, width: width * 0.18, height: 2, backgroundColor: SOLAR }} />
    <View style={{ position: 'absolute', bottom: 12, left: 0, right: 0, alignItems: 'center' }}>
      <RunstampMark tone="paper" opacity={0.45} />
    </View>
  </View>
);
