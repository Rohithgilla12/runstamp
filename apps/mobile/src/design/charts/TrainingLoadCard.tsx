import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { LoadPoint } from '../../analytics/trainingLoad';
import { Card } from '../atoms';
import { useColors } from '../theme';
import { Eyebrow, TText } from '../typography';

interface Props {
  series: LoadPoint[];
  isHrBased: boolean;
  needsHrProfile: boolean;
  onTapProfile?: () => void;
}

const W = 280;
const H = 56;
const PAD = 4;

export function TrainingLoadCard({ series, isHrBased, needsHrProfile, onTapProfile }: Props) {
  const c = useColors();
  const last = series[series.length - 1];
  if (!last) return null;

  const tail = series.slice(-28);
  const max = Math.max(1, ...tail.map((p) => p.ctl));
  const step = tail.length === 1 ? 0 : (W - PAD * 2) / (tail.length - 1);
  const y = (v: number) => PAD + (H - PAD * 2) - (v / max) * (H - PAD * 2);
  const d = tail.map((p, i) => `${i === 0 ? 'M' : 'L'}${(PAD + i * step).toFixed(1)} ${y(p.ctl).toFixed(1)}`).join(' ');

  const tsbColor = last.tsb >= 5 ? c.moss : last.tsb <= -10 ? c.accent : c.ink2;
  const tsbLabel = last.tsb >= 5 ? 'Fresh' : last.tsb <= -10 ? 'Loaded' : 'Steady';

  return (
    <Card style={{ backgroundColor: c.paper2 }}>
      <Eyebrow>{isHrBased ? 'TRAINING LOAD' : 'LOAD (DISTANCE-BASED)'}</Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
        <View>
          <TText variant="monoMedium" style={{ fontSize: 36, lineHeight: 36, letterSpacing: -1, color: c.ink }}>
            {Math.round(last.ctl)}
          </TText>
          <Eyebrow style={{ color: c.ink3 }}>FITNESS · CTL</Eyebrow>
        </View>
        <Svg width={W * 0.55} height={H}>
          <Path d={d} fill="none" stroke={c.accent} strokeWidth={1.6} strokeLinecap="round" />
          <Circle cx={PAD + (tail.length - 1) * step} cy={y(last.ctl)} r={3} fill={c.accent} />
        </Svg>
      </View>
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.line }}>
        <View style={{ flex: 1 }}>
          <Eyebrow style={{ color: c.ink3 }}>FATIGUE · ATL</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 16, color: c.ink }}>{Math.round(last.atl)}</TText>
        </View>
        <View style={{ flex: 1 }}>
          <Eyebrow style={{ color: c.ink3 }}>FORM · TSB</Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TText variant="monoMedium" style={{ fontSize: 16, color: c.ink }}>
              {last.tsb >= 0 ? '+' : ''}{Math.round(last.tsb)}
            </TText>
            <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: tsbColor + '22' }}>
              <TText style={{ fontSize: 9, color: tsbColor, fontWeight: '500' }}>{tsbLabel}</TText>
            </View>
          </View>
        </View>
      </View>
      {needsHrProfile && isHrBased ? (
        <Pressable onPress={onTapProfile} style={{ marginTop: 10 }}>
          <TText style={{ fontSize: 11, color: c.accent, textDecorationLine: 'underline' }}>
            Using defaults — tap to set your HR profile
          </TText>
        </Pressable>
      ) : null}
    </Card>
  );
}
