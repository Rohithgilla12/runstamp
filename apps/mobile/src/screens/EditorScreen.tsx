import React from 'react';
import { EditorView } from '../editor/EditorView';
import type { RootStackProps } from '../nav/types';

export function EditorScreen(props: RootStackProps<'Editor'>) {
  return <EditorView {...props} />;
}
