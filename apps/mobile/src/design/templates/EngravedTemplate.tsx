import React from 'react';
import { View } from 'react-native';
import Svg, {
  Defs,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import type { Activity } from '../../data/models';
import { distUnit, fmtDist, fmtPace, fmtTime } from '../../lib/format';
import { TText, Eyebrow } from '../typography';
import { richMetrics } from './metrics';
import { type Units } from './shared';
import { EditableField } from '../../editor/text/EditableField';
import { titleField, placeField } from '../../editor/text/EditFieldContext';

interface Props {
  run: Activity;
  width: number;
  height: number;
  background: 'map' | 'photo' | 'solid';
  units?: Units;
  /** Engraved is intentionally monochrome — accepts the prop for editor
   *  call-site consistency but ignores it. */
  photoUri?: string | null;
  /** Engraved has no map backdrop — accepts for call-site uniformity, ignores. */
  rawLatLng?: ReadonlyArray<readonly [number, number]> | null;
  hideAttribution?: boolean;
}

// EngravedTemplate
//
// Letterpress monochrome aesthetic from PRD §6.3.
// All-caps Instrument Serif display title in tight tracking.
// The large distance numeral is outlined (SVG stroke, fill="none") giving it
// a carved-relief feel. Double concentric border rules frame the whole card.
// No accent colour — pure ink (#14110d) on paper (#f3ede2) regardless of theme.
// Background variant has no effect on colour; only the solid variant gets a
// slightly darker paper to simulate thick card stock.
export function EngravedTemplate({ run, width, height, background, units = 'km', hideAttribution }: Props) {
  // Monochrome — intentionally bypass theme accent
  const paper = background === 'solid' ? '#ede5d4' : '#f3ede2';
  const ink = '#14110d';
  const borderInset1 = 10;
  const borderInset2 = 16;

  const distFontSize = Math.min(width * 0.28, 100);

  // Third stat slot: elevation reads most certificate-like, but a flat or
  // indoor run (elev 0) would leave a dead "0m". Fall back to the strongest
  // present rich metric (GAP, cadence, VO₂, …); if a run truly has none,
  // keep elevation — an honest "0m" beats a duplicated stat.
  const richer = richMetrics(run, units).find((m) => m.key !== 'elev');
  const thirdStat =
    run.elev > 0 || !richer
      ? { label: 'ELEV', value: `${run.elev}m` }
      : { label: richer.label, value: richer.value };

  return (
    <View style={{ width, height, position: 'relative', backgroundColor: paper, overflow: 'hidden' }}>

      {/* Double-ruled border via two concentric SVG Rects */}
      <Svg
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0 }}
        pointerEvents="none"
      >
        <Defs />
        <Rect
          x={borderInset1}
          y={borderInset1}
          width={width - borderInset1 * 2}
          height={height - borderInset1 * 2}
          fill="none"
          stroke={ink}
          strokeWidth={1.4}
        />
        <Rect
          x={borderInset2}
          y={borderInset2}
          width={width - borderInset2 * 2}
          height={height - borderInset2 * 2}
          fill="none"
          stroke={ink}
          strokeWidth={0.6}
        />
      </Svg>

      {/* Top header block */}
      <View style={{ paddingHorizontal: 26, paddingTop: 28, alignItems: 'center' }}>
        <TText
          variant="serif"
          style={{
            fontSize: 8,
            color: ink,
            letterSpacing: 5,
            textTransform: 'uppercase',
            opacity: 0.55
          }}
        >
          REPUBLIC OF RUNNING
        </TText>
        <View style={{ height: 0.7, width: '40%', backgroundColor: ink, opacity: 0.25, marginTop: 6 }} />
      </View>

      {/* Outlined distance numeral — the centrepiece */}
      <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 4 }}>
        <Svg width={width} height={distFontSize + 12} viewBox={`0 0 ${width} ${distFontSize + 12}`}>
          <SvgText
            x={width / 2}
            y={distFontSize}
            fontSize={distFontSize}
            fill="none"
            stroke={ink}
            strokeWidth={1.2}
            textAnchor="middle"
            fontFamily="InstrumentSerif_400Regular"
            letterSpacing={-4}
          >
            {fmtDist(run.distance, units)}
          </SvgText>
        </Svg>
        <TText
          variant="serif"
          style={{
            fontSize: 11,
            color: ink,
            letterSpacing: 6,
            textTransform: 'uppercase',
            opacity: 0.5,
            marginTop: -4
          }}
        >
          {units === 'mi' ? 'MILES' : 'KILOMETRES'}
        </TText>
      </View>

      {/* Thin rule */}
      <View style={{ marginHorizontal: 26, height: 0.7, backgroundColor: ink, opacity: 0.20, marginTop: 12, marginBottom: 12 }} />

      {/* Stats row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 24 }}>
        <StatBlock label="PACE" value={`${fmtPace(run.pace, units)}/${distUnit(units)}`} ink={ink} />
        <View style={{ width: 0.7, backgroundColor: ink, opacity: 0.15 }} />
        <StatBlock label="TIME" value={fmtTime(run.seconds)} ink={ink} />
        <View style={{ width: 0.7, backgroundColor: ink, opacity: 0.15 }} />
        <StatBlock label={thirdStat.label} value={thirdStat.value} ink={ink} />
      </View>

      {/* Run title — italic serif */}
      <View style={{ alignItems: 'center', marginTop: 14, paddingHorizontal: 30 }}>
        <EditableField field={titleField(run)}>
          <TText
            variant="serifItalic"
            style={{ fontSize: 15, color: ink, textAlign: 'center', opacity: 0.65, lineHeight: 20 }}
            numberOfLines={2}
          >
            {run.title}
          </TText>
        </EditableField>
      </View>

      {/* Thin rule */}
      <View style={{ marginHorizontal: 26, height: 0.7, backgroundColor: ink, opacity: 0.20, marginTop: 12, marginBottom: 12 }} />

      {/* Lower metadata */}
      <View style={{ paddingHorizontal: 26, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Eyebrow style={{ color: ink, opacity: 0.45, fontSize: 7 }}>{run.day.toUpperCase()}</Eyebrow>
          <TText variant="mono" style={{ fontSize: 10, color: ink, opacity: 0.65, marginTop: 2 }}>
            {formatEngravedDate(run.date)}
          </TText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Eyebrow style={{ color: ink, opacity: 0.45, fontSize: 7 }}>CITY</Eyebrow>
          <EditableField field={placeField(run)}>
            <TText variant="serif" style={{ fontSize: 13, color: ink, opacity: 0.7, marginTop: 2 }}>
              {run.city}
            </TText>
          </EditableField>
        </View>
      </View>

      {/* Bottom ornament row */}
      {!hideAttribution && (
        <View style={{ alignItems: 'center', position: 'absolute', bottom: 26, left: 0, right: 0 }}>
          <OrnamentsRow ink={ink} width={width * 0.5} />
          <TText
            variant="serif"
            style={{
              fontSize: 7,
              color: ink,
              letterSpacing: 4,
              textTransform: 'uppercase',
              opacity: 0.35,
              marginTop: 4
            }}
          >
            RUNSTAMP · {run.country.toUpperCase()}
          </TText>
        </View>
      )}
    </View>
  );
}

function formatEngravedDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const m = months[(parseInt(month, 10) - 1) % 12];
  return `${day} ${m} ${year}`;
}

interface StatBlockProps {
  label: string;
  value: string;
  ink: string;
}

function StatBlock({ label, value, ink }: StatBlockProps) {
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 6 }}>
      <TText
        variant="mono"
        style={{ fontSize: 9, color: ink, opacity: 0.5, letterSpacing: 1.6, textTransform: 'uppercase' }}
      >
        {label}
      </TText>
      <TText
        variant="mono"
        style={{ fontSize: 14, color: ink, opacity: 0.85, letterSpacing: -0.3, marginTop: 4 }}
      >
        {value}
      </TText>
    </View>
  );
}

interface OrnamentsRowProps {
  ink: string;
  width: number;
}

function OrnamentsRow({ ink, width }: OrnamentsRowProps) {
  const h = 8;
  return (
    <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
      {/* Simple geometric ornament — alternating diamonds and lines */}
      {Array.from({ length: 9 }).map((_, i) => {
        const x = (width / 9) * i + (width / 18);
        if (i % 2 === 0) {
          // Diamond
          return (
            <SvgText
              key={i}
              x={x}
              y={h * 0.85}
              fontSize={6}
              fill={ink}
              textAnchor="middle"
              opacity={0.35}
              fontFamily="InstrumentSerif_400Regular"
            >
              ◆
            </SvgText>
          );
        }
        // Short vertical line
        return (
          <Svg key={i} x={x - 0.3} y={1} width={0.6} height={h - 2}>
            <Rect x={0} y={0} width={0.6} height={h - 2} fill={ink} opacity={0.20} />
          </Svg>
        );
      })}
    </Svg>
  );
}
