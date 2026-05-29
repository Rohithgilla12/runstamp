import React from 'react';
import { Image, View } from 'react-native';

interface Props {
  uri: string | null | undefined;
  width: number;
  height: number;
  /**
   * Rendered when no photoUri is selected yet. Templates each have their own
   * mood for the empty state (some pass a diagonal stripe pattern, some pass
   * a paper-textured field) so the fallback is injected rather than hard-
   * coded here.
   */
  fallback: React.ReactNode;
  /** 0..1 — useful when a template wants the photo muted as a backdrop. */
  opacity?: number;
}

// Shared photo-background renderer. The editor owns the URI (picker is one
// place, one piece of state) and every template just calls this with the
// `photoUri` prop — so a user who picked a photo on the Stickers template
// instantly sees the same photo behind a Postage, Riso, Cyanotype, etc.
//
// Without this every template was rendering an identical diagonal-stripe
// placeholder regardless of whether the user had a photo set, which is
// exactly the bug the user reported.
export function PhotoBackground({ uri, width, height, fallback, opacity = 1 }: Props) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ position: 'absolute', top: 0, left: 0, width, height, opacity }}
        resizeMode="cover"
      />
    );
  }
  return <View style={{ position: 'absolute', top: 0, left: 0, width, height }}>{fallback}</View>;
}
