/**
 * Design tokens shared by the web app and, later, the native clients.
 *
 * The web stylesheet (apps/web/src/app/globals.css) expresses these as CSS
 * custom properties; this file is the platform-neutral source, in points, so
 * an Expo or SwiftUI client can use the same scale without translating CSS.
 *
 * The palette is apple.com's web palette rather than raw iOS system values.
 * iOS `secondaryLabel` on white is about 3.4:1, which fails WCAG AA for body
 * text; #6E6E73 reads the same and is 5:1. Every text colour here passes AA on
 * the surface it is meant for, in both appearances. Native clients should
 * still prefer the platform's own semantic colours where one exists, and use
 * these where they must match the web exactly (evidence states, accent).
 */

export interface Palette {
  label: string;
  labelSecondary: string;
  /** Decoration and large text only: below 4.5:1 on some surfaces. */
  labelTertiary: string;

  background: string;
  backgroundElevated: string;
  backgroundElevated2: string;

  fill: string;
  fillStrong: string;

  separator: string;
  separatorStrong: string;

  accent: string;
  accentText: string;
  accentTint: string;

  /** Evidence states. Green is earned, orange is normal, grey is a dead end. */
  confirmed: string;
  confirmedTint: string;
  unconfirmed: string;
  unconfirmedTint: string;
  ruledOut: string;
  ruledOutTint: string;
  danger: string;
  dangerTint: string;

  materialBar: string;
  materialThick: string;
  materialRegular: string;
}

export const light: Palette = {
  label: '#1d1d1f',
  labelSecondary: '#6e6e73',
  labelTertiary: '#86868b',

  background: '#f5f5f7',
  backgroundElevated: '#ffffff',
  backgroundElevated2: '#fbfbfd',

  fill: 'rgba(118, 118, 128, 0.12)',
  fillStrong: 'rgba(118, 118, 128, 0.2)',

  separator: 'rgba(0, 0, 0, 0.09)',
  separatorStrong: 'rgba(0, 0, 0, 0.16)',

  accent: '#0071e3',
  accentText: '#0066cc',
  accentTint: 'rgba(0, 113, 227, 0.1)',

  confirmed: '#1f7a36',
  confirmedTint: 'rgba(52, 199, 89, 0.14)',
  unconfirmed: '#b04a00',
  unconfirmedTint: 'rgba(255, 149, 0, 0.14)',
  ruledOut: '#6e6e73',
  ruledOutTint: 'rgba(118, 118, 128, 0.12)',
  danger: '#d70015',
  dangerTint: 'rgba(255, 59, 48, 0.1)',

  materialBar: 'rgba(251, 251, 253, 0.74)',
  materialThick: 'rgba(255, 255, 255, 0.8)',
  materialRegular: 'rgba(255, 255, 255, 0.68)',
};

export const dark: Palette = {
  label: '#f5f5f7',
  labelSecondary: '#a1a1a6',
  labelTertiary: '#86868b',

  background: '#000000',
  backgroundElevated: '#1c1c1e',
  backgroundElevated2: '#2c2c2e',

  fill: 'rgba(118, 118, 128, 0.24)',
  fillStrong: 'rgba(118, 118, 128, 0.36)',

  separator: 'rgba(255, 255, 255, 0.1)',
  separatorStrong: 'rgba(255, 255, 255, 0.18)',

  accent: '#0071e3',
  accentText: '#2997ff',
  accentTint: 'rgba(41, 151, 255, 0.16)',

  confirmed: '#30d158',
  confirmedTint: 'rgba(48, 209, 88, 0.16)',
  unconfirmed: '#ff9f0a',
  unconfirmedTint: 'rgba(255, 159, 10, 0.16)',
  ruledOut: '#a1a1a6',
  ruledOutTint: 'rgba(118, 118, 128, 0.24)',
  danger: '#ff453a',
  dangerTint: 'rgba(255, 69, 58, 0.16)',

  materialBar: 'rgba(22, 22, 23, 0.72)',
  materialThick: 'rgba(28, 28, 30, 0.82)',
  materialRegular: 'rgba(28, 28, 30, 0.66)',
};

/** @deprecated Use `light` or `dark`. Kept so older imports resolve. */
export const colors = light;

/** 4-point grid. */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

/**
 * Corner radii. Nest them concentrically: an inner radius is the outer radius
 * minus the padding between them (a 20-radius card with 8 padding holds
 * 12-radius controls), which is what keeps corners looking continuous.
 */
export const radius = {
  xs: 8,
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 980,
} as const;

export interface TextStyle {
  size: number;
  lineHeight: number;
  weight: 400 | 500 | 600 | 700;
  /** Tracking in em. Display sizes run negative. */
  tracking: number;
}

/** iOS text styles at the default Dynamic Type size. */
export const text: Record<string, TextStyle> = {
  largeTitle: { size: 34, lineHeight: 41, weight: 700, tracking: -0.022 },
  title1: { size: 28, lineHeight: 34, weight: 700, tracking: -0.02 },
  title2: { size: 22, lineHeight: 28, weight: 700, tracking: -0.017 },
  title3: { size: 20, lineHeight: 25, weight: 600, tracking: -0.02 },
  headline: { size: 17, lineHeight: 22, weight: 600, tracking: -0.022 },
  body: { size: 17, lineHeight: 22, weight: 400, tracking: -0.022 },
  callout: { size: 16, lineHeight: 21, weight: 400, tracking: -0.02 },
  subhead: { size: 15, lineHeight: 20, weight: 400, tracking: -0.012 },
  footnote: { size: 13, lineHeight: 18, weight: 400, tracking: -0.006 },
  caption: { size: 12, lineHeight: 16, weight: 400, tracking: 0 },
};

export const typography = {
  /** Resolves to SF Pro on Apple platforms. SF is not licensed for web embedding. */
  text: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', 'Segoe UI', Roboto, Arial, sans-serif",
  display: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', 'Segoe UI', Roboto, Arial, sans-serif",
  mono: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace",
} as const;

/**
 * Motion. Native clients should use a real spring with these parameters
 * (SwiftUI `.spring(response:dampingFraction:)`, Reanimated `withSpring`);
 * the web approximates the same curve with CSS `linear()`.
 */
export const motion = {
  spring: { response: 0.42, dampingFraction: 0.86 },
  springSnappy: { response: 0.3, dampingFraction: 0.9 },
  durationFast: 160,
  duration: 280,
  durationSlow: 480,
  /** Press feedback on buttons and chips. */
  pressScale: 0.97,
} as const;

export const materials = {
  /** Blur radius and saturation behind translucent bars and sheets. */
  blur: 20,
  saturation: 1.8,
} as const;

export const layout = {
  headerHeight: 52,
  /** Minimum touch target, per Apple's Human Interface Guidelines. */
  minTouchTarget: 44,
  gutter: { phone: 16, tablet: 28, desktop: 40 },
} as const;

export const breakpoints = {
  /** The three widths the product is checked at. */
  phone: 390,
  tablet: 768,
  desktop: 1440,
} as const;
