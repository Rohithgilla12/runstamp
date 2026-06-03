import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../design/theme';
import { Eyebrow, TText } from '../../design/typography';
import { FONT } from '../../design/fonts';

interface Props {
  visible: boolean;
  titleValue: string;
  placeValue: string;
  titlePlaceholder: string;
  placePlaceholder: string;
  edited: boolean;
  onChangeTitle: (t: string) => void;
  onChangePlace: (t: string) => void;
  onReset: () => void;
  onClose: () => void;
}

// Fill-in-the-form text editing for the free-text slots (title + place). Metrics
// stay honest and aren't editable here — only the descriptive text a runner
// writes themselves. Styled like a customs / luggage-tag field, on-brand.
export function TextEditSheet({
  visible, titleValue, placeValue, titlePlaceholder, placePlaceholder, edited,
  onChangeTitle, onChangePlace, onReset, onClose,
}: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(14,13,11,0.7)', justifyContent: 'flex-end' }}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: c.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 14, paddingBottom: insets.bottom + 22 }}
          >
            <View style={{ width: 36, height: 4, backgroundColor: c.line, borderRadius: 2, alignSelf: 'center', marginBottom: 14 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Eyebrow style={{ color: c.accent }}>LABEL</Eyebrow>
              {edited && (
                <Pressable onPress={onReset} hitSlop={8}>
                  <TText variant="mono" style={{ fontSize: 11, color: c.ink3 }}>RESET TO RUN</TText>
                </Pressable>
              )}
            </View>
            <TText variant="serifItalic" style={{ fontSize: 28, lineHeight: 30, letterSpacing: -0.4, color: c.ink, marginTop: 4 }}>Name it.</TText>

            <Field label="TITLE" value={titleValue} placeholder={titlePlaceholder} onChangeText={onChangeTitle} autoFocus maxLength={48} />
            <Field label="PLACE" value={placeValue} placeholder={placePlaceholder} onChangeText={onChangePlace} maxLength={32} />

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [{ marginTop: 18, height: 50, borderRadius: 12, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 }]}
            >
              <TText style={{ fontSize: 15, color: c.paper, fontWeight: '500' }}>Done</TText>
            </Pressable>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, value, placeholder, onChangeText, autoFocus, maxLength }: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (t: string) => void;
  autoFocus?: boolean;
  maxLength: number;
}) {
  const c = useColors();
  return (
    <View style={{ marginTop: 16 }}>
      <Eyebrow style={{ color: c.ink3, marginBottom: 6 }}>{label}</Eyebrow>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor={c.ink3}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
        autoCapitalize="words"
        maxLength={maxLength}
        returnKeyType="done"
        style={{
          fontFamily: FONT.geist, fontSize: 17, color: c.ink,
          backgroundColor: c.paper2, borderWidth: 1, borderColor: c.line, borderRadius: 10,
          paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10,
        }}
      />
    </View>
  );
}
