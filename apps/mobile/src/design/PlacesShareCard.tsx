import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Eyebrow, TText } from './typography';
import { WorldMap, type MapCity } from './WorldMap';
import { PostmarkCancellation } from './PostmarkCancellation';

interface Props {
  cities: MapCity[];
  year: number;
  stats: { cities: number; countries: number; continents: number; totalKm: number };
  width: number;
  height: number;
}

// The "My YYYY Runstamps" share artifact — Spotify-Wrapped-for-runners. Same
// postage-stamp composition as StampShareCard (canvas + perforated paper +
// top plate + body + postmark + bottom plate) but with the WorldMap as the
// hero image and stats stacked underneath.
export function PlacesShareCard({ cities, year, stats, width, height }: Props) {
  const palette = {
    canvas: '#14110d',
    paper: '#f3ede2',
    ink: '#14110d',
    postmarkInk: '#e85d2f',
  };

  const marginH = width * 0.055;
  const marginV = height * 0.035;
  const paperW = width - marginH * 2;
  const paperH = height - marginV * 2;
  const pad = paperW * 0.07;
  const mapW = paperW - pad * 2;
  const postmarkSize = paperW * 0.22;
  const eyebrowFont = Math.max(Math.min(paperW * 0.028, 13), 9);
  const monoSm = Math.max(Math.min(paperW * 0.026, 12), 8);
  const titleFont = Math.min(paperW * 0.13, 56);
  const bigFont = Math.min(paperW * 0.22, 96);

  return (
    <View style={{ width, height, backgroundColor: palette.canvas, position: 'relative', overflow: 'hidden' }}>
      {/* Stamp paper */}
      <View
        style={{
          position: 'absolute',
          left: marginH,
          top: marginV,
          width: paperW,
          height: paperH,
          backgroundColor: palette.paper,
          paddingHorizontal: pad,
          paddingVertical: pad * 0.85,
        }}
      >
        {/* Top plate */}
        <View>
          <TText
            variant="mono"
            style={{ fontSize: eyebrowFont, color: palette.ink, letterSpacing: 2.4, fontWeight: '600' }}
          >
            RUNSTAMP · PASSPORT · {year}
          </TText>
          <View style={{ height: 1, backgroundColor: palette.ink, opacity: 0.35, marginTop: pad * 0.5 }} />
        </View>

        {/* Hero title */}
        <View style={{ marginTop: pad * 0.6 }}>
          <TText
            variant="serif"
            style={{ fontSize: titleFont, lineHeight: titleFont * 1.0, color: palette.ink, letterSpacing: -1 }}
          >
            My{' '}
          </TText>
          <TText
            variant="serifItalic"
            style={{ fontSize: titleFont, lineHeight: titleFont * 1.0, color: palette.ink, letterSpacing: -1 }}
          >
            {year}
          </TText>
          <TText
            variant="serif"
            style={{ fontSize: titleFont, lineHeight: titleFont * 1.0, color: palette.ink, letterSpacing: -1 }}
          >
            {' '}Runstamps.
          </TText>
        </View>

        {/* Map */}
        <View style={{ marginTop: pad * 0.6, alignItems: 'center' }}>
          <WorldMap cities={cities} width={mapW} animate={false} />
        </View>

        {/* Stats row */}
        <View style={{ marginTop: pad * 0.7, flexDirection: 'row', gap: pad * 0.5 }}>
          <StatBlock label="STAMPS" value={String(stats.cities)} big={bigFont * 0.55} eyebrowFont={eyebrowFont} ink={palette.ink} />
          <StatBlock label="COUNTRIES" value={String(stats.countries)} big={bigFont * 0.55} eyebrowFont={eyebrowFont} ink={palette.ink} />
          <StatBlock label="CONTINENTS" value={String(stats.continents)} big={bigFont * 0.55} eyebrowFont={eyebrowFont} ink={palette.ink} />
        </View>

        <View style={{ flex: 1 }} />

        {/* Hairline before footer */}
        <View style={{ height: 1, backgroundColor: palette.ink, opacity: 0.35 }} />

        {/* Bottom plate */}
        <View style={{ paddingTop: pad * 0.5, paddingLeft: postmarkSize * 0.55 }}>
          <TText
            variant="serifItalic"
            style={{ fontSize: titleFont * 0.45, lineHeight: titleFont * 0.5, color: palette.ink, letterSpacing: -0.3 }}
            numberOfLines={1}
          >
            {Math.round(stats.totalKm).toLocaleString()} km · {year}
          </TText>
          <TText
            variant="mono"
            style={{ fontSize: monoSm * 0.9, color: palette.ink, opacity: 0.45, marginTop: 4, letterSpacing: 1.6 }}
            numberOfLines={1}
          >
            PASSPORT · {year} · RUNSTAMP
          </TText>
        </View>
      </View>

      {/* Perforations around the stamp paper */}
      <Perforations
        canvasColor={palette.canvas}
        canvasW={width}
        canvasH={height}
        marginH={marginH}
        marginV={marginV}
        paperW={paperW}
        paperH={paperH}
        radius={width * 0.014}
      />

      {/* Postmark — overlaps bottom-left of paper */}
      <View
        style={{
          position: 'absolute',
          left: marginH - postmarkSize * 0.32,
          top: marginV + paperH - postmarkSize * 0.65,
          width: postmarkSize,
          height: postmarkSize,
        }}
        pointerEvents="none"
      >
        <PostmarkCancellation
          size={postmarkSize}
          color={palette.postmarkInk}
          topText={`${year} PASSPORT`}
          bottomText={`${stats.cities} STAMPS`}
        />
      </View>
    </View>
  );
}

function StatBlock({ label, value, big, eyebrowFont, ink }: {
  label: string;
  value: string;
  big: number;
  eyebrowFont: number;
  ink: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Eyebrow style={{ color: ink, opacity: 0.55, fontSize: eyebrowFont }}>{label}</Eyebrow>
      <TText
        variant="monoMedium"
        style={{ fontSize: big, lineHeight: big * 1.05, letterSpacing: -1.5, color: ink, marginTop: 2 }}
      >
        {value}
      </TText>
    </View>
  );
}

function Perforations({
  canvasColor, canvasW, canvasH, marginH, marginV, paperW, paperH, radius,
}: {
  canvasColor: string; canvasW: number; canvasH: number;
  marginH: number; marginV: number; paperW: number; paperH: number; radius: number;
}) {
  const pitch = radius * 2.6;
  const colCount = Math.floor(paperW / pitch);
  const colSpacing = paperW / colCount;
  const rowCount = Math.floor(paperH / pitch);
  const rowSpacing = paperH / rowCount;

  const circles: Array<{ cx: number; cy: number }> = [];
  for (let i = 0; i <= colCount; i++) {
    const cx = marginH + i * colSpacing;
    circles.push({ cx, cy: marginV });
    circles.push({ cx, cy: marginV + paperH });
  }
  for (let i = 1; i < rowCount; i++) {
    const cy = marginV + i * rowSpacing;
    circles.push({ cx: marginH, cy });
    circles.push({ cx: marginH + paperW, cy });
  }

  return (
    <Svg
      width={canvasW}
      height={canvasH}
      style={{ position: 'absolute', top: 0, left: 0 }}
      pointerEvents="none"
    >
      {circles.map((c, i) => (
        <Circle key={i} cx={c.cx} cy={c.cy} r={radius} fill={canvasColor} />
      ))}
    </Svg>
  );
}
