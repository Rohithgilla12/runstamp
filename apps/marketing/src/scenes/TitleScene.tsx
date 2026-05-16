import { interpolate, spring, useCurrentFrame, useVideoConfig, AbsoluteFill } from "remotion";
import { colors, fonts } from "../theme";
import { Eyebrow } from "../components/Eyebrow";
import type { LaunchVideoProps } from "../LaunchVideo";

export const TitleScene: React.FC<LaunchVideoProps> = ({ orientation }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = spring({ frame, fps, config: { damping: 18, mass: 0.6 } });

  // Postmark "thump" — a circle that scales up and fades out, landing on the
  // word "stamp" to make the title hit harder. Brand-reinforcement, not decor.
  const thumpStart = 20;
  const thumpScale = interpolate(frame, [thumpStart, thumpStart + 20], [0, 2.2], { extrapolateRight: "clamp" });
  const thumpOpacity = interpolate(frame, [thumpStart + 4, thumpStart + 36], [0.7, 0], { extrapolateRight: "clamp" });

  const portrait = orientation === "portrait";
  const titleSize = portrait ? 160 : 184;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.paper,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: portrait ? "0 80px" : "0 160px",
      }}
    >
      <div
        style={{
          opacity: fadeIn,
          transform: `translateY(${(1 - fadeIn) * -16}px)`,
          textAlign: "center",
          maxWidth: portrait ? 980 : 1500,
          position: "relative",
        }}
      >
        {/* Postmark ring behind the title */}
        <svg
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
          width={portrait ? 760 : 880}
          height={portrait ? 760 : 880}
          viewBox="0 0 200 200"
        >
          <circle cx="100" cy="100" r={70} fill="none" stroke={colors.accent} strokeWidth={1.2} strokeDasharray="2 4" opacity={thumpOpacity} style={{ transform: `scale(${thumpScale})`, transformOrigin: "100px 100px" }} />
          <circle cx="100" cy="100" r={56} fill="none" stroke={colors.accent} strokeWidth={0.8} opacity={thumpOpacity * 0.6} style={{ transform: `scale(${thumpScale})`, transformOrigin: "100px 100px" }} />
        </svg>

        <Eyebrow color={colors.accent} size={portrait ? 24 : 22} style={{ marginBottom: 36 }}>
          Runstamp · Open Beta · 2026
        </Eyebrow>
        <div
          style={{
            fontFamily: fonts.serifItalic,
            fontSize: titleSize,
            fontWeight: 400,
            color: colors.ink,
            lineHeight: 0.98,
            letterSpacing: "-0.025em",
            position: "relative",
          }}
        >
          Collect a stamp
          <br />
          for every run.
        </div>
      </div>
    </AbsoluteFill>
  );
};
