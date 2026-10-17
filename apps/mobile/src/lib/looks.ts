/**
 * Looks: how the whole app is drawn, beyond its colours (Pro).
 *
 * A look sets the corners, the typefaces, what surfaces are made of (glass,
 * or solid plates), their shadows and the colours of the page and cards.
 * The accent stays yours, and so do the evidence colours: green, orange and
 * grey mean the same thing in every look. Whatever surfaces a look uses, the
 * text colours on them are nudged darker or lighter until they pass WCAG AA
 * (see `readable` below), so no look trades legibility for style.
 *
 * - Standard: GymGO's own iPhone look (everyone).
 * - 8-bit: square pixels, arcade type for headings, a readable pixel face for
 *   everything else, and chunky outlines with hard drop shadows.
 * - Classic: a nineties desktop: teal backdrop, grey bevelled plates.
 * - Material: rounded, tonal surfaces tinted by your accent, set in Roboto,
 *   the way an Android phone draws things.
 * - Neon: always dark, with cards that glow in your accent.
 *
 * Pure data and colour maths, with no React: theme.ts applies it.
 */

import type { ViewStyle } from 'react-native';

export type LookId = 'standard' | 'pixel' | 'classic' | 'material' | 'neon';
export const LOOK_IDS: LookId[] = ['standard', 'pixel', 'classic', 'material', 'neon'];
export const FREE_LOOK: LookId = 'standard';

type Scheme = 'light' | 'dark';
type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

export interface Radii {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  sheet: number;
  pill: number;
}

export interface LookFonts {
  /** The face for each weight, as registered with expo-font (see lookFonts.ts). */
  body: Record<Weight, string>;
  /** A display face for titles and big figures, if the look has one. */
  display?: string;
  /** How much smaller the display face is set (arcade faces run large). */
  displayScale?: number;
}

/** The surfaces a look can repaint. */
export interface Surfaces {
  groupedBackground: string;
  background: string;
  card: string;
  cardRaised: string;
  cardGlass: string;
  separator: string;
  fill: string;
}

export interface LookSpec {
  name: string;
  /** One line for the picker. */
  blurb: string;
  radius: Radii;
  /** Draw floating controls and sheets as solid plates instead of glass. */
  solid: boolean;
  fonts: LookFonts | null;
  /** A look that only makes sense one way (Neon is always dark). */
  scheme?: Scheme;
  surfaces?: (scheme: Scheme, brand: string) => Surfaces;
  /**
   * Shadows for floating things and cards, and the edge a flat card on the
   * page gets (a list group, a Home tile). None means the standard soft ones.
   */
  shadows?: (scheme: Scheme, brand: string) => { float: ViewStyle; card: ViewStyle; plate: ViewStyle };
}

export const STANDARD_RADIUS: Radii = { sm: 10, md: 14, lg: 18, xl: 24, sheet: 38, pill: 999 };

// --- Colour maths -----------------------------------------------------------

const hex = (value: string) => {
  const m = /^#([0-9a-f]{6})$/i.exec(value);
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};
const toHex = (rgb: readonly number[]) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

/** `a` moved `amount` (0 to 1) of the way to `b`. */
export function mix(a: string, b: string, amount: number): string {
  const x = hex(a);
  const y = hex(b);
  if (!x || !y) return a;
  return toHex(x.map((c, i) => c + (y[i]! - c) * amount));
}

/** The colour with an alpha, as rgba(). */
export function alpha(value: string, opacity: number): string {
  const x = hex(value);
  return x ? `rgba(${x[0]}, ${x[1]}, ${x[2]}, ${opacity})` : value;
}

const channel = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
export function luminance(value: string): number {
  const x = hex(value);
  if (!x) return 0;
  return 0.2126 * channel(x[0]) + 0.7152 * channel(x[1]) + 0.0722 * channel(x[2]);
}
export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (light! + 0.05) / (dark! + 0.05);
}

/**
 * The text colour, nudged towards black (light pages) or white (dark pages)
 * until it reads at WCAG AA on every one of the backgrounds. Colours that
 * already pass come back unchanged.
 */
export function readable(text: string, backgrounds: string[], scheme: Scheme, target = 4.6): string {
  if (!hex(text)) return text;
  const towards = scheme === 'dark' ? '#FFFFFF' : '#000000';
  for (let step = 0; step <= 20; step++) {
    const candidate = mix(text, towards, step / 20);
    if (backgrounds.every((bg) => !hex(bg) || contrast(candidate, bg) >= target)) return candidate;
  }
  return towards;
}

// --- The looks --------------------------------------------------------------

const PIXEL_BODY: Record<Weight, string> = {
  regular: 'PixelifySans_400Regular',
  medium: 'PixelifySans_500Medium',
  semibold: 'PixelifySans_600SemiBold',
  bold: 'PixelifySans_700Bold',
};
const ROBOTO: Record<Weight, string> = {
  regular: 'Roboto_400Regular',
  medium: 'Roboto_500Medium',
  semibold: 'Roboto_500Medium',
  bold: 'Roboto_700Bold',
};

export const LOOKS: Record<LookId, LookSpec> = {
  standard: {
    name: 'Standard',
    blurb: 'Glass and soft shadows, the iPhone way',
    radius: STANDARD_RADIUS,
    solid: false,
    fonts: null,
  },
  pixel: {
    name: '8-bit',
    blurb: 'Square pixels, arcade titles, hard shadows',
    radius: { sm: 0, md: 0, lg: 0, xl: 0, sheet: 0, pill: 0 },
    solid: true,
    fonts: { body: PIXEL_BODY, display: 'PressStart2P_400Regular', displayScale: 0.62 },
    surfaces: (scheme) =>
      scheme === 'dark'
        ? { groupedBackground: '#0E1116', background: '#1B2027', card: '#1B2027', cardRaised: '#2A313A', cardGlass: '#1B2027', separator: 'rgba(229, 229, 234, 0.35)', fill: 'rgba(229, 229, 234, 0.12)' }
        : { groupedBackground: '#E9E3D3', background: '#FFFDF6', card: '#FFFDF6', cardRaised: '#FFFFFF', cardGlass: '#FFFDF6', separator: 'rgba(28, 28, 30, 0.35)', fill: 'rgba(28, 28, 30, 0.1)' },
    shadows: (scheme) => {
      const ink = scheme === 'dark' ? '#E5E5EA' : '#1C1C1E';
      const card = { boxShadow: `0px 0px 0px 2px ${ink}, 4px 4px 0px 2px ${ink}` };
      return { card, plate: card, float: { boxShadow: `0px 0px 0px 2px ${ink}, 5px 5px 0px 2px ${ink}` } };
    },
  },
  classic: {
    name: 'Classic',
    blurb: 'A nineties desktop: teal backdrop, bevelled grey',
    radius: { sm: 0, md: 0, lg: 0, xl: 0, sheet: 2, pill: 2 },
    solid: true,
    fonts: null,
    surfaces: (scheme) =>
      scheme === 'dark'
        ? { groupedBackground: '#123838', background: '#3C3C3C', card: '#3C3C3C', cardRaised: '#505050', cardGlass: '#3C3C3C', separator: '#1A1A1A', fill: 'rgba(255, 255, 255, 0.1)' }
        : { groupedBackground: '#3FA0A0', background: '#C0C0C0', card: '#C0C0C0', cardRaised: '#DFDFDF', cardGlass: '#C0C0C0', separator: '#808080', fill: 'rgba(0, 0, 0, 0.08)' },
    shadows: (scheme) => {
      const bevel =
        scheme === 'dark'
          ? 'inset -1px -1px 0px 0px #000000, inset 1px 1px 0px 0px #8A8A8A, inset -2px -2px 0px 0px #1A1A1A, inset 2px 2px 0px 0px #5A5A5A'
          : 'inset -1px -1px 0px 0px #0A0A0A, inset 1px 1px 0px 0px #FFFFFF, inset -2px -2px 0px 0px #808080, inset 2px 2px 0px 0px #DFDFDF';
      return { card: { boxShadow: bevel }, plate: { boxShadow: bevel }, float: { boxShadow: `${bevel}, 2px 2px 0px 0px rgba(0, 0, 0, 0.35)` } };
    },
  },
  material: {
    name: 'Material',
    blurb: 'Rounded and tonal, tinted by your accent, like Android',
    radius: { sm: 8, md: 12, lg: 16, xl: 28, sheet: 28, pill: 999 },
    solid: true,
    fonts: { body: ROBOTO },
    surfaces: (scheme, brand) =>
      scheme === 'dark'
        ? {
            groupedBackground: mix('#131316', brand, 0.06),
            background: mix('#1A1A1E', brand, 0.08),
            card: mix('#1D1B20', brand, 0.12),
            cardRaised: mix('#2B2930', brand, 0.14),
            cardGlass: mix('#1D1B20', brand, 0.12),
            separator: alpha(mix('#CAC4D0', brand, 0.2), 0.3),
            fill: alpha(mix('#CAC4D0', brand, 0.3), 0.14),
          }
        : {
            groupedBackground: mix('#FFFFFF', brand, 0.04),
            background: mix('#FFFFFF', brand, 0.03),
            card: mix('#FFFFFF', brand, 0.1),
            cardRaised: mix('#FFFFFF', brand, 0.16),
            cardGlass: mix('#FFFFFF', brand, 0.1),
            separator: alpha(mix('#79747E', brand, 0.2), 0.3),
            fill: alpha(mix('#79747E', brand, 0.4), 0.14),
          },
    shadows: () => ({
      card: { boxShadow: '0px 1px 2px 0px rgba(0, 0, 0, 0.12), 0px 1px 3px 1px rgba(0, 0, 0, 0.06)' },
      float: { boxShadow: '0px 4px 8px 3px rgba(0, 0, 0, 0.12), 0px 1px 3px 0px rgba(0, 0, 0, 0.24)' },
      // Filled cards sit flat: the tone sets them apart.
      plate: {},
    }),
  },
  neon: {
    name: 'Neon',
    blurb: 'Night-black, with edges that glow in your accent',
    radius: { sm: 8, md: 12, lg: 16, xl: 20, sheet: 30, pill: 999 },
    solid: true,
    fonts: null,
    scheme: 'dark',
    surfaces: (_scheme, brand) => ({
      groupedBackground: '#06050D',
      background: '#0C0A18',
      card: '#110E22',
      cardRaised: '#1B1735',
      cardGlass: '#110E22',
      separator: alpha(brand, 0.3),
      fill: 'rgba(255, 255, 255, 0.08)',
    }),
    shadows: (_scheme, brand) => ({
      card: { boxShadow: `0px 0px 0px 1px ${alpha(brand, 0.45)}, 0px 0px 16px 0px ${alpha(brand, 0.35)}` },
      float: { boxShadow: `0px 0px 0px 1px ${alpha(brand, 0.8)}, 0px 0px 22px 2px ${alpha(brand, 0.55)}` },
      plate: { boxShadow: `0px 0px 0px 1px ${alpha(brand, 0.35)}, 0px 0px 12px 0px ${alpha(brand, 0.22)}` },
    }),
  },
};
