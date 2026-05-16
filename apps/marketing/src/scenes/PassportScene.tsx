import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";
import { Eyebrow } from "../components/Eyebrow";
import { WorldMap } from "../components/WorldMap";
import type { LaunchVideoProps } from "../LaunchVideo";

const NUM_CITIES = 9;
const PIN_START = 18;
const PER_PIN = 12;

export const PassportScene: React.FC<LaunchVideoProps> = ({ orientation }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const portrait = orientation === "portrait";

  const headEnter = spring({ frame, fps, config: { damping: 18, mass: 0.6 } });
  const revealedCount = Math.min(NUM_CITIES, Math.max(0, Math.floor((frame - PIN_START) / PER_PIN) + 1));

  const labelOpacity = (i: number) => {
    const localFrame = frame - (PIN_START + i * PER_PIN);
    return interpolate(localFrame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  };

  const ringScale = (i: number) => {
    const localFrame = frame - (PIN_START + i * PER_PIN);
    return interpolate(localFrame, [0, 24], [0, 2.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  };

  const mapW = portrait ? 980 : 1500;
  const mapH = portrait ? 490 : 750;

  // Tally counter — animates from 0 to 9 (the cities we've shown) → final 47
  const tallyKm = Math.round(interpolate(frame, [40, 150], [0, 47], { extrapolateRight: "clamp" }));
  const countries = Math.round(interpolate(frame, [50, 150], [0, 6], { extrapolateRight: "clamp" }));

  return (
    <AbsoluteFill style={{ backgroundColor: colors.paper }}>
      {/* Headline */}
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
        <Eyebrow color={colors.accent} size={portrait ? 22 : 20} style={{ marginBottom: 16 }}>Passport</Eyebrow>
        <div style={{ fontFamily: fonts.serifItalic, fontSize: portrait ? 96 : 104, fontWeight: 400, lineHeight: 1.0, letterSpacing: "-0.02em", color: colors.ink }}>
          A stamp for <span style={{ color: colors.accent }}>every</span> city.
        </div>
        <div style={{ fontFamily: fonts.ui, fontSize: portrait ? 30 : 26, color: colors.ink3, marginTop: 18, lineHeight: 1.4 }}>
          Reverse-geocoded once, pinned to a map you've earned.
        </div>
      </div>

      {/* Map */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: portrait ? 160 : 30,
          paddingBottom: portrait ? 280 : 220,
        }}
      >
        <div style={{ filter: "drop-shadow(0 14px 40px rgba(20,17,13,0.10))" }}>
          <WorldMap
            width={mapW}
            height={mapH}
            revealedCount={revealedCount}
            labelOpacity={labelOpacity}
            ringScale={ringScale}
          />
        </div>
      </div>

      {/* Tally */}
      <div
        style={{
          position: "absolute",
          bottom: portrait ? 120 : 70,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <div style={{ display: "inline-flex", gap: portrait ? 60 : 100, alignItems: "baseline" }}>
          <TallyStat n={tallyKm} label="CITIES" />
          <TallyStat n={countries} label="COUNTRIES" accent />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const TallyStat: React.FC<{ n: number; label: string; accent?: boolean }> = ({ n, label, accent }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{ fontFamily: fonts.mono, fontSize: 88, fontWeight: 500, color: accent ? colors.accent : colors.ink, letterSpacing: "-0.04em", lineHeight: 1 }}>
      {n}
    </div>
    <Eyebrow size={16}>{label}</Eyebrow>
  </div>
);
