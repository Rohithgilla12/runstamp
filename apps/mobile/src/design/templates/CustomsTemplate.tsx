import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import type { Activity } from '../../data/models';
import { distUnit, fmtDist, fmtPace, fmtTime } from '../../lib/format';
import { useColors } from '../theme';
import { TText, Eyebrow } from '../typography';
import { RouteMap } from '../RouteMap';
import { type Units } from './shared';
import { richMetrics } from './metrics';
import { PhotoBackground } from './PhotoBackground';
import { RunstampMark } from '../RunstampMark';
import { EditableField } from '../../editor/text/EditableField';
import { runTypeField, placeField, type EditableTextField } from '../../editor/text/EditFieldContext';
import { runTypeOverride } from '../../editor/text/runType';

interface Props {
  run: Activity;
  width: number;
  height: number;
  background: 'map' | 'photo' | 'solid';
  units?: Units;
  photoUri?: string | null;
  rawLatLng?: ReadonlyArray<readonly [number, number]> | null;
}

// CustomsTemplate
//
// Tongue-in-cheek customs declaration form from PRD §6.3.
// Form-row aesthetic with dotted separator lines, small-caps eyebrow labels
// on the left, JetBrains Mono values on the right.
// "DECLARATION OF RUN" as the italic Instrument Serif title at the top.
// Personal Best checkbox in the lower right.
// Signature line at the very bottom.
export function CustomsTemplate({ run, width, height, background, units = 'km', photoUri, rawLatLng }: Props) {
  const c = useColors();

  const paperTone = '#f5eedf';
  const inkTone = '#1c1812';

  const isPB = run.kind === 'long' || run.distance > 21;

  const unitLabel = distUnit(units).toUpperCase();

  // Genuine training metrics already declared above (elevation, calories) are
  // dropped so the ledger never repeats a row; the next 2 present-only metrics
  // — GAP, cadence, VO₂ — get declared in the form's own customs phrasing.
  const customsLabels: Record<string, string> = {
    gap: 'GRADE-ADJUSTED PACE',
    cadence: 'CADENCE DECLARED',
    vo2: 'AEROBIC FITNESS (VO₂)',
    power: 'RUNNING POWER',
    hr: 'AVERAGE HEART RATE',
  };
  const extraRows = richMetrics(run, units)
    .filter((m) => m.key in customsLabels)
    .slice(0, 2)
    .map((m) => ({ label: customsLabels[m.key] ?? m.label, value: m.value.toUpperCase() }));

  const formRows: { label: string; value: string; editField?: EditableTextField }[] = [
    { label: 'DISTANCE DECLARED', value: `${fmtDist(run.distance, units)} ${unitLabel}` },
    { label: 'PACE DECLARED',     value: `${fmtPace(run.pace, units)} / ${unitLabel}` },
    { label: 'TIME DECLARED',     value: fmtTime(run.seconds) },
    { label: 'ELEVATION GAIN',    value: `${run.elev} M` },
    { label: 'CALORIES CONSUMED', value: run.cal > 0 ? `${run.cal} KCAL` : '—' },
    ...extraRows,
    { label: 'PURPOSE OF VISIT',  value: (runTypeOverride(run)?.toUpperCase()) ?? purposeFromKind(run.kind), editField: runTypeField(run) },
    { label: 'CITY OF ORIGIN',    value: (run.city || '—').toUpperCase(), editField: placeField(run) },
    { label: 'COUNTRY',           value: (run.country || '—').toUpperCase() },
  ];

  return (
    <View style={{ width, height, position: 'relative', backgroundColor: paperTone, overflow: 'hidden' }}>

      {/* Warm paper background */}
      <View style={{ position: 'absolute', inset: 0, backgroundColor: paperTone }} />

      {/* Background overlay */}
      {background === 'map' && (
        <View style={{ position: 'absolute', inset: 0, opacity: 0.08 }}>
          <RouteMap rawLatLng={rawLatLng} width={width} height={height} style="light" accent={c.accent} routeStrokeWidth={2} animate={false} flat />
        </View>
      )}
      {background === 'photo' && (
        <PhotoBackground
          uri={photoUri}
          width={width}
          height={height}
          opacity={0.5}
          fallback={
            <View style={{ position: 'absolute', inset: 0 }}>
              {Array.from({ length: 16 }).map((_, i) => (
                <View key={i} style={{
                  position: 'absolute', top: i * 32 - 50, left: -20, width: width + 40,
                  height: 12, backgroundColor: 'rgba(28,24,18,0.025)', transform: [{ rotate: '-6deg' }],
                }} />
              ))}
            </View>
          }
        />
      )}
      {background === 'solid' && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: c.accent, opacity: 0.06 }} />
      )}

      {/* Outer form border */}
      <Svg
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0 }}
        pointerEvents="none"
      >
        <Rect
          x={10} y={10}
          width={width - 20}
          height={height - 20}
          fill="none"
          stroke="rgba(28,24,18,0.22)"
          strokeWidth={1}
        />
        <Rect
          x={14} y={14}
          width={width - 28}
          height={height - 28}
          fill="none"
          stroke="rgba(28,24,18,0.10)"
          strokeWidth={0.6}
        />
      </Svg>

      {/* Header */}
      <View style={{ paddingHorizontal: 22, paddingTop: 22, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Eyebrow style={{ color: 'rgba(28,24,18,0.45)', fontSize: 7, letterSpacing: 2 }}>
              DEPARTMENT OF ATHLETIC AFFAIRS
            </Eyebrow>
            <TText
              variant="serifItalic"
              style={{
                fontSize: Math.min(width * 0.085, 30),
                color: inkTone,
                letterSpacing: -0.4,
                lineHeight: Math.min(width * 0.085, 30) * 1.1,
                marginTop: 4
              }}
            >
              Declaration of Run
            </TText>
          </View>
          <View style={{
            borderWidth: 1, borderColor: 'rgba(28,24,18,0.25)', borderRadius: 3,
            paddingHorizontal: 7, paddingVertical: 4, marginTop: 4
          }}>
            <TText variant="mono" style={{ fontSize: 8, color: 'rgba(28,24,18,0.5)' }}>
              FORM {run.id.toUpperCase()}
            </TText>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: 'rgba(28,24,18,0.18)', marginTop: 12 }} />
        <View style={{ height: 0.4, backgroundColor: 'rgba(28,24,18,0.08)', marginTop: 2 }} />
      </View>

      {/* Instruction text */}
      <View style={{ paddingHorizontal: 22, paddingBottom: 8 }}>
        <TText style={{ fontSize: 9, color: 'rgba(28,24,18,0.42)', lineHeight: 13, letterSpacing: 0.2 }}>
          All runners are required to accurately declare the following. False declarations may result in elevation audits.
        </TText>
      </View>

      {/* Form rows */}
      <View style={{ flex: 1, paddingHorizontal: 22 }}>
        {formRows.map((row, i) => (
          <FormRow
            key={row.label}
            label={row.label}
            value={row.value}
            isLast={i === formRows.length - 1}
            inkTone={inkTone}
            editField={row.editField}
          />
        ))}
      </View>

      {/* Bottom section: PB checkbox + signature */}
      <View style={{ paddingHorizontal: 22, paddingBottom: 20, paddingTop: 8 }}>
        <View style={{ height: 0.6, backgroundColor: 'rgba(28,24,18,0.18)', marginBottom: 12 }} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Signature line */}
          <View style={{ flex: 1, marginRight: 20 }}>
            <View style={{ height: 0.8, backgroundColor: 'rgba(28,24,18,0.35)', marginBottom: 4 }} />
            <TText
              variant="serifItalic"
              style={{ fontSize: 9, color: 'rgba(28,24,18,0.45)', letterSpacing: 0.3 }}
            >
              GILLA · MAY 17 26
            </TText>
            <Eyebrow style={{ color: 'rgba(28,24,18,0.35)', fontSize: 7, marginTop: 1 }}>
              SIGNATURE OF RUNNER
            </Eyebrow>
          </View>

          {/* PB checkbox */}
          <PBCheckbox checked={isPB} inkTone={inkTone} accentColor={c.accent} />
        </View>

        {/* via Runstamp footer */}
        <View style={{ marginTop: 10, alignItems: 'flex-end' }}>
          <RunstampMark tone="ink" opacity={0.4} />
        </View>
      </View>
    </View>
  );
}

function purposeFromKind(kind: Activity['kind']): string {
  switch (kind) {
    case 'long':    return 'LONG RUN — ENDURANCE';
    case 'workout': return 'SPEED WORK — QUALITY';
    case 'easy':    return 'EASY RUN — RECOVERY';
    case 'travel':  return 'TRAVEL RUN — LEISURE';
    case 'race':    return 'RACE — COMPETITION';
    default:        return 'RUNNING — GENERAL';
  }
}

interface FormRowProps {
  label: string;
  value: string;
  isLast: boolean;
  inkTone: string;
  editField?: EditableTextField;
}

function FormRow({ label, value, isLast, inkTone, editField }: FormRowProps) {
  return (
    <View style={{ paddingVertical: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Eyebrow style={{ color: 'rgba(28,24,18,0.50)', fontSize: 7.5, flex: 1, marginRight: 8 }}>
          {label}
        </Eyebrow>
        {editField ? (
          <EditableField field={editField}>
            <TText
              variant="mono"
              style={{ fontSize: 12.5, color: inkTone, letterSpacing: -0.2, textAlign: 'right', flexShrink: 0 }}
            >
              {value}
            </TText>
          </EditableField>
        ) : (
          <TText
            variant="mono"
            style={{ fontSize: 12.5, color: inkTone, letterSpacing: -0.2, textAlign: 'right', flexShrink: 0 }}
          >
            {value}
          </TText>
        )}
      </View>
      {/* Dotted separator — not shown after last row */}
      {!isLast && <DottedLine />}
    </View>
  );
}

function DottedLine() {
  return (
    <View style={{ height: 6, justifyContent: 'center' }}>
      <View style={{
        height: 0,
        borderBottomWidth: 0.8,
        borderBottomColor: 'rgba(28,24,18,0.18)',
        borderStyle: 'dashed'
      }} />
    </View>
  );
}

interface PBCheckboxProps {
  checked: boolean;
  inkTone: string;
  accentColor: string;
}

function PBCheckbox({ checked, inkTone, accentColor }: PBCheckboxProps) {
  const size = 18;
  return (
    <View style={{ alignItems: 'flex-end', gap: 3 }}>
      <Eyebrow style={{ color: 'rgba(28,24,18,0.45)', fontSize: 7 }}>PERSONAL BEST</Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <View style={{
          width: size,
          height: size,
          borderWidth: 1.2,
          borderColor: checked ? accentColor : 'rgba(28,24,18,0.35)',
          borderRadius: 2,
          backgroundColor: checked ? accentColor : 'transparent',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {checked && (
            <Svg width={size - 4} height={size - 4} viewBox="0 0 14 14">
              <Line x1={2} y1={7} x2={5} y2={11} stroke="#f5eedf" strokeWidth={1.8} strokeLinecap="round" />
              <Line x1={5} y1={11} x2={12} y2={3} stroke="#f5eedf" strokeWidth={1.8} strokeLinecap="round" />
            </Svg>
          )}
          {!checked && (
            <Svg width={size - 4} height={size - 4} viewBox="0 0 14 14">
              <Line x1={2} y1={2} x2={12} y2={12} stroke="rgba(28,24,18,0.35)" strokeWidth={1.2} strokeLinecap="round" />
              <Line x1={12} y1={2} x2={2} y2={12} stroke="rgba(28,24,18,0.35)" strokeWidth={1.2} strokeLinecap="round" />
            </Svg>
          )}
        </View>
        <TText variant="mono" style={{ fontSize: 9, color: checked ? accentColor : 'rgba(28,24,18,0.4)' }}>
          {checked ? 'YES' : 'NO'}
        </TText>
      </View>
    </View>
  );
}
