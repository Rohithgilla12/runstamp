import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";
import { Eyebrow } from "../components/Eyebrow";
import type { LaunchVideoProps } from "../LaunchVideo";

export const OutroScene: React.FC<LaunchVideoProps> = ({ orientation }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeIn = spring({ frame, fps, config: { damping: 18, mass: 0.6 } });
  const sealRotation = interpolate(frame, [0, 90], [-8, 0]);
  const sealScale = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 12, mass: 0.5 } });
  const portraitLayout = orientation === "portrait";

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.ink,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: portraitLayout ? "0 80px" : "0 160px",
      }}
    >
      <div style={{ opacity: fadeIn, textAlign: "center", color: colors.paper }}>
        <div
          style={{
            fontFamily: fonts.serifItalic,
            fontSize: portraitLayout ? 156 : 184,
            fontWeight: 900,
            lineHeight: 0.96,
            letterSpacing: "-0.03em",
            color: colors.paper,
          }}
        >
          Runstamp
        </div>
        <div style={{ marginTop: 28 }}>
          <Eyebrow color="rgba(243,237,226,0.72)" size={26}>Free · open source · iOS + Android</Eyebrow>
        </div>
      </div>

      {/* Wax-seal style stamp — solar circle */}
      <div style={{ marginTop: portraitLayout ? 100 : 80, transform: `rotate(${sealRotation}deg) scale(${sealScale})` }}>
        <svg width={portraitLayout ? 320 : 280} height={portraitLayout ? 320 : 280} viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="86" fill={colors.accent} />
          <circle cx="100" cy="100" r="86" fill="none" stroke="rgba(20,17,13,0.32)" strokeWidth={1.4} strokeDasharray="2 4" />
          <circle cx="100" cy="100" r="68" fill="none" stroke="rgba(20,17,13,0.55)" strokeWidth={1} />
          <text x="100" y="84" textAnchor="middle" fontFamily={fonts.mono} fontSize="9" letterSpacing="3" fill="rgba(20,17,13,0.65)">RUNSTAMP</text>
          <text x="100" y="116" textAnchor="middle" fontFamily={fonts.serifItalic} fontSize="34" fill={colors.ink}>open</text>
          <text x="100" y="142" textAnchor="middle" fontFamily={fonts.mono} fontSize="9" letterSpacing="3" fill="rgba(20,17,13,0.65)">BETA · 2026</text>
        </svg>
      </div>

      <div style={{ marginTop: portraitLayout ? 60 : 50, opacity: fadeIn, color: "rgba(243,237,226,0.85)", fontFamily: fonts.mono, fontSize: portraitLayout ? 30 : 28, letterSpacing: "0.08em" }}>
        runstamp.gilla.fun
      </div>
    </AbsoluteFill>
  );
};
