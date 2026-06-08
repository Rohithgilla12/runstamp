// Designed inner-screens for App Store shots. These render the framed content
// out-of-the-box (no simulator needed) and stay locked to the brand tokens.
// Swap any one for a real capture in shots.tsx — see the Capture helper.

import { Img, staticFile } from "remotion";
import { colors, fonts } from "../theme";
import { Eyebrow } from "../components/Eyebrow";
import { PostageCard } from "../components/PostageCard";
import { WorldMap } from "../components/WorldMap";
import type { ScreenProps } from "./layout";

// iOS status bar — the canonical 9:41, mono numerals, brand ink.
const StatusBar: React.FC<{ pad: number }> = ({ pad }) => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 88,
      paddingInline: pad,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      zIndex: 20,
    }}
  >
    <span style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: 30, color: colors.ink, letterSpacing: "-0.02em" }}>9:41</span>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {[6, 9, 12, 15].map((bh) => (
        <div key={bh} style={{ width: 5, height: bh + 6, borderRadius: 2, backgroundColor: colors.ink }} />
      ))}
      <div style={{ width: 44, height: 22, borderRadius: 5, border: `2px solid ${colors.ink}`, padding: 2, marginLeft: 6 }}>
        <div style={{ width: "70%", height: "100%", borderRadius: 2, backgroundColor: colors.ink }} />
      </div>
    </div>
  </div>
);

// Shared chrome: paper canvas at the inner-screen size, status bar, a header.
const Screen: React.FC<{
  w: number;
  h: number;
  title: string;
  meta?: string;
  bg?: string;
  children: React.ReactNode;
}> = ({ w, h, title, meta, bg = colors.paper, children }) => {
  const pad = Math.round(w * 0.07);
  return (
    <div style={{ position: "absolute", inset: 0, width: w, height: h, backgroundColor: bg, overflow: "hidden" }}>
      <StatusBar pad={pad} />
      <div style={{ position: "absolute", top: 120, left: pad, right: pad, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontFamily: fonts.serifItalic, fontSize: 56, color: colors.ink, lineHeight: 1 }}>{title}</span>
        {meta ? <span style={{ fontFamily: fonts.mono, fontSize: 22, color: colors.ink3, letterSpacing: "0.06em" }}>{meta}</span> : null}
      </div>
      {children}
    </div>
  );
};

const sampleRun = {
  country: "JAPAN",
  city: "Tokyo",
  distance: "21.1",
  pace: "5:12/km",
  time: "1:49:43",
  runNo: "A0009",
  date: "2026 · JAN · 22",
};

// ── Home — the post-run keepsake ──────────────────────────────────────────
export const HomeScreen: React.FC<ScreenProps> = ({ w, h }) => {
  const pad = Math.round(w * 0.07);
  const cardScale = (w * 0.84) / 280;
  return (
    <Screen w={w} h={h} title="Today" meta="SYNCED">
      <div style={{ position: "absolute", top: 230, left: pad, right: pad }}>
        <Eyebrow color={colors.moss} size={20}>● Strava · 22 Jan</Eyebrow>
      </div>
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <PostageCard {...sampleRun} scale={cardScale} rotation={-1.5} />
      </div>
      <div
        style={{
          position: "absolute",
          left: pad,
          right: pad,
          bottom: 120,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        {[
          ["DISTANCE", "21.1", "km"],
          ["PACE", "5:12", "/km"],
          ["TIME", "1:49", "h"],
        ].map(([label, value, unit]) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: fonts.mono, fontSize: 18, color: colors.ink3, letterSpacing: "0.12em" }}>{label}</div>
            <div style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: 54, color: colors.ink, letterSpacing: "-0.04em", lineHeight: 1.1 }}>
              {value}
              <span style={{ fontSize: 24, color: colors.ink3 }}> {unit}</span>
            </div>
          </div>
        ))}
      </div>
    </Screen>
  );
};

// ── Editor — share-card editor ────────────────────────────────────────────
const templates = ["Postage", "Postmark", "Boarding", "Passport", "Customs", "Wax Seal"];
export const EditorScreen: React.FC<ScreenProps> = ({ w, h }) => {
  const pad = Math.round(w * 0.05);
  const cardScale = (w * 0.78) / 280;
  return (
    <div style={{ position: "absolute", inset: 0, width: w, height: h, backgroundColor: colors.paper, overflow: "hidden" }}>
      <StatusBar pad={Math.round(w * 0.07)} />
      <div style={{ position: "absolute", top: 110, left: pad, right: pad, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: fonts.mono, fontSize: 22, color: colors.ink3, letterSpacing: "0.14em" }}>← BACK</span>
        <span style={{ fontFamily: fonts.serifItalic, fontSize: 38, color: colors.ink }}>Editor</span>
        <span style={{ fontFamily: fonts.mono, fontSize: 22, color: colors.accent, letterSpacing: "0.14em" }}>EXPORT</span>
      </div>
      <div style={{ position: "absolute", top: 230, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <PostageCard {...sampleRun} scale={cardScale} />
      </div>
      {/* Dragged stat sticker resting on the canvas */}
      <div
        style={{
          position: "absolute",
          top: 1020,
          right: pad + 80,
          backgroundColor: colors.paper2,
          border: `2px solid ${colors.ink}`,
          borderRadius: 18,
          padding: "16px 26px",
          textAlign: "center",
          boxShadow: "0 14px 36px rgba(20,17,13,0.20)",
          transform: "rotate(-3deg)",
        }}
      >
        <div style={{ fontFamily: fonts.mono, fontSize: 16, letterSpacing: "0.16em", color: colors.ink3 }}>AVG HR</div>
        <div style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: 48, letterSpacing: "-0.04em", color: colors.ink, lineHeight: 1 }}>152</div>
        <div style={{ fontFamily: fonts.mono, fontSize: 16, letterSpacing: "0.16em", color: colors.ink3 }}>BPM</div>
      </div>
      {/* Template strip */}
      <div style={{ position: "absolute", left: pad, right: pad, bottom: 90, display: "flex", gap: 16, overflow: "hidden" }}>
        {templates.map((t, i) => {
          const active = i === 0;
          return (
            <div
              key={t}
              style={{
                flex: "0 0 auto",
                width: 150,
                height: 196,
                borderRadius: 14,
                backgroundColor: active ? colors.ink : colors.paper2,
                border: `2px solid ${active ? colors.ink : colors.line}`,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                padding: 12,
              }}
            >
              <span style={{ fontFamily: fonts.mono, fontSize: 16, letterSpacing: "0.1em", color: active ? colors.paper : colors.ink3 }}>
                {t.toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Analytics — read your training honestly ───────────────────────────────
const vo2Points = [48.1, 48.6, 49.2, 49.0, 50.4, 51.1, 52.0, 52.7, 53.4, 54.2];
const LineChart: React.FC<{ w: number; h: number; points: number[]; unit: string; label: string }> = ({ w, h, points, unit, label }) => {
  const min = Math.min(...points) - 1;
  const max = Math.max(...points) + 1;
  const px = (i: number) => 70 + (i / (points.length - 1)) * (w - 100);
  const py = (v: number) => 60 + (1 - (v - min) / (max - min)) * (h - 130);
  const d = points.map((v, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(v)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {[0, 0.5, 1].map((t) => {
        const y = 60 + t * (h - 130);
        return <line key={t} x1={70} y1={y} x2={w - 30} y2={y} stroke={colors.line} strokeWidth={1} />;
      })}
      <text x={20} y={66} fontFamily={fonts.mono} fontSize={18} fill={colors.ink3}>{max.toFixed(0)}</text>
      <text x={20} y={h - 64} fontFamily={fonts.mono} fontSize={18} fill={colors.ink3}>{min.toFixed(0)}</text>
      <path d={d} fill="none" stroke={colors.accent} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={px(points.length - 1)} cy={py(last)} r={9} fill={colors.accent} stroke={colors.paper} strokeWidth={3} />
      <text x={30} y={36} fontFamily={fonts.mono} fontSize={20} letterSpacing="0.14em" fill={colors.ink3}>{label}</text>
      <text x={w - 30} y={36} textAnchor="end" fontFamily={fonts.mono} fontWeight={500} fontSize={28} letterSpacing="-0.03em" fill={colors.ink}>
        {last.toFixed(1)} {unit}
      </text>
    </svg>
  );
};

export const AnalyticsScreen: React.FC<ScreenProps> = ({ w, h }) => {
  const pad = Math.round(w * 0.07);
  const cardW = w - pad * 2;
  return (
    <Screen w={w} h={h} title="Analytics" meta="90 DAYS">
      <div style={{ position: "absolute", top: 230, left: pad, right: pad }}>
        <div style={{ backgroundColor: colors.paper2, borderRadius: 22, border: `1px solid ${colors.line}`, padding: 20, marginBottom: 26 }}>
          <LineChart w={cardW - 40} h={420} points={vo2Points} unit="" label="VO₂ MAX TREND" />
        </div>
        <div style={{ display: "flex", gap: 26 }}>
          {[
            ["TSB", "+4.2", "balanced", colors.moss],
            ["DECOUPLING", "3.1%", "aerobically sound", colors.ink],
            ["MAF PACE", "5:38", "/km @ 145bpm", colors.ink],
          ].map(([label, value, sub, c]) => (
            <div key={label} style={{ flex: 1, backgroundColor: colors.paper2, borderRadius: 20, border: `1px solid ${colors.line}`, padding: 24 }}>
              <div style={{ fontFamily: fonts.mono, fontSize: 17, letterSpacing: "0.12em", color: colors.ink3 }}>{label}</div>
              <div style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: 50, letterSpacing: "-0.04em", color: c, lineHeight: 1.2 }}>{value}</div>
              <div style={{ fontFamily: fonts.ui, fontSize: 19, color: colors.ink3 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
};

// ── Places — passport of cities ───────────────────────────────────────────
const cityList: [string, string][] = [
  ["Tokyo", "12"],
  ["London", "9"],
  ["Hyderabad", "7"],
  ["Lisbon", "5"],
  ["Reykjavík", "3"],
];
export const PlacesScreen: React.FC<ScreenProps> = ({ w, h }) => {
  const pad = Math.round(w * 0.07);
  return (
    <Screen w={w} h={h} title="Places" meta="47 CITIES · 6">
      <div style={{ position: "absolute", top: 240, left: pad, right: pad }}>
        <div style={{ borderRadius: 22, overflow: "hidden", border: `1px solid ${colors.line}` }}>
          <WorldMap width={w - pad * 2} height={760} revealedCount={9} labelOpacity={() => 1} ringScale={() => 0} />
        </div>
        <div style={{ marginTop: 30 }}>
          {cityList.map(([name, count], i) => (
            <div
              key={name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "26px 6px",
                borderBottom: i === cityList.length - 1 ? "none" : `1px solid ${colors.line}`,
              }}
            >
              <span style={{ fontFamily: fonts.serifItalic, fontSize: 42, color: colors.ink }}>{name}</span>
              <span style={{ fontFamily: fonts.mono, fontSize: 30, color: colors.ink3, letterSpacing: "-0.02em" }}>
                {count}<span style={{ fontSize: 20 }}> runs</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
};

// ── Stamps — earned by running ────────────────────────────────────────────
type Tier = "common" | "rare" | "mythic";
const tierColor = (t: Tier) => (t === "mythic" ? colors.accent : t === "rare" ? colors.ink : colors.moss);

const stampTiles: { title: string; tier: Tier; body: React.ReactElement }[] = [
  {
    title: "Marathon",
    tier: "rare",
    body: (
      <g>
        <circle cx="100" cy="100" r="84" fill={colors.paper2} stroke={colors.ink} strokeWidth={2.4} />
        <circle cx="100" cy="100" r="84" fill="none" stroke="rgba(20,17,13,0.40)" strokeWidth={1.2} strokeDasharray="2 4" />
        <text x="100" y="118" textAnchor="middle" fontFamily={fonts.serifItalic} fontSize="58" fill={colors.ink}>42</text>
      </g>
    ),
  },
  {
    title: "Five Continents",
    tier: "mythic",
    body: (
      <g>
        <circle cx="100" cy="100" r="84" fill={colors.accent} />
        <circle cx="100" cy="100" r="84" fill="none" stroke="rgba(20,17,13,0.32)" strokeWidth={1.4} strokeDasharray="2 4" />
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          return <circle key={i} cx={100 + Math.cos(a) * 44} cy={100 + Math.sin(a) * 44} r={6} fill={colors.ink} />;
        })}
        <text x="100" y="118" textAnchor="middle" fontFamily={fonts.serifItalic} fontSize="48" fill={colors.ink}>5</text>
      </g>
    ),
  },
  {
    title: "Sub-3:45",
    tier: "rare",
    body: (
      <g>
        <circle cx="100" cy="100" r="84" fill={colors.paper2} stroke={colors.ink} strokeWidth={2.4} />
        <circle cx="100" cy="100" r="64" fill="none" stroke={colors.ink} strokeWidth={1} strokeDasharray="2 4" />
        <text x="100" y="112" textAnchor="middle" fontFamily={fonts.serifItalic} fontSize="34" fill={colors.ink}>3:45</text>
      </g>
    ),
  },
  {
    title: "Monsoon run",
    tier: "common",
    body: (
      <g>
        <circle cx="100" cy="100" r="84" fill={colors.paper2} stroke={colors.moss} strokeWidth={2.4} />
        {Array.from({ length: 10 }, (_, i) => {
          const x = 50 + i * 10;
          const y0 = 40 + ((i * 7) % 20);
          return <line key={i} x1={x} y1={y0} x2={x - 6} y2={y0 + 20} stroke={colors.moss} strokeWidth={1.8} strokeLinecap="round" opacity={0.6} />;
        })}
        <text x="100" y="135" textAnchor="middle" fontFamily={fonts.serifItalic} fontSize="40" fill={colors.moss}>15+</text>
      </g>
    ),
  },
  {
    title: "Dawn patrol",
    tier: "common",
    body: (
      <g>
        <circle cx="100" cy="100" r="84" fill={colors.paper2} stroke={colors.moss} strokeWidth={2.4} />
        <circle cx="100" cy="118" r="30" fill={colors.accent} opacity={0.85} />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI - Math.PI;
          return <line key={i} x1={100 + Math.cos(a) * 42} y1={118 + Math.sin(a) * 42} x2={100 + Math.cos(a) * 54} y2={118 + Math.sin(a) * 54} stroke={colors.accent} strokeWidth={3} strokeLinecap="round" />;
        })}
        <line x1="40" y1="118" x2="160" y2="118" stroke={colors.ink} strokeWidth={2} />
      </g>
    ),
  },
  {
    title: "100 km week",
    tier: "rare",
    body: (
      <g>
        <circle cx="100" cy="100" r="84" fill={colors.paper2} stroke={colors.ink} strokeWidth={2.4} />
        <circle cx="100" cy="100" r="64" fill="none" stroke={colors.ink} strokeWidth={1} />
        <text x="100" y="112" textAnchor="middle" fontFamily={fonts.serifItalic} fontSize="46" fill={colors.ink}>100</text>
        <text x="100" y="150" textAnchor="middle" fontFamily="monospace" fontSize="14" letterSpacing="2" fill={colors.ink3}>KM</text>
      </g>
    ),
  },
];

export const StampsScreen: React.FC<ScreenProps> = ({ w, h }) => {
  const pad = Math.round(w * 0.07);
  const col = (w - pad * 2 - 60) / 2;
  return (
    <Screen w={w} h={h} title="Stamps" meta="23 EARNED">
      <div style={{ position: "absolute", top: 250, left: pad, right: pad, display: "flex", flexWrap: "wrap", gap: 60, justifyContent: "space-between" }}>
        {stampTiles.map((s) => (
          <div key={s.title} style={{ width: col, display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 40 }}>
            <svg width={col * 0.82} height={col * 0.82} viewBox="0 0 200 200">{s.body}</svg>
            <div style={{ fontFamily: fonts.serifItalic, fontSize: 36, color: colors.ink, marginTop: 12, textAlign: "center" }}>{s.title}</div>
            <div style={{ marginTop: 6 }}>
              <Eyebrow size={16} color={tierColor(s.tier)}>{s.tier.toUpperCase()}</Eyebrow>
            </div>
          </div>
        ))}
      </div>
    </Screen>
  );
};

// ── Year in Stamps — the recap ────────────────────────────────────────────
export const YearScreen: React.FC<ScreenProps> = ({ w, h }) => {
  const pad = Math.round(w * 0.07);
  const cols = 26;
  const rows = 7;
  const cell = (w - pad * 2 - (cols - 1) * 6) / cols;
  return (
    <Screen w={w} h={h} title="2026" meta="YEAR IN STAMPS">
      <div style={{ position: "absolute", top: 250, left: pad, right: pad }}>
        <div style={{ fontFamily: fonts.serifItalic, fontSize: 76, color: colors.ink, lineHeight: 1.05 }}>
          Your year, <span style={{ color: colors.accent }}>stamped</span>.
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 30, marginTop: 50 }}>
          {[
            ["KILOMETRES", "2,418"],
            ["RUNS", "312"],
            ["CITIES", "47"],
            ["STAMPS", "23"],
          ].map(([label, value]) => (
            <div key={label} style={{ width: (w - pad * 2 - 30) / 2 }}>
              <div style={{ fontFamily: fonts.mono, fontSize: 19, letterSpacing: "0.14em", color: colors.ink3 }}>{label}</div>
              <div style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: 84, letterSpacing: "-0.05em", color: colors.ink, lineHeight: 1.1 }}>{value}</div>
            </div>
          ))}
        </div>
        {/* Mini training heatmap — moss intensity, deterministic (no Math.random). */}
        <div style={{ marginTop: 60 }}>
          <Eyebrow size={18} color={colors.ink3}>TRAINING LOAD</Eyebrow>
          <div style={{ display: "flex", gap: 6, marginTop: 18 }}>
            {Array.from({ length: cols }, (_, c) => (
              <div key={c} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {Array.from({ length: rows }, (_, r) => {
                  const n = (c * 7 + r * 3) % 5; // deterministic ramp 0–4
                  return <div key={r} style={{ width: cell, height: cell, borderRadius: 4, backgroundColor: colors.moss, opacity: 0.15 + n * 0.2 }} />;
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Screen>
  );
};

// Use a real simulator capture instead of a designed screen: point this at a
// PNG dropped in apps/marketing/public/captures/. See that folder's README.
export const Capture: React.FC<ScreenProps & { src: string }> = ({ w, h, src }) => (
  <Img src={staticFile(src)} style={{ width: w, height: h, objectFit: "cover" }} />
);
