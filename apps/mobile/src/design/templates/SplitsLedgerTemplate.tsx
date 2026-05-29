import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { Activity, Split } from '../../data/sample';
import { distUnit, fmtDist, fmtPace, fmtTime, paceUnit } from '../../data/sample';
import { useColors } from '../theme';
import { TText, Eyebrow } from '../typography';
import { RouteMap } from '../RouteMap';
import { EYEBROW_SIZE, PAD, formatLongDate, type Units } from './shared';
import { richMetrics } from './metrics';
import { PhotoBackground } from './PhotoBackground';
import { RunstampMark } from '../RunstampMark';

interface Props {
  run: Activity;
  width: number;
  height: number;
  background: 'map' | 'photo' | 'solid';
  units?: Units;
  photoUri?: string | null;
  rawLatLng?: ReadonlyArray<readonly [number, number]> | null;
}

// SplitsLedgerTemplate
//
// The run as a typeset receipt / shipping manifest. A clean paper card: a
// header band carrying the title + total distance/time, then a monospaced
// table of per-km splits. Each row gets a thin bar whose length encodes that
// km's pace, so the *shape* of the run reads straight down the column —
// faster kms reach further right, the single fastest km is the one warm pop.
//
// No splits → a clean distance/pace/time stat block so the card never breaks.
// The map is deliberately omitted/secondary: this card is about the numbers.
export function SplitsLedgerTemplate({ run, width, height, background, units = 'km', photoUri, rawLatLng }: Props) {
  const c = useColors();

  const splits = run.splits ?? [];
  const hasSplits = splits.length > 0;

  // How many rows fit before we spill into a "+N more" line. Derived from the
  // canvas height so a Story-tall card shows more than a square.
  const headerReserve = 168;
  const footerReserve = 64;
  const rowH = 19;
  const maxRows = Math.max(6, Math.floor((height - headerReserve - footerReserve) / rowH));
  const shown = hasSplits ? splits.slice(0, Math.min(splits.length, maxRows)) : [];
  const overflow = hasSplits ? splits.length - shown.length : 0;

  // Pace bounds across ALL splits (not just the shown ones) so the bar scale
  // and the fastest-km mark stay honest even when rows are truncated.
  const secs = splits.map((s) => s.sec);
  const fastestSec = secs.length ? Math.min(...secs) : 0;
  const slowestSec = secs.length ? Math.max(...secs) : 0;
  const span = Math.max(1, slowestSec - fastestSec);
  const fastestK = hasSplits
    ? splits.reduce((best, s) => (s.sec < best.sec ? s : best), splits[0]).k
    : -1;

  const distFont = Math.min(width * 0.18, 64);
  const unitLabel = distUnit(units).toUpperCase();

  // Receipt geometry — bars live in the right portion of each row.
  const ledgerPadH = PAD.xl;
  const ledgerInnerW = width - ledgerPadH * 2;
  const labelColW = Math.min(46, ledgerInnerW * 0.18);
  const paceColW = 56;
  const barX = labelColW + paceColW + 10;
  const barMaxW = Math.max(20, ledgerInnerW - barX - 8);

  return (
    <View style={{ width, height, position: 'relative', backgroundColor: c.paper, overflow: 'hidden' }}>
      {/* Secondary backgrounds. The map is a faint, contained header watermark
          only — never full-bleed. The numbers lead on every variant. */}
      {background === 'map' && (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: headerReserve, opacity: 0.06 }}>
          <RouteMap
            points={run.route}
            rawLatLng={rawLatLng}
            width={width}
            height={headerReserve}
            style="light"
            accent={c.accent}
            routeStrokeWidth={2}
            animate={false}
            flat
          />
        </View>
      )}
      {background === 'photo' && (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: headerReserve, opacity: 0.18 }}>
          <PhotoBackground
            uri={photoUri}
            width={width}
            height={headerReserve}
            fallback={<View style={{ position: 'absolute', inset: 0, backgroundColor: c.paper2 }} />}
          />
        </View>
      )}
      {background === 'solid' && (
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0, backgroundColor: c.accent, opacity: 0.03 }} />
      )}

      {/* Header band — the manifest masthead. */}
      <View style={{ paddingHorizontal: ledgerPadH, paddingTop: PAD.xl + 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: PAD.md }}>
            <Eyebrow style={{ color: c.ink3, fontSize: EYEBROW_SIZE }}>
              {formatLongDate(run.date).toUpperCase()}
            </Eyebrow>
            <TText
              variant="serifItalic"
              style={{ fontSize: 21, color: c.ink, marginTop: 5, lineHeight: 25, letterSpacing: -0.3 }}
              numberOfLines={2}
            >
              {run.title}
            </TText>
          </View>
          {/* Manifest serial — receipts carry one. */}
          <View style={{ alignItems: 'flex-end' }}>
            <Eyebrow style={{ color: c.ink3, fontSize: EYEBROW_SIZE }}>NO.</Eyebrow>
            <TText variant="mono" style={{ fontSize: 11, color: c.ink2, marginTop: 3, letterSpacing: 0.5 }}>
              {run.id.slice(0, 6).toUpperCase()}
            </TText>
          </View>
        </View>

        {/* Totals row — distance dominates, time + pace alongside. */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: PAD.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <TText variant="monoSemi" style={{ fontSize: distFont, lineHeight: distFont, letterSpacing: -2.5, color: c.ink }}>
              {fmtDist(run.distance, units)}
            </TText>
            <TText variant="mono" style={{ fontSize: 13, color: c.ink3, marginLeft: 6, letterSpacing: 0.5 }}>
              {unitLabel}
            </TText>
          </View>
          <View style={{ flex: 1 }} />
          <View style={{ alignItems: 'flex-end' }}>
            <TText variant="mono" style={{ fontSize: 16, color: c.ink, letterSpacing: -0.3 }}>{fmtTime(run.seconds)}</TText>
            <TText variant="mono" style={{ fontSize: 11, color: c.ink3, marginTop: 3, letterSpacing: -0.2 }}>
              {fmtPace(run.pace, units)}{paceUnit(units)}
            </TText>
          </View>
        </View>
      </View>

      {/* Hairline rule under the masthead. */}
      <View style={{ height: 0.8, backgroundColor: c.line, marginTop: PAD.md, marginHorizontal: ledgerPadH }} />

      {hasSplits ? (
        <Ledger
          c={c}
          shown={shown}
          overflow={overflow}
          fastestK={fastestK}
          fastestSec={fastestSec}
          span={span}
          units={units}
          padH={ledgerPadH}
          labelColW={labelColW}
          paceColW={paceColW}
          barX={barX}
          barMaxW={barMaxW}
          rowH={rowH}
        />
      ) : (
        <Fallback c={c} run={run} units={units} padH={ledgerPadH} />
      )}

      {/* Torn-receipt bottom edge + attribution. */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <View style={{ alignItems: 'center', paddingBottom: 12 }}>
          <RunstampMark tone="ink" opacity={0.42} />
        </View>
        <TornEdge width={width} seed={seedFromId(run.id)} paper={c.paper} line={c.line} />
      </View>
    </View>
  );
}

interface LedgerProps {
  c: ReturnType<typeof useColors>;
  shown: Split[];
  overflow: number;
  fastestK: number;
  fastestSec: number;
  span: number;
  units: Units;
  padH: number;
  labelColW: number;
  paceColW: number;
  barX: number;
  barMaxW: number;
  rowH: number;
}

function Ledger({ c, shown, overflow, fastestK, fastestSec, span, units, padH, labelColW, paceColW, barX, barMaxW, rowH }: LedgerProps) {
  return (
    <View style={{ flex: 1, paddingHorizontal: padH, paddingTop: PAD.md }}>
      {/* Column header — quiet caps so the table reads as a ledger. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: PAD.xs }}>
        <View style={{ width: labelColW }}>
          <Eyebrow style={{ color: c.ink3, fontSize: EYEBROW_SIZE }}>KM</Eyebrow>
        </View>
        <View style={{ width: paceColW }}>
          <Eyebrow style={{ color: c.ink3, fontSize: EYEBROW_SIZE }}>SPLIT</Eyebrow>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Eyebrow style={{ color: c.ink3, fontSize: EYEBROW_SIZE }}>FAST → SLOW</Eyebrow>
        </View>
      </View>

      {shown.map((s) => {
        const isFastest = s.k === fastestK;
        // Faster split → longer bar. Normalize so the fastest km fills the
        // track and the slowest leaves a stub; clamp to a floor so a row is
        // never invisible.
        const t = 1 - (s.sec - fastestSec) / span; // 0 (slowest) .. 1 (fastest)
        const w = Math.max(6, barMaxW * (0.18 + 0.82 * t));
        return (
          <View key={s.k} style={{ flexDirection: 'row', alignItems: 'center', height: rowH }}>
            <View style={{ width: labelColW, flexDirection: 'row', alignItems: 'baseline' }}>
              <TText variant="mono" style={{ fontSize: 9, color: c.ink3, letterSpacing: 0.3 }}>K</TText>
              <TText
                variant={isFastest ? 'monoSemi' : 'mono'}
                style={{ fontSize: 12, color: isFastest ? c.accent : c.ink, letterSpacing: -0.4 }}
              >
                {s.k}
              </TText>
            </View>
            <View style={{ width: paceColW }}>
              <TText
                variant={isFastest ? 'monoSemi' : 'mono'}
                style={{ fontSize: 12, color: isFastest ? c.accent : c.ink, letterSpacing: -0.3 }}
              >
                {fmtPace(s.sec, units)}
              </TText>
            </View>
            {/* Pace bar — the column shape IS the run. */}
            <View style={{ flex: 1, height: rowH, justifyContent: 'center' }}>
              <View style={{ position: 'absolute', left: 0, right: 0, height: 5, top: rowH / 2 - 2.5 }}>
                {/* Faint track so short bars still read against a baseline. */}
                <View style={{ position: 'absolute', left: 0, width: barMaxW, height: 1, top: 2, backgroundColor: c.line }} />
                <View
                  style={{
                    width: w,
                    height: 5,
                    backgroundColor: isFastest ? c.accent : c.ink2,
                    opacity: isFastest ? 1 : 0.55,
                  }}
                />
              </View>
            </View>
          </View>
        );
      })}

      {overflow > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', height: rowH, marginTop: 2 }}>
          <View style={{ width: labelColW }}>
            <TText variant="mono" style={{ fontSize: 12, color: c.ink3, letterSpacing: -0.3 }}>···</TText>
          </View>
          <TText variant="mono" style={{ fontSize: 11, color: c.ink3, letterSpacing: -0.2 }}>
            +{overflow} more
          </TText>
        </View>
      )}

      {/* Footnote: name the fastest split in plain runner voice. */}
      <View style={{ marginTop: PAD.sm }}>
        <View style={{ height: 0.6, backgroundColor: c.line, marginBottom: PAD.sm }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 14, height: 4, backgroundColor: c.accent }} />
          <TText variant="mono" style={{ fontSize: 10, color: c.ink2, letterSpacing: -0.2 }}>
            FASTEST · K{fastestK} {fmtPace(fastestSec, units)}{paceUnit(units)}
          </TText>
        </View>
      </View>
    </View>
  );
}

// No per-km splits (indoor / unimported run). Fall back to a clean stat block
// so the receipt still reads as a complete document, never a broken table.
function Fallback({ c, run, units, padH }: { c: ReturnType<typeof useColors>; run: Activity; units: Units; padH: number }) {
  const extras = richMetrics(run, units).filter((m) => m.key !== 'elev').slice(0, 4);
  const rows: { label: string; value: string }[] = [
    { label: 'PACE', value: `${fmtPace(run.pace, units)}${paceUnit(units)}` },
    { label: 'TIME', value: fmtTime(run.seconds) },
    ...(run.elev > 0 ? [{ label: 'ELEV', value: `${run.elev} m` }] : []),
    ...extras.map((m) => ({ label: m.label, value: m.value })),
  ];

  return (
    <View style={{ flex: 1, paddingHorizontal: padH, paddingTop: PAD.md }}>
      <Eyebrow style={{ color: c.ink3, fontSize: EYEBROW_SIZE, marginBottom: PAD.xs }}>SUMMARY</Eyebrow>
      {rows.map((r, i) => (
        <View
          key={r.label}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            height: 28,
            borderTopWidth: i === 0 ? 0 : 0.6,
            borderTopColor: c.line,
          }}
        >
          <Eyebrow style={{ color: c.ink3, fontSize: EYEBROW_SIZE }}>{r.label}</Eyebrow>
          <TText
            variant={r.label === 'PACE' ? 'monoSemi' : 'mono'}
            style={{ fontSize: 15, color: r.label === 'PACE' ? c.accent : c.ink, letterSpacing: -0.4 }}
          >
            {r.value}
          </TText>
        </View>
      ))}
      <View style={{ marginTop: PAD.sm }}>
        <TText variant="mono" style={{ fontSize: 9, color: c.ink3, letterSpacing: 0.2 }}>
          NO SPLIT DATA — SUMMARY ONLY
        </TText>
      </View>
    </View>
  );
}

// Torn / perforated receipt edge along the bottom. Deterministic per run.id so
// captures are stable (no Math.random in the render path).
function TornEdge({ width, seed, paper, line }: { width: number; seed: number; paper: string; line: string }) {
  const h = 10;
  const teeth = Math.max(10, Math.round(width / 12));
  const rng = mulberry32(seed);
  let d = `M 0 ${h} L 0 0`;
  for (let i = 0; i <= teeth; i++) {
    const x = (width * i) / teeth;
    const jitter = (rng() - 0.5) * 3;
    const y = i % 2 === 0 ? 1.5 + jitter : h - 1.5 - jitter;
    d += ` L ${x.toFixed(2)} ${Math.max(0, Math.min(h, y)).toFixed(2)}`;
  }
  d += ` L ${width} ${h} Z`;
  return (
    <Svg width={width} height={h} pointerEvents="none">
      {/* Hairline above the tear so the receipt has a top lip. */}
      <Rect x={0} y={0} width={width} height={0.6} fill={line} />
      <Path d={d} fill={paper} />
    </Svg>
  );
}

// Seeded LCG — keep renders deterministic per run.
function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
