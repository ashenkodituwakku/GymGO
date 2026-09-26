import { describe, expect, it, vi } from 'vitest';

vi.mock('./fonts', () => ({ BUNDLED_FACES: {} }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: async () => null, setItem: async () => undefined } }));

const { DEFAULT_CHOICE, parseChoice, schemeFor } = await import('./themePrefs');

describe('your appearance', () => {
  it('reads what was kept, and falls back rather than trusting odd values', () => {
    expect(parseChoice(JSON.stringify({ appearance: 'dark', accent: 'ocean' }))).toEqual({ appearance: 'dark', accent: 'ocean' });
    expect(parseChoice(JSON.stringify({ appearance: 'sepia', accent: 'neon' }))).toEqual(DEFAULT_CHOICE);
    expect(parseChoice('not json')).toEqual(DEFAULT_CHOICE);
    expect(parseChoice(null)).toEqual(DEFAULT_CHOICE);
  });

  it('follows the phone only when set to Automatic', () => {
    expect(schemeFor('system', 'dark')).toBe('dark');
    expect(schemeFor('system', 'light')).toBe('light');
    expect(schemeFor('system', null)).toBe('light');
    expect(schemeFor('light', 'dark')).toBe('light');
    expect(schemeFor('dark', 'light')).toBe('dark');
  });
});
