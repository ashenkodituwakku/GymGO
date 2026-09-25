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
 * SF Pro, Apple's system typeface, set the way Apple sets it.
 *
 * iPhone: the system font, which is SF Pro. iOS switches between its Text
 * and Display optical sizes (at 20 pt) and applies SF's size-specific
 * tracking itself, so no letter-spacing is set there.
 *
 * Browser: SF Pro through the system font on a Mac or iPhone, or by name
 * where someone has installed it; otherwise Inter.
 *
 * Android, and browsers without SF Pro: Inter (SIL Open Font Licence), the
 * closest free match. Apple's licence for SF Pro only covers Apple's own
 * platforms, so it can't be shipped inside the app for anything else. Inter
 * gets the size-based tracking its designer publishes for it, which is
 * what makes it sit like SF: slightly tight at text sizes, tighter still
 * for headings.
 *
 * Sizes, line heights and weights follow Apple's iOS text styles (Large
 * Title 34/41, Body 17/22, Headline 17/22 semibold, and so on). Every
 * weight goes through `face()`: Android picks bundled fonts by name, and a
 * bare `fontWeight` there would give a faux bold instead of the real cut.
 */
export type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

/** Names the bundled faces are registered under (see app/_layout.tsx and lib/fonts.ts). */
export { BUNDLED_FACES } from './fonts';


const NUMERIC = { regular: '400', medium: '500', semibold: '600', bold: '700' } as const;
const INTER: Record<Weight, string> = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

/** Where SF Pro is what actually draws: iPhone, and browsers on Apple devices. */
const SF_DRAWS =
  Platform.OS === 'ios' || (Platform.OS === 'web' && typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent));

/** True where the app must load the bundled faces (Inter) before drawing text: never where SF Pro draws. */
export const NEEDS_BUNDLED_FACES = !SF_DRAWS;

export function face(weight: Weight = 'regular'): { fontFamily: string; fontWeight: '400' | '500' | '600' | '700' | 'normal' } {
  if (Platform.OS === 'ios') return { fontFamily: 'System', fontWeight: NUMERIC[weight] };
  if (Platform.OS === 'web') {
    // The system font first (SF Pro on Apple devices), then SF Pro by name, then Inter.
    return { fontFamily: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", ${INTER[weight]}, system-ui, sans-serif`, fontWeight: NUMERIC[weight] };
  }
  return { fontFamily: INTER[weight], fontWeight: 'normal' };
}

/**
 * Letter-spacing for a size, in points. None where SF Pro draws: the system
 * applies SF's own tracking table. For Inter, its designer's formula
 * (rsms.me/inter/dynmetrics): tracking = -0.0223 + 0.185 × e^(-0.1745 × size) em.
 */
export function tracking(size: number): number {
  if (SF_DRAWS) return 0;
  return Math.round((-0.0223 + 0.185 * Math.exp(-0.1745 * size)) * size * 100) / 100;
}

const style = (fontSize: number, lineHeight: number, weight: Weight) => ({ fontSize, lineHeight, letterSpacing: tracking(fontSize), ...face(weight) });

/** Apple's iOS text styles, at the default text size. */
export const type = {
  /** Large Title, emphasized, as on a screen's opening heading. */
  largeTitle: style(34, 41, 'bold'),
  /** Title 1, emphasized. */
  title: style(28, 34, 'bold'),
  /** Title 2, emphasized. */
  title2: style(22, 28, 'bold'),
  headline: style(17, 22, 'semibold'),
  body: style(17, 22, 'regular'),
  callout: style(16, 21, 'regular'),
  subhead: style(15, 20, 'regular'),
  footnote: style(13, 18, 'regular'),
  /** Caption 1. */
  caption: style(12, 16, 'regular'),
  /** Small capitals over figures, as in Maps (Caption 2 size, opened up because it's set in capitals). */
  eyebrow: { ...style(11, 13, 'semibold'), letterSpacing: 0.6 },
  /** Big numbers: prices, ratings (Title 3 size). */
  figure: style(20, 25, 'bold'),
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
