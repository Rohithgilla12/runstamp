import React from 'react';
import { View } from 'react-native';
import { fmtTime } from '../../data/sample';
import type { RacePredictorResult } from '../../analytics/racePredictor';
import { Card } from '../atoms';
import { useColors } from '../theme';
import { Eyebrow, TText } from '../typography';
import { ChartShareButton, useChartShare } from './useChartShare';
import { ChartInfoButton } from './ChartInfoButton';

interface Props {
  result: RacePredictorResult;
}

const EXPLANATION =
  'Projects equivalent race times across distances from your best recent ' +
  'performance.\n\n' +
  '• Anchor — your highest-VDOT effort (Daniels formula).\n' +
  '• VDOT row — Daniels-equivalent time at each distance.\n' +
  '• Riegel — empirical "endurance fades" sanity check (t₂ = t₁·(d₂/d₁)^1.06).\n' +
  '• Tanda — marathon estimate from the last 8 weeks of training volume + mean pace.\n\n' +
  'Predictions assume similar conditions and adequate marathon-specific training.';

// Race-prediction card. Picks the user's highest-VDOT PR as anchor and
// projects equivalent times at standard distances via Daniels VDOT
// (headline) + Riegel (sanity check, smaller). Marathon also shows
// Tanda's training-based estimate as a separate footer block when the
// 8-week training summary qualifies.
export function RacePredictorCard({ result }: Props) {
  const c = useColors();
  const { captureRef, share, busy } = useChartShare('Race predictor');
  const { anchor, vdot, rows, tandaMarathonSec, weeklyKm, meanPaceSecPerKm, anchorAchievedAt } = result;

  const anchorLabel = labelFor(anchor.distanceM);
  const anchorTime = fmtTime(anchor.timeSeconds);
  const anchorDate = anchorAchievedAt ? formatDate(anchorAchievedAt) : null;

  return (
    <View>
      <View ref={captureRef} collapsable={false} style={{ backgroundColor: c.paper }}>
        <Card style={{ backgroundColor: c.paper2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Eyebrow>RACE PREDICTOR</Eyebrow>
                <ChartInfoButton explanation={EXPLANATION} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                <TText variant="monoMedium" style={{ fontSize: 36, lineHeight: 42, letterSpacing: -1, color: c.ink }}>
                  {vdot.toFixed(1)}
                </TText>
                <TText style={{ fontSize: 12, color: c.ink3 }}>VDOT</TText>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', marginTop: 4, marginRight: 40 }}>
              <TText style={{ fontSize: 10, color: c.ink3 }}>BASED ON</TText>
              <TText variant="monoMedium" style={{ fontSize: 13, color: c.ink, marginTop: 2 }}>
                {anchorLabel} · {anchorTime}
              </TText>
              {anchorDate ? (
                <TText style={{ fontSize: 10, color: c.ink3, marginTop: 1 }}>{anchorDate}</TText>
              ) : null}
            </View>
          </View>

          <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: c.line }}>
            {rows.map((r) => {
              const isAnchor = r.isAnchor;
              return (
                <View
                  key={r.distanceM}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Eyebrow style={{ color: isAnchor ? c.accent : c.ink3, width: 78 }}>
                      {r.label.toUpperCase()}
                    </Eyebrow>
                    {isAnchor ? (
                      <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: c.accent + '22' }}>
                        <TText variant="mono" style={{ fontSize: 9, color: c.accent, fontWeight: '500' }}>ANCHOR</TText>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <TText
                      variant="monoMedium"
                      style={{
                        fontSize: 18, lineHeight: 22, letterSpacing: -0.2,
                        color: isAnchor ? c.accent : c.ink,
                      }}
                    >
                      {fmtTime(r.vdotSec)}
                    </TText>
                    {!isAnchor ? (
                      <TText variant="mono" style={{ fontSize: 10, color: c.ink3, marginTop: 1 }}>
                        Riegel {fmtTime(r.riegelSec)}
                      </TText>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>

          {tandaMarathonSec !== null && weeklyKm !== null && meanPaceSecPerKm !== null ? (
            <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.line }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Eyebrow style={{ color: c.ink3 }}>TANDA · 8-WK TRAINING</Eyebrow>
                <TText variant="monoMedium" style={{ fontSize: 16, color: c.ink }}>
                  {fmtTime(tandaMarathonSec)}
                </TText>
              </View>
              <TText style={{ fontSize: 10, color: c.ink3, marginTop: 4 }}>
                {weeklyKm.toFixed(0)} km/wk · {fmtPaceSec(meanPaceSecPerKm)}/km avg → marathon
              </TText>
            </View>
          ) : null}
        </Card>
      </View>
      <ChartShareButton onPress={share} busy={busy} />
    </View>
  );
}

function labelFor(distanceM: number): string {
  if (Math.abs(distanceM - 1609.34) < 50) return '1 mile';
  if (Math.abs(distanceM - 5000) < 50) return '5K';
  if (Math.abs(distanceM - 10000) < 50) return '10K';
  if (Math.abs(distanceM - 21097.5) < 100) return 'Half';
  if (Math.abs(distanceM - 42195) < 200) return 'Marathon';
  return `${(distanceM / 1000).toFixed(1)}K`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function fmtPaceSec(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm - m * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
