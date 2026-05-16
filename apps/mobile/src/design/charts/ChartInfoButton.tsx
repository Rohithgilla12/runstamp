import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useColors } from '../theme';
import { TText } from '../typography';

interface ChartInfoButtonProps {
  /** Body text shown when the button is tapped. Plain string. */
  explanation: string;
}

// "ⓘ" disclosure that toggles an explanation paragraph below the chart's
// title row. Quieter than a modal, doesn't steal focus, and the panel
// state itself is captured cleanly into a shared image when expanded —
// which is occasionally useful as a "what does this number mean?" caption.
export function ChartInfoButton({ explanation }: ChartInfoButtonProps) {
  const c = useColors();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        hitSlop={10}
        accessibilityLabel={open ? 'Hide explanation' : 'Show explanation'}
        style={({ pressed }) => ({
          width: 20, height: 20, borderRadius: 10,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 1, borderColor: open ? c.ink : c.line,
          backgroundColor: open ? c.ink : 'transparent',
          opacity: pressed ? 0.6 : 1,
          marginLeft: 6,
        })}
      >
        <TText
          variant="mono"
          style={{ fontSize: 11, lineHeight: 13, color: open ? c.paper : c.ink3, fontWeight: '600' }}
        >
          i
        </TText>
      </Pressable>
      {open && (
        <View
          style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 8,
            backgroundColor: c.paper,
            borderWidth: 1,
            borderColor: c.line,
          }}
        >
          <TText style={{ fontSize: 11, lineHeight: 16, color: c.ink2 }}>
            {explanation}
          </TText>
        </View>
      )}
    </>
  );
}

// Convenience wrapper that places the info button next to a header. The
// caller controls the surrounding layout — typically a header row with
// title on one side and the share button outside the capture ref.
export function withInfoButton(header: React.ReactNode, explanation: string) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {header}
      <ChartInfoButton explanation={explanation} />
    </View>
  );
}
