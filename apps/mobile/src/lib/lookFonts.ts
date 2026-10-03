/**
 * The typefaces some looks draw in, loaded only when that look is chosen
 * (all SIL Open Font Licence): Press Start 2P and Pixelify Sans for 8-bit,
 * Roboto for Material. Bundled with the app, so nothing is fetched.
 */

import * as Font from 'expo-font';
import type { LookId } from './looks';

const FACES: Partial<Record<LookId, Record<string, number>>> = {
  pixel: {
    PressStart2P_400Regular: require('@expo-google-fonts/press-start-2p/400Regular').PressStart2P_400Regular,
    PixelifySans_400Regular: require('@expo-google-fonts/pixelify-sans/400Regular').PixelifySans_400Regular,
    PixelifySans_500Medium: require('@expo-google-fonts/pixelify-sans/500Medium').PixelifySans_500Medium,
    PixelifySans_600SemiBold: require('@expo-google-fonts/pixelify-sans/600SemiBold').PixelifySans_600SemiBold,
    PixelifySans_700Bold: require('@expo-google-fonts/pixelify-sans/700Bold').PixelifySans_700Bold,
  },
  material: {
    Roboto_400Regular: require('@expo-google-fonts/roboto/400Regular').Roboto_400Regular,
    Roboto_500Medium: require('@expo-google-fonts/roboto/500Medium').Roboto_500Medium,
    Roboto_700Bold: require('@expo-google-fonts/roboto/700Bold').Roboto_700Bold,
  },
};

/** Load a look's faces (once). Resolves either way: a face that fails falls back to the system's. */
export async function loadLookFonts(look: LookId): Promise<void> {
  const faces = FACES[look];
  if (!faces || Object.keys(faces).every((name) => Font.isLoaded(name))) return;
  try {
    await Font.loadAsync(faces);
  } catch {
    // Drawn in the standard face instead.
  }
}

/** Every look's faces, for the Appearance screen's previews. */
export async function loadAllLookFonts(): Promise<void> {
  await Promise.all((Object.keys(FACES) as LookId[]).map(loadLookFonts));
}
