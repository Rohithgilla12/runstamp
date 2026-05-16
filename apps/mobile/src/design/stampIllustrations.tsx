import React from 'react';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

// Per-stamp illustration components. Each renders inside 200x200 viewBox at
// the requested size with the requested stroke colours. Multi-layer Mythic
// stamps accept `shadow` and `foil` colours too; single-layer stamps ignore
// the optional colours and render only with `ink`.

export interface IllustrationColors {
  ink: string;
  accent?: string;   // unused at v0 — reserved for Rare overlay layer
  shadow?: string;   // Mythic only
  foil?: string;     // Mythic only
}

interface Props {
  size: number;
  colors: IllustrationColors;
}

const STROKE = 2.4;
const LINE_PROPS = {
  strokeWidth: STROKE,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
};

// ── Tata Mumbai Marathon — Gateway of India ────────────────────────────────
export function TataMumbaiMarathonIllustration({ size, colors }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <G stroke={colors.ink} {...LINE_PROPS}>
        <Line x1={14} y1={184} x2={186} y2={184} />
        <Rect x={22} y={170} width={156} height={14} />
        <Path d="M 24 170 L 24 42 L 176 42 L 176 170" />
        <Line x1={24} y1={74} x2={176} y2={74} />
        <Line x1={36} y1={100} x2={164} y2={100} />
        <Path d="M 78 170 L 78 110 A 22 22 0 0 1 122 110 L 122 170" />
        <Path d="M 38 170 L 38 138 A 12 12 0 0 1 62 138 L 62 170" />
        <Path d="M 138 170 L 138 138 A 12 12 0 0 1 162 138 L 162 170" />
        <Rect x={50} y={50} width={8} height={18} />
        <Rect x={96} y={50} width={8} height={18} />
        <Rect x={142} y={50} width={8} height={18} />
        <Line x1={72} y1={50} x2={72} y2={68} />
        <Line x1={86} y1={50} x2={86} y2={68} />
        <Line x1={114} y1={50} x2={114} y2={68} />
        <Line x1={128} y1={50} x2={128} y2={68} />
        {/* Four corner turrets */}
        {[26, 68, 116, 158].map((x) => (
          <G key={x}>
            <Line x1={x} y1={42} x2={x} y2={26} />
            <Line x1={x + 16} y1={42} x2={x + 16} y2={26} />
            <Line x1={x - 4} y1={26} x2={x + 20} y2={26} />
            <Path d={`M ${x - 2} 26 Q ${x + 8} 6 ${x + 18} 26`} />
            <Line x1={x + 8} y1={10} x2={x + 8} y2={4} />
          </G>
        ))}
      </G>
    </Svg>
  );
}

// ── Hyderabad Marathon — Charminar ─────────────────────────────────────────
export function HyderabadMarathonIllustration({ size, colors }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <G stroke={colors.ink} {...LINE_PROPS}>
        <Line x1={14} y1={184} x2={186} y2={184} />
        <Rect x={20} y={170} width={160} height={14} />
        <Line x1={42} y1={170} x2={42} y2={124} />
        <Line x1={158} y1={170} x2={158} y2={124} />
        <Path d="M 78 170 L 78 138 A 22 22 0 0 1 122 138 L 122 170" />
        <Line x1={42} y1={124} x2={158} y2={124} />
        <Line x1={42} y1={120} x2={158} y2={120} />
        <Path d="M 56 120 L 56 108 A 6 6 0 0 1 68 108 L 68 120" />
        <Path d="M 80 120 L 80 100 A 10 10 0 0 1 100 100 L 100 120" />
        <Path d="M 100 120 L 100 100 A 10 10 0 0 1 120 100 L 120 120" />
        <Path d="M 132 120 L 132 108 A 6 6 0 0 1 144 108 L 144 120" />
        <Line x1={42} y1={92} x2={158} y2={92} />
        <Path d="M 84 92 Q 100 60 116 92" />
        <Line x1={100} y1={58} x2={100} y2={50} />
      </G>
      <Circle cx={100} cy={48} r={1.6} fill={colors.ink} />
      {/* Minarets */}
      {[[30, 42], [158, 170]].map(([x1, x2], idx) => (
        <G key={idx} stroke={colors.ink} {...LINE_PROPS}>
          <Line x1={x1} y1={170} x2={x1} y2={44} />
          <Line x1={x2} y1={170} x2={x2} y2={44} />
          <Line x1={x1 - 4} y1={142} x2={x2 + 4} y2={142} />
          <Line x1={x1 - 4} y1={108} x2={x2 + 4} y2={108} />
          <Line x1={x1 - 4} y1={74} x2={x2 + 4} y2={74} />
          <Line x1={x1 - 4} y1={44} x2={x2 + 4} y2={44} />
          <Path d={`M ${x1 - 2} 44 Q ${(x1 + x2) / 2} 22 ${x2 + 2} 44`} />
          <Line x1={(x1 + x2) / 2} y1={22} x2={(x1 + x2) / 2} y2={14} />
        </G>
      ))}
      <Circle cx={36} cy={12} r={1.6} fill={colors.ink} />
      <Circle cx={164} cy={12} r={1.6} fill={colors.ink} />
    </Svg>
  );
}

// ── Bengaluru Marathon — Vidhana Soudha ────────────────────────────────────
export function BengaluruMarathonIllustration({ size, colors }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <G stroke={colors.ink} {...LINE_PROPS}>
        <Line x1={6} y1={186} x2={194} y2={186} />
        <Line x1={20} y1={172} x2={180} y2={172} />
        <Line x1={14} y1={180} x2={186} y2={180} />
        <Line x1={14} y1={172} x2={14} y2={116} />
        <Line x1={186} y1={172} x2={186} y2={116} />
        <Line x1={14} y1={116} x2={186} y2={116} />
        <Line x1={14} y1={112} x2={186} y2={112} />
        <Line x1={34} y1={172} x2={34} y2={116} />
        <Line x1={166} y1={172} x2={166} y2={116} />
        <Rect x={20} y={140} width={8} height={20} />
        <Rect x={40} y={140} width={8} height={20} />
        <Rect x={152} y={140} width={8} height={20} />
        <Rect x={172} y={140} width={8} height={20} />
        <Line x1={62} y1={172} x2={62} y2={116} />
        <Line x1={62} y1={116} x2={138} y2={116} />
        <Line x1={138} y1={172} x2={138} y2={116} />
        {[72, 84, 96, 104, 116, 128].map((x) => (
          <Line key={x} x1={x} y1={170} x2={x} y2={120} />
        ))}
        <Line x1={66} y1={120} x2={134} y2={120} />
        <Rect x={72} y={80} width={56} height={32} />
        <Line x1={72} y1={86} x2={128} y2={86} />
        <Line x1={80} y1={92} x2={80} y2={106} />
        <Line x1={100} y1={92} x2={100} y2={106} />
        <Line x1={120} y1={92} x2={120} y2={106} />
        <Path d="M 70 80 Q 100 30 130 80" />
        <Path d="M 84 78 Q 84 60 92 50" />
        <Path d="M 116 78 Q 116 60 108 50" />
        <Line x1={100} y1={78} x2={100} y2={40} />
        <Line x1={92} y1={40} x2={108} y2={40} />
        <Line x1={100} y1={38} x2={100} y2={22} />
      </G>
      <Circle cx={100} cy={20} r={2} fill={colors.ink} />
      <G stroke={colors.ink} {...LINE_PROPS}>
        <Line x1={100} y1={18} x2={100} y2={10} />
        <Path d="M 30 116 Q 42 100 54 116" />
        <Line x1={42} y1={100} x2={42} y2={92} />
        <Path d="M 146 116 Q 158 100 170 116" />
        <Line x1={158} y1={100} x2={158} y2={92} />
      </G>
    </Svg>
  );
}

// ── Vedanta Delhi Half — Lotus Temple ──────────────────────────────────────
export function VedantaDelhiHalfIllustration({ size, colors }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <G stroke={colors.ink} {...LINE_PROPS}>
        <Path d="M 26 188 Q 100 196 174 188" />
        <Path d="M 32 184 Q 100 190 168 184" />
        <Line x1={46} y1={174} x2={154} y2={174} />
        <Line x1={38} y1={180} x2={162} y2={180} />
        <Path d="M 22 168 Q 8 110 36 60 Q 64 32 100 28" />
        <Path d="M 178 168 Q 192 110 164 60 Q 136 32 100 28" />
        <Path d="M 50 174 Q 38 110 60 60 Q 80 36 100 28" />
        <Path d="M 150 174 Q 162 110 140 60 Q 120 36 100 28" />
        <Path d="M 76 174 Q 70 110 86 56 Q 94 32 100 28" />
        <Path d="M 124 174 Q 130 110 114 56 Q 106 32 100 28" />
        <Line x1={100} y1={174} x2={100} y2={32} />
        <Line x1={100} y1={28} x2={100} y2={18} />
      </G>
      <Circle cx={100} cy={16} r={1.6} fill={colors.ink} />
    </Svg>
  );
}

// ── Ladakh Marathon — Stupa + Himalayan peak + prayer flags (Mythic 3-layer)
export function LadakhMarathonIllustration({ size, colors }: Props) {
  const shadow = colors.shadow ?? colors.ink;
  const foil = colors.foil ?? colors.accent ?? colors.ink;
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {/* Shadow plate: Himalayan ridge behind the stupa */}
      <G stroke={shadow} {...LINE_PROPS}>
        <Path d="M 8 132 L 60 38 L 96 90 L 138 30 L 192 118" />
        <Path d="M 30 110 L 68 80 L 84 96 L 106 76 L 132 100 L 168 76 L 186 100" />
        <Line x1={6} y1={172} x2={194} y2={172} />
      </G>
      {/* Ink plate: the stupa */}
      <G stroke={colors.ink} {...LINE_PROPS}>
        <Rect x={60} y={158} width={80} height={14} />
        <Rect x={68} y={146} width={64} height={12} />
        <Rect x={76} y={134} width={48} height={12} />
        <Path d="M 78 134 Q 100 78 122 134" />
        <Rect x={92} y={76} width={16} height={12} />
        <Path d="M 92 76 L 100 50 L 108 76" />
        <Line x1={94} y1={68} x2={106} y2={68} />
        <Line x1={96} y1={60} x2={104} y2={60} />
        <Line x1={92} y1={50} x2={108} y2={50} />
        <Line x1={94} y1={44} x2={106} y2={44} />
        <Line x1={96} y1={38} x2={104} y2={38} />
        <Line x1={100} y1={38} x2={100} y2={30} />
      </G>
      <Circle cx={100} cy={28} r={1.8} fill={colors.ink} />
      {/* Foil plate: prayer-flag line — the warm pop */}
      <G stroke={foil} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <Path d="M 18 26 Q 80 48 138 30 Q 168 22 188 38" />
        <Path d="M 36 32 L 36 42 L 44 38 Z" fill={foil} />
        <Path d="M 64 40 L 64 50 L 72 46 Z" fill={foil} />
        <Path d="M 96 42 L 96 52 L 104 48 Z" fill={foil} />
        <Path d="M 128 36 L 128 46 L 136 42 Z" fill={foil} />
        <Path d="M 160 30 L 160 40 L 168 36 Z" fill={foil} />
      </G>
    </Svg>
  );
}

// ── Indian Metros 3 — Gateway + Charminar + Vidhana Soudha frieze ──────────
export function IndianMetros3Illustration({ size, colors }: Props) {
  // Three landmarks across a horizontal frieze, each scaled down + offset.
  // The component reuses the source 200x200 geometries by transforming each
  // into a 60-unit-wide slot. ViewBox stays 200x200; landmarks sit on a
  // shared baseline at y ≈ 175.
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {/* Frieze ground line */}
      <G stroke={colors.ink} {...LINE_PROPS}>
        <Line x1={6} y1={186} x2={194} y2={186} />
        <Line x1={6} y1={188} x2={194} y2={188} strokeWidth={0.8} />
      </G>

      {/* Caption banner above the frieze */}
      <G stroke={colors.ink} strokeWidth={1.4} fill="none" strokeLinecap="round">
        <Line x1={20} y1={36} x2={180} y2={36} />
        <Line x1={20} y1={42} x2={180} y2={42} strokeWidth={0.6} />
      </G>

      {/* Slot 1: Gateway of India — left, scaled to ~28% (factor 0.32, dx=-10, dy=22) */}
      <G transform="translate(-2, 38) scale(0.32)">
        <G stroke={colors.ink} {...LINE_PROPS}>
          <Rect x={22} y={170} width={156} height={14} />
          <Path d="M 24 170 L 24 42 L 176 42 L 176 170" />
          <Line x1={24} y1={74} x2={176} y2={74} />
          <Path d="M 78 170 L 78 110 A 22 22 0 0 1 122 110 L 122 170" />
          <Path d="M 38 170 L 38 138 A 12 12 0 0 1 62 138 L 62 170" />
          <Path d="M 138 170 L 138 138 A 12 12 0 0 1 162 138 L 162 170" />
          {[26, 68, 116, 158].map((x) => (
            <G key={x}>
              <Line x1={x} y1={42} x2={x} y2={26} />
              <Line x1={x + 16} y1={42} x2={x + 16} y2={26} />
              <Path d={`M ${x - 2} 26 Q ${x + 8} 6 ${x + 18} 26`} />
            </G>
          ))}
        </G>
      </G>

      {/* Slot 2: Charminar — centre */}
      <G transform="translate(66, 38) scale(0.32)">
        <G stroke={colors.ink} {...LINE_PROPS}>
          <Rect x={20} y={170} width={160} height={14} />
          <Line x1={42} y1={170} x2={42} y2={124} />
          <Line x1={158} y1={170} x2={158} y2={124} />
          <Path d="M 78 170 L 78 138 A 22 22 0 0 1 122 138 L 122 170" />
          <Line x1={42} y1={124} x2={158} y2={124} />
          <Line x1={42} y1={92} x2={158} y2={92} />
          <Path d="M 84 92 Q 100 60 116 92" />
          {[[30, 42], [158, 170]].map(([x1, x2], idx) => (
            <G key={idx}>
              <Line x1={x1} y1={170} x2={x1} y2={44} />
              <Line x1={x2} y1={170} x2={x2} y2={44} />
              <Line x1={x1 - 4} y1={108} x2={x2 + 4} y2={108} />
              <Line x1={x1 - 4} y1={74} x2={x2 + 4} y2={74} />
              <Path d={`M ${x1 - 2} 44 Q ${(x1 + x2) / 2} 22 ${x2 + 2} 44`} />
            </G>
          ))}
        </G>
      </G>

      {/* Slot 3: Vidhana Soudha — right */}
      <G transform="translate(134, 38) scale(0.32)">
        <G stroke={colors.ink} {...LINE_PROPS}>
          <Line x1={14} y1={180} x2={186} y2={180} />
          <Line x1={14} y1={172} x2={186} y2={172} />
          <Line x1={14} y1={172} x2={14} y2={116} />
          <Line x1={186} y1={172} x2={186} y2={116} />
          <Line x1={14} y1={116} x2={186} y2={116} />
          <Line x1={62} y1={172} x2={62} y2={116} />
          <Line x1={138} y1={172} x2={138} y2={116} />
          {[72, 84, 96, 104, 116, 128].map((x) => (
            <Line key={x} x1={x} y1={170} x2={x} y2={120} />
          ))}
          <Path d="M 70 80 Q 100 30 130 80" />
          <Line x1={100} y1={78} x2={100} y2={40} />
          <Line x1={92} y1={40} x2={108} y2={40} />
          <Line x1={100} y1={38} x2={100} y2={22} />
          <Path d="M 30 116 Q 42 100 54 116" />
          <Path d="M 146 116 Q 158 100 170 116" />
        </G>
      </G>
    </Svg>
  );
}

// ── Monsoon Run — Banyan tree with rain ────────────────────────────────────
export function MonsoonRunIllustration({ size, colors }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <G stroke={colors.ink} {...LINE_PROPS}>
        <Line x1={14} y1={184} x2={186} y2={184} />
        <Path d="M 92 184 Q 88 160 96 132 Q 92 112 100 96" />
        <Path d="M 108 184 Q 112 160 104 132 Q 108 112 100 96" />
        <Path d="M 56 184 Q 52 160 60 142 Q 58 120 66 108" />
        <Path d="M 144 184 Q 148 160 140 142 Q 142 120 134 108" />
        <Path d="M 32 184 Q 36 162 44 146" />
        <Path d="M 168 184 Q 164 162 156 146" />
        <Path d="M 22 100 Q 18 70 36 50 Q 60 32 100 30 Q 140 32 164 50 Q 182 70 178 100" />
        <Path d="M 22 100 Q 36 116 56 110 Q 80 118 100 112 Q 120 118 144 110 Q 164 116 178 100" />
        <Line x1={68} y1={112} x2={68} y2={162} />
        <Line x1={82} y1={114} x2={82} y2={150} />
        <Line x1={118} y1={114} x2={118} y2={150} />
        <Line x1={132} y1={112} x2={132} y2={162} />
        <Path d="M 48 68 Q 60 60 72 68" />
        <Path d="M 88 50 Q 100 42 112 50" />
        <Path d="M 128 68 Q 140 60 152 68" />
        <Line x1={8} y1={22} x2={4} y2={34} />
        <Line x1={28} y1={14} x2={24} y2={26} />
        <Line x1={50} y1={10} x2={46} y2={22} />
        <Line x1={100} y1={6} x2={96} y2={18} />
        <Line x1={150} y1={10} x2={146} y2={22} />
        <Line x1={172} y1={14} x2={168} y2={26} />
        <Line x1={192} y1={22} x2={188} y2={34} />
      </G>
      {[
        [40, 116, 1], [38, 128, 1], [40, 140, 0.8],
        [160, 116, 1], [162, 128, 1], [160, 140, 0.8],
        [22, 118, 0.8], [178, 118, 0.8], [100, 124, 0.8],
      ].map(([cx, cy, r], i) => (
        <Circle key={i} cx={cx} cy={cy} r={r} fill={colors.ink} />
      ))}
    </Svg>
  );
}

// ── Dispatcher ─────────────────────────────────────────────────────────────

const REGISTRY: Record<string, React.ComponentType<Props>> = {
  tata_mumbai_marathon: TataMumbaiMarathonIllustration,
  hyderabad_marathon: HyderabadMarathonIllustration,
  bengaluru_marathon: BengaluruMarathonIllustration,
  vedanta_delhi_half: VedantaDelhiHalfIllustration,
  ladakh_marathon: LadakhMarathonIllustration,
  monsoon_run: MonsoonRunIllustration,
  indian_metros_3: IndianMetros3Illustration,
};

export function hasIllustration(stampId: string): boolean {
  return stampId in REGISTRY;
}

export function StampIllustration({ stampId, size, colors }: {
  stampId: string;
  size: number;
  colors: IllustrationColors;
}) {
  const Component = REGISTRY[stampId];
  if (!Component) return null;
  return <Component size={size} colors={colors} />;
}
