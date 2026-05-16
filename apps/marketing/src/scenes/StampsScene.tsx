// StampsScene v2 — three stamps land sequentially with HTML labels (the v1
// SVG-text-inside-circle bug made the Mythic stamp render as an empty
// orange disk). Each stamp's "body" is a self-contained SVG, the title +
// tier badge sit beneath as plain HTML — readable, debuggable, and gives
// the typography room to breathe.

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";
import { Eyebrow } from "../components/Eyebrow";
import type { LaunchVideoProps } from "../LaunchVideo";

type Tier = "common" | "rare" | "mythic";

interface StampDef {
  id: string;
  title: string;
  caption: string;
  tier: Tier;
  body: React.ReactElement;
}

// All stamp art renders within a 200×200 viewBox; tier colour is supplied by
// each body so foil-orange Mythic stamps read right against the paper.
const stamps: StampDef[] = [
  {
    id: "marathon",
    title: "Marathon",
    caption: "42.2 km · stamped",
    tier: "rare",
    body: (
      <g>
        <circle cx="100" cy="100" r="84" fill={colors.paper2} stroke={colors.ink} strokeWidth={2.4} />
        <circle cx="100" cy="100" r="84" fill="none" stroke="rgba(20,17,13,0.40)" strokeWidth={1.2} strokeDasharray="2 4" />
        <circle cx="100" cy="100" r="64" fill="none" stroke={colors.ink} strokeWidth={1} />
        <line x1="36" y1="100" x2="50" y2="100" stroke={colors.ink} strokeWidth={1.4} />
        <line x1="150" y1="100" x2="164" y2="100" stroke={colors.ink} strokeWidth={1.4} />
        <text x="100" y="112" textAnchor="middle" fontFamily={fonts.serifItalic} fontSize="56" fill={colors.ink}>42</text>
      </g>
    ),
  },
  {
    id: "five_continents",
    title: "Five Continents",
    caption: "Run on five · earned",
    tier: "mythic",
    body: (
      <g>
        <circle cx="100" cy="100" r="84" fill={colors.accent} />
        <circle cx="100" cy="100" r="84" fill="none" stroke="rgba(20,17,13,0.32)" strokeWidth={1.4} strokeDasharray="2 4" />
        <circle cx="100" cy="100" r="68" fill="none" stroke="rgba(20,17,13,0.55)" strokeWidth={1} />
        {/* Five tiny continent silhouettes ringed around */}
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const r = 44;
          const cx = 100 + Math.cos(angle) * r;
          const cy = 100 + Math.sin(angle) * r;
          return <circle key={i} cx={cx} cy={cy} r={6} fill={colors.ink} />;
        })}
        <text x="100" y="116" textAnchor="middle" fontFamily={fonts.serifItalic} fontSize="44" fill={colors.ink}>5</text>
      </g>
    ),
  },
  {
    id: "monsoon_run",
    title: "Monsoon long run",
    caption: "15+ km in the rain",
    tier: "common",
    body: (
      <g>
        <circle cx="100" cy="100" r="84" fill={colors.paper2} stroke={colors.moss} strokeWidth={2.4} />
        {/* Rain lines */}
        {Array.from({ length: 14 }, (_, i) => {
          const x = 40 + (i * 9);
          const y0 = 28 + ((i * 7) % 22);
          return <line key={`rain-${i}`} x1={x} y1={y0} x2={x - 6} y2={y0 + 22} stroke={colors.moss} strokeWidth={1.6} strokeLinecap="round" opacity={0.55} />;
        })}
        {/* Footprint mark in the centre */}
        <ellipse cx="84" cy="118" rx="11" ry="16" fill={colors.moss} />
        <ellipse cx="116" cy="134" rx="11" ry="16" fill={colors.moss} opacity={0.65} />
        <text x="100" y="80" textAnchor="middle" fontFamily={fonts.serifItalic} fontSize="30" fill={colors.moss}>15+</text>
        <text x="100" y="172" textAnchor="middle" fontFamily="monospace" fontSize="9" letterSpacing="3" fill={colors.moss}>MONSOON · IN</text>
      </g>
    ),
  },
];

const PER_STAMP = 32;
const START = 10;

export const StampsScene: React.FC<LaunchVideoProps> = ({ orientation }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const portrait = orientation === "portrait";

  const headEnter = spring({ frame, fps, config: { damping: 18, mass: 0.6 } });

  // Layout: portrait = 1 column, landscape = 3 across
  const direction = portrait ? ("column" as const) : ("row" as const);
  const gap = portrait ? 28 : 80;
  const stampSize = portrait ? 260 : 280;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.paper }}>
      <div
        style={{
          position: "absolute",
          top: portrait ? 110 : 80,
          left: 80,
          right: 80,
          textAlign: portrait ? "center" : "left",
          opacity: headEnter,
          transform: `translateY(${(1 - headEnter) * -16}px)`,
        }}
      >
        <Eyebrow color={colors.accent} size={portrait ? 22 : 20} style={{ marginBottom: 16 }}>Stamps</Eyebrow>
        <div style={{ fontFamily: fonts.serifItalic, fontSize: portrait ? 96 : 104, fontWeight: 400, lineHeight: 1.0, letterSpacing: "-0.02em", color: colors.ink }}>
          Earned by <span style={{ color: colors.accent }}>running</span>.
        </div>
        <div style={{ fontFamily: fonts.ui, fontSize: portrait ? 30 : 26, color: colors.ink3, marginTop: 18, lineHeight: 1.4 }}>
          Not by opening the app. Twenty-three stamps live; Common, Rare, Mythic.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: direction,
          alignItems: "center",
          justifyContent: "center",
          gap,
          paddingTop: portrait ? 380 : 100,
          paddingBottom: portrait ? 80 : 60,
        }}
      >
        {stamps.map((stamp, i) => {
          const local = frame - (START + i * PER_STAMP);
          const enter = spring({ frame: Math.max(0, local), fps, config: { damping: 11, mass: 0.6 } });
          const rotation = interpolate(enter, [0, 1], [-12, 0]);
          const thumpScale = interpolate(Math.max(0, local), [0, 20], [0, 1.6], { extrapolateRight: "clamp" });
          const thumpOpacity = interpolate(Math.max(0, local), [4, 30], [0.6, 0], { extrapolateRight: "clamp" });
          return (
            <div
              key={stamp.id}
              style={{
                transform: `translateY(${(1 - enter) * 80}px) rotate(${rotation}deg) scale(${0.7 + enter * 0.3})`,
                opacity: enter,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{ position: "relative" }}>
                <svg width={stampSize} height={stampSize} viewBox="0 0 200 200" style={{ display: "block" }}>
                  {/* Postmark thump ring */}
                  <circle cx="100" cy="100" r={50 * thumpScale} fill="none" stroke={colors.accent} strokeWidth={3} opacity={thumpOpacity} />
                  {stamp.body}
                </svg>
              </div>
              <div style={{ fontFamily: fonts.serifItalic, fontSize: 32, color: colors.ink, marginTop: 10, textAlign: "center" }}>
                {stamp.title}
              </div>
              <div style={{ fontFamily: fonts.ui, fontSize: 16, color: colors.ink3, marginTop: 2, textAlign: "center" }}>
                {stamp.caption}
              </div>
              <div style={{ marginTop: 8 }}>
                <Eyebrow size={12} color={tierColor(stamp.tier)}>{stamp.tier.toUpperCase()}</Eyebrow>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

function tierColor(t: Tier): string {
  if (t === "mythic") return colors.accent;
  if (t === "rare") return colors.ink;
  return colors.moss;
}
