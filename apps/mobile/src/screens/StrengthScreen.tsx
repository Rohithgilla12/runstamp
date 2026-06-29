// Strength catalogue — one routine per runner need. A quiet library surface,
// closest in spirit to the Stamps catalogue: ink + paper, the need framed up
// top, the routine underneath. Moves come from the open exercises-dataset.

import React from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { Card } from '../design/atoms';
import { Icon } from '../design/Icon';
import { NEEDS, ROUTINES, needMeta, type Routine } from '../data/strength';
import type { RootStackProps } from '../nav/types';

const DATASET_URL = 'https://github.com/hasaneyldrm/exercises-dataset';

export function StrengthScreen({ navigation }: RootStackProps<'Strength'>) {
  const c = useColors();
  const insets = useSafeAreaInsets();

  // Surface routines in the NEEDS order (stay healthy first, sharpen last).
  const ordered = NEEDS.flatMap((n) => ROUTINES.filter((r) => r.need === n.key));

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: c.paper }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }}
    >
      <View style={{ paddingHorizontal: 14 }}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          style={{
            width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: c.line,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon.back size={18} color={c.ink} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <Eyebrow>TRAINING</Eyebrow>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', marginTop: 4 }}>
          <TText variant="serif" style={{ fontSize: 30, lineHeight: 32, letterSpacing: -0.6 }}>Strength for </TText>
          <TText variant="serifItalic" style={{ fontSize: 30, lineHeight: 32, letterSpacing: -0.6 }}>runners</TText>
          <TText variant="serif" style={{ fontSize: 30, lineHeight: 32, letterSpacing: -0.6 }}>.</TText>
        </View>
        <TText style={{ fontSize: 13, color: c.ink3, marginTop: 6, lineHeight: 19 }}>
          Lifts that make you faster and harder to break. Pick what you need this season.
        </TText>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
        {ordered.map((r) => (
          <View key={r.id} style={{ paddingVertical: 6 }}>
            <RoutineCard routine={r} onPress={() => navigation.navigate('Routine', { id: r.id })} />
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => Linking.openURL(DATASET_URL)}
        accessibilityLabel="Open the exercises-dataset on GitHub"
        style={{ paddingHorizontal: 20, paddingTop: 18 }}
      >
        <TText variant="mono" style={{ fontSize: 10, color: c.ink3, lineHeight: 16 }}>
          Exercise demos from the open exercises-dataset →
        </TText>
      </Pressable>
    </ScrollView>
  );
}

function RoutineCard({ routine, onPress }: { routine: Routine; onPress: () => void }) {
  const c = useColors();
  const need = needMeta(routine.need);
  return (
    <Card onPress={onPress} style={{ backgroundColor: c.paper2 }}>
      <Eyebrow>{need.label.toUpperCase()}</Eyebrow>
      <TText variant="serif" style={{ fontSize: 22, lineHeight: 26, letterSpacing: -0.3, marginTop: 4 }}>
        {routine.title}
      </TText>
      <TText style={{ fontSize: 12.5, color: c.ink2, marginTop: 6, lineHeight: 18 }}>{routine.why}</TText>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <MetaTag>{routine.frequency}</MetaTag>
        <MetaTag>~{routine.minutes} min</MetaTag>
        <MetaTag>{routine.gear}</MetaTag>
      </View>

      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line,
      }}>
        <TText variant="mono" style={{ fontSize: 11, color: c.ink3 }}>
          {routine.items.length} exercises · {routine.level}
        </TText>
        <Icon.chevR size={16} color={c.ink3} />
      </View>
    </Card>
  );
}

function MetaTag({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{
      paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999,
      backgroundColor: c.paper3, borderWidth: 1, borderColor: c.line,
    }}>
      <TText variant="mono" style={{ fontSize: 10.5, color: c.ink2 }}>{children}</TText>
    </View>
  );
}
