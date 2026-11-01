/**
 * Where the app starts: straight away, except on the website that picks its
 * version (EXPO_PUBLIC_LIMITED=auto, gymgo.site). That one first asks its
 * GymGO server whether it's on (lib/website.ts): the full GymGO if it
 * answers, the limited version if not. It asks before the rest of the app's
 * code runs, because the answer decides how that's put together
 * (lib/limited.ts reads it once, as the app loads).
 *
 * A phone always starts at once: it must have the app ready when it asks.
 */

import { decideWebsite } from './src/lib/website';

function start(): void {
  require('expo-router/entry');
}

if (process.env.EXPO_PUBLIC_LIMITED === 'auto' && typeof window !== 'undefined' && typeof document !== 'undefined') {
  void decideWebsite().then(start, start);
} else {
  start();
}
