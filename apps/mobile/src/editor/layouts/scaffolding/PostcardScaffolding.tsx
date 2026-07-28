import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import type { Scaffolding } from '../types';
import { POSTCARD_TOP_FRACTION } from '../../layers';
import { RunstampMark } from '../../../design/RunstampMark';

const INK_SOFT = 'rgba(20,17,13,0.16)';
const INK_MID = 'rgba(20,17,13,0.32)';

// Postcard: photo band on top (Canvas photo layer), postcard-back below —
// centre divider, dashed stamp box with postmark ghost, address rules.
// Stats live on the correspondence half as seeded stickers.
export const PostcardScaffolding: Scaffolding = ({ width, height }) => {
  const bandTop = height * POSTCARD_TOP_FRACTION;
  const dividerX = width * 0.62;
  const boxW = width * 0.17;
  const boxH = height * 0.1;
  const boxX = width - boxW - width * 0.045;
  const boxY = bandTop + height * 0.025;
  const ringR = boxW * 0.3;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
        {/* seam under the photo */}
        <Line x1={0} y1={bandTop} x2={width} y2={bandTop} stroke={INK_SOFT} strokeWidth={1} />
        {/* centre divider */}
        <Line x1={dividerX} y1={bandTop + height * 0.03} x2={dividerX} y2={height - height * 0.03} stroke={INK_SOFT} strokeWidth={1} />
        {/* stamp box + postmark ghost overlapping its corner */}
        <Rect x={boxX} y={boxY} width={boxW} height={boxH} fill="none" stroke={INK_MID} strokeWidth={1.2} strokeDasharray="3 3" />
        <Circle cx={boxX - ringR * 0.25} cy={boxY + boxH + ringR * 0.15} r={ringR} fill="none" stroke={INK_SOFT} strokeWidth={1} strokeDasharray="2 2" />
        <Circle cx={boxX - ringR * 0.25} cy={boxY + boxH + ringR * 0.15} r={ringR * 0.68} fill="none" stroke={INK_SOFT} strokeWidth={0.8} />
        {/* address rules */}
        {[0.855, 0.9, 0.945].map((frac) => (
          <Line key={frac} x1={width * 0.66} y1={height * frac} x2={width * 0.95} y2={height * frac} stroke={INK_MID} strokeWidth={0.8} />
        ))}
      </Svg>
      <View style={{ position: 'absolute', bottom: 10, left: 12 }}>
        <RunstampMark tone="ink" opacity={0.4} />
      </View>
    </View>
  );
};
