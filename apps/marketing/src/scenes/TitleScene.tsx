import { interpolate, spring, useCurrentFrame, useVideoConfig, AbsoluteFill } from "remotion";
import { colors, fonts } from "../theme";
import { Eyebrow } from "../components/Eyebrow";
import type { LaunchVideoProps } from "../LaunchVideo";

export const TitleScene: React.FC<LaunchVideoProps> = ({ orientation }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = spring({ frame, fps, config: { damping: 18, mass: 0.6 } });
  const tickShift = interpolate(frame, [60, 90], [0, -14], { extrapolateRight: "clamp" });

  const portraitLayout = orientation === "portrait";
  const titleSize = portraitLayout ? 150 : 168;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.paper,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: portraitLayout ? "0 80px" : "0 160px",
      }}
    >
      <div
        style={{
          opacity: fadeIn,
          transform: `translateY(${tickShift}px)`,
          textAlign: "center",
          maxWidth: portraitLayout ? 900 : 1500,
        }}
      >
        <Eyebrow color={colors.accent} size={24} style={{ marginBottom: 40 }}>
          Runstamp · Open Beta · 2026
        </Eyebrow>
        <div
          style={{
            fontFamily: fonts.display,
            fontStyle: "italic",
            fontSize: titleSize,
            fontWeight: 900,
            color: colors.ink,
            lineHeight: 0.96,
            letterSpacing: "-0.03em",
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
