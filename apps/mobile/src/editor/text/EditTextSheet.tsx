import React, { useEffect, useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../design/theme';
import { Eyebrow, TText } from '../../design/typography';
import { Button } from '../../design/atoms';
import { RUN_TYPE_PRESETS } from './runType';
import type { EditableTextField } from './EditFieldContext';

const TITLES: Record<EditableTextField['kind'], string> = {
  title: 'Edit title',
  place: 'Edit place',
  runType: 'Edit run type',
};

export function EditTextSheet({
  field,
  saving,
  onSave,
  onCancel,
}: {
  field: EditableTextField | null;
  saving: boolean;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState('');

  // Reseed the input whenever a new field opens.
  useEffect(() => {
    setValue(field?.value ?? '');
  }, [field]);

  if (!field) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable onPress={onCancel} style={{ flex: 1, backgroundColor: 'rgba(14,13,11,0.65)', justifyContent: 'flex-end' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: c.paper,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: insets.bottom + 20,
          }}
        >
          <View style={{ width: 36, height: 4, backgroundColor: c.line, borderRadius: 2, alignSelf: 'center', marginBottom: 18 }} />
          <Eyebrow style={{ color: c.accent }}>EDIT</Eyebrow>
          <TText variant="serif" style={{ fontSize: 26, lineHeight: 30, letterSpacing: -0.6, color: c.ink, marginTop: 4 }}>
            {TITLES[field.kind]}
          </TText>

          {field.kind === 'runType' && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
              {RUN_TYPE_PRESETS.map((p) => {
                const active = value.trim().toLowerCase() === p.label.toLowerCase();
                return (
                  <Pressable
                    key={p.kind}
                    onPress={() => setValue(p.label)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                      backgroundColor: active ? c.ink : c.paper2,
                      borderWidth: 1, borderColor: active ? c.ink : c.line,
                    }}
                  >
                    <TText style={{ fontSize: 12, color: active ? c.paper : c.ink2, fontWeight: '500' }}>{p.label}</TText>
                  </Pressable>
                );
              })}
            </View>
          )}

          <TextInput
            value={value}
            onChangeText={setValue}
            autoFocus={field.kind !== 'runType'}
            placeholder={field.kind === 'runType' ? 'Or type your own…' : ''}
            placeholderTextColor={c.ink3}
            maxLength={200}
            style={{
              marginTop: 14, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
              borderWidth: 1, borderColor: c.line, backgroundColor: c.paper2,
              fontSize: 16, color: c.ink,
            }}
          />

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
            <View style={{ flex: 1 }}>
              <Button kind="ghost" full onPress={onCancel}>Cancel</Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button kind="primary" full onPress={() => onSave(value)}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
