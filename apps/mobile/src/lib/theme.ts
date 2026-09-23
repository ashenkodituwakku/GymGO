/**
 * GymGO's native look.
 *
 * Built to sit on top of a real map the way Apple Maps does: light, airy
 * surfaces, one brand colour, and state colours that mean something. The
 * brand colour is Apple's system indigo — distinctive against the map's blues
 * and greens, and native on both platforms. Actions use it; evidence states
 * never do, so "good to go" can't be confused with "tap here".
 *
 * Text colours are Apple's accessible variants (the ones iOS switches to under
 * Increase Contrast), so every label passes WCAG AA on white.
 */

import { Platform } from 'react-native';

export const color = {
  // Brand
  brand: '#5856D6',
  brandPressed: '#4B49C4',
  brandTint: 'rgba(88, 86, 214, 0.12)',

  // Labels
  label: '#000000',
  labelSecondary: '#6C6C70',
  labelTertiary: '#8E8E93',
  onBrand: '#FFFFFF',

  // Surfaces
  background: '#FFFFFF',
  groupedBackground: '#F2F2F7',
  card: '#FFFFFF',
  fill: 'rgba(118, 118, 128, 0.12)',
  fillStrong: 'rgba(118, 118, 128, 0.2)',
  separator: 'rgba(60, 60, 67, 0.18)',

  // Evidence states: a fill for pins and glyphs, a darker ink for text.
  good: '#34C759',
  goodInk: '#1F7A36',
  goodTint: 'rgba(52, 199, 89, 0.14)',
  maybe: '#FF9500',
  maybeInk: '#B04A00',
  maybeTint: 'rgba(255, 149, 0, 0.14)',
  no: '#8E8E93',
  noInk: '#6C6C70',
  noTint: 'rgba(142, 142, 147, 0.14)',
  danger: '#FF3B30',
  dangerInk: '#D70015',
  dangerTint: 'rgba(255, 59, 48, 0.12)',

  // Glass fallbacks where the platform has no native material.
  glass: 'rgba(255, 255, 255, 0.78)',
  glassBorder: 'rgba(0, 0, 0, 0.06)',
  shadow: '#000000',
} as const;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  /** Matches the corner radius of recent iPhones, as system sheets do. */
  sheet: 38,
  pill: 999,
} as const;

/**
 * Helvetica, everywhere.
 *
 * iPhone: Helvetica Neue, which ships with iOS, in its real Regular, Medium
 * and Bold cuts.
 *
 * Android and the web preview: Helvetica isn't on those devices, and
 * bundling it needs a paid licence. They use TeX Gyre Heros instead, a free
 * Helvetica clone (GUST Font License / LPPL), from assets/fonts. It has no
 * Medium cut, so medium falls back to Regular there.
 *
 * Custom fonts on Android are picked by name, not by weight, so every weight
 * in the app goes through `face()`. A bare `fontWeight` would give Android a
 * faux bold rather than the real cut.
 */
export type Weight = 'regular' | 'medium' | 'bold';

/** Names the bundled faces are registered under (see app/_layout.tsx). */
export const BUNDLED_FACES = {
  HelveticaCloneRegular: require('../../assets/fonts/texgyreheros-regular.otf'),
  HelveticaCloneBold: require('../../assets/fonts/texgyreheros-bold.otf'),
} as const;

/** True where the app must load the bundled faces before drawing text. */
export const NEEDS_BUNDLED_FACES = Platform.OS !== 'ios';

const IOS_WEIGHT = { regular: '400', medium: '500', bold: '700' } as const;

export function face(weight: Weight = 'regular'): { fontFamily: string; fontWeight: '400' | '500' | '700' | 'normal' } {
  if (Platform.OS === 'ios') return { fontFamily: 'Helvetica Neue', fontWeight: IOS_WEIGHT[weight] };
  return { fontFamily: weight === 'bold' ? 'HelveticaCloneBold' : 'HelveticaCloneRegular', fontWeight: 'normal' };
}

/**
 * Tracking tuned for Helvetica: tight at display sizes, where it was drawn to
 * be set tight, and neutral at text sizes. Small caps are opened up.
 */
export const type = {
  largeTitle: { fontSize: 32, lineHeight: 38, letterSpacing: -0.8, ...face('bold') },
  title: { fontSize: 26, lineHeight: 31, letterSpacing: -0.6, ...face('bold') },
  title2: { fontSize: 21, lineHeight: 26, letterSpacing: -0.4, ...face('bold') },
  headline: { fontSize: 17, lineHeight: 22, letterSpacing: -0.2, ...face('bold') },
  body: { fontSize: 17, lineHeight: 22, letterSpacing: 0, ...face('regular') },
  callout: { fontSize: 16, lineHeight: 21, letterSpacing: 0, ...face('regular') },
  subhead: { fontSize: 15, lineHeight: 20, letterSpacing: 0, ...face('regular') },
  footnote: { fontSize: 13, lineHeight: 18, letterSpacing: 0, ...face('regular') },
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.1, ...face('medium') },
  /** Small caps labels in metric strips, as in Maps. */
  eyebrow: { fontSize: 11, lineHeight: 13, letterSpacing: 0.8, ...face('bold') },
  /** Big numbers: prices, ratings. */
  figure: { fontSize: 19, lineHeight: 23, letterSpacing: -0.4, ...face('bold') },
} as const;

export const shadow = {
  /** Floating controls over the map. */
  float: {
    shadowColor: color.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  /** Cards inside sheets. */
  card: {
    shadowColor: color.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
} as const;

/** Minimum touch target, per Apple's Human Interface Guidelines. */
export const HIT = 44;
