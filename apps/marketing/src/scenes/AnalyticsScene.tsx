import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";
import { Eyebrow } from "../components/Eyebrow";
import type { LaunchVideoProps } from "../LaunchVideo";

// Deterministic activity heatmap — 7 rows × 26 weeks ≈ half a year.
// Each cell has a seeded intensity so the fill order looks organic.
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

const rng = mulberry32(2026_05_16);
const heatmap: number[][] = Array.from({ length: DAYS }, () =>
  Array.from({ length: WEEKS }, () => {
    const r = rng();
    if (r < 0.55) return 0;
    if (r < 0.78) return 1;
    if (r < 0.92) return 2;
    return 3;
  })
);

export const AnalyticsScene: React.FC<LaunchVideoProps> = ({ orientation }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const portraitLayout = orientation === "portrait";

  // Fill the heatmap left-to-right top-to-bottom across ~120 frames.
  const fillProgress = interpolate(frame, [10, 120], [0, 1], { extrapolateRight: "clamp" });
  const totalCells = WEEKS * DAYS;

  // Ticking distance counter: 0 → 3,142 km
  const km = Math.round(interpolate(frame, [20, 130], [0, 3142], { extrapolateRight: "clamp" }));
  const runs = Math.round(interpolate(frame, [20, 130], [0, 612], { extrapolateRight: "clamp" }));
  const cities = Math.round(interpolate(frame, [40, 140], [0, 47], { extrapolateRight: "clamp" }));

  const heatCellSize = portraitLayout ? 30 : 28;
  const gap = 4;
  const heatW = WEEKS * (heatCellSize + gap) - gap;
  const heatH = DAYS * (heatCellSize + gap) - gap;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.paper }}>
      <div style={{ position: "absolute", top: portraitLayout ? 110 : 80, left: 80, right: 80, textAlign: portraitLayout ? "center" : "left" }}>
        <Eyebrow color={colors.accent} size={22} style={{ marginBottom: 18 }}>Analytics</Eyebrow>
        <div style={{ fontFamily: fonts.display, fontStyle: "italic", fontSize: portraitLayout ? 88 : 104, fontWeight: 900, lineHeight: 1.0, letterSpacing: "-0.02em", color: colors.ink }}>
          The <span style={{ color: colors.accent }}>bigger</span> picture.
        </div>
        <div style={{ fontFamily: fonts.ui, fontSize: portraitLayout ? 34 : 30, color: colors.ink3, marginTop: 18 }}>
          Year, month, week — every distance you've run, stamped.
        </div>
      </div>

      {/* Heatmap centered */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: portraitLayout ? 200 : 60 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 36 }}>
          {/* Big numerals */}
          <div style={{ display: "flex", gap: portraitLayout ? 36 : 80, alignItems: "baseline" }}>
            <Stat label="KM" value={km.toLocaleString()} portrait={portraitLayout} />
            <Stat label="RUNS" value={runs.toLocaleString()} portrait={portraitLayout} />
            <Stat label="CITIES" value={cities.toString()} portrait={portraitLayout} accent />
          </div>

          <svg width={heatW} height={heatH}>
            {heatmap.map((row, ri) =>
              row.map((v, ci) => {
                const idx = ri * WEEKS + ci;
                const localFrame = idx / totalCells;
                const visible = fillProgress >= localFrame ? 1 : 0;
                const cellEnter = spring({
                  frame: Math.max(0, frame - 10 - idx * 0.6),
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
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Stat: React.FC<{ label: string; value: string; portrait: boolean; accent?: boolean }> = ({ label, value, portrait, accent }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{ fontFamily: fonts.mono, fontSize: portrait ? 110 : 130, fontWeight: 500, color: accent ? colors.accent : colors.ink, letterSpacing: "-0.04em", lineHeight: 1 }}>
      {value}
    </div>
    <Eyebrow size={portrait ? 18 : 16}>{label}</Eyebrow>
  </div>
);
