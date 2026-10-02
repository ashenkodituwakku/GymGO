import { describe, expect, it, vi } from 'vitest';

vi.mock('./fonts', () => ({ BUNDLED_FACES: {} }));
vi.mock('./lookFonts', () => ({ loadLookFonts: async () => undefined, loadAllLookFonts: async () => undefined }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: async () => null, setItem: async () => undefined } }));

const { DEFAULT_CHOICE, parseChoice, schemeFor } = await import('./themePrefs');

describe('your appearance', () => {
  it('reads what was kept, and falls back rather than trusting odd values', () => {
    // Kept before looks existed: the standard look.
    expect(parseChoice(JSON.stringify({ appearance: 'dark', accent: 'ocean' }))).toEqual({ appearance: 'dark', accent: 'ocean', look: 'standard', glass: 50 });
    expect(parseChoice(JSON.stringify({ appearance: 'light', accent: 'camo', look: 'pixel', glass: 80 }))).toEqual({ appearance: 'light', accent: 'camo', look: 'pixel', glass: 80 });
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
