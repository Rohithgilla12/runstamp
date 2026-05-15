import {
  useFonts as useGeist,
  Geist_300Light,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold
} from '@expo-google-fonts/geist';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic
} from '@expo-google-fonts/instrument-serif';
import {
  JetBrainsMono_300Light,
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold
} from '@expo-google-fonts/jetbrains-mono';

export const FONT = {
  geist: 'Geist_400Regular',
  geistMedium: 'Geist_500Medium',
  geistSemibold: 'Geist_600SemiBold',
  geistBold: 'Geist_700Bold',
  geistLight: 'Geist_300Light',
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoSemibold: 'JetBrainsMono_600SemiBold',
  monoLight: 'JetBrainsMono_300Light'
} as const;

export function useAppFonts() {
  const [loaded] = useGeist({
    Geist_300Light,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    JetBrainsMono_300Light,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold
  });
  return loaded;
}
