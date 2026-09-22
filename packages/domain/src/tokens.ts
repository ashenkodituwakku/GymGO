/**
 * Design tokens shared by the web app and, later, the Expo clients.
 *
 * One restrained accent (deep sea green) carries interactive elements. The
 * evidence palette is deliberately quiet: "needs confirmation" is the most
 * common state in an honest dataset, so it must not look like an error.
 */

export const colors = {
  ink: '#101820',
  inkMuted: '#4a5866',
  inkFaint: '#6d7c8a',
  surface: '#ffffff',
  surfaceMuted: '#f4f6f7',
  surfaceSunken: '#eceff1',
  border: '#d7dee3',
  borderStrong: '#b6c2ca',

  accent: '#0d6a5f',
  accentHover: '#0a564d',
  accentSoft: '#e4f1ee',
  accentContrast: '#ffffff',

  /** Evidence states. Green is earned, amber is normal, grey is a dead end. */
  confirmed: '#1c6b3f',
  confirmedSoft: '#e5f2ea',
  unconfirmed: '#8a5a00',
  unconfirmedSoft: '#fdf1dc',
  ruledOut: '#5b6770',
  ruledOutSoft: '#eef1f3',
  warning: '#9a3412',
  warningSoft: '#fdeee7',

  focus: '#0b5fff',
} as const;

export const space = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '48px',
} as const;

export const radius = {
  sm: '6px',
  md: '10px',
  lg: '14px',
  pill: '999px',
} as const;

export const typography = {
  /** System stack: fast first paint, no third-party font request. */
  sans: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  scale: {
    xs: '12px',
    sm: '13px',
    base: '15px',
    md: '17px',
    lg: '21px',
    xl: '27px',
    '2xl': '34px',
  },
} as const;

export const breakpoints = {
  /** The three widths the product is checked at. */
  phone: 390,
  tablet: 768,
  desktop: 1440,
} as const;

export const elevation = {
  card: '0 1px 2px rgba(16, 24, 32, 0.06), 0 1px 3px rgba(16, 24, 32, 0.04)',
  sheet: '0 -2px 16px rgba(16, 24, 32, 0.12)',
  popover: '0 4px 20px rgba(16, 24, 32, 0.14)',
} as const;
