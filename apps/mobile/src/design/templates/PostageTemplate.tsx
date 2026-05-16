import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, Path, Rect, Text as SvgText, TextPath } from 'react-native-svg';
import type { Activity } from '../../data/sample';
import { distUnit, fmtDist, fmtPace, fmtTime } from '../../data/sample';
import { useColors } from '../theme';
import { TText, Eyebrow } from '../typography';
import { RouteMap } from '../RouteMap';
import { EYEBROW_SIZE, PAD, TONE, formatMonthDay, type Units } from './shared';

interface Props {
  run: Activity;
  width: number;
  height: number;
  background: 'map' | 'photo' | 'solid';
  units?: Units;
}

// PostageTemplate
//
// Perforated stamp from PRD §6.3. Distance is the denomination; city +
// country read at the top mark; postmark circle in the bottom-right carries
// the run date + pace around the rim. Air-mail accent stripe at the very
// bottom edge.
//
// Polish notes vs first draft:
//  - Units now respect the user preference instead of being hardcoded 'km'.
//  - Postmark circle actually renders date + pace inside (was empty rings).
//  - "DENOMINATION" eyebrow dropped in favour of plain DISTANCE — less jargon.
//  - Padding uses the shared scale so spacing matches the rest of the family.
export function PostageTemplate({ run, width, height, background, units = 'km' }: Props) {
  const c = useColors();
  // Stamp inset — perforations sit just inside the outer rect so the paper
  // backdrop bleeds through the notches.
  const inset = 14;
  const cardW = width - inset * 2;
  const cardH = height - inset * 2;
  const denomFont = Math.min(cardW * 0.22, 80);

  return (
    <View style={{ width, height, position: 'relative' }}>
      {/* Full backdrop (paper texture) — perforations cut to this layer. */}
      <View style={{ position: 'absolute', inset: 0, backgroundColor: c.paper }} />

      {/* Stamp body */}
      <View style={{
        position: 'absolute', top: inset, left: inset, width: cardW, height: cardH,
        overflow: 'hidden',
        backgroundColor: c.ink,
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
                height: 14, backgroundColor: 'rgba(243,237,226,0.04)', transform: [{ rotate: '-12deg' }],
              }} />
            ))}
            <TText variant="mono" style={{ fontSize: 10, color: 'rgba(243,237,226,0.55)' }}>UPLOAD PHOTO</TText>
          </View>
        )}
        {background === 'solid' && (
          <View style={{ position: 'absolute', inset: 0, backgroundColor: c.accent }} />
        )}

        {/* Scrim so type reads on any background. */}
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0, backgroundColor: TONE.scrimInkSoft }} />

        {/* Top mark: country + city + serial */}
        <View style={{ paddingHorizontal: PAD.lg, paddingTop: PAD.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, paddingRight: PAD.md }}>
              <Eyebrow style={{ color: 'rgba(243,237,226,0.6)', fontSize: EYEBROW_SIZE }}>{(run.country || '—').toUpperCase()}</Eyebrow>
              <TText
                variant="serif"
                style={{
                  fontSize: Math.min(cardW * 0.07, 26),
                  color: c.paper,
                  lineHeight: Math.min(cardW * 0.08, 28),
                  letterSpacing: -0.4,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {run.city || run.title}
              </TText>
            </View>
            <View style={{
              borderWidth: 1.2, borderColor: 'rgba(243,237,226,0.55)', borderRadius: 4,
              paddingHorizontal: 8, paddingVertical: 4,
            }}>
              <TText variant="mono" style={{ fontSize: 9, color: 'rgba(243,237,226,0.7)', letterSpacing: 1 }}>
                NO. {run.id.slice(0, 6).toUpperCase()}
              </TText>
            </View>
          </View>
        </View>

        {/* Denomination — distance dominates the card */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: PAD.md }}>
          <View style={{ alignItems: 'center' }}>
            <Eyebrow style={{ color: 'rgba(243,237,226,0.55)', fontSize: EYEBROW_SIZE }}>DISTANCE</Eyebrow>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 6 }}>
              <TText
                variant="monoSemi"
                style={{
                  fontSize: denomFont,
                  lineHeight: denomFont,
                  letterSpacing: -3,
                  color: c.paper,
                }}
              >
                {fmtDist(run.distance, units)}
              </TText>
              <TText style={{ fontSize: 16, color: 'rgba(243,237,226,0.7)', marginLeft: 6, letterSpacing: 0.5 }}>
                {distUnit(units).toUpperCase()}
              </TText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
              <TText variant="mono" style={{ fontSize: 12, color: 'rgba(243,237,226,0.75)' }}>{fmtPace(run.pace, units)}</TText>
              <Dot />
              <TText variant="mono" style={{ fontSize: 12, color: 'rgba(243,237,226,0.75)' }}>{fmtTime(run.seconds)}</TText>
              {run.elev > 0 && (
                <>
                  <Dot />
                  <TText variant="mono" style={{ fontSize: 12, color: 'rgba(243,237,226,0.75)' }}>{run.elev}m</TText>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Postmark — bottom-right */}
        <View style={{ position: 'absolute', bottom: PAD.md + 4, right: PAD.md + 4 }}>
          <PostmarkCircle
            dateLabel={`${run.day.toUpperCase()} · ${formatMonthDay(run.date)}`}
            paceLabel={`${fmtPace(run.pace, units)} /${distUnit(units)}`}
          />
        </View>

        {/* Title strip — bottom-left */}
        <View style={{ position: 'absolute', bottom: PAD.md + 6, left: PAD.lg, maxWidth: cardW * 0.52 }}>
          <Eyebrow style={{ color: 'rgba(243,237,226,0.55)', fontSize: EYEBROW_SIZE }}>RUN NO.</Eyebrow>
          <TText
            variant="serifItalic"
            style={{ fontSize: 14, color: c.paper, lineHeight: 17, marginTop: 2 }}
            numberOfLines={2}
          >
            {run.title}
          </TText>
        </View>

        {/* Air-mail accent stripes at the bottom edge. */}
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, flexDirection: 'row' }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: i % 2 === 0 ? c.accent : c.paper }} />
          ))}
        </View>
      </View>

      {/* Perforated outer ring — drawn last so the notches reveal the paper
          backdrop beneath the stamp body. */}
      <PerforatedFrame width={width} height={height} inset={inset} paperColor={c.paper} />
    </View>
  );
}

function Dot() {
  return <TText style={{ color: 'rgba(243,237,226,0.4)' }}>·</TText>;
}

function PerforatedFrame({ width, height, inset, paperColor }: { width: number; height: number; inset: number; paperColor: string }) {
  const notchR = Math.max(3, Math.round(inset * 0.45));
  const horizontalCount = Math.max(8, Math.round((width - inset * 2) / (notchR * 3.2)));
  const verticalCount = Math.max(10, Math.round((height - inset * 2) / (notchR * 3.2)));

  const notches: { cx: number; cy: number }[] = [];
  for (let i = 1; i < horizontalCount; i++) {
    const cx = inset + ((width - inset * 2) * i) / horizontalCount;
    notches.push({ cx, cy: inset });
    notches.push({ cx, cy: height - inset });
  }
  for (let i = 1; i < verticalCount; i++) {
    const cy = inset + ((height - inset * 2) * i) / verticalCount;
    notches.push({ cx: inset, cy });
    notches.push({ cx: width - inset, cy });
  }
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

interface PostmarkCircleProps {
  dateLabel: string;
  paceLabel: string;
}

// Compact postmark — date wedge in the centre, pace curved along the bottom
// arc, classic horizontal cancel bars. Previously this component took the
// props but rendered nothing inside the rings.
function PostmarkCircle({ dateLabel, paceLabel }: PostmarkCircleProps) {
  const size = 86;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = cx - 2;
  const innerR = outerR - 9;
  const textR = outerR - 5;
  const stroke = 'rgba(243,237,226,0.85)';
  const dateColor = '#f3ede2';

  const bottomArcId = `pm-bot-arc-${Math.round(size)}`;
  const botArcD = `M ${cx + textR} ${cy} A ${textR} ${textR} 0 0 1 ${cx - textR} ${cy}`;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <Path id={bottomArcId} d={botArcD} />
      </Defs>

      <Circle cx={cx} cy={cy} r={outerR} fill="none" stroke={stroke} strokeWidth={1.3} strokeDasharray="2 2" />
      <Circle cx={cx} cy={cy} r={innerR} fill="none" stroke={stroke} strokeWidth={0.9} />

      {/* Horizontal cancel bar above the date wedge. */}
      <Line x1={cx - innerR * 0.78} y1={cy - innerR * 0.32} x2={cx + innerR * 0.78} y2={cy - innerR * 0.32} stroke={stroke} strokeWidth={0.6} opacity={0.7} />
      <Line x1={cx - innerR * 0.78} y1={cy + innerR * 0.42} x2={cx + innerR * 0.78} y2={cy + innerR * 0.42} stroke={stroke} strokeWidth={0.6} opacity={0.55} />

      {/* Date in the centre. */}
      <SvgText
        x={cx}
        y={cy + 4}
        fontSize={10.5}
        fill={dateColor}
        textAnchor="middle"
        fontFamily="JetBrainsMono_600SemiBold"
        letterSpacing={1.2}
      >
        {dateLabel}
      </SvgText>

      {/* Pace curved along the bottom arc. */}
      <SvgText
        fill="rgba(243,237,226,0.75)"
        fontSize={7.2}
        letterSpacing={1.4}
        fontFamily="JetBrainsMono_400Regular"
      >
        <TextPath href={`#${bottomArcId}`} startOffset="50%" textAnchor="middle">
          {paceLabel}
        </TextPath>
      </SvgText>
    </Svg>
  );
}
