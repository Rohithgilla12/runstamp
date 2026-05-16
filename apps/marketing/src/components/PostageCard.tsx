// Standalone postage-style share-card SVG — the same visual vocabulary as
// `apps/landing/src/components/HeroPassStack.astro`. Accepts a small set of
// data props so different scenes can reuse it for different runs.

import { colors, fonts } from "../theme";

interface Props {
  country: string;
  city: string;
  distance: string;
  pace: string;
  time: string;
  runNo: string;
  date: string;
  /** Polyline points within the SVG viewBox 0–280, 0–370. */
  route?: string;
  scale?: number;
  rotation?: number;
}

const defaultRoute = "M40,240 L56,200 L78,180 L108,172 L142,175 L170,188 L188,212 L192,244 L178,270 L148,282 L112,280 L82,264 L62,246 L50,244 L42,244";

export const PostageCard: React.FC<Props> = ({
  country,
  city,
  distance,
  pace,
  time,
  runNo,
  date,
  route = defaultRoute,
  scale = 1,
  rotation = 0,
}) => {
  const perfV = Array.from({ length: 9 }, (_, i) => i);
  const perfH = Array.from({ length: 7 }, (_, i) => i);

  return (
    <svg
      viewBox="0 0 280 370"
      style={{
        width: 280 * scale,
        height: 370 * scale,
        transform: `rotate(${rotation}deg)`,
        filter: "drop-shadow(0 14px 40px rgba(20,17,13,0.22)) drop-shadow(0 3px 10px rgba(20,17,13,0.12))",
      }}
    >
      <rect width="280" height="370" fill={colors.paper} />
      <rect x="16" y="16" width="248" height="338" fill={colors.ink} />

      {/* Halftone */}
      {Array.from({ length: 7 }, (_, row) =>
        Array.from({ length: 11 }, (_, col) => (
          <circle
            key={`h-${row}-${col}`}
            cx={32 + col * 22}
            cy={88 + row * 24}
            r={0.65 + ((row + col) % 3) * 0.2}
            fill="rgba(243,237,226,0.055)"
          />
        ))
      )}

      {/* Air-mail strip */}
      {Array.from({ length: 18 }, (_, i) => (
        <rect
          key={`am-${i}`}
          x={16 + i * 14.2}
          y="338"
          width="7.1"
          height="16"
          fill={i % 2 === 0 ? colors.accent : colors.paper}
          opacity={0.72}
        />
      ))}

      <path d={route} stroke={colors.accent} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.88} />

      <text x="30" y="42" fontFamily="'JetBrains Mono', monospace" fontSize="7.5" letterSpacing="3.2" fill="rgba(243,237,226,0.48)">{country}</text>
      <text x="30" y="70" fontFamily={fonts.serifItalic} fontSize="30" fill={colors.paper} letterSpacing="-0.5">{city}</text>

      <rect x="196" y="28" width="54" height="18" fill="none" stroke="rgba(243,237,226,0.28)" strokeWidth="1" rx="2" />
      <text x="223" y="41" textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontSize="7" fill="rgba(243,237,226,0.48)">NO. {runNo}</text>

      <text x="30" y="310" fontFamily="'JetBrains Mono', monospace" fontSize="54" fontWeight="500" fill={colors.paper} letterSpacing="-3">{distance}</text>
      <text x="30" y="326" fontFamily="'JetBrains Mono', monospace" fontSize="8" fill="rgba(243,237,226,0.42)" letterSpacing="2.8">KILOMETRES</text>

      <text x="252" y="300" textAnchor="end" fontFamily="'JetBrains Mono', monospace" fontSize="13.5" fill="rgba(243,237,226,0.78)">{pace}</text>
      <text x="252" y="317" textAnchor="end" fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="rgba(243,237,226,0.46)">{time}</text>
      <text x="252" y="334" textAnchor="end" fontFamily="'JetBrains Mono', monospace" fontSize="7.5" fill="rgba(243,237,226,0.28)" letterSpacing="0.6">{date}</text>

      <circle cx="210" cy="180" r="38" fill="none" stroke="rgba(243,237,226,0.10)" strokeWidth="1.2" strokeDasharray="2 3" />
      <circle cx="210" cy="180" r="28" fill="none" stroke="rgba(243,237,226,0.07)" strokeWidth="0.8" />

      {perfV.map((i) => <circle key={`l-${i}`} cx="16" cy={32 + i * 36} r="9" fill={colors.paper} />)}
      {perfV.map((i) => <circle key={`r-${i}`} cx="264" cy={32 + i * 36} r="9" fill={colors.paper} />)}
      {perfH.map((i) => <circle key={`t-${i}`} cx={36 + i * 34} cy="16" r="9" fill={colors.paper} />)}
      {perfH.map((i) => <circle key={`b-${i}`} cx={36 + i * 34} cy="354" r="9" fill={colors.paper} />)}
    </svg>
  );
};
