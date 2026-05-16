import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import type { MafPoint } from '../../analytics/maf';
import { Card } from '../atoms';
import { useColors } from '../theme';
import { Eyebrow, TText } from '../typography';

interface Props {
  series: MafPoint[];
  mafHrThreshold: number;
  improvementSec: number | null;
  needsBirthYear?: boolean;
  onTapProfile?: () => void;
}

// MAF Test trend — one point per month, plotted as average pace of all
// sub-MAF-HR runs that month. Improvement story: dots drift downward
// (faster) at the same HR cap = aerobic engine getting more efficient.
export function MafPaceCard({ series, mafHrThreshold, improvementSec, needsBirthYear, onTapProfile }: Props) {
  const c = useColors();

  if (needsBirthYear) {
    return (
      <Card style={{ backgroundColor: c.paper2 }}>
        <Eyebrow>MAF AEROBIC TEST</Eyebrow>
        <TText variant="serif" style={{ fontSize: 18, lineHeight: 22, color: c.ink, marginTop: 6, letterSpacing: -0.2 }}>
          Same loop. Same HR. Watch yourself get faster.
        </TText>
        <TText style={{ fontSize: 12, color: c.ink3, marginTop: 6, lineHeight: 17 }}>
          Maffetone's 180-formula needs your birth year to compute your aerobic-HR ceiling
          (180 − age). Add it in Profile to unlock the trend.
        </TText>
        <Pressable onPress={onTapProfile} style={{ marginTop: 10 }}>
          <TText style={{ fontSize: 12, color: c.accent, fontWeight: '500' }}>Set birth year →</TText>
        </Pressable>
      </Card>
    );
  }

  if (series.length === 0) return null;

  const W = 300;
  const H = 140;
  const LEFT = 38;
  const RIGHT = 8;
  const TOP = 10;
  const BOTTOM = 22;
  const innerW = W - LEFT - RIGHT;
  const innerH = H - TOP - BOTTOM;

  const values = series.map((p) => p.meanPaceSecPerKm);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const pad = Math.max(5, (maxV - minV) * 0.1);
  // Pace y-axis: faster = top (lower sec/km = higher on chart, so invert).
  const yTop = Math.max(0, minV - pad);
  const yBot = maxV + pad;
  const span = Math.max(5, yBot - yTop);
  const x = (i: number) => LEFT + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
  // Inverted: faster pace at top of chart.
  const y = (v: number) => TOP + ((v - yTop) / span) * innerH;

  const last = series[series.length - 1];
  const d = series.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.meanPaceSecPerKm).toFixed(1)}`).join(' ');

  const yTicks = [yTop, (yTop + yBot) / 2, yBot];

  const tone =
    improvementSec === null ? c.ink3 :
    improvementSec > 0 ? c.moss :
    improvementSec < 0 ? c.accent : c.ink2;
  const deltaLabel =
    improvementSec === null
      ? null
      : `${improvementSec > 0 ? '−' : '+'}${Math.abs(improvementSec)}s vs base`;

  return (
    <Card style={{ backgroundColor: c.paper2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View>
          <Eyebrow>MAF AEROBIC PACE</Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
            <TText variant="monoMedium" style={{ fontSize: 36, lineHeight: 42, letterSpacing: -1, color: c.ink }}>
              {fmtPace(last.meanPaceSecPerKm)}
            </TText>
            <TText style={{ fontSize: 12, color: c.ink3 }}>/km @ ≤{mafHrThreshold}</TText>
          </View>
        </View>
        {deltaLabel ? (
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: tone + '22', marginTop: 4 }}>
            <TText variant="mono" style={{ fontSize: 11, color: tone, fontWeight: '500' }}>{deltaLabel}</TText>
          </View>
        ) : null}
      </View>

      <View style={{ marginTop: 12, alignItems: 'center' }}>
        <Svg width={W} height={H}>
          {yTicks.map((v, i) => (
            <React.Fragment key={i}>
              <Line x1={LEFT} y1={y(v)} x2={W - RIGHT} y2={y(v)} stroke={c.line2} strokeWidth={0.6} />
              <SvgText x={LEFT - 4} y={y(v) + 3} fontSize={8} fill={c.ink3} textAnchor="end" fontFamily="JetBrainsMono-Regular">
                {fmtPace(v)}
              </SvgText>
            </React.Fragment>
          ))}

          <Path d={d} fill="none" stroke={c.accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />

          {series.map((p, i) => (
            <Circle key={i} cx={x(i)} cy={y(p.meanPaceSecPerKm)} r={Math.min(5, 2 + p.totalKm / 20)} fill={c.accent} opacity={0.85} />
          ))}
          <Circle cx={x(series.length - 1)} cy={y(last.meanPaceSecPerKm)} r={6.4} fill="none" stroke={c.accent} strokeWidth={0.6} opacity={0.5} />

          <SvgText x={LEFT} y={H - 6} fontSize={9} fill={c.ink3} fontFamily="JetBrainsMono-Regular">{formatMonthShort(series[0].month)}</SvgText>
          <SvgText x={W - RIGHT} y={H - 6} fontSize={9} fill={c.ink3} textAnchor="end" fontFamily="JetBrainsMono-Regular">{formatMonthShort(last.month)}</SvgText>
        </Svg>
      </View>

      <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.line, flexDirection: 'row', gap: 16 }}>
        <View style={{ flex: 1 }}>
          <Eyebrow style={{ color: c.ink3 }}>BEST</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 16, color: c.ink }}>{fmtPace(Math.min(...values))}</TText>
        </View>
        <View style={{ flex: 1 }}>
          <Eyebrow style={{ color: c.ink3 }}>MONTHS</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 16, color: c.ink }}>{series.length}</TText>
        </View>
        <View style={{ flex: 1 }}>
          <Eyebrow style={{ color: c.ink3 }}>RUNS</Eyebrow>
          <TText variant="monoMedium" style={{ fontSize: 16, color: c.ink }}>{series.reduce((s, p) => s + p.runs, 0)}</TText>
        </View>
      </View>
    </Card>
  );
}

function fmtPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm - m * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const MONTHS_3 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;

function formatMonthShort(month: string): string {
  const [y, m] = month.split('-');
  const idx = Math.max(0, Math.min(11, parseInt(m, 10) - 1));
  return `${MONTHS_3[idx]} ${y.slice(2)}`;
}
