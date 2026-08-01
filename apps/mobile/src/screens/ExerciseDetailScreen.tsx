// Exercise detail — the bundled demo GIF plus expert-validated instructions,
// coaching tips and muscle detail pulled from AscendAPI's ExerciseDB (proxied
// by our backend, resolved by name). The GIF always shows; the enrichment
// loads in and degrades quietly to the bundled metadata when the catalogue
// isn't configured or has no match.

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../design/theme';
import { Eyebrow, TText } from '../design/typography';
import { Card } from '../design/atoms';
import { Icon } from '../design/Icon';
import { exerciseGif, getExercise } from '../data/strength';
import { findExerciseByName, type AscendExercise } from '../services/exercisedb';
import { useAuth } from '../state/AuthContext';
import type { RootStackProps } from '../nav/types';

type Load = 'loading' | 'done' | 'error';

export function ExerciseDetailScreen({ navigation, route }: RootStackProps<'ExerciseDetail'>) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { getIdToken } = useAuth();
  const ex = getExercise(route.params.exerciseId);

  const [detail, setDetail] = useState<AscendExercise | null>(null);
  const [load, setLoad] = useState<Load>('loading');

  useEffect(() => {
    if (!ex) return;
    let cancelled = false;
    (async () => {
      try {
        const idToken = await getIdToken();
        const found = await findExerciseByName(ex.name, idToken);
        if (cancelled) return;
        setDetail(found);
        setLoad('done');
      } catch {
        if (!cancelled) setLoad('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ex, getIdToken]);

  if (!ex) {
    return (
      <View style={{ flex: 1, backgroundColor: c.paper, paddingTop: insets.top + 60, paddingHorizontal: 20 }}>
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Go back" style={{ marginBottom: 16 }}>
          <Icon.back size={20} color={c.ink} />
        </Pressable>
        <TText style={{ color: c.ink3 }}>That exercise isn’t available.</TText>
      </View>
    );
  }

  // Muscle / equipment lines: prefer the richer AscendAPI arrays, fall back to
  // the single bundled values.
  const target = detail?.targetMuscles?.length ? detail.targetMuscles.join(', ') : ex.target;
  const equipment = detail?.equipments?.length ? detail.equipments.join(', ') : ex.equipment;
  const secondary = detail?.secondaryMuscles?.length ? detail.secondaryMuscles : ex.secondary;

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
        <Eyebrow>EXERCISE</Eyebrow>
        <TText variant="serif" style={{ fontSize: 30, lineHeight: 34, letterSpacing: -0.6, marginTop: 4 }}>
          {ex.name}
        </TText>
        <TText variant="mono" style={{ fontSize: 11, color: c.ink3, marginTop: 6, textTransform: 'capitalize' }}>
          {target} · {equipment}
        </TText>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <Card padded={false} style={{ backgroundColor: c.paper2, overflow: 'hidden' }}>
          <Image
            source={{ uri: exerciseGif(ex) }}
            accessibilityLabel={`${ex.name} demonstration`}
            style={{ width: '100%', aspectRatio: 1, backgroundColor: c.paper3 }}
            resizeMode="cover"
          />
        </Card>
      </View>

      {detail?.overview ? (
        <Section title="Overview">
          <TText style={{ fontSize: 13.5, color: c.ink2, lineHeight: 20 }}>{detail.overview}</TText>
        </Section>
      ) : null}

      {detail?.instructions?.length ? (
        <Section title="How to do it">
          {detail.instructions.map((step, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, marginTop: i === 0 ? 0 : 10 }}>
              <TText variant="monoMedium" style={{ fontSize: 12, color: c.accent, width: 20 }}>
                {String(i + 1).padStart(2, '0')}
              </TText>
              <TText style={{ flex: 1, fontSize: 13.5, color: c.ink2, lineHeight: 20 }}>{step}</TText>
            </View>
          ))}
        </Section>
      ) : null}

      {detail?.exerciseTips?.length ? (
        <Section title="Coaching cues">
          {detail.exerciseTips.map((tip, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginTop: i === 0 ? 0 : 8 }}>
              <TText style={{ fontSize: 13.5, color: c.ink3 }}>·</TText>
              <TText style={{ flex: 1, fontSize: 13.5, color: c.ink2, lineHeight: 20 }}>{tip}</TText>
            </View>
          ))}
        </Section>
      ) : null}

      {secondary.length ? (
        <Section title="Also works">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {secondary.map((m) => (
              <View
                key={m}
                style={{
                  paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999,
                  backgroundColor: c.paper3, borderWidth: 1, borderColor: c.line,
                }}
              >
                <TText variant="mono" style={{ fontSize: 10.5, color: c.ink2, textTransform: 'capitalize' }}>{m}</TText>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        {load === 'loading' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator size="small" color={c.ink3} />
            <TText variant="mono" style={{ fontSize: 10.5, color: c.ink3 }}>Loading instructions…</TText>
          </View>
        ) : detail ? (
          <TText variant="mono" style={{ fontSize: 10, color: c.ink3 }}>Instructions from AscendAPI ExerciseDB →</TText>
        ) : (
          <TText variant="mono" style={{ fontSize: 10.5, color: c.ink3, lineHeight: 16 }}>
            Detailed instructions aren’t available for this move yet — follow the demo above.
          </TText>
        )}
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
      <Eyebrow style={{ marginBottom: 10 }}>{title.toUpperCase()}</Eyebrow>
      <View>{children}</View>
    </View>
  );
}
