/**
 * In a browser the fonts are downloads: Inter in four weights where SF Pro
 * doesn't draw, and the icon font. The app asked for them only once its
 * first screen was being put together, over a second after its code had
 * arrived, and held that screen until Inter came. Asking as the code starts
 * to run has them downloading through that second instead, so the screen
 * isn't kept waiting and its icons are there with it.
 *
 * The same names as the later requests (app/_layout.tsx for Inter,
 * expo-symbols' SymbolView for the icons), which expo-font answers from the
 * one download. Nothing from the rest of the app is loaded here: index.ts
 * runs this before the website has picked its version (lib/limited.ts).
 */

import { loadAsync } from 'expo-font';
import icons from 'expo-symbols/androidWeights/regular';
import { BUNDLED_FACES } from './fonts';
import { NEEDS_BUNDLED_FACES } from './typeface';

export function startFonts(): void {
  // A failure here is left for the later request to meet and handle, as it always did.
  if (NEEDS_BUNDLED_FACES) void loadAsync(BUNDLED_FACES).catch(() => undefined);
  void loadAsync({ [icons.name]: { uri: icons.font } }).catch(() => undefined);
}
