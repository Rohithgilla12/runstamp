import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { FONT } from './fonts';
import { useColors } from './theme';

type Variant = 'body' | 'mono' | 'monoMedium' | 'monoSemi' | 'serif' | 'serifItalic' | 'display' | 'eyebrow';

const variantStyle: Record<Variant, TextStyle> = {
  body:        { fontFamily: FONT.geist },
  mono:        { fontFamily: FONT.mono },
  monoMedium:  { fontFamily: FONT.monoMedium },
  monoSemi:    { fontFamily: FONT.monoSemibold },
  serif:       { fontFamily: FONT.serif },
  serifItalic: { fontFamily: FONT.serifItalic },
  display:     { fontFamily: FONT.serif, letterSpacing: -0.2 },
  eyebrow:     { fontFamily: FONT.monoMedium, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' }
};

interface CustomTextProps extends TextProps {
  variant?: Variant;
}

export function TText({ variant = 'body', style, ...rest }: CustomTextProps) {
  const c = useColors();
  return <Text {...rest} style={[{ color: c.ink, includeFontPadding: false } as TextStyle, variantStyle[variant], style]} />;
}

export function Eyebrow({ style, children, ...rest }: TextProps) {
  const c = useColors();
  return (
    <Text {...rest} style={[{ color: c.ink3 }, variantStyle.eyebrow, style]}>
      {children}
    </Text>
  );
}
