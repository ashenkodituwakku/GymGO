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
 * SF Pro Rounded for display type — the face Apple uses in Fitness and
 * Activity — gives the app its voice. Body text stays in the standard system
 * face for legibility.
 */
export const font = {
  rounded: Platform.select({
    ios: 'ui-rounded',
    web: "ui-rounded, 'SF Pro Rounded', 'Nunito', system-ui, sans-serif",
    default: 'sans-serif-medium',
  }),
  text: Platform.select({
    ios: undefined,
    web: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif",
    default: undefined,
  }),
};

export const type = {
  largeTitle: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.6, fontFamily: font.rounded },
  title: { fontSize: 26, lineHeight: 31, fontWeight: '800', letterSpacing: -0.5, fontFamily: font.rounded },
  title2: { fontSize: 21, lineHeight: 26, fontWeight: '700', letterSpacing: -0.35, fontFamily: font.rounded },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.4, fontFamily: font.text },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400', letterSpacing: -0.4, fontFamily: font.text },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400', letterSpacing: -0.3, fontFamily: font.text },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.2, fontFamily: font.text },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: -0.1, fontFamily: font.text },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0, fontFamily: font.text },
  /** Small caps labels in metric strips, as in Maps. */
  eyebrow: { fontSize: 11, lineHeight: 13, fontWeight: '600', letterSpacing: 0.5, fontFamily: font.text },
  /** Big numbers: prices, ratings. */
  figure: { fontSize: 19, lineHeight: 23, fontWeight: '700', letterSpacing: -0.4, fontFamily: font.rounded },
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
