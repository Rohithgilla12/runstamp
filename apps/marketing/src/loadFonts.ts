import { loadFont as loadInstrumentSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";

// Eager-load all three brand fonts so they're ready when the first frame
// renders. Remotion will wait on these promises before snapping frames.
loadInstrumentSerif();
loadGeist();
loadJetBrainsMono();
