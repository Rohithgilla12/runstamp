import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";
import { Eyebrow } from "../components/Eyebrow";
import type { LaunchVideoProps } from "../LaunchVideo";

// Three stamps land in sequence with a postmark "thump" on each. Each stamp
// is built from primitive SVG — same vocabulary as the mobile app's
// StampBadge.

interface StampDef {
  id: string;
  title: string;
  tier: "common" | "rare" | "mythic";
  body: React.ReactElement;
}

const stamps: StampDef[] = [
  {
    id: "marathon",
    title: "Marathon",
    tier: "rare",
    body: (
      <g>
        <circle cx="100" cy="100" r="78" fill="none" stroke={colors.ink} strokeWidth={2.4} />
        <text x="100" y="92" textAnchor="middle" fontFamily={fonts.display} fontStyle="italic" fontSize="36" fill={colors.ink}>42.2</text>
        <text x="100" y="120" textAnchor="middle" fontFamily={fonts.mono} fontSize="10" letterSpacing="3" fill={colors.ink2}>KILOMETRES</text>
      </g>
    ),
  },
  {
    id: "five_continents",
    title: "Five Continents",
    tier: "mythic",
    body: (
      <g>
        <circle cx="100" cy="100" r="78" fill={colors.accent} />
        <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(20,17,13,0.32)" strokeWidth={1.4} strokeDasharray="2 4" />
        <text x="100" y="92" textAnchor="middle" fontFamily={fonts.display} fontStyle="italic" fontSize="32" fill={colors.ink}>5</text>
        <text x="100" y="120" textAnchor="middle" fontFamily={fonts.mono} fontSize="10" letterSpacing="3" fill={colors.ink}>CONTINENTS</text>
      </g>
    ),
  },
  {
    id: "monsoon_run",
    title: "Monsoon long run",
    tier: "common",
    body: (
      <g>
        <circle cx="100" cy="100" r="78" fill="none" stroke={colors.moss} strokeWidth={2.4} />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1={100 + Math.cos((i / 12) * Math.PI * 2) * 50} y1={100 + Math.sin((i / 12) * Math.PI * 2) * 50}
                       x2={100 + Math.cos((i / 12) * Math.PI * 2) * 64} y2={100 + Math.sin((i / 12) * Math.PI * 2) * 64}
            stroke={colors.moss} strokeWidth={1.6} />
        ))}
        <text x="100" y="96" textAnchor="middle" fontFamily={fonts.display} fontStyle="italic" fontSize="24" fill={colors.moss}>15+</text>
        <text x="100" y="120" textAnchor="middle" fontFamily={fonts.mono} fontSize="9" letterSpacing="3" fill={colors.moss}>MONSOON · IN</text>
      </g>
    ),
  },
];

export const StampsScene: React.FC<LaunchVideoProps> = ({ orientation }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const portraitLayout = orientation === "portrait";
  const perStamp = 50;
  const startFrame = 20;

  const layoutDirection = portraitLayout ? ("column" as const) : ("row" as const);
  const gap = portraitLayout ? 36 : 80;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.paper }}>
      <div style={{ position: "absolute", top: portraitLayout ? 110 : 80, left: 80, right: 80, textAlign: portraitLayout ? "center" : "left" }}>
        <Eyebrow color={colors.accent} size={22} style={{ marginBottom: 18 }}>Stamps</Eyebrow>
        <div style={{ fontFamily: fonts.display, fontStyle: "italic", fontSize: portraitLayout ? 88 : 104, fontWeight: 900, lineHeight: 1.0, letterSpacing: "-0.02em", color: colors.ink }}>
          Earned by <span style={{ color: colors.accent }}>running</span>.
        </div>
        <div style={{ fontFamily: fonts.ui, fontSize: portraitLayout ? 34 : 30, color: colors.ink3, marginTop: 18 }}>
          Not by opening the app. Boston, Mythic city, monsoon long run — all yours.
        </div>
      </div>

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: layoutDirection, alignItems: "center", justifyContent: "center", gap, paddingTop: portraitLayout ? 360 : 80, paddingBottom: portraitLayout ? 120 : 60 }}>
        {stamps.map((stamp, i) => {
          const local = frame - (startFrame + i * perStamp);
          const enter = spring({ frame: Math.max(0, local), fps, config: { damping: 11, mass: 0.6 } });
          const rotation = interpolate(enter, [0, 1], [-12, 0]);
          const thumpScale = interpolate(Math.max(0, local), [0, 18], [0, 1.4], { extrapolateRight: "clamp" });
          const thumpOpacity = interpolate(Math.max(0, local), [4, 28], [0.7, 0], { extrapolateRight: "clamp" });
          return (
            <div key={stamp.id} style={{ transform: `translateY(${(1 - enter) * 60}px) rotate(${rotation}deg) scale(${enter})`, opacity: enter, position: "relative" }}>
              <svg width="280" height="280" viewBox="0 0 200 200">
                {/* Postmark thump */}
                <circle cx="100" cy="100" r={56 * thumpScale} fill="none" stroke={colors.accent} strokeWidth={3} opacity={thumpOpacity} />
                {stamp.body}
              </svg>
              <div style={{ textAlign: "center", fontFamily: fonts.display, fontStyle: "italic", fontSize: 32, color: colors.ink, marginTop: 8 }}>
                {stamp.title}
              </div>
              <Eyebrow color={tierColor(stamp.tier)} size={14} style={{ display: "block", textAlign: "center", marginTop: 4 }}>
                {stamp.tier.toUpperCase()}
              </Eyebrow>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

function tierColor(t: StampDef["tier"]): string {
  if (t === "mythic") return colors.accent;
  if (t === "rare") return colors.ink;
  return colors.moss;
}
