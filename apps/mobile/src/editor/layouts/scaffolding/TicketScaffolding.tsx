import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { Scaffolding } from '../types';
import { TICKET_TOP_FRACTION } from '../../layers';
import { RunstampMark } from '../../../design/RunstampMark';

const PAPER = '#f3ede2';
const SOLAR = '#e85d2f';

// Ticket: photo above, paper stub below. The tear line is a dotted perforation
// with die-cut notches biting the card edges; a solar stripe keys the stub.
export const TicketScaffolding: Scaffolding = ({ width, height }) => {
  const seamY = height * TICKET_TOP_FRACTION;
  const notchR = Math.max(5, width * 0.032);
  const dots = Math.max(12, Math.round(width / 16));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      <Svg width={width} height={notchR * 2 + 8} style={{ position: 'absolute', top: seamY - notchR - 4, left: 0 }}>
        {Array.from({ length: dots }).map((_, i) => (
          <Circle key={i} cx={((i + 0.5) * width) / dots} cy={notchR + 4} r={Math.max(1.4, width * 0.006)} fill="rgba(20,17,13,0.35)" />
        ))}
        <Circle cx={0} cy={notchR + 4} r={notchR} fill={PAPER} />
        <Circle cx={width} cy={notchR + 4} r={notchR} fill={PAPER} />
      </Svg>
      <View style={{ position: 'absolute', top: seamY + 6, bottom: 6, left: 0, width: Math.max(3, width * 0.012), backgroundColor: SOLAR }} />
      <View style={{ position: 'absolute', top: 12, left: 12 }}>
        <RunstampMark tone="paper" opacity={0.5} />
      </View>
    </View>
  );
};
