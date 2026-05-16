import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import type { LoadPoint } from '../../analytics/trainingLoad';
import { Card } from '../atoms';
import { useColors } from '../theme';
import { Eyebrow, TText } from '../typography';

interface Props {
  series: LoadPoint[];
  isHrBased: boolean;
  needsHrProfile?: boolean;
  onTapProfile?: () => void;
}

// PMC-style Form chart (Banister 1991 / Coggan). Three series over 90
// days: CTL (chronic, "fitness"), ATL (acute, "fatigue"), and TSB
// (form = CTL − ATL). The story is in how the lines diverge and cross.
//   TSB > +25  fresh — may have lost fitness
//   +5 to +25  race-ready
//   −10 to +5  productive training
//   −10 to −30 loaded
//   < −30      overreaching
// Cite: Banister EW, *Modeling elite athletic performance* (1991);
//       Allen H & Coggan A, *Training and Racing with a Power Meter*.
export function FormChartCard({ series, isHrBased, needsHrProfile, onTapProfile }: Props) {
  const c = useColors();
  const tail = series.slice(-90);
  const last = tail[tail.length - 1];
  if (!last || tail.length < 7) return null;

  const W = 320;
  const H = 200;
  const LEFT = 30;
  const RIGHT = 36;
  const TOP = 14;
  const BOTTOM = 22;
  const innerW = W - LEFT - RIGHT;
  const innerH = H - TOP - BOTTOM;

  const loadMax = Math.max(20, ...tail.map((p) => Math.max(p.ctl, p.atl))) * 1.1;
  const tsbExtent = Math.max(15, ...tail.map((p) => Math.abs(p.tsb))) * 1.1;

  const x = (i: number) => LEFT + (i / Math.max(1, tail.length - 1)) * innerW;
  const yLoad = (v: number) => TOP + innerH - (v / loadMax) * innerH;
  // TSB axis: zero at middle of the chart, ±tsbExtent at top/bottom.
  const yTsb = (v: number) => TOP + innerH / 2 - (v / tsbExtent) * (innerH / 2);

  const ctlPath = tail.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${yLoad(p.ctl).toFixed(1)}`).join(' ');
  const atlPath = tail.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${yLoad(p.atl).toFixed(1)}`).join(' ');
  const tsbPath = tail.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${yTsb(p.tsb).toFixed(1)}`).join(' ');

  // TSB filled-area paths (above zero = moss, below = accent).
  const zeroY = yTsb(0);
  const tsbPos = areaPath(tail, x, yTsb, zeroY, (v) => Math.max(0, v));
  const tsbNeg = areaPath(tail, x, yTsb, zeroY, (v) => Math.min(0, v));

  const loadTicks = niceTicks(loadMax, 3);
  const firstDate = formatYmShort(tail[0].date);
  const lastDate = formatYmShort(last.date);

  const tsbValue = last.tsb;
  const verdict = tsbVerdict(tsbValue);
  const tsbTone =
    tsbValue >= 25 ? c.ink2 :
    tsbValue >= 5  ? c.moss :
    tsbValue >= -10 ? c.ink2 :
    c.accent;

  return (
    <Card style={{ backgroundColor: c.paper2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View>
          <Eyebrow>FORM</Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
            <TText variant="monoMedium" style={{ fontSize: 36, lineHeight: 42, letterSpacing: -1, color: c.ink }}>
              {tsbValue >= 0 ? '+' : ''}{Math.round(tsbValue)}
            </TText>
            <TText style={{ fontSize: 12, color: c.ink3 }}>TSB</TText>
          </View>
        </View>
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: tsbTone + '22', marginTop: 4, maxWidth: 170 }}>
          <TText variant="mono" style={{ fontSize: 10, color: tsbTone, fontWeight: '500', textAlign: 'right' }}>{verdict}</TText>
        </View>
      </View>

      <View style={{ marginTop: 12, alignItems: 'center' }}>
        <Svg width={W} height={H}>
          {/* Load (CTL/ATL) gridlines */}
          {loadTicks.map((v, i) => (
            <React.Fragment key={`l${i}`}>
              <Line x1={LEFT} y1={yLoad(v)} x2={W - RIGHT} y2={yLoad(v)} stroke={c.line2} strokeWidth={0.4} />
              <SvgText x={LEFT - 4} y={yLoad(v) + 3} fontSize={8} fill={c.ink3} textAnchor="end" fontFamily="JetBrainsMono-Regular">
                {v.toFixed(0)}
              </SvgText>
            </React.Fragment>
          ))}

          {/* TSB zero line (right axis) */}
          <Line x1={LEFT} y1={zeroY} x2={W - RIGHT} y2={zeroY} stroke={c.line} strokeWidth={0.8} strokeDasharray="2 3" />
          <SvgText x={W - RIGHT + 4} y={zeroY + 3} fontSize={8} fill={c.ink3} fontFamily="JetBrainsMono-Regular">0</SvgText>
          <SvgText x={W - RIGHT + 4} y={yTsb(tsbExtent) + 3} fontSize={8} fill={c.ink3} fontFamily="JetBrainsMono-Regular">+{Math.round(tsbExtent)}</SvgText>
          <SvgText x={W - RIGHT + 4} y={yTsb(-tsbExtent) + 3} fontSize={8} fill={c.ink3} fontFamily="JetBrainsMono-Regular">−{Math.round(tsbExtent)}</SvgText>

          {/* TSB filled areas */}
          <Path d={tsbPos} fill={c.moss} opacity={0.12} />
          <Path d={tsbNeg} fill={c.accent} opacity={0.12} />

          {/* CTL line (fitness, accent) */}
          <Path d={ctlPath} fill="none" stroke={c.accent} strokeWidth={2.0} strokeLinecap="round" strokeLinejoin="round" />
          {/* ATL line (fatigue, ink) */}
          <Path d={atlPath} fill="none" stroke={c.ink2} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
          {/* TSB line (form, thin) */}
          <Path d={tsbPath} fill="none" stroke={c.ink} strokeWidth={1.0} strokeLinecap="round" strokeLinejoin="round" opacity={0.55} />

          {/* Latest dots */}
          <Circle cx={x(tail.length - 1)} cy={yLoad(last.ctl)} r={3} fill={c.accent} />
          <Circle cx={x(tail.length - 1)} cy={yLoad(last.atl)} r={2.4} fill={c.ink2} />
          <Circle cx={x(tail.length - 1)} cy={yTsb(last.tsb)} r={2.4} fill={c.ink} />

          <SvgText x={LEFT} y={H - 6} fontSize={9} fill={c.ink3} fontFamily="JetBrainsMono-Regular">{firstDate}</SvgText>
          <SvgText x={W - RIGHT} y={H - 6} fontSize={9} fill={c.ink3} textAnchor="end" fontFamily="JetBrainsMono-Regular">{lastDate}</SvgText>
        </Svg>
      </View>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.line }}>
        <Legend dotColor={c.accent} label="FITNESS · CTL" value={Math.round(last.ctl)} />
        <Legend dotColor={c.ink2} label="FATIGUE · ATL" value={Math.round(last.atl)} />
        <Legend dotColor={c.ink} label="FORM · TSB" value={`${last.tsb >= 0 ? '+' : ''}${Math.round(last.tsb)}`} />
      </View>

      {needsHrProfile && isHrBased ? (
        <Pressable onPress={onTapProfile} style={{ marginTop: 8 }}>
          <TText style={{ fontSize: 11, color: c.accent, textDecorationLine: 'underline' }}>
            Using default HR zones — tap to set yours
          </TText>
        </Pressable>
      ) : !isHrBased ? (
        <TText style={{ fontSize: 10, color: c.ink3, marginTop: 8 }}>
          Distance-based load — add HR for a sharper signal.
        </TText>
      ) : null}
    </Card>
  );
}

function Legend({ dotColor, label, value }: { dotColor: string; label: string; value: string | number }) {
  const c = useColors();
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: dotColor }} />
        <Eyebrow style={{ color: c.ink3, fontSize: 9 }}>{label}</Eyebrow>
      </View>
      <TText variant="monoMedium" style={{ fontSize: 16, color: c.ink, marginTop: 2 }}>{value}</TText>
    </View>
  );
}

function areaPath(
  series: readonly LoadPoint[],
  x: (i: number) => number,
  y: (v: number) => number,
  zeroY: number,
  clamp: (v: number) => number,
): string {
  if (series.length === 0) return '';
  const points = series.map((p, i) => ({ x: x(i), y: y(clamp(p.tsb)) }));
  let d = `M${points[0].x.toFixed(1)} ${zeroY.toFixed(1)}`;
  for (const p of points) d += ` L${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  d += ` L${points[points.length - 1].x.toFixed(1)} ${zeroY.toFixed(1)} Z`;
  return d;
}

function niceTicks(max: number, count: number): number[] {
  const step = Math.ceil(max / count / 5) * 5;
  const out: number[] = [];
  for (let v = 0; v <= max + 0.01; v += step) out.push(v);
  return out;
}

function tsbVerdict(tsb: number): string {
  if (tsb >= 25) return 'Fresh — may have lost fitness';
  if (tsb >= 5) return 'Race-ready';
  if (tsb >= -10) return 'Productive training';
  if (tsb >= -30) return 'Loaded';
  return 'Overreaching';
}

const MONTHS_3 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;

function formatYmShort(iso: string): string {
  const [y, m] = iso.split('-');
  const monthIdx = Math.max(0, Math.min(11, parseInt(m, 10) - 1));
  return `${MONTHS_3[monthIdx]} ${y.slice(2)}`;
}
