import React from 'react';
import Svg, { Circle, G, Line, Path, Rect, Ellipse } from 'react-native-svg';

export interface IllustrationColors {
  ink: string;
  accent?: string;
  shadow?: string;
  foil?: string;
}

interface Props {
  size: number;
  colors: IllustrationColors;
}

// Auto-generated from SVG assets
export function BengaluruMarathonIllustration({ size, colors }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {colors.shadow && (
        <G stroke={colors.shadow} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    {/* Dense parallel horizontal lines for the sky/clouds in the background */}
    <Path d="M 10 120 L 50 120 M 15 114 L 45 114 M 20 108 L 40 108" strokeWidth="1.2"/>
    <Path d="M 150 120 L 190 120 M 155 114 L 185 114 M 160 108 L 180 108" strokeWidth="1.2"/>
    {/* Distant trees using clustered short vertical strokes */}
    <Path d="M 15 125 L 15 135 M 20 123 L 20 135 M 25 126 L 25 135 M 30 124 L 30 135 M 35 127 L 35 135 M 40 125 L 40 135 M 45 128 L 45 135" strokeWidth="1.2"/>
    <Path d="M 155 125 L 155 135 M 160 123 L 160 135 M 165 126 L 165 135 M 170 124 L 170 135 M 175 127 L 175 135 M 180 125 L 180 135 M 185 128 L 185 135" strokeWidth="1.2"/>
          </G>
      )}
      <G stroke={colors.ink} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    {/* Ground line and dense base hatching */}
    <Line x1="4" y1="184" x2="196" y2="184"/>
    <Line x1="10" y1="178" x2="190" y2="178"/>
    <Line x1="16" y1="172" x2="184" y2="172"/>
    <Path d="M 10 184 L 16 178 M 20 184 L 26 178 M 30 184 L 36 178 M 40 184 L 46 178 M 50 184 L 56 178 M 60 184 L 66 178 M 70 184 L 76 178 M 80 184 L 86 178 M 90 184 L 96 178 M 100 184 L 106 178 M 110 184 L 116 178 M 120 184 L 126 178 M 130 184 L 136 178 M 140 184 L 146 178 M 150 184 L 156 178 M 160 184 L 166 178 M 170 184 L 176 178 M 180 184 L 186 178 M 190 184 L 196 178" strokeWidth="1.2"/>
    
    {/* Central building block */}
    <Rect x="56" y="110" width="88" height="62"/>
    
    {/* Colonnade (densely packed columns) */}
    <Line x1="62" y1="110" x2="62" y2="172"/>
    <Line x1="68" y1="110" x2="68" y2="172"/>
    <Line x1="74" y1="110" x2="74" y2="172"/>
    <Line x1="80" y1="110" x2="80" y2="172"/>
    <Line x1="86" y1="110" x2="86" y2="172"/>
    <Line x1="92" y1="110" x2="92" y2="172"/>
    <Line x1="98" y1="110" x2="98" y2="172"/>
    <Line x1="104" y1="110" x2="104" y2="172"/>
    <Line x1="110" y1="110" x2="110" y2="172"/>
    <Line x1="116" y1="110" x2="116" y2="172"/>
    <Line x1="122" y1="110" x2="122" y2="172"/>
    <Line x1="128" y1="110" x2="128" y2="172"/>
    <Line x1="134" y1="110" x2="134" y2="172"/>

    {/* Architrave and pediment area */}
    <Rect x="52" y="102" width="96" height="8"/>
    <Path d="M 52 102 L 100 85 L 148 102 Z"/>
    {/* Pediment hatching */}
    <Path d="M 60 102 L 100 88 M 70 102 L 100 92 M 80 102 L 100 95 M 90 102 L 100 98" strokeWidth="1"/>
    <Path d="M 140 102 L 100 88 M 130 102 L 100 92 M 120 102 L 100 95 M 110 102 L 100 98" strokeWidth="1"/>

    {/* Main Dome Drum */}
    <Rect x="76" y="65" width="48" height="20"/>
    <Line x1="82" y1="65" x2="82" y2="85"/>
    <Line x1="88" y1="65" x2="88" y2="85"/>
    <Line x1="94" y1="65" x2="94" y2="85"/>
    <Line x1="100" y1="65" x2="100" y2="85"/>
    <Line x1="106" y1="65" x2="106" y2="85"/>
    <Line x1="112" y1="65" x2="112" y2="85"/>
    <Line x1="118" y1="65" x2="118" y2="85"/>

    {/* Main Dome */}
    <Path d="M 72 65 Q 100 25 128 65"/>
    {/* Dome vertical ribbing/hatching */}
    <Path d="M 80 65 Q 90 35 100 25" strokeWidth="1.5"/>
    <Path d="M 90 65 Q 95 30 100 25" strokeWidth="1.5"/>
    <Path d="M 100 65 L 100 25" strokeWidth="1.5"/>
    <Path d="M 110 65 Q 105 30 100 25" strokeWidth="1.5"/>
    <Path d="M 120 65 Q 110 35 100 25" strokeWidth="1.5"/>

    {/* Side Wings */}
    <Rect x="24" y="126" width="32" height="46"/>
    <Rect x="144" y="126" width="32" height="46"/>
    
    {/* Side Wing Details */}
    <Rect x="30" y="136" width="8" height="16"/>
    <Rect x="42" y="136" width="8" height="16"/>
    <Rect x="150" y="136" width="8" height="16"/>
    <Rect x="162" y="136" width="8" height="16"/>

    {/* Side wing domes */}
    <Path d="M 22 126 Q 40 106 58 126"/>
    <Path d="M 142 126 Q 160 106 178 126"/>
    
    <Path d="M 30 126 Q 40 112 50 126" strokeWidth="1.2"/>
    <Path d="M 150 126 Q 160 112 170 126" strokeWidth="1.2"/>
        </G>
      {colors.accent && (
        <G stroke={colors.accent} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    {/* Shading blocks inside colonnade and dome */}
    <Path d="M 65 110 L 65 172 M 77 110 L 77 172 M 89 110 L 89 172 M 101 110 L 101 172 M 113 110 L 113 172 M 125 110 L 125 172" strokeWidth="2" opacity="0.3"/>
          </G>
      )}
      {colors.foil && (
        <G stroke={colors.foil} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    {/* Finial and top crest */}
    <Line x1="100" y1="25" x2="100" y2="8"/>
    <Line x1="94" y1="18" x2="106" y2="18"/>
    <Line x1="96" y1="12" x2="104" y2="12"/>
    <Circle cx="100" cy="8" r="2" fill={colors.foil} stroke="none"/>
          </G>
      )}
    </Svg>
  );
}

export function HyderabadMarathonIllustration({ size, colors }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {colors.shadow && (
        <G stroke={colors.shadow} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    {/* Busy market street suggestion with horizontal and diagonal hatching */}
    <Line x1="10" y1="190" x2="190" y2="190"/>
    <Path d="M 15 186 L 45 186 M 155 186 L 185 186" strokeWidth="1.2"/>
    <Path d="M 20 180 L 35 190 M 180 180 L 165 190" strokeWidth="1"/>
          </G>
      )}
      <G stroke={colors.ink} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    <Rect x="36" y="110" width="128" height="74"/>
    
    {/* Main Central Arch */}
    <Path d="M 70 184 L 70 140 Q 100 110 130 140 L 130 184"/>
    {/* Arch inner detail and recessed shadow hatching */}
    <Path d="M 76 184 L 76 140 Q 100 120 124 140 L 124 184"/>
    <Path d="M 80 184 L 80 142 Q 100 126 120 142 L 120 184" strokeWidth="1.2"/>
    <Path d="M 84 184 L 84 145 M 88 184 L 88 148 M 92 184 L 92 152 M 96 184 L 96 155 M 100 184 L 100 157 M 104 184 L 104 155 M 108 184 L 108 152 M 112 184 L 112 148 M 116 184 L 116 145" strokeWidth="1.2"/>

    {/* Side Arches */}
    <Path d="M 44 184 L 44 155 Q 52 145 60 155 L 60 184"/>
    <Path d="M 140 184 L 140 155 Q 148 145 156 155 L 156 184"/>

    {/* Balustrades / Upper Gallery */}
    <Line x1="36" y1="110" x2="164" y2="110"/>
    <Line x1="36" y1="100" x2="164" y2="100"/>
    <Line x1="36" y1="90" x2="164" y2="90"/>
    
    {/* Gallery arches */}
    <Path d="M 50 100 Q 56 90 62 100 M 66 100 Q 72 90 78 100 M 82 100 Q 88 90 94 100 M 98 100 Q 104 90 110 100 M 114 100 Q 120 90 126 100 M 130 100 Q 136 90 142 100 M 146 100 Q 152 90 158 100"/>

    {/* Central Dome */}
    <Path d="M 80 90 Q 100 60 120 90"/>
    <Path d="M 90 90 Q 100 70 110 90" strokeWidth="1.2"/>

    {/* Left Minaret */}
    <Line x1="26" y1="184" x2="26" y2="30"/>
    <Line x1="36" y1="184" x2="36" y2="30"/>
    {/* Minaret Balconies */}
    <Line x1="20" y1="140" x2="42" y2="140"/>
    <Line x1="20" y1="90" x2="42" y2="90"/>
    <Line x1="22" y1="50" x2="40" y2="50"/>
    {/* Minaret details */}
    <Line x1="31" y1="184" x2="31" y2="30" strokeWidth="1"/>
    {/* Dome */}
    <Path d="M 22 30 Q 31 10 40 30"/>

    {/* Right Minaret */}
    <Line x1="164" y1="184" x2="164" y2="30"/>
    <Line x1="174" y1="184" x2="174" y2="30"/>
    <Line x1="158" y1="140" x2="180" y2="140"/>
    <Line x1="158" y1="90" x2="180" y2="90"/>
    <Line x1="160" y1="50" x2="178" y2="50"/>
    <Line x1="169" y1="184" x2="169" y2="30" strokeWidth="1"/>
    <Path d="M 160 30 Q 169 10 178 30"/>
        </G>
      {colors.accent && (
        <G stroke={colors.accent} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    {/* Gallery balustrade crosses */}
    <Path d="M 40 108 L 44 102 M 44 108 L 40 102" strokeWidth="1"/>
    <Path d="M 48 108 L 52 102 M 52 108 L 48 102" strokeWidth="1"/>
    <Path d="M 148 108 L 152 102 M 152 108 L 148 102" strokeWidth="1"/>
    <Path d="M 156 108 L 160 102 M 160 108 L 156 102" strokeWidth="1"/>
          </G>
      )}
      {colors.foil && (
        <G stroke={colors.foil} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    {/* Minaret and Dome Finials */}
    <Line x1="100" y1="60" x2="100" y2="45"/>
    <Circle cx="100" cy="42" r="2" fill={colors.foil} stroke="none"/>
    <Line x1="31" y1="15" x2="31" y2="5"/>
    <Line x1="169" y1="15" x2="169" y2="5"/>
          </G>
      )}
    </Svg>
  );
}

export function LadakhMarathonIllustration({ size, colors }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {colors.shadow && (
        <G stroke={colors.shadow} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    {/* Detailed jagged mountain range in the back */}
    <Path d="M 4 120 L 30 70 L 45 85 L 70 30 L 95 65 L 110 50 L 140 90 L 165 40 L 196 110"/>
    <Path d="M 20 120 L 50 80 L 65 95 L 90 50 L 115 80 L 140 60 L 170 100 M 180 120 L 190 100" strokeWidth="1.5"/>
    
    {/* Mountain ridge shading using dense diagonal hatching */}
    <Path d="M 28 75 L 35 90 M 32 75 L 40 90 M 68 35 L 75 55 M 72 35 L 80 55 M 76 35 L 85 55 M 108 55 L 115 70 M 112 55 L 120 70 M 162 45 L 170 65 M 166 45 L 175 65" strokeWidth="1.2"/>
          </G>
      )}
      <G stroke={colors.ink} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    <Line x1="20" y1="180" x2="180" y2="180"/>
    <Line x1="30" y1="172" x2="170" y2="172"/>
    <Line x1="40" y1="164" x2="160" y2="164"/>
    
    {/* Plinth block */}
    <Rect x="50" y="150" width="100" height="14"/>
    {/* Plinth block detailed shading */}
    <Path d="M 55 164 L 55 150 M 60 164 L 60 150 M 140 164 L 140 150 M 145 164 L 145 150" strokeWidth="1.2"/>

    {/* Dome of Stupa (Anda) */}
    <Path d="M 60 150 Q 60 90 100 90 Q 140 90 140 150"/>
    {/* Dome curvature shading */}
    <Path d="M 70 150 Q 70 100 100 100 Q 130 100 130 150" strokeWidth="1.2"/>
    <Path d="M 80 150 Q 80 110 100 110 Q 120 110 120 150" strokeWidth="1.2"/>
    <Path d="M 90 150 Q 90 120 100 120 Q 110 120 110 150" strokeWidth="1.2"/>

    {/* Harmika (Square top box) */}
    <Rect x="86" y="70" width="28" height="20"/>
    <Line x1="86" y1="75" x2="114" y2="75"/>
    <Line x1="86" y1="80" x2="114" y2="80"/>
    {/* Eyes of the Stupa */}
    <Circle cx="94" cy="80" r="2" fill={colors.ink}/>
    <Circle cx="106" cy="80" r="2" fill={colors.ink}/>
    <Path d="M 94 76 Q 94 74 96 74 M 106 76 Q 106 74 104 74" strokeWidth="1.2"/>

    {/* Spire (Sokushin) */}
    <Path d="M 90 70 L 100 20 L 110 70"/>
    <Line x1="92" y1="60" x2="108" y2="60"/>
    <Line x1="94" y1="50" x2="106" y2="50"/>
    <Line x1="96" y1="40" x2="104" y2="40"/>
    <Line x1="98" y1="30" x2="102" y2="30"/>
        </G>
      {colors.accent && (
        <G stroke={colors.accent} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    {/* Prayer flags draped from the spire down to the ground */}
    <Path d="M 100 45 Q 60 70 20 160"/>
    <Path d="M 100 45 Q 140 70 180 160"/>
    {/* Individual flags (triangles) */}
    <Path d="M 84 65 L 75 75 L 80 82 Z"/>
    <Path d="M 68 85 L 55 95 L 62 105 Z"/>
    <Path d="M 50 110 L 35 120 L 45 132 Z"/>
    <Path d="M 116 65 L 125 75 L 120 82 Z"/>
    <Path d="M 132 85 L 145 95 L 138 105 Z"/>
    <Path d="M 150 110 L 165 120 L 155 132 Z"/>
          </G>
      )}
      {colors.foil && (
        <G stroke={colors.foil} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    {/* Spire tip / pinnacle */}
    <Circle cx="100" cy="16" r="3" fill={colors.foil} stroke="none"/>
          </G>
      )}
    </Svg>
  );
}

export function MonsoonRunIllustration({ size, colors }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {colors.shadow && (
        <G stroke={colors.shadow} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    {/* Dense diagonal monsoon rain in background */}
    <Path d="M 20 10 L 10 30 M 40 5 L 20 45 M 60 15 L 45 45 M 80 5 L 60 45 M 120 5 L 100 45 M 140 10 L 125 40 M 160 5 L 140 45 M 180 15 L 165 45 M 190 5 L 180 25" strokeWidth="1"/>
    <Path d="M 10 70 L 5 80 M 185 70 L 175 90 M 15 150 L 5 170 M 190 130 L 180 150" strokeWidth="1"/>
    
    {/* Puddles / ground reflections */}
    <Ellipse cx="100" cy="188" rx="60" ry="4" strokeWidth="1.2"/>
    <Path d="M 50 194 L 150 194 M 70 198 L 130 198" strokeWidth="1"/>
          </G>
      )}
      <G stroke={colors.ink} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    <Line x1="6" y1="184" x2="194" y2="184"/>
    
    {/* Massive organic banyan trunk */}
    <Path d="M 80 184 Q 75 140 90 90 Q 70 120 70 184"/>
    <Path d="M 120 184 Q 125 140 110 90 Q 130 120 130 184"/>
    <Path d="M 90 184 Q 95 150 100 90"/>
    <Path d="M 110 184 Q 105 150 100 90"/>
    
    {/* Dense bark hatching */}
    <Path d="M 85 180 Q 82 140 94 100 M 115 180 Q 118 140 106 100 M 95 180 L 98 120 M 105 180 L 102 120" strokeWidth="1.2"/>

    {/* Organic, rugged canopy composed of many overlapping cloudy/leafy clumps */}
    <Path d="M 40 110 Q 20 100 25 70 Q 10 40 45 35 Q 60 10 90 20 Q 110 5 140 20 Q 170 10 180 40 Q 195 65 170 95 Q 160 115 140 105"/>
    <Path d="M 50 105 Q 40 120 65 125 Q 90 135 120 120 Q 135 125 145 110"/>
    
    {/* Canopy interior detail and leaf clusters */}
    <Path d="M 50 45 Q 60 25 80 35 M 100 30 Q 120 15 140 35 M 40 70 Q 55 55 75 75 M 125 75 Q 145 55 160 70 M 70 100 Q 90 85 110 100" strokeWidth="1.5"/>

    {/* Aerial Roots reaching down */}
    <Path d="M 45 115 L 45 184 M 40 110 L 40 170" strokeWidth="1.5"/>
    <Path d="M 60 120 L 60 184 M 55 122 L 55 160" strokeWidth="1.5"/>
    <Path d="M 140 115 L 140 184 M 145 110 L 145 175" strokeWidth="1.5"/>
    <Path d="M 155 105 L 155 184 M 160 100 L 160 165" strokeWidth="1.5"/>
    
    {/* Roots weaving */}
    <Path d="M 45 140 Q 50 150 60 160 M 140 130 Q 145 145 155 155" strokeWidth="1.2"/>
        </G>
      {colors.accent && (
        <G stroke={colors.accent} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    {/* Highlight raindrops hitting the canopy (stippling) */}
    <Circle cx="35" cy="30" r="1.5" fill={colors.accent} stroke="none"/>
    <Circle cx="70" cy="15" r="1.5" fill={colors.accent} stroke="none"/>
    <Circle cx="110" cy="12" r="1.5" fill={colors.accent} stroke="none"/>
    <Circle cx="155" cy="25" r="1.5" fill={colors.accent} stroke="none"/>
    <Circle cx="180" cy="45" r="1.5" fill={colors.accent} stroke="none"/>
    {/* Drops falling from leaves */}
    <Line x1="50" y1="130" x2="50" y2="135"/>
    <Line x1="90" y1="140" x2="90" y2="145"/>
    <Line x1="130" y1="130" x2="130" y2="135"/>
          </G>
      )}
      {colors.foil && (
        <G stroke={colors.foil} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    {/* Occasional distinct raindrop */}
    <Path d="M 80 160 Q 82 165 80 170 Q 78 165 80 160" fill={colors.foil}/>
    <Path d="M 150 150 Q 152 155 150 160 Q 148 155 150 150" fill={colors.foil}/>
    <Path d="M 30 165 Q 32 170 30 175 Q 28 170 30 165" fill={colors.foil}/>
          </G>
      )}
    </Svg>
  );
}

export function TataMumbaiMarathonIllustration({ size, colors }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {colors.shadow && (
        <G stroke={colors.shadow} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    {/* Sea water at the base */}
    <Path d="M 10 185 Q 25 190 40 185 T 70 185 T 100 185 T 130 185 T 160 185 T 190 185"/>
    <Path d="M 15 192 Q 30 196 45 192 T 75 192 T 105 192 T 135 192 T 165 192 T 185 192" strokeWidth="1.5"/>
    <Path d="M 30 198 Q 50 195 70 198 T 110 198 T 150 198 T 170 198" strokeWidth="1.2"/>
          </G>
      )}
      <G stroke={colors.ink} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    <Line x1="16" y1="178" x2="184" y2="178"/>
    <Rect x="22" y="164" width="156" height="14"/>
    <Rect x="26" y="56" width="148" height="108"/>

    {/* Central massive arch */}
    <Path d="M 74 164 L 74 100 A 26 26 0 0 1 126 100 L 126 164"/>
    <Path d="M 80 164 L 80 102 A 20 20 0 0 1 120 102 L 120 164" strokeWidth="1.5"/>
    {/* Recessed shadow in arch (hatching) */}
    <Line x1="86" y1="164" x2="86" y2="108" strokeWidth="1.5"/>
    <Line x1="92" y1="164" x2="92" y2="114" strokeWidth="1.5"/>
    <Line x1="98" y1="164" x2="98" y2="118" strokeWidth="1.5"/>
    <Line x1="102" y1="164" x2="102" y2="118" strokeWidth="1.5"/>
    <Line x1="108" y1="164" x2="108" y2="114" strokeWidth="1.5"/>
    <Line x1="114" y1="164" x2="114" y2="108" strokeWidth="1.5"/>

    {/* Side arches */}
    <Path d="M 36 164 L 36 130 A 12 12 0 0 1 60 130 L 60 164"/>
    <Path d="M 40 164 L 40 132 A 8 8 0 0 1 56 132 L 56 164" strokeWidth="1.5"/>
    <Path d="M 140 164 L 140 130 A 12 12 0 0 1 164 130 L 164 164"/>
    <Path d="M 144 164 L 144 132 A 8 8 0 0 1 160 132 L 160 164" strokeWidth="1.5"/>

    {/* Upper Gallery Details */}
    <Line x1="26" y1="90" x2="174" y2="90"/>
    <Line x1="26" y1="76" x2="174" y2="76"/>
    {/* Intricate lattice windows */}
    <Rect x="40" y="62" width="10" height="10"/>
    <Rect x="65" y="62" width="10" height="10"/>
    <Rect x="95" y="62" width="10" height="10"/>
    <Rect x="125" y="62" width="10" height="10"/>
    <Rect x="150" y="62" width="10" height="10"/>
    
    {/* Corner Turrets (Chhatris) */}
    {/* Far Left */}
    <Line x1="26" y1="56" x2="26" y2="30"/>
    <Line x1="40" y1="56" x2="40" y2="30"/>
    <Rect x="22" y="26" width="22" height="4"/>
    <Path d="M 24 26 Q 33 6 42 26"/>
    {/* Inner Left */}
    <Line x1="68" y1="56" x2="68" y2="36"/>
    <Line x1="78" y1="56" x2="78" y2="36"/>
    <Rect x="66" y="32" width="14" height="4"/>
    <Path d="M 68 32 Q 73 16 78 32"/>
    {/* Inner Right */}
    <Line x1="122" y1="56" x2="122" y2="36"/>
    <Line x1="132" y1="56" x2="132" y2="36"/>
    <Rect x="120" y="32" width="14" height="4"/>
    <Path d="M 122 32 Q 127 16 132 32"/>
    {/* Far Right */}
    <Line x1="160" y1="56" x2="160" y2="30"/>
    <Line x1="174" y1="56" x2="174" y2="30"/>
    <Rect x="156" y="26" width="22" height="4"/>
    <Path d="M 158 26 Q 167 6 176 26"/>
        </G>
      {colors.accent && (
        <G stroke={colors.accent} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    {/* Stonework block textures */}
    <Path d="M 30 110 L 34 110 M 30 120 L 34 120 M 166 110 L 170 110 M 166 120 L 170 120 M 80 82 L 86 82 M 114 82 L 120 82" strokeWidth="1.2"/>
          </G>
      )}
      {colors.foil && (
        <G stroke={colors.foil} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    <Circle cx="33" cy="8" r="2" fill={colors.foil} stroke="none"/>
    <Line x1="33" y1="12" x2="33" y2="10"/>
    <Circle cx="73" cy="16" r="1.5" fill={colors.foil} stroke="none"/>
    <Circle cx="127" cy="16" r="1.5" fill={colors.foil} stroke="none"/>
    <Circle cx="167" cy="8" r="2" fill={colors.foil} stroke="none"/>
    <Line x1="167" y1="12" x2="167" y2="10"/>
          </G>
      )}
    </Svg>
  );
}

export function VedantaDelhiHalfIllustration({ size, colors }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {colors.shadow && (
        <G stroke={colors.shadow} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    {/* Serene reflecting pools */}
    <Path d="M 10 188 Q 55 196 100 188 T 190 188"/>
    <Path d="M 20 180 Q 55 186 100 180 T 180 180" strokeWidth="1.5"/>
    <Path d="M 40 194 Q 70 198 100 194 T 160 194" strokeWidth="1.2"/>
          </G>
      )}
      <G stroke={colors.ink} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    {/* Elevated Lotus Base */}
    <Rect x="40" y="168" width="120" height="8"/>
    <Rect x="30" y="176" width="140" height="4"/>

    {/* Lotus Petals (Back layer) */}
    <Path d="M 16 168 Q 10 100 50 50 Q 75 30 100 24"/>
    <Path d="M 184 168 Q 190 100 150 50 Q 125 30 100 24"/>
    {/* Hatching on back petals */}
    <Path d="M 30 160 Q 25 110 55 65" strokeWidth="1.2"/>
    <Path d="M 170 160 Q 175 110 145 65" strokeWidth="1.2"/>

    {/* Mid layer petals */}
    <Path d="M 40 168 Q 30 90 70 45 Q 85 30 100 24"/>
    <Path d="M 160 168 Q 170 90 130 45 Q 115 30 100 24"/>
    <Path d="M 52 168 Q 45 100 75 60" strokeWidth="1.2"/>
    <Path d="M 148 168 Q 155 100 125 60" strokeWidth="1.2"/>

    {/* Front layer petals */}
    <Path d="M 64 168 Q 60 100 90 50 Q 96 30 100 24"/>
    <Path d="M 136 168 Q 140 100 110 50 Q 104 30 100 24"/>
    <Path d="M 76 168 Q 75 110 95 65" strokeWidth="1.5"/>
    <Path d="M 124 168 Q 125 110 105 65" strokeWidth="1.5"/>

    {/* Center core and ribbing */}
    <Path d="M 100 168 L 100 24"/>
    <Path d="M 90 168 Q 95 100 100 40" strokeWidth="1.5"/>
    <Path d="M 110 168 Q 105 100 100 40" strokeWidth="1.5"/>
        </G>
      {colors.accent && (
        <G stroke={colors.accent} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    {/* Distinctive petal tips / edges */}
    <Path d="M 50 50 Q 75 30 100 24" strokeWidth="2"/>
    <Path d="M 150 50 Q 125 30 100 24" strokeWidth="2"/>
    <Path d="M 70 45 Q 85 30 100 24" strokeWidth="2"/>
    <Path d="M 130 45 Q 115 30 100 24" strokeWidth="2"/>
          </G>
      )}
      {colors.foil && (
        <G stroke={colors.foil} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">

    <Circle cx="100" cy="18" r="3" fill={colors.foil} stroke="none"/>
          </G>
      )}
    </Svg>
  );
}

const REGISTRY: Record<string, React.ComponentType<Props>> = {
  bengaluru_marathon: BengaluruMarathonIllustration,
  hyderabad_marathon: HyderabadMarathonIllustration,
  ladakh_marathon: LadakhMarathonIllustration,
  monsoon_run: MonsoonRunIllustration,
  tata_mumbai_marathon: TataMumbaiMarathonIllustration,
  vedanta_delhi_half: VedantaDelhiHalfIllustration,
};

export function hasIllustration(stampId: string): boolean {
  return stampId in REGISTRY;
}

export function StampIllustration({ stampId, size, colors }: { stampId: string; size: number; colors: IllustrationColors; }) {
  const Component = REGISTRY[stampId];
  if (!Component) return null;
  return <Component size={size} colors={colors} />;
}
