import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, Line, Mask, Path, Rect } from 'react-native-svg';
import type { Activity } from '../../data/sample';
import { distUnit, fmtDist, fmtPace, fmtTime } from '../../data/sample';
import { useColors } from '../theme';
import { TText, Eyebrow } from '../typography';
import { RouteMap } from '../RouteMap';

interface Props {
  run: Activity;
  width: number;
  height: number;
  background: 'map' | 'photo' | 'solid';
}

// PostageTemplate
//
// Renders a single share card in the "Postage" template family from PRD §6.3 —
// perforated stamp edges, country/region mark, distance as denomination, date stamp
// in the corner. Designed to compose over a route map, a photo, or a solid colour.
export function PostageTemplate({ run, width, height, background }: Props) {
  const c = useColors();
  // Stamp inset — the perforated edge sits just inside the outer rect so the
  // background bleeds through the perforations and the rest of the card stays opaque.
  const inset = 14;
  const cardW = width - inset * 2;
  const cardH = height - inset * 2;

  return (
    <View style={{ width, height, position: 'relative' }}>
      {/* The full backdrop (paper texture). The perforations cut through to this layer. */}
      <View style={{ position: 'absolute', inset: 0, backgroundColor: c.paper }} />

      {/* Stamp body */}
      <View style={{
        position: 'absolute', top: inset, left: inset, width: cardW, height: cardH,
        overflow: 'hidden',
        backgroundColor: c.ink
      }}>
        {/* Background layer */}
        {background === 'map' && (
          <RouteMap points={run.route} width={cardW} height={cardH} style="dark" accent={c.accent} routeStrokeWidth={4} flat />
        )}
        {background === 'photo' && (
          <View style={{ position: 'absolute', inset: 0, backgroundColor: '#1a1714', alignItems: 'center', justifyContent: 'center' }}>
            {Array.from({ length: 16 }).map((_, i) => (
              <View key={i} style={{
                position: 'absolute', top: i * 32 - 60, left: -20, width: cardW + 40,
                height: 14, backgroundColor: 'rgba(243,237,226,0.04)', transform: [{ rotate: '-12deg' }]
              }} />
            ))}
            <TText variant="mono" style={{ fontSize: 10, color: 'rgba(243,237,226,0.55)' }}>UPLOAD PHOTO</TText>
          </View>
        )}
        {background === 'solid' && (
          <View style={{ position: 'absolute', inset: 0, backgroundColor: c.accent }} />
        )}

        {/* Solid scrim so type reads on any background */}
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(14,13,11,0.32)' }} />

        {/* Top mark: country + city + ordinal */}
        <View style={{ paddingHorizontal: 18, paddingTop: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Eyebrow style={{ color: 'rgba(243,237,226,0.6)' }}>{run.country.toUpperCase()}</Eyebrow>
              <TText variant="serif" style={{ fontSize: cardW * 0.06, color: c.paper, lineHeight: cardW * 0.07, letterSpacing: -0.4, marginTop: 2 }}>
                {run.city}
              </TText>
            </View>
            <View style={{
              borderWidth: 1.2, borderColor: 'rgba(243,237,226,0.6)', borderRadius: 4,
              paddingHorizontal: 8, paddingVertical: 4
            }}>
              <TText variant="mono" style={{ fontSize: 9, color: 'rgba(243,237,226,0.7)' }}>NO. {run.id.toUpperCase()}</TText>
            </View>
          </View>
        </View>

        {/* Denomination — distance — dominates the card */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}>
          <View style={{ alignItems: 'center' }}>
            <Eyebrow style={{ color: 'rgba(243,237,226,0.55)' }}>DENOMINATION</Eyebrow>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
              <TText
                variant="monoSemi"
                style={{
                  fontSize: Math.min(cardW * 0.22, 80),
                  lineHeight: Math.min(cardW * 0.22, 80),
                  letterSpacing: -3,
                  color: c.paper
                }}
              >
                {fmtDist(run.distance, 'km')}
              </TText>
              <TText style={{ fontSize: 16, color: 'rgba(243,237,226,0.7)', marginLeft: 6 }}>{distUnit('km').toUpperCase()}</TText>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
              <TText variant="mono" style={{ fontSize: 12, color: 'rgba(243,237,226,0.75)' }}>{fmtPace(run.pace)}/km</TText>
              <TText style={{ color: 'rgba(243,237,226,0.4)' }}>·</TText>
              <TText variant="mono" style={{ fontSize: 12, color: 'rgba(243,237,226,0.75)' }}>{fmtTime(run.seconds)}</TText>
              <TText style={{ color: 'rgba(243,237,226,0.4)' }}>·</TText>
              <TText variant="mono" style={{ fontSize: 12, color: 'rgba(243,237,226,0.75)' }}>{run.elev}m</TText>
            </View>
          </View>
        </View>

        {/* Postmark — bottom-right, circular cancellation */}
        <View style={{ position: 'absolute', bottom: 16, right: 16 }}>
          <PostmarkCircle date={`MAY 17 · ${run.day.toUpperCase()}`} pace={fmtPace(run.pace)} />
        </View>

        {/* Title strip — bottom-left */}
        <View style={{ position: 'absolute', bottom: 16, left: 18, maxWidth: cardW * 0.55 }}>
          <Eyebrow style={{ color: 'rgba(243,237,226,0.55)' }}>RUN NO.</Eyebrow>
          <TText variant="serifItalic" style={{ fontSize: 14, color: c.paper, lineHeight: 16 }} numberOfLines={2}>
            {run.title}
          </TText>
        </View>

        {/* Air-mail accent stripes */}
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, flexDirection: 'row' }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: i % 2 === 0 ? c.accent : c.paper }} />
          ))}
        </View>
      </View>

      {/* Perforated outer ring — drawn last so it sits on top of the body and the
          notches reveal the paper backdrop. Uses a mask: a filled rect minus
          circles around the perimeter, then we paint paper-colored circles
          along the inset border. */}
      <PerforatedFrame width={width} height={height} inset={inset} paperColor={c.paper} />
    </View>
  );
}

function PerforatedFrame({ width, height, inset, paperColor }: { width: number; height: number; inset: number; paperColor: string }) {
  // Notch radius and spacing for the perforations.
  const notchR = Math.max(3, Math.round(inset * 0.45));
  const horizontalCount = Math.max(8, Math.round((width - inset * 2) / (notchR * 3.2)));
  const verticalCount = Math.max(10, Math.round((height - inset * 2) / (notchR * 3.2)));

  const notches: { cx: number; cy: number }[] = [];
  // top + bottom
  for (let i = 1; i < horizontalCount; i++) {
    const cx = inset + ((width - inset * 2) * i) / horizontalCount;
    notches.push({ cx, cy: inset });
    notches.push({ cx, cy: height - inset });
  }
  // left + right
  for (let i = 1; i < verticalCount; i++) {
    const cy = inset + ((height - inset * 2) * i) / verticalCount;
    notches.push({ cx: inset, cy });
    notches.push({ cx: width - inset, cy });
  }
  // corners
  notches.push({ cx: inset, cy: inset });
  notches.push({ cx: width - inset, cy: inset });
  notches.push({ cx: inset, cy: height - inset });
  notches.push({ cx: width - inset, cy: height - inset });

  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      {notches.map((n, i) => (
        <Circle key={i} cx={n.cx} cy={n.cy} r={notchR} fill={paperColor} />
      ))}
    </Svg>
  );
}

function PostmarkCircle({ date, pace }: { date: string; pace: string }) {
  const c = useColors();
  const size = 78;
  const r = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <Path id="postmark-arc-top" d={`M ${size * 0.12} ${r} A ${r - 6} ${r - 6} 0 1 1 ${size * 0.88} ${r}`} />
      </Defs>
      <Circle cx={r} cy={r} r={r - 2} fill="none" stroke="rgba(243,237,226,0.85)" strokeWidth={1.3} strokeDasharray="2 2" />
      <Circle cx={r} cy={r} r={r - 10} fill="none" stroke="rgba(243,237,226,0.85)" strokeWidth={1} />
      <Line x1={r - r * 0.5} y1={r} x2={r + r * 0.5} y2={r} stroke="rgba(243,237,226,0.85)" strokeWidth={0.6} />
      <G>
        <Rect x={r - 26} y={r - 6} width={52} height={12} fill="none" stroke="rgba(243,237,226,0.85)" strokeWidth={0.6} />
      </G>
    </Svg>
  );
}
