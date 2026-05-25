import React from 'react';
import { View } from 'react-native';
import { TText } from '../design/typography';
import { useColors } from '../design/theme';
import type { RootStackProps } from '../nav/types';

// Placeholder. Replaced with the real new editor implementation.
export function EditorView(_props: RootStackProps<'Editor'>) {
  const c = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.paper, alignItems: 'center', justifyContent: 'center' }}>
      <TText style={{ color: c.ink }}>EditorView placeholder</TText>
    </View>
  );
}
