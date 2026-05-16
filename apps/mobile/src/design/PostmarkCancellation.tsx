import React from 'react';
import Svg, { Circle, Defs, G, Line, Path, Text as SvgText, TextPath } from 'react-native-svg';

interface Props {
  size: number;
  color: string;
  /** Top arc text — typically the earn date. Wraps if longer than ~14 chars. */
  topText?: string;
  /** Bottom arc text — typically the city. Wraps if longer than ~14 chars. */
  bottomText?: string;
}

// Reusable postmark cancellation glyph. Three concentric rings + central
// 8-axis sun glyph + ink-bleed splotches. The whole thing is rotated -8° so
// it reads as "stamped at a slight angle" rather than "drawn precisely."
export function PostmarkCancellation({ size, color, topText, bottomText }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 88 88">
      <Defs>
        {/* Path for curved top text — runs left-to-right along the top of the outer ring */}
        <Path id="pm-top-arc" d="M 12 44 A 32 32 0 0 1 76 44" />
        {/* Path for curved bottom text — runs left-to-right along the bottom */}
        <Path id="pm-bottom-arc" d="M 76 44 A 32 32 0 0 1 12 44" />
      </Defs>
      <G transform="rotate(-8 44 44)">
        <Circle cx={44} cy={44} r={38} fill="none" stroke={color} strokeWidth={2.2} />
        <Circle cx={44} cy={44} r={32} fill="none" stroke={color} strokeWidth={1} />
        <Circle cx={44} cy={44} r={14} fill="none" stroke={color} strokeWidth={1.4} />
        {/* Central sun glyph — 8-axis radiating star */}
        <G stroke={color} strokeWidth={1.4} strokeLinecap="round" fill="none">
          <Line x1={44} y1={32} x2={44} y2={38} />
          <Line x1={44} y1={50} x2={44} y2={56} />
          <Line x1={32} y1={44} x2={38} y2={44} />
          <Line x1={50} y1={44} x2={56} y2={44} />
          <Line x1={34.5} y1={34.5} x2={38.5} y2={38.5} />
          <Line x1={49.5} y1={49.5} x2={53.5} y2={53.5} />
          <Line x1={34.5} y1={53.5} x2={38.5} y2={49.5} />
          <Line x1={49.5} y1={38.5} x2={53.5} y2={34.5} />
        </G>
        <Circle cx={44} cy={44} r={2.5} fill={color} />
        {/* Curved text along the ring */}
        {topText ? (
          <SvgText fill={color} fontSize={5} fontWeight="600" letterSpacing={1.4}>
            <TextPath href="#pm-top-arc" startOffset="50%" textAnchor="middle">
              {topText.toUpperCase()}
            </TextPath>
          </SvgText>
        ) : null}
        {bottomText ? (
          <SvgText fill={color} fontSize={5} fontWeight="600" letterSpacing={1.4}>
            <TextPath href="#pm-bottom-arc" startOffset="50%" textAnchor="middle">
              {bottomText.toUpperCase()}
            </TextPath>
          </SvgText>
        ) : null}
        {/* Ink-bleed splotches just outside the outer ring */}
        <Circle cx={6} cy={32} r={1.2} fill={color} />
        <Circle cx={4} cy={48} r={0.9} fill={color} />
        <Circle cx={10} cy={62} r={0.7} fill={color} />
        <Circle cx={82} cy={28} r={1.3} fill={color} />
        <Circle cx={84} cy={56} r={1} fill={color} />
        <Circle cx={58} cy={84} r={1.1} fill={color} />
        <Circle cx={36} cy={86} r={0.8} fill={color} />
        <Circle cx={78} cy={74} r={0.6} fill={color} />
      </G>
    </Svg>
  );
}
