import React, { createContext, useContext } from 'react';
import type { Activity } from '../../data/models';

export type EditableFieldKind = 'title' | 'place' | 'runType';

export interface EditableTextField {
  kind: EditableFieldKind;
  // The raw editable value (not the display-transformed text). Empty string
  // is valid — e.g. an unset run-type override starts the editor blank.
  value: string;
}

interface EditFieldContextValue {
  // Opens the inline editor for a field. Undefined when no provider is
  // mounted (templates rendered outside the editor render as plain text).
  beginEdit?: (field: EditableTextField) => void;
  // When true, EditableField shows its tap affordance. Off during export
  // capture so the dashed underline never bleeds into the PNG.
  affordance: boolean;
}

const EditFieldContext = createContext<EditFieldContextValue>({ affordance: false });

export function EditFieldProvider({
  beginEdit,
  affordance,
  children,
}: {
  beginEdit: (field: EditableTextField) => void;
  affordance: boolean;
  children: React.ReactNode;
}) {
  return (
    <EditFieldContext.Provider value={{ beginEdit, affordance }}>
      {children}
    </EditFieldContext.Provider>
  );
}

export function useEditField(): EditFieldContextValue {
  return useContext(EditFieldContext);
}

// Field builders — keep the value mapping in one place.
export function titleField(run: Activity): EditableTextField {
  return { kind: 'title', value: run.title };
}
export function placeField(run: Activity): EditableTextField {
  return { kind: 'place', value: run.city };
}
export function runTypeField(run: Activity): EditableTextField {
  return { kind: 'runType', value: run.categoryLabel ?? '' };
}
