/**
 * The map's style (Appearance → Map). Standard is everyone's; the rest are
 * part of GymGO Pro, like the looks.
 *
 * In a browser and on Android the map is MapLibre with OpenFreeMap's free
 * styles, so each choice is one of theirs: a light one, and the dark one in
 * dark mode (Deep blue is dark either way). An iPhone draws Apple's own map,
 * which has a muted version but nothing like Classic or Deep blue: there
 * Muted is Apple's muted map, Deep blue Apple's dark one, and Classic
 * Apple's standard map.
 *
 * The preview colours are the styles' own daytime ones (their land, water,
 * parks and roads), read from OpenFreeMap's style files, so a tile shows the
 * map it picks. Daytime even in dark mode, where all but Deep blue share
 * the one dark map and would look the same (Appearance says so).
 *
 * No React Native here, so it is unit-tested in Node.
 */

export type MapStyleId = 'standard' | 'muted' | 'classic' | 'deep';

export const FREE_MAP_STYLE: MapStyleId = 'standard';

/** What a style's tile is drawn with. */
export interface MapPalette {
  land: string;
  water: string;
  park: string;
  major: string;
  minor: string;
}

export interface MapStyle {
  id: MapStyleId;
  name: string;
  blurb: string;
  /** OpenFreeMap's style for light mode, and for dark mode. */
  light: string;
  dark: string;
  /** Apple's map type on an iPhone, and whether it's drawn dark whatever the mode. */
  apple: 'standard' | 'mutedStandard';
  appleDark: boolean;
  /** The style's daytime colours, for its tile. */
  preview: MapPalette;
}

export const MAP_STYLES: readonly MapStyle[] = [
  {
    id: 'standard',
    name: 'Standard',
    blurb: 'Streets, parks and water in their usual colours',
    light: 'liberty',
    dark: 'dark',
    apple: 'standard',
    appleDark: false,
    preview: { land: '#F8F4F0', water: '#9EBDFF', park: '#D8E8C8', major: '#FFEEAA', minor: '#FFFFFF' },
  },
  {
    id: 'muted',
    name: 'Muted',
    blurb: 'Pale greys, so the pins stand out',
    light: 'positron',
    dark: 'dark',
    apple: 'mutedStandard',
    appleDark: false,
    preview: { land: '#F2F3F0', water: '#C2C8CA', park: '#E6E9E5', major: '#FFFFFF', minor: '#E0E0E0' },
  },
  {
    id: 'classic',
    name: 'Classic',
    blurb: 'The classic OpenStreetMap look: deep green woods, orange motorways',
    light: 'bright',
    dark: 'dark',
    apple: 'standard',
    appleDark: false,
    preview: { land: '#F8F4F0', water: '#AECFE2', park: '#66AA44', major: '#FFCC88', minor: '#FFFFFF' },
  },
  {
    id: 'deep',
    name: 'Deep blue',
    blurb: 'A dark blue map, day or night',
    light: 'fiord',
    dark: 'fiord',
    apple: 'standard',
    appleDark: true,
    preview: { land: '#45516E', water: '#38435C', park: '#414863', major: '#3C4357', minor: '#5A6890' },
  },
];

const BASE = 'https://tiles.openfreemap.org/styles/';

export function isMapStyle(value: unknown): value is MapStyleId {
  return MAP_STYLES.some((style) => style.id === value);
}

export function mapStyle(id: MapStyleId): MapStyle {
  return MAP_STYLES.find((style) => style.id === id) ?? MAP_STYLES[0]!;
}

/** The style in use: yours with Pro, Standard without (a Pro style kept from before shows as Standard). */
export function mapStyleFor(id: MapStyleId, isPro: boolean): MapStyleId {
  return isPro || id === FREE_MAP_STYLE ? id : FREE_MAP_STYLE;
}

/** The OpenFreeMap style to load, in light or dark mode. */
export function mapStyleUrl(id: MapStyleId, scheme: 'light' | 'dark'): string {
  const style = mapStyle(id);
  return `${BASE}${scheme === 'dark' ? style.dark : style.light}`;
}
