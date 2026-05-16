// AnalyticsScene v2 — bigger heatmap (the headline visual), numbers
// settle to fixed finals rather than ticking mid-frame, layout fits better
// in both orientations.

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";
import { Eyebrow } from "../components/Eyebrow";
import type { LaunchVideoProps } from "../LaunchVideo";

const WEEKS = 26;
const DAYS = 7;

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20260516);
const heatmap: number[][] = Array.from({ length: DAYS }, () =>
  Array.from({ length: WEEKS }, () => {
    const r = rng();
    if (r < 0.55) return 0;
    if (r < 0.78) return 1;
    if (r < 0.92) return 2;
    return 3;
  })
);

const TARGETS = { km: 3142, runs: 612, cities: 47 };

export const AnalyticsScene: React.FC<LaunchVideoProps> = ({ orientation }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const portrait = orientation === "portrait";

  const headEnter = spring({ frame, fps, config: { damping: 18, mass: 0.6 } });
  const fillProgress = interpolate(frame, [10, 130], [0, 1], { extrapolateRight: "clamp" });
  const totalCells = WEEKS * DAYS;

  // Number tick — finishes early at frame 140 so the numbers stay readable
  const tickProgress = interpolate(frame, [20, 140], [0, 1], { extrapolateRight: "clamp" });
  const km = Math.round(TARGETS.km * tickProgress);
  const runs = Math.round(TARGETS.runs * tickProgress);
  const cities = Math.round(TARGETS.cities * tickProgress);

  // Cells sized so the heatmap is the visual centrepiece
  const heatCellSize = portrait ? 36 : 44;
  const gap = 5;
  const heatW = WEEKS * (heatCellSize + gap) - gap;
  const heatH = DAYS * (heatCellSize + gap) - gap;

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
        <Eyebrow color={colors.accent} size={portrait ? 22 : 20} style={{ marginBottom: 16 }}>Analytics</Eyebrow>
        <div style={{ fontFamily: fonts.serifItalic, fontSize: portrait ? 96 : 104, fontWeight: 400, lineHeight: 1.0, letterSpacing: "-0.02em", color: colors.ink }}>
          The <span style={{ color: colors.accent }}>bigger</span> picture.
        </div>
        <div style={{ fontFamily: fonts.ui, fontSize: portrait ? 30 : 26, color: colors.ink3, marginTop: 18, lineHeight: 1.4 }}>
          Year, month, week — every distance you've run, stamped.
        </div>
      </div>

      {/* Heatmap + numerals */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: portrait ? 56 : 64,
          paddingTop: portrait ? 240 : 80,
        }}
      >
        {/* Numerals row */}
        <div style={{ display: "flex", gap: portrait ? 60 : 120, alignItems: "baseline" }}>
          <Stat label="KILOMETRES" value={km.toLocaleString()} portrait={portrait} />
          <Stat label="RUNS" value={runs.toLocaleString()} portrait={portrait} />
          <Stat label="CITIES" value={cities.toString()} portrait={portrait} accent />
        </div>

        {/* Heatmap */}
        <svg width={heatW} height={heatH}>
          {heatmap.map((row, ri) =>
            row.map((v, ci) => {
              const idx = ri * WEEKS + ci;
              const localProgress = idx / totalCells;
              const visible = fillProgress >= localProgress ? 1 : 0;
              const cellEnter = spring({
                frame: Math.max(0, frame - 10 - idx * 0.4),
                fps,
                config: { damping: 14, mass: 0.4 },
              });
              const fill =
                v === 0 ? "rgba(20,17,13,0.06)" :
                v === 1 ? "rgba(232,93,47,0.30)" :
                v === 2 ? "rgba(232,93,47,0.60)" :
                          colors.accent;
              return (
                <rect
                  key={`${ri}-${ci}`}
                  x={ci * (heatCellSize + gap)}
                  y={ri * (heatCellSize + gap)}
                  width={heatCellSize}
                  height={heatCellSize}
                  rx={3}
                  fill={fill}
                  opacity={visible * cellEnter}
                />
              );
            })
          )}
        </svg>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, alignItems: "center", fontFamily: fonts.mono, fontSize: 14, color: colors.ink3, letterSpacing: "0.12em" }}>
          <span>LESS</span>
          {[0, 1, 2, 3].map((v) => (
            <div
              key={v}
              style={{
                width: 18, height: 18, borderRadius: 3,
                background:
                  v === 0 ? "rgba(20,17,13,0.06)" :
                  v === 1 ? "rgba(232,93,47,0.30)" :
                  v === 2 ? "rgba(232,93,47,0.60)" :
                            colors.accent,
              }}
            />
          ))}
          <span>MORE</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Stat: React.FC<{ label: string; value: string; portrait: boolean; accent?: boolean }> = ({ label, value, portrait, accent }) => (
  <div style={{ textAlign: "center" }}>
    <div
      style={{
        fontFamily: fonts.mono,
        fontSize: portrait ? 96 : 124,
        fontWeight: 500,
        color: accent ? colors.accent : colors.ink,
        letterSpacing: "-0.04em",
        lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {value}
    </div>
    <Eyebrow size={portrait ? 16 : 14}>{label}</Eyebrow>
  </div>
);
