import { describe, expect, it, vi } from 'vitest';

vi.mock('./fonts', () => ({ BUNDLED_FACES: {} }));
vi.mock('./lookFonts', () => ({ loadLookFonts: async () => undefined, loadAllLookFonts: async () => undefined }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: async () => null, setItem: async () => undefined } }));

const { DEFAULT_CHOICE, parseChoice, schemeFor } = await import('./themePrefs');

describe('your appearance', () => {
  it('reads what was kept, and falls back rather than trusting odd values', () => {
    // Kept before looks existed: the standard look.
    expect(parseChoice(JSON.stringify({ appearance: 'dark', accent: 'ocean' }))).toEqual({ ...DEFAULT_CHOICE, appearance: 'dark', accent: 'ocean', look: 'standard', glass: 50, dark: 'black' });
    expect(parseChoice(JSON.stringify({ appearance: 'light', accent: 'camo', look: 'pixel', glass: 80 }))).toEqual({ ...DEFAULT_CHOICE, appearance: 'light', accent: 'camo', look: 'pixel', glass: 80, dark: 'black' });
    expect(parseChoice(JSON.stringify({ appearance: 'dark', dark: 'dim' })).dark).toBe('dim');
    expect(parseChoice(JSON.stringify({ dark: 'grey' })).dark).toBe('black');
    expect(parseChoice(JSON.stringify({ appearance: 'sepia', accent: 'neon', look: 'vaporwave' }))).toEqual(DEFAULT_CHOICE);
    expect(parseChoice('not json')).toEqual(DEFAULT_CHOICE);
    expect(parseChoice(null)).toEqual(DEFAULT_CHOICE);
  });

  it('keeps Liquid Glass to whole steps from 0 to 100, and the balance for anything odd', () => {
    const glass = (value: unknown) => parseChoice(JSON.stringify({ glass: value })).glass;
    expect(glass(0)).toBe(0);
    expect(glass(100)).toBe(100);
    expect(glass(73)).toBe(75);
    expect(glass(140)).toBe(100);
    expect(glass(-20)).toBe(0);
    expect(glass('clear')).toBe(50);
    expect(glass(null)).toBe(50);
  });

  it('follows the phone only when set to Automatic', () => {
    expect(schemeFor('system', 'dark')).toBe('dark');
    expect(schemeFor('system', 'light')).toBe('light');
    expect(schemeFor('system', null)).toBe('light');
    expect(schemeFor('light', 'dark')).toBe('light');
    expect(schemeFor('dark', 'light')).toBe('dark');
  });

  it('keeps Neon dark whatever the setting', () => {
    expect(schemeFor('light', 'light', 'neon')).toBe('dark');
    expect(schemeFor('system', 'light', 'neon')).toBe('dark');
    expect(schemeFor('light', 'dark', 'classic')).toBe('light');
  });
});

describe('your adjustments', () => {
  it('keeps text size, bold text, corners, your own colour, the clock and GymPal’s side, and falls back for anything odd', () => {
    const kept = parseChoice(JSON.stringify({ accent: 'custom', textSize: 'larger', bold: true, corners: 'round', customHue: 725, clock24: true, gymPalSide: 'left' }));
    expect(kept).toMatchObject({ accent: 'custom', textSize: 'larger', bold: true, corners: 'round', customHue: 5, clock24: true, gymPalSide: 'left' });
    const odd = parseChoice(JSON.stringify({ textSize: 'huge', bold: 'yes', corners: 'wavy', customHue: 'red', clock24: 1, gymPalSide: 'top' }));
    expect(odd).toMatchObject({ textSize: 'default', bold: false, corners: 'standard', customHue: DEFAULT_CHOICE.customHue, clock24: false, gymPalSide: 'right' });
    expect(parseChoice(JSON.stringify({ customHue: -30 })).customHue).toBe(330);
  });
});
