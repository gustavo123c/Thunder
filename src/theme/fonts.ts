import {
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
  JetBrainsMono_800ExtraBold,
} from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';

/**
 * Brand fonts, keyed by the names used in tailwind.config.js `fontFamily`.
 * Archivo Expanded is a static instance (wdth 125, wght 700) of the Archivo variable
 * font (SIL OFL 1.1 — assets/fonts/OFL-Archivo.txt).
 */
export const BRAND_FONTS = {
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
  JetBrainsMono_800ExtraBold,

  ArchivoExpanded_700Bold: require('../../assets/fonts/ArchivoExpanded-Bold.ttf'),
};

/** True once the fonts are ready — or failed to load (the system font is used then). */
export function useBrandFonts(): boolean {
  const [loaded, error] = useFonts(BRAND_FONTS);
  return loaded || error !== null;
}
