/**
 * GymGO's native look, in light and dark.
 *
 * Built to sit on top of a real map the way Apple Maps does: light, airy
 * surfaces (or Apple's dark ones), one brand colour, and state colours that
 * mean something. Actions use the brand colour; evidence states never do, so
 * "good to go" can't be confused with "tap here". That's also why no accent
 * theme is green, orange or red.
 *
 * Text colours are Apple's accessible variants, so every label passes WCAG AA
 * on its background in both modes. In dark mode no one colour can be both
 * readable text on near-black and a fill that white text reads on, so the
 * brand has two: `brand` for text, icons and strokes, `brandFill` behind
 * white text.
 *
 * `color` is one object that changes in place when the theme does (see
 * `applyTheme`), and style sheets are made with `themed()`, which remakes
 * them on the next read after a change. The app then redraws its screens
 * (app/_layout.tsx), so nothing needs to import a hook to follow the theme.
 */

import { Platform, StyleSheet, type TextStyle } from 'react-native';

export type Scheme = 'light' | 'dark';
/** What you picked: follow the phone, or always one. */
export type AppearanceChoice = 'system' | 'light' | 'dark';
export type AccentId = 'indigo' | 'ocean' | 'grape' | 'rose' | 'graphite';

interface AccentColors {
  brand: string;
  brandPressed: string;
  brandFill: string;
  brandTint: string;
  brandBorder: string;
  brandWash: string;
}

const BASE = {
  light: {
    // Labels
    label: '#000000',
    labelSecondary: '#6C6C70',
    labelTertiary: '#8E8E93',
    onBrand: '#FFFFFF',
    onBrandSoft: 'rgba(255, 255, 255, 0.86)',
    onBrandFaint: 'rgba(255, 255, 255, 0.2)',

    // Surfaces
    background: '#FFFFFF',
    groupedBackground: '#F2F2F7',
    card: '#FFFFFF',
    /** A control or card raised above a card (segment thumbs, chips). */
    cardRaised: '#FFFFFF',
    /** A card laid on glass, so the glass shows a little. */
    cardGlass: 'rgba(255, 255, 255, 0.86)',
    fill: 'rgba(118, 118, 128, 0.12)',
    fillStrong: 'rgba(118, 118, 128, 0.2)',
    separator: 'rgba(60, 60, 67, 0.18)',
    pressed: 'rgba(0, 0, 0, 0.06)',
    scrim: 'rgba(0, 0, 0, 0.45)',
    handle: 'rgba(60, 60, 67, 0.3)',
    /** Behind a brand's logo, which is drawn for white. */
    logoPlate: '#FFFFFF',
    /** The ring round map pins. */
    pinBorder: '#FFFFFF',
    warnBackground: '#FFF4E5',

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

    // Glass where the platform has no native material.
    glass: 'rgba(255, 255, 255, 0.78)',
    glassBorder: 'rgba(0, 0, 0, 0.06)',
    glassEdge: 'rgba(255, 255, 255, 0.7)',
    glassThin: 'rgba(255, 255, 255, 0.42)',
    glassThick: 'rgba(250, 250, 253, 0.66)',
    glassWashThin: 'rgba(255, 255, 255, 0.8)',
    glassWashThick: 'rgba(248, 248, 251, 0.94)',
    glassBar: 'rgba(250, 250, 253, 0.93)',
    glassWashBar: 'rgba(248, 248, 251, 0.98)',
    shadow: '#000000',

    // The body diagram.
    bodyIdle: '#D5D5DB',
    bodyInert: '#ECECEF',
    bodyBorder: '#C4C4CA',
    bodyHover: '#B4B4BE',
    /** Google's own grey, for its attribution. */
    googleInk: '#5F6368',
  },
  dark: {
    label: '#FFFFFF',
    labelSecondary: '#AEAEB2',
    labelTertiary: '#8E8E93',
    onBrand: '#FFFFFF',
    onBrandSoft: 'rgba(255, 255, 255, 0.86)',
    onBrandFaint: 'rgba(255, 255, 255, 0.2)',

    background: '#000000',
    groupedBackground: '#000000',
    card: '#1C1C1E',
    cardRaised: '#3A3A3C',
    cardGlass: 'rgba(44, 44, 46, 0.82)',
    fill: 'rgba(118, 118, 128, 0.24)',
    fillStrong: 'rgba(118, 118, 128, 0.36)',
    separator: 'rgba(84, 84, 88, 0.65)',
    pressed: 'rgba(255, 255, 255, 0.08)',
    scrim: 'rgba(0, 0, 0, 0.55)',
    handle: 'rgba(235, 235, 245, 0.3)',
    logoPlate: '#F2F2F7',
    pinBorder: '#FFFFFF',
    warnBackground: '#3A2A12',

    good: '#30D158',
    goodInk: '#30D158',
    goodTint: 'rgba(48, 209, 88, 0.2)',
    maybe: '#FF9F0A',
    maybeInk: '#FFB340',
    maybeTint: 'rgba(255, 159, 10, 0.2)',
    no: '#8E8E93',
    noInk: '#AEAEB2',
    noTint: 'rgba(142, 142, 147, 0.24)',
    danger: '#FF453A',
    dangerInk: '#FF6961',
    dangerTint: 'rgba(255, 69, 58, 0.2)',

    glass: 'rgba(30, 30, 32, 0.78)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
    glassEdge: 'rgba(255, 255, 255, 0.16)',
    glassThin: 'rgba(40, 40, 44, 0.46)',
    glassThick: 'rgba(28, 28, 30, 0.7)',
    glassWashThin: 'rgba(36, 36, 40, 0.82)',
    glassWashThick: 'rgba(28, 28, 30, 0.95)',
    glassBar: 'rgba(28, 28, 30, 0.93)',
    glassWashBar: 'rgba(22, 22, 24, 0.98)',
    shadow: '#000000',

    bodyIdle: '#48484A',
    bodyInert: '#2C2C2E',
    bodyBorder: '#636366',
    bodyHover: '#636366',
    googleInk: '#BDC1C6',
  },
} as const;

/**
 * The accents. Indigo is everyone's; the rest are part of GymGO Pro. Each
 * passes AA as text on its mode's cards, and white on its fill passes AA.
 */
export const ACCENTS: Record<AccentId, { name: string; light: AccentColors; dark: AccentColors }> = {
  indigo: {
    name: 'Indigo',
    light: { brand: '#5856D6', brandPressed: '#4B49C4', brandFill: '#5856D6', brandTint: 'rgba(88, 86, 214, 0.12)', brandBorder: 'rgba(88, 86, 214, 0.28)', brandWash: 'rgba(88, 86, 214, 0.06)' },
    dark: { brand: '#7D7AFF', brandPressed: '#6B68F0', brandFill: '#5856D6', brandTint: 'rgba(125, 122, 255, 0.2)', brandBorder: 'rgba(125, 122, 255, 0.4)', brandWash: 'rgba(125, 122, 255, 0.1)' },
  },
  ocean: {
    name: 'Ocean',
    light: { brand: '#0064D2', brandPressed: '#0056B5', brandFill: '#0064D2', brandTint: 'rgba(0, 100, 210, 0.12)', brandBorder: 'rgba(0, 100, 210, 0.28)', brandWash: 'rgba(0, 100, 210, 0.06)' },
    dark: { brand: '#409CFF', brandPressed: '#2E8AF0', brandFill: '#0062CC', brandTint: 'rgba(64, 156, 255, 0.2)', brandBorder: 'rgba(64, 156, 255, 0.4)', brandWash: 'rgba(64, 156, 255, 0.1)' },
  },
  grape: {
    name: 'Grape',
    light: { brand: '#8E3FD8', brandPressed: '#7B32C0', brandFill: '#8E3FD8', brandTint: 'rgba(142, 63, 216, 0.12)', brandBorder: 'rgba(142, 63, 216, 0.28)', brandWash: 'rgba(142, 63, 216, 0.06)' },
    dark: { brand: '#DA8FFF', brandPressed: '#C77CF0', brandFill: '#8E3FD8', brandTint: 'rgba(218, 143, 255, 0.2)', brandBorder: 'rgba(218, 143, 255, 0.4)', brandWash: 'rgba(218, 143, 255, 0.1)' },
  },
  rose: {
    name: 'Rose',
    light: { brand: '#C2185B', brandPressed: '#A8134E', brandFill: '#C2185B', brandTint: 'rgba(194, 24, 91, 0.12)', brandBorder: 'rgba(194, 24, 91, 0.28)', brandWash: 'rgba(194, 24, 91, 0.06)' },
    dark: { brand: '#FF6B9D', brandPressed: '#F0588B', brandFill: '#C2185B', brandTint: 'rgba(255, 107, 157, 0.2)', brandBorder: 'rgba(255, 107, 157, 0.4)', brandWash: 'rgba(255, 107, 157, 0.1)' },
  },
  graphite: {
    name: 'Graphite',
    light: { brand: '#3A3A3C', brandPressed: '#2C2C2E', brandFill: '#3A3A3C', brandTint: 'rgba(58, 58, 60, 0.1)', brandBorder: 'rgba(58, 58, 60, 0.28)', brandWash: 'rgba(58, 58, 60, 0.05)' },
    dark: { brand: '#D1D1D6', brandPressed: '#BCBCC0', brandFill: '#48484A', brandTint: 'rgba(209, 209, 214, 0.16)', brandBorder: 'rgba(209, 209, 214, 0.36)', brandWash: 'rgba(209, 209, 214, 0.08)' },
  },
};

export const ACCENT_IDS = Object.keys(ACCENTS) as AccentId[];
export const FREE_ACCENT: AccentId = 'indigo';

export type Palette = { -readonly [K in keyof (typeof BASE)['light']]: string } & AccentColors;

const paletteFor = (scheme: Scheme, accent: AccentId): Palette => ({ ...BASE[scheme], ...ACCENTS[accent][scheme] });

/** The colours in use now. Changes in place with the theme; read it while drawing, not once at start-up. */
export const color: Palette = paletteFor('light', FREE_ACCENT);

let current: { scheme: Scheme; accent: AccentId } = { scheme: 'light', accent: FREE_ACCENT };
let version = 0;
const listeners = new Set<() => void>();

export const currentTheme = () => current;
export const themeVersion = () => version;

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Switch the colours everywhere. Returns false if nothing changed. */
export function applyTheme(scheme: Scheme, accent: AccentId): boolean {
  if (current.scheme === scheme && current.accent === accent) return false;
  current = { scheme, accent };
  Object.assign(color, paletteFor(scheme, accent));
  version += 1;
  for (const listener of listeners) listener();
  return true;
}

/**
 * An object (usually a style sheet) made from the colours, and made again
 * the first time it's read after the theme changes:
 *
 *     const styles = themed(() => StyleSheet.create({ page: { backgroundColor: color.card } }));
 */
export function themed<T extends object>(make: () => T): T {
  let madeAt = -1;
  let made = {} as T;
  const fresh = () => {
    if (madeAt !== version) {
      made = make();
      madeAt = version;
    }
    return made as Record<PropertyKey, unknown>;
  };
  return new Proxy({} as T, {
    get: (_, key) => fresh()[key],
    has: (_, key) => key in fresh(),
    ownKeys: () => Reflect.ownKeys(fresh()),
    getOwnPropertyDescriptor: (_, key) => {
      const descriptor = Object.getOwnPropertyDescriptor(fresh(), key);
      return descriptor ? { ...descriptor, configurable: true } : undefined;
    },
  });
}

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

/**
 * Where touches go. Made with StyleSheet.create: in a browser only compiled
 * styles understand 'box-none' (an inline one would swallow every click).
 */
const touches = StyleSheet.create({
  /** Touches pass through this view (decoration over something tappable). */
  none: { pointerEvents: 'none' },
  /** Touches pass through this view itself, but reach its children. */
  childrenOnly: { pointerEvents: 'box-none' },
});
export const NO_TOUCH = touches.none;
export const CHILD_TOUCH = touches.childrenOnly;

/**
 * For a text field whose box shows focus itself (an accent border): the
 * browser's own focus box would be drawn inside it as well, so it's left out.
 */
export const NO_WEB_OUTLINE = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as unknown as TextStyle;

/** Minimum touch target, per Apple's Human Interface Guidelines. */
export const HIT = 44;
