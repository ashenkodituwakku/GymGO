import { describe, expect, it } from 'vitest';
import { FREE_MAP_STYLE, MAP_STYLES, isMapStyle, mapStyleFor, mapStyleUrl } from './mapStyles';

describe('map styles', () => {
  it('loads the standard map as before, light and dark', () => {
    expect(mapStyleUrl('standard', 'light')).toBe('https://tiles.openfreemap.org/styles/liberty');
    expect(mapStyleUrl('standard', 'dark')).toBe('https://tiles.openfreemap.org/styles/dark');
  });

  it('uses the dark map in dark mode for every style but Deep blue, which is dark either way', () => {
    expect(mapStyleUrl('muted', 'light')).toBe('https://tiles.openfreemap.org/styles/positron');
    expect(mapStyleUrl('classic', 'light')).toBe('https://tiles.openfreemap.org/styles/bright');
    expect(mapStyleUrl('muted', 'dark')).toBe('https://tiles.openfreemap.org/styles/dark');
    expect(mapStyleUrl('deep', 'light')).toBe('https://tiles.openfreemap.org/styles/fiord');
    expect(mapStyleUrl('deep', 'dark')).toBe('https://tiles.openfreemap.org/styles/fiord');
  });

  it('keeps every style but Standard for Pro', () => {
    expect(mapStyleFor('deep', true)).toBe('deep');
    expect(mapStyleFor('deep', false)).toBe(FREE_MAP_STYLE);
    expect(mapStyleFor('standard', false)).toBe('standard');
  });

  it('knows its own names, and nothing else', () => {
    expect(MAP_STYLES.map((style) => style.id)).toEqual(['standard', 'muted', 'classic', 'deep']);
    expect(isMapStyle('muted')).toBe(true);
    expect(isMapStyle('satellite')).toBe(false);
    expect(isMapStyle(undefined)).toBe(false);
  });
});
