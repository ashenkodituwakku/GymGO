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
 * - Frost: frosted glass on a blue-and-white page (glassmorphism): see-through
 *   cards with a white edge, over a page of pale blues that stays put as it
 *   scrolls, so each card shows a little of what's behind it. How see-through
 *   follows your Liquid Glass level, like Standard's.
 * - Liquid: everything in Liquid Glass. Clear cards with bright, light-
 *   catching edges and a sheen across them, over soft pools of your accent
 *   and its neighbouring colours for the glass to show; in a browser each
 *   card also blurs and deepens what's behind it. Rounder, like iOS 26.
 * - 8-bit: square pixels, arcade type for headings, a readable pixel face for
 *   everything else, and chunky outlines with hard drop shadows.
 * - Classic: a nineties desktop: teal backdrop, grey bevelled plates.
 * - Material: rounded, tonal surfaces tinted by your accent, set in Roboto,
 *   the way an Android phone draws things.
 * - Neon: always dark, with cards that glow in your accent.
 * - Soft: cards pressed out of the page itself, lit from the top left, in a
 *   rounded face (Nunito).
 * - Paper: cream pages and ink hairlines, titles set in a serif (Fraunces).
 * - Terminal: always dark, square, every word in a monospaced face
 *   (JetBrains Mono), cards outlined in your accent.
 * - Comic: thick ink outlines with a hard offset shadow on a sunny page,
 *   titles in a comic-book face (Bangers).
 *
 * Pure data and colour maths, with no React: theme.ts applies it.
 */

import type { ViewStyle } from 'react-native';

export type LookId = 'standard' | 'frost' | 'liquid' | 'pixel' | 'classic' | 'material' | 'neon' | 'soft' | 'paper' | 'terminal' | 'comic';
export const LOOK_IDS: LookId[] = ['standard', 'frost', 'liquid', 'soft', 'paper', 'material', 'neon', 'terminal', 'pixel', 'classic', 'comic'];
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
  /** The face for each weight, as registered with expo-font (see lookFonts.ts); the system's if not given. */
  body?: Record<Weight, string>;
  /** A display face for titles and big figures, if the look has one. */
  display?: string;
  /** How much smaller the display face is set (arcade faces run large). */
  displayScale?: number;
  /** Its line height, as a multiple of its size (1.5 if not given: pixel faces want room). */
  displayLeading?: number;
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
  /**
   * A page of the look's own, behind see-through cards (Frost): drawn behind
   * each page and staying put as it scrolls, in place of Standard's glow.
   */
  backdrop?: (scheme: Scheme, brand: string) => Backdrop;
  /**
   * Cards on the page as glass over the backdrop: how solid they are at the
   * default Liquid Glass level and at 100% (solid at 0%), at the least: more
   * solid where their text needs it.
   */
  plates?: Record<Scheme, { balanced: number; clearest: number }>;
  /**
   * Cards on the page drawn as Liquid Glass (Liquid): a sheen across each
   * and, in a browser, a blur under it that deepens the colours behind
   * (theme.ts adds these to the look's own card shadow).
   */
  glassCards?: boolean;
  /** The colour of the glass floating over the page and the map (red, green, blue), in place of Standard's white and grey. */
  wash?: Record<Scheme, { thin: string; thick: string; bar: string }>;
}

/** A look's own page: CSS gradients, and every colour they reach (text over them is checked against each). */
export interface Backdrop {
  image: string;
  tones: string[];
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

// --- OKLCH -----------------------------------------------------------------
//
// OKLCH (Björn Ottosson's OKLab, as lightness, chroma and hue) is spaced the
// way eyes see: the same lightness looks equally light in every hue, the same
// chroma equally vivid. So a colour made in it at a hue the slider picks looks
// as bright and as saturated as its neighbours (in HSL a yellow and a blue at
// the same "lightness" look nothing alike), and a blend between two colours
// through it keeps its colour, where a blend in sRGB goes grey between two
// far-apart hues.

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

/** A hex colour as [lightness 0–1, chroma, hue in degrees]; null if it isn't one. */
export function hexToOklch(value: string): [number, number, number] | null {
  const x = hex(value);
  if (!x) return null;
  const [r, g, b] = x.map(toLinear) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const hue = (Math.atan2(B, A) * 180) / Math.PI;
  return [L, Math.hypot(A, B), hue < 0 ? hue + 360 : hue];
}

/** OKLCH as linear sRGB, which may fall outside 0–1 (outside what a screen can show). */
function oklchLinear(L: number, C: number, H: number): [number, number, number] {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}

/**
 * An OKLCH colour as hex. Where a screen can't show that much colour at that
 * lightness and hue, the chroma comes down (lightness and hue kept) until it
 * can, rather than the channels being clipped, which shifts the hue.
 */
export function oklchToHex(L: number, C: number, H: number): string {
  const fits = (c: number) => oklchLinear(L, c, H).every((v) => v >= -0.0001 && v <= 1.0001);
  let chroma = C;
  if (!fits(chroma)) {
    let low = 0;
    let high = C;
    for (let step = 0; step < 24; step++) {
      const mid = (low + high) / 2;
      if (fits(mid)) low = mid;
      else high = mid;
    }
    chroma = low;
  }
  return toHex(oklchLinear(L, chroma, H).map((v) => fromLinear(Math.min(1, Math.max(0, v)))));
}

/** `a` moved `amount` (0 to 1) of the way to `b` through OKLCH, the short way round the hue circle. */
export function mixOklch(a: string, b: string, amount: number): string {
  const x = hexToOklch(a);
  const y = hexToOklch(b);
  if (!x || !y) return mix(a, b, amount);
  // A grey has no hue to speak of: take the other colour's.
  const hx = x[1] < 0.01 ? y[2] : x[2];
  const hy = y[1] < 0.01 ? x[2] : y[2];
  const turn = ((hy - hx + 540) % 360) - 180;
  return oklchToHex(x[0] + (y[0] - x[0]) * amount, x[1] + (y[1] - x[1]) * amount, (hx + turn * amount + 360) % 360);
}

/**
 * A gradient's stops with colours blended through OKLCH put between them, so
 * the browser's (or the phone's) blend, which is in sRGB, only ever bridges
 * near neighbours and never goes grey: CSS's "in oklch", in a form every
 * browser and both phones draw.
 */
export function oklchStops(stops: readonly string[], between = 3): string[] {
  const out: string[] = [];
  stops.forEach((stop, index) => {
    out.push(stop);
    const next = stops[index + 1];
    if (next === undefined) return;
    for (let step = 1; step <= between; step++) out.push(mixOklch(stop, next, step / (between + 1)));
  });
  return out;
}

/** `a` moved `amount` (0 to 1) of the way to `b`. */
export function mix(a: string, b: string, amount: number): string {
  const x = hex(a);
  const y = hex(b);
  if (!x || !y) return a;
  return toHex(x.map((c, i) => c + (y[i]! - c) * amount));
}

/**
 * A see-through colour ("rgba(r, g, b, a)") as it comes out over a solid
 * ground. A solid colour comes back as it is; where either can't be read
 * (a see-through ground, say), the ground does.
 */
export function over(ground: string, wash: string): string {
  if (hex(wash)) return wash;
  const parts = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.exec(wash);
  const under = hex(ground);
  if (!parts || !under) return ground;
  const share = Number(parts[4]);
  return toHex(under.map((c, i) => c + (Number(parts[i + 1]) - c) * share));
}

/**
 * A colour made fully clear, keeping its hue: where a fade from "transparent"
 * should start. "Transparent" is clear black, so a highlight fading from it
 * to a grey passed through a darker tint on the way.
 */
export function clearOf(value: string): string {
  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(value);
  if (rgb) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, 0)`;
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value);
  const x = hex(short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : value.slice(0, 7));
  return x ? `rgba(${x[0]}, ${x[1]}, ${x[2]}, 0)` : 'transparent';
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

const NUNITO: Record<Weight, string> = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
};
const MONO: Record<Weight, string> = {
  regular: 'JetBrainsMono_400Regular',
  medium: 'JetBrainsMono_500Medium',
  semibold: 'JetBrainsMono_600SemiBold',
  bold: 'JetBrainsMono_700Bold',
};

/**
 * Frost's page: white at the top fading to pale blue at the foot (deep navy
 * in dark), and two soft pools of a stronger blue, top right and left, for
 * the glass over them to show. Made in one place with the colours it
 * reaches, so the cards' text is checked against what's really drawn.
 */
function frostBackdrop(scheme: Scheme): Backdrop {
  const dark = scheme === 'dark';
  const ground = dark ? ['#13203E', '#0C1529', '#0A1222'] : ['#F8FBFF', '#E7F0FD', '#D6E4F9'];
  const pools = dark
    ? [
        { at: '90% 2%', tint: '#3B6BDB', strength: 0.34, reach: 48 },
        { at: '2% 58%', tint: '#3457B5', strength: 0.26, reach: 52 },
      ]
    : [
        { at: '90% 2%', tint: '#8CB4FF', strength: 0.5, reach: 48 },
        { at: '2% 58%', tint: '#A6C3F7', strength: 0.45, reach: 52 },
      ];
  const round = (value: number) => Math.round(value * 100) / 100;
  const image = [
    // Each eased out over three stops, so no ring shows where a pool ends.
    ...pools.map(({ at, tint, strength, reach }) => `radial-gradient(circle at ${at}, ${alpha(tint, strength)} 0%, ${alpha(tint, round(strength * 0.45))} ${round(reach * 0.45)}%, ${alpha(tint, 0)} ${reach}%)`),
    `linear-gradient(170deg, ${ground[0]} 0%, ${ground[1]} 55%, ${ground[2]} 100%)`,
  ].join(', ');
  const pooled = (under: string) => pools.map(({ tint, strength }) => over(under, alpha(tint, strength)));
  const tones = [...ground, ...ground.flatMap(pooled), over(over(ground[2]!, alpha(pools[0]!.tint, pools[0]!.strength)), alpha(pools[1]!.tint, pools[1]!.strength))];
  return { image, tones };
}

/**
 * Liquid's page: near white (near black in dark) with three soft pools, your
 * accent's hue and its neighbours either side, made in OKLCH so each is as
 * light and as vivid as the next. Glass needs colour behind it to be seen as
 * glass: over a plain page it is just a pale card. A grey accent (Slate,
 * Graphite) has no hue of its own, so its pools are blue-violet.
 */
function liquidBackdrop(scheme: Scheme, brand: string): Backdrop {
  const dark = scheme === 'dark';
  const [, chroma, hue] = hexToOklch(brand) ?? [0, 0, 265];
  const base = chroma < 0.04 ? 265 : hue;
  const ground = dark ? ['#11111A', '#0C0C13', '#08080D'] : ['#FAFAFD', '#F2F2F8', '#ECEDF5'];
  const [L, C, strength] = dark ? [0.5, 0.14, 0.5] : [0.8, 0.12, 0.55];
  const pools = [
    { at: '12% 6%', tint: oklchToHex(L, C, base), reach: 50 },
    { at: '96% 42%', tint: oklchToHex(L, C, (base + 60) % 360), reach: 46 },
    { at: '30% 100%', tint: oklchToHex(L, C, (base + 300) % 360), reach: 50 },
  ];
  const round = (value: number) => Math.round(value * 100) / 100;
  const image = [
    ...pools.map(({ at, tint, reach }) => `radial-gradient(circle at ${at}, ${alpha(tint, strength)} 0%, ${alpha(tint, round(strength * 0.45))} ${round(reach * 0.45)}%, ${alpha(tint, 0)} ${reach}%)`),
    `linear-gradient(170deg, ${ground[0]} 0%, ${ground[1]} 55%, ${ground[2]} 100%)`,
  ].join(', ');
  const tones = [...ground, ...ground.flatMap((under) => pools.map(({ tint }) => over(under, alpha(tint, strength))))];
  return { image, tones };
}

export const LOOKS: Record<LookId, LookSpec> = {
  standard: {
    name: 'Standard',
    blurb: 'Glass and soft shadows, the iPhone way',
    radius: STANDARD_RADIUS,
    solid: false,
    fonts: null,
  },
  frost: {
    name: 'Frost',
    blurb: 'Frosted glass cards on a blue-and-white page (deep blue in dark)',
    radius: { sm: 12, md: 16, lg: 20, xl: 26, sheet: 38, pill: 999 },
    solid: false,
    fonts: null,
    surfaces: (scheme) =>
      scheme === 'dark'
        ? { groupedBackground: '#0C1529', background: '#121D36', card: '#22325A', cardRaised: '#2C3D68', cardGlass: 'rgba(28, 40, 70, 0.86)', separator: 'rgba(170, 195, 255, 0.16)', fill: 'rgba(170, 195, 255, 0.1)' }
        : { groupedBackground: '#E6EFFC', background: '#F4F8FE', card: '#FFFFFF', cardRaised: '#FFFFFF', cardGlass: 'rgba(255, 255, 255, 0.86)', separator: 'rgba(50, 80, 140, 0.16)', fill: 'rgba(60, 95, 160, 0.1)' },
    backdrop: (scheme) => frostBackdrop(scheme),
    plates: { light: { balanced: 0.6, clearest: 0.42 }, dark: { balanced: 0.6, clearest: 0.44 } },
    wash: {
      light: { thin: '255, 255, 255', thick: '246, 249, 255', bar: '246, 249, 255' },
      dark: { thin: '30, 43, 76', thick: '22, 33, 60', bar: '17, 27, 50' },
    },
    // Glass's edge: a fine white line all round, brighter along the top where
    // the light catches it, and a soft shadow in the page's own blue.
    shadows: (scheme) =>
      scheme === 'dark'
        ? {
            plate: { boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.32), inset 0px 0px 0px 1px rgba(170, 195, 255, 0.14), inset 0px 1px 0px rgba(215, 228, 255, 0.2)' },
            card: { boxShadow: 'inset 0px 0px 0px 1px rgba(170, 195, 255, 0.12)' },
            float: { boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.5), inset 0px 0px 0px 1px rgba(170, 195, 255, 0.16)' },
          }
        : {
            plate: { boxShadow: '0px 1px 2px rgba(35, 70, 140, 0.05), 0px 8px 24px rgba(35, 70, 140, 0.1), inset 0px 0px 0px 1px rgba(255, 255, 255, 0.7), inset 0px 1px 0px rgba(255, 255, 255, 0.95)' },
            card: { boxShadow: '0px 1px 2px rgba(35, 70, 140, 0.05), 0px 3px 10px rgba(35, 70, 140, 0.07)' },
            float: { boxShadow: '0px 2px 6px rgba(35, 70, 140, 0.08), 0px 10px 30px rgba(35, 70, 140, 0.16)' },
          },
  },
  liquid: {
    name: 'Liquid',
    blurb: 'Clear, bright-edged glass cards over soft colour',
    radius: { sm: 12, md: 18, lg: 24, xl: 30, sheet: 38, pill: 999 },
    solid: false,
    fonts: null,
    glassCards: true,
    surfaces: (scheme) =>
      scheme === 'dark'
        ? { groupedBackground: '#0C0C13', background: '#15151D', card: '#2C2C36', cardRaised: '#383843', cardGlass: 'rgba(44, 44, 54, 0.82)', separator: 'rgba(235, 235, 245, 0.14)', fill: 'rgba(235, 235, 245, 0.1)' }
        : { groupedBackground: '#F2F2F8', background: '#F7F7FB', card: '#FFFFFF', cardRaised: '#FFFFFF', cardGlass: 'rgba(255, 255, 255, 0.8)', separator: 'rgba(60, 60, 67, 0.15)', fill: 'rgba(120, 120, 135, 0.12)' },
    backdrop: (scheme, brand) => liquidBackdrop(scheme, brand),
    plates: { light: { balanced: 0.42, clearest: 0.28 }, dark: { balanced: 0.5, clearest: 0.36 } },
    // Apple's glass edge: bright along the top, fainter down the sides and
    // along the bottom, a soft light inside the rim, and a shadow under it.
    shadows: (scheme) =>
      scheme === 'dark'
        ? {
            plate: { boxShadow: '0px 10px 28px rgba(0, 0, 0, 0.45), inset 0px 1px 0.5px rgba(255, 255, 255, 0.24), inset 1px 0px 0.5px rgba(255, 255, 255, 0.1), inset -1px 0px 0.5px rgba(255, 255, 255, 0.06), inset 0px -1px 0.5px rgba(255, 255, 255, 0.08), inset 0px 0px 18px rgba(255, 255, 255, 0.05)' },
            card: { boxShadow: 'inset 0px 1px 0px rgba(255, 255, 255, 0.18), inset 0px 0px 0px 1px rgba(255, 255, 255, 0.08)' },
            float: { boxShadow: '0px 12px 32px rgba(0, 0, 0, 0.55), inset 0px 1px 0px rgba(255, 255, 255, 0.2)' },
          }
        : {
            plate: { boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.08), 0px 1px 3px rgba(0, 0, 0, 0.05), inset 0px 1px 0.5px rgba(255, 255, 255, 0.95), inset 1px 0px 0.5px rgba(255, 255, 255, 0.55), inset -1px 0px 0.5px rgba(255, 255, 255, 0.35), inset 0px -1px 0.5px rgba(255, 255, 255, 0.45), inset 0px 0px 18px rgba(255, 255, 255, 0.35)' },
            card: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06), inset 0px 1px 0px rgba(255, 255, 255, 0.9), inset 0px 0px 0px 1px rgba(255, 255, 255, 0.45)' },
            float: { boxShadow: '0px 12px 32px rgba(0, 0, 0, 0.14), 0px 2px 6px rgba(0, 0, 0, 0.08), inset 0px 1px 0px rgba(255, 255, 255, 0.95)' },
          },
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
    blurb: 'Nineties desktop with a teal backdrop and bevelled grey',
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
  soft: {
    name: 'Soft',
    blurb: 'Cards pressed out of the page, soft and rounded',
    radius: { sm: 12, md: 16, lg: 22, xl: 28, sheet: 34, pill: 999 },
    solid: true,
    fonts: { body: NUNITO },
    // The card is the page's own colour: only its light and shade lift it.
    surfaces: (scheme) =>
      scheme === 'dark'
        ? { groupedBackground: '#23262C', background: '#23262C', card: '#23262C', cardRaised: '#2C3037', cardGlass: '#23262C', separator: 'rgba(200, 210, 225, 0.12)', fill: 'rgba(200, 210, 225, 0.08)' }
        : { groupedBackground: '#E4E9F0', background: '#E4E9F0', card: '#E4E9F0', cardRaised: '#EEF2F7', cardGlass: '#E4E9F0', separator: 'rgba(110, 124, 145, 0.22)', fill: 'rgba(110, 124, 145, 0.12)' },
    shadows: (scheme) =>
      scheme === 'dark'
        ? {
            card: { boxShadow: '-5px -5px 12px 0px rgba(255, 255, 255, 0.045), 6px 6px 14px 0px rgba(0, 0, 0, 0.55)' },
            plate: { boxShadow: '-5px -5px 12px 0px rgba(255, 255, 255, 0.045), 6px 6px 14px 0px rgba(0, 0, 0, 0.55)' },
            float: { boxShadow: '-4px -4px 10px 0px rgba(255, 255, 255, 0.05), 8px 10px 22px 0px rgba(0, 0, 0, 0.6)' },
          }
        : {
            card: { boxShadow: '-6px -6px 14px 0px rgba(255, 255, 255, 0.9), 6px 6px 14px 0px rgba(148, 162, 184, 0.55)' },
            plate: { boxShadow: '-6px -6px 14px 0px rgba(255, 255, 255, 0.9), 6px 6px 14px 0px rgba(148, 162, 184, 0.55)' },
            float: { boxShadow: '-4px -4px 10px 0px rgba(255, 255, 255, 0.85), 8px 10px 22px 0px rgba(128, 143, 166, 0.5)' },
          },
  },
  paper: {
    name: 'Paper',
    blurb: 'Cream pages, ink hairlines and serif titles',
    radius: { sm: 4, md: 6, lg: 8, xl: 12, sheet: 18, pill: 999 },
    solid: true,
    fonts: { display: 'Fraunces_700Bold', displayLeading: 1.22 },
    surfaces: (scheme) =>
      scheme === 'dark'
        ? { groupedBackground: '#1C1A17', background: '#24211D', card: '#2A2723', cardRaised: '#36322D', cardGlass: '#2A2723', separator: 'rgba(240, 228, 205, 0.18)', fill: 'rgba(240, 228, 205, 0.08)' }
        : { groupedBackground: '#F3EDE0', background: '#FBF8F1', card: '#FFFDF8', cardRaised: '#FFFFFF', cardGlass: '#FFFDF8', separator: 'rgba(60, 50, 35, 0.22)', fill: 'rgba(60, 50, 35, 0.07)' },
    shadows: (scheme) => {
      const edge = scheme === 'dark' ? 'rgba(240, 228, 205, 0.16)' : 'rgba(60, 50, 35, 0.24)';
      const lift = scheme === 'dark' ? 'rgba(0, 0, 0, 0.35)' : 'rgba(60, 50, 35, 0.08)';
      return {
        card: { boxShadow: `0px 0px 0px 1px ${edge}, 0px 2px 0px 0px ${lift}` },
        plate: { boxShadow: `0px 0px 0px 1px ${edge}, 0px 2px 0px 0px ${lift}` },
        float: { boxShadow: `0px 0px 0px 1px ${edge}, 0px 6px 16px 0px ${scheme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(60, 50, 35, 0.18)'}` },
      };
    },
  },
  terminal: {
    name: 'Terminal',
    blurb: 'Black, square and monospaced, outlined in your accent',
    radius: { sm: 2, md: 2, lg: 3, xl: 4, sheet: 6, pill: 4 },
    solid: true,
    fonts: { body: MONO },
    scheme: 'dark',
    surfaces: (_scheme, brand) => ({
      groupedBackground: '#0A0C0D',
      background: '#0F1214',
      card: '#111517',
      cardRaised: '#1A1F22',
      cardGlass: '#111517',
      separator: alpha(brand, 0.35),
      fill: 'rgba(255, 255, 255, 0.07)',
    }),
    shadows: (_scheme, brand) => ({
      card: { boxShadow: `0px 0px 0px 1px ${alpha(brand, 0.55)}` },
      plate: { boxShadow: `0px 0px 0px 1px ${alpha(brand, 0.4)}` },
      float: { boxShadow: `0px 0px 0px 1px ${alpha(brand, 0.85)}, 3px 3px 0px 0px ${alpha(brand, 0.35)}` },
    }),
  },
  comic: {
    name: 'Comic',
    blurb: 'Bold ink outlines, a sunny page and comic-book titles',
    radius: { sm: 10, md: 14, lg: 18, xl: 22, sheet: 28, pill: 999 },
    solid: true,
    fonts: { display: 'Bangers_400Regular', displayScale: 1.06, displayLeading: 1.15 },
    surfaces: (scheme) =>
      scheme === 'dark'
        ? { groupedBackground: '#17141F', background: '#211D2B', card: '#241F30', cardRaised: '#2F2A3D', cardGlass: '#241F30', separator: 'rgba(242, 238, 230, 0.4)', fill: 'rgba(242, 238, 230, 0.1)' }
        : { groupedBackground: '#FFF1BF', background: '#FFFDF5', card: '#FFFFFF', cardRaised: '#FFFFFF', cardGlass: '#FFFFFF', separator: 'rgba(20, 20, 20, 0.45)', fill: 'rgba(20, 20, 20, 0.08)' },
    shadows: (scheme) => {
      const ink = scheme === 'dark' ? '#F2EEE6' : '#141414';
      return {
        card: { boxShadow: `0px 0px 0px 2px ${ink}, 4px 5px 0px 2px ${ink}` },
        plate: { boxShadow: `0px 0px 0px 2px ${ink}, 4px 5px 0px 2px ${ink}` },
        float: { boxShadow: `0px 0px 0px 2px ${ink}, 5px 6px 0px 2px ${ink}` },
      };
    },
  },
};
