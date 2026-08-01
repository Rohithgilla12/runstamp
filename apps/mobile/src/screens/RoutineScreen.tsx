// Routine detail — the prescription. Each move shows its dataset demo GIF,
// the runner-specific sets/reps/rest, and a one-line cue. Quiet ledger
// styling; the GIF is the only moving thing on the page.

import React from 'react';
import { Image, Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { Card } from '../design/atoms';
import { Icon } from '../design/Icon';
import {
  exerciseGif,
  getExercise,
  getRoutine,
  needMeta,
  type RoutineItem,
} from '../data/strength';
import type { RootStackProps } from '../nav/types';

const DATASET_URL = 'https://github.com/hasaneyldrm/exercises-dataset';

export function RoutineScreen({ navigation, route }: RootStackProps<'Routine'>) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const routine = getRoutine(route.params.id);

  if (!routine) {
    return (
      <View style={{ flex: 1, backgroundColor: c.paper, paddingTop: insets.top + 60, paddingHorizontal: 20 }}>
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Go back" style={{ marginBottom: 16 }}>
          <Icon.back size={20} color={c.ink} />
        </Pressable>
        <TText style={{ color: c.ink3 }}>That routine isn’t available.</TText>
      </View>
    );
  }

  const need = needMeta(routine.need);

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
        <Eyebrow>{need.label.toUpperCase()}</Eyebrow>
        <TText variant="serif" style={{ fontSize: 30, lineHeight: 34, letterSpacing: -0.6, marginTop: 4 }}>
          {routine.title}
        </TText>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <MetaTag>{routine.frequency}</MetaTag>
          <MetaTag>~{routine.minutes} min</MetaTag>
          <MetaTag>{routine.gear}</MetaTag>
          <MetaTag>{routine.level}</MetaTag>
        </View>

        <TText style={{ fontSize: 13.5, color: c.ink2, marginTop: 14, lineHeight: 20 }}>{routine.why}</TText>
        <TText style={{ fontSize: 12, color: c.ink3, marginTop: 8, lineHeight: 18 }}>{routine.forWhom}</TText>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 22 }}>
        {routine.items.map((item, i) => (
          <View key={`${item.exerciseId}-${i}`} style={{ paddingVertical: 5 }}>
            <ExerciseRow
              item={item}
              index={i + 1}
              onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.exerciseId })}
            />
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <TText style={{ fontSize: 11.5, color: c.ink3, lineHeight: 17 }}>
          New to lifting? Start light, nail the form in the demo, then add load. Stop if anything sharp shows up.
        </TText>
        <Pressable
          onPress={() => Linking.openURL(DATASET_URL)}
          accessibilityLabel="Open the exercises-dataset on GitHub"
          style={{ marginTop: 10 }}
        >
          <TText variant="mono" style={{ fontSize: 10, color: c.ink3 }}>
            Demos from the open exercises-dataset →
          </TText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function ExerciseRow({ item, index, onPress }: { item: RoutineItem; index: number; onPress: () => void }) {
  const c = useColors();
  const ex = getExercise(item.exerciseId);
  if (!ex) return null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${ex.name} — full demo and instructions`}
    >
      <Card padded={false} style={{ backgroundColor: c.paper2 }}>
        <View style={{ flexDirection: 'row' }}>
          <Image
            source={{ uri: exerciseGif(ex) }}
            accessibilityLabel={`${ex.name} demonstration`}
            style={{ width: 92, height: 92, backgroundColor: c.paper3 }}
            resizeMode="cover"
          />
          <View style={{ flex: 1, padding: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <TText variant="mono" style={{ fontSize: 11, color: c.ink3 }}>{String(index).padStart(2, '0')}</TText>
              <TText style={{ flex: 1, fontSize: 14, fontWeight: '500', color: c.ink }}>
                {ex.name}
              </TText>
              <Icon.chevR size={16} color={c.ink3} />
            </View>
            <TText variant="mono" style={{ fontSize: 10, color: c.ink3, marginTop: 2, textTransform: 'capitalize' }}>
              {ex.target} · {ex.equipment}
            </TText>

            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 8, gap: 6 }}>
              <TText variant="monoMedium" style={{ fontSize: 14, letterSpacing: -0.3, color: c.ink }}>
                {item.sets} × {item.reps}
              </TText>
              <TText variant="mono" style={{ fontSize: 11, color: c.ink3 }}>· rest {item.restSec}s</TText>
            </View>

            {item.note && (
              <TText style={{ fontSize: 11.5, color: c.ink2, marginTop: 6, lineHeight: 16 }}>{item.note}</TText>
            )}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function MetaTag({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{
      paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999,
      backgroundColor: c.paper3, borderWidth: 1, borderColor: c.line,
    }}>
      <TText variant="mono" style={{ fontSize: 10.5, color: c.ink2, textTransform: 'capitalize' }}>{children}</TText>
    </View>
  );
}
