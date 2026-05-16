import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";
import { Eyebrow } from "../components/Eyebrow";
import type { LaunchVideoProps } from "../LaunchVideo";

// City pins drop sequentially. Coords are abstract on a stylised globe-rect,
// not lat/lon — this is a hero animation, not a navigation tool.
const cities = [
  { name: "Tokyo",     country: "JP", x: 0.82, y: 0.45 },
  { name: "London",    country: "GB", x: 0.49, y: 0.34 },
  { name: "Reykjavík", country: "IS", x: 0.45, y: 0.22 },
  { name: "Hyderabad", country: "IN", x: 0.71, y: 0.48 },
  { name: "Lisbon",    country: "PT", x: 0.47, y: 0.42 },
  { name: "Berlin",    country: "DE", x: 0.55, y: 0.34 },
  { name: "New York",  country: "US", x: 0.27, y: 0.40 },
  { name: "Mumbai",    country: "IN", x: 0.70, y: 0.52 },
  { name: "Boston",    country: "US", x: 0.29, y: 0.38 },
];

export const PassportScene: React.FC<LaunchVideoProps> = ({ orientation }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const portraitLayout = orientation === "portrait";

  const mapW = portraitLayout ? 940 : 1380;
  const mapH = portraitLayout ? 640 : 760;

  const pinStartFrame = 20;
  const perPin = 12;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.paper }}>
      <div style={{ position: "absolute", top: portraitLayout ? 110 : 80, left: 80, right: 80, textAlign: portraitLayout ? "center" : "left" }}>
        <Eyebrow color={colors.accent} size={22} style={{ marginBottom: 18 }}>Passport</Eyebrow>
        <div style={{ fontFamily: fonts.display, fontStyle: "italic", fontSize: portraitLayout ? 88 : 104, fontWeight: 900, lineHeight: 1.0, letterSpacing: "-0.02em", color: colors.ink }}>
          A stamp for <span style={{ color: colors.accent }}>every</span> city.
        </div>
        <div style={{ fontFamily: fonts.ui, fontSize: portraitLayout ? 34 : 30, color: colors.ink3, marginTop: 18 }}>
          Reverse-geocoded once, pinned to a map you've earned.
        </div>
      </div>

      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: portraitLayout ? 220 : 60 }}>
        <svg width={mapW} height={mapH} style={{ filter: "drop-shadow(0 12px 36px rgba(20,17,13,0.10))" }}>
          {/* Map backdrop — stylised land masses as grouped circles (halftone-feel) */}
          <rect width={mapW} height={mapH} fill={colors.paper2} rx={4} />
          {/* Halftone background dots */}
          {Array.from({ length: 26 }, (_, row) =>
            Array.from({ length: 38 }, (_, col) => (
              <circle
                key={`d-${row}-${col}`}
                cx={col * (mapW / 38) + 8}
                cy={row * (mapH / 26) + 6}
                r={Math.max(0.7, 1.6 - Math.abs(((row * 13 + col * 7) % 11) - 5) * 0.18)}
                fill={`rgba(20,17,13,${0.04 + (col % 5) * 0.012})`}
              />
            ))
          )}

          {/* Continent silhouettes — abstract blobs */}
          <path
            d={`M${mapW * 0.13},${mapH * 0.18} Q${mapW * 0.30},${mapH * 0.05} ${mapW * 0.46},${mapH * 0.20}
                Q${mapW * 0.52},${mapH * 0.45} ${mapW * 0.38},${mapH * 0.62}
                Q${mapW * 0.20},${mapH * 0.50} ${mapW * 0.13},${mapH * 0.18}Z`}
            fill="rgba(20,17,13,0.07)"
          />
          <path
            d={`M${mapW * 0.56},${mapH * 0.30} Q${mapW * 0.66},${mapH * 0.18} ${mapW * 0.74},${mapH * 0.30}
                Q${mapW * 0.78},${mapH * 0.55} ${mapW * 0.66},${mapH * 0.70}
                Q${mapW * 0.55},${mapH * 0.55} ${mapW * 0.56},${mapH * 0.30}Z`}
            fill="rgba(20,17,13,0.07)"
          />
          <path
            d={`M${mapW * 0.78},${mapH * 0.38} Q${mapW * 0.88},${mapH * 0.30} ${mapW * 0.92},${mapH * 0.45}
                Q${mapW * 0.90},${mapH * 0.65} ${mapW * 0.80},${mapH * 0.60}
                Q${mapW * 0.74},${mapH * 0.50} ${mapW * 0.78},${mapH * 0.38}Z`}
            fill="rgba(20,17,13,0.07)"
          />

          {cities.map((city, i) => {
            const localFrame = frame - (pinStartFrame + i * perPin);
            const enter = spring({ frame: Math.max(0, localFrame), fps, config: { damping: 12, mass: 0.4 } });
            const ringScale = interpolate(Math.max(0, localFrame), [0, 30], [0, 2.4], { extrapolateRight: "clamp" });
            const ringOpacity = interpolate(Math.max(0, localFrame), [0, 30], [0.6, 0], { extrapolateRight: "clamp" });
            const cx = mapW * city.x;
            const cy = mapH * city.y;
            return (
              <g key={city.name}>
                <circle cx={cx} cy={cy} r={ringScale * 18} fill="none" stroke={colors.accent} strokeWidth={1.4} opacity={ringOpacity} />
                <circle cx={cx} cy={cy} r={9 * enter} fill={colors.accent} />
                <text
                  x={cx + 16}
                  y={cy + 4}
                  fontFamily="'Instrument Serif', Georgia, serif"
                  fontStyle="italic"
                  fontSize={portraitLayout ? 26 : 22}
                  fill={colors.ink}
                  opacity={enter}
                >
                  {city.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Total tally bottom */}
      <div style={{ position: "absolute", bottom: portraitLayout ? 140 : 80, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontFamily: fonts.mono, fontSize: portraitLayout ? 80 : 96, color: colors.ink, letterSpacing: "-0.04em" }}>
          {Math.round(interpolate(frame, [40, 140], [0, 47], { extrapolateRight: "clamp" }))} cities · 6 countries
        </div>
      </div>
    </AbsoluteFill>
  );
};
