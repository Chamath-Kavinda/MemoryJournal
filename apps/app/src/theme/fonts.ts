import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { useFonts } from 'expo-font';

import { FONT_FAMILY } from './typography';

// Each weight is imported from its own entry point, so only these three files ship in the app
// (importing from the package root would bundle every weight and style).
export const FONT_FILES = {
  [FONT_FAMILY.regular]: PlusJakartaSans_400Regular,
  [FONT_FAMILY.semibold]: PlusJakartaSans_600SemiBold,
  [FONT_FAMILY.bold]: PlusJakartaSans_700Bold,
};

/**
 * Loads the bundled fonts. It is true once they are ready, and also if loading failed, so a
 * broken font never blocks the app: text then falls back to the system font. The fonts are local
 * files, so this never waits for the network.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(FONT_FILES);
  return loaded || error !== null;
}
