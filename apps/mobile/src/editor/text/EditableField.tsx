import React from 'react';
import { Pressable, View } from 'react-native';
import { useEditField, type EditableTextField } from './EditFieldContext';

// Wraps a template text node so tapping it opens the inline editor. When no
// provider is mounted (or affordance is off) it renders children unchanged —
// so templates used outside the editor, and export snapshots, are untouched.
export function EditableField({
  field,
  children,
}: {
  field: EditableTextField;
  children: React.ReactNode;
}) {
  const { beginEdit, affordance } = useEditField();

  if (!beginEdit) {
    return <>{children}</>;
  }

  return (
    <Pressable
      onPress={() => beginEdit(field)}
      hitSlop={8}
      style={
        affordance
          ? { borderBottomWidth: 1, borderColor: 'rgba(232,93,47,0.55)', borderStyle: 'dashed' }
          : undefined
      }
    >
      <View pointerEvents="none">{children}</View>
    </Pressable>
  );
}
