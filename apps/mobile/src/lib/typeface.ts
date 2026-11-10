/**
 * Which typeface draws GymGO's words. Apart from theme.ts so the code that
 * starts the app (index.ts, lib/earlyFonts) can ask without loading the rest.
 */

import { Platform } from 'react-native';

/** Where SF Pro is what actually draws: iPhone, and browsers on Apple devices. */
export const SF_DRAWS =
  Platform.OS === 'ios' || (Platform.OS === 'web' && typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent));

/** True where the app must load the bundled faces (Inter) before drawing text: never where SF Pro draws. */
export const NEEDS_BUNDLED_FACES = !SF_DRAWS;
