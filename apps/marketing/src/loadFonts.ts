// Load Google Fonts via Remotion's font loader. `loadFont()` returns the actual
// fontFamily string Remotion hashes — using the canonical name ('Instrument
// Serif') as a CSS fallback resolves to a system serif, which is why v1
// rendered with a generic bouncy italic instead of the actual Instrument Serif.

import { loadFont as loadInstrumentSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";

// Instrument Serif ships only Regular + Italic at weight 400.
const instrumentSerifNormal = loadInstrumentSerif("normal", { weights: ["400"], subsets: ["latin"] });
const instrumentSerifItalic = loadInstrumentSerif("italic", { weights: ["400"], subsets: ["latin"] });
const geist = loadGeist("normal", { weights: ["400", "500", "700"], subsets: ["latin"] });
const jetbrainsMono = loadJetBrainsMono("normal", { weights: ["400", "500", "700"], subsets: ["latin"] });

export const fontFamilies = {
  // The display font. `display` and `serifItalic` are aliases — both resolve to
  // Instrument Serif italic, which is the brand's display moment everywhere.
  serif: instrumentSerifNormal.fontFamily,
  serifItalic: instrumentSerifItalic.fontFamily,
  display: instrumentSerifItalic.fontFamily,
  ui: geist.fontFamily,
  mono: jetbrainsMono.fontFamily,
} as const;
