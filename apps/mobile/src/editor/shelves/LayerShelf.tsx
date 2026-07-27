import React, { memo } from 'react';
import { Pressable, View } from 'react-native';
import { useColors } from '../../design/theme';
import { TText } from '../../design/typography';
import {
  layerToScrimStep,
  type BaseFill, type LayerStack, type RouteTreatment, type ScrimStep,
} from '../layers';

type MapStyle = LayerStack['map']['style'];

interface Props {
  layers: LayerStack;
  // No pace stream means the pace-gradient treatment has nothing to colour by.
  hasPace: boolean;
  dirty: boolean;
  onBase: (base: BaseFill) => void;
  onTreatment: (treatment: RouteTreatment) => void;
  onScrimStep: (step: ScrimStep) => void;
  onMapStyle: (style: MapStyle) => void;
  onReset: () => void;
}

const BASES: { value: BaseFill; label: string }[] = [
  { value: 'ink', label: 'Ink' },
  { value: 'paper', label: 'Paper' },
  { value: 'solar', label: 'Solar' },
];

const TREATMENTS: { value: RouteTreatment; label: string }[] = [
  { value: 'signature', label: 'Signature' },
  { value: 'pace-gradient', label: 'Pace' },
  { value: 'plain', label: 'Plain' },
];

const SCRIM_STEPS: { value: ScrimStep; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'soft', label: 'Soft' },
  { value: 'medium', label: 'Medium' },
  { value: 'strong', label: 'Strong' },
];

const MAP_STYLES: { value: MapStyle; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export const LayerShelf = memo(function LayerShelf({
  layers, hasPace, dirty, onBase, onTreatment, onScrimStep, onMapStyle, onReset,
}: Props) {
  const c = useColors();
  const scrimStep = layerToScrimStep(layers.scrim);

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14 }}>
        <TText variant="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: c.ink3 }}>LAYERS</TText>
        {dirty && (
          <Pressable
            onPress={onReset}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Reset layers to the layout default"
          >
            {({ pressed }) => (
              <TText variant="mono" style={{ fontSize: 10, letterSpacing: 1, color: c.ink3, opacity: pressed ? 0.5 : 1 }}>
                RESET
              </TText>
            )}
          </Pressable>
        )}
      </View>

      <Row label="BASE">
        {BASES.map((o) => (
          <Chip key={o.value} label={o.label} group="Base fill"
            active={layers.base === o.value} onPress={() => onBase(o.value)} />
        ))}
      </Row>

      <Row label="ROUTE">
        {TREATMENTS.map((o) => (
          <Chip key={o.value} label={o.label} group="Route treatment"
            active={layers.route.treatment === o.value}
            disabled={o.value === 'pace-gradient' && !hasPace}
            onPress={() => onTreatment(o.value)} />
        ))}
      </Row>

      <Row label="SCRIM">
        {SCRIM_STEPS.map((o) => (
          <Chip key={o.value} label={o.label} group="Scrim strength"
            active={scrimStep === o.value} onPress={() => onScrimStep(o.value)} />
        ))}
      </Row>

      {layers.map.enabled && (
        <Row label="MAP">
          {MAP_STYLES.map((o) => (
            <Chip key={o.value} label={o.label} group="Map style"
              active={layers.map.style === o.value} onPress={() => onMapStyle(o.value)} />
          ))}
        </Row>
      )}
    </View>
  );
});

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, gap: 10 }}>
      <TText variant="mono" style={{ width: 46, fontSize: 9, letterSpacing: 1, color: c.ink3 }}>{label}</TText>
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{children}</View>
    </View>
  );
}

interface ChipProps {
  label: string;
  group: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}

function Chip({ label, group, active, disabled, onPress }: ChipProps) {
  const c = useColors();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      // Chips match the StatsShelf silhouette (~28pt); hitSlop carries them to
      // the 44pt tap target.
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      accessibilityRole="radio"
      accessibilityLabel={`${group}: ${label}`}
      accessibilityState={{ checked: active, disabled: !!disabled }}
      style={({ pressed }) => [{
        paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
        backgroundColor: active ? c.ink : c.paper2,
        borderWidth: 1, borderColor: active ? c.ink : c.line,
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      }]}
    >
      <TText style={{ fontSize: 12, color: active ? c.paper : c.ink2 }}>{label}</TText>
    </Pressable>
  );
}
