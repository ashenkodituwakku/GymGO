/**
 * Phosphor icons (MIT), drawn with react-native-svg so they look the same on
 * iPhone, Android and the web. Outline and filled for the tab bar; two-tone
 * everywhere else, with the light layer in an accent colour. With Bold text
 * on (Appearance), an outline is drawn in its bold cut, so its stroke keeps
 * up with the heavier words.
 *
 * Only the icons in phosphor.ts are here; scripts/phosphor-icons.mjs adds more.
 */

import { Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { iconMotion, isArt } from '@/lib/iconHover';
import { ART } from './iconArt';
import { PHOSPHOR, type IconPaths } from './phosphor';
import { NO_TOUCH, boldText } from '@/lib/theme';

export type PhosphorName = keyof typeof PHOSPHOR;
type Weight = 'regular' | 'bold' | 'fill' | 'duotone';

export function PIcon({
  name,
  weight = 'duotone',
  size = 22,
  color,
  accent,
}: {
  name: PhosphorName;
  weight?: Weight;
  size?: number;
  color: string;
  /** Colour of a two-tone icon's light layer; the main colour if unset. */
  accent?: string;
}) {
  const set = PHOSPHOR[name] as Partial<Record<Weight, IconPaths>>;
  // An outline's stroke matches the words beside it: with Bold text on, its bold cut, as the words go a step heavier.
  const drawn = weight === 'regular' && boldText() && set.bold ? 'bold' : weight;
  // In a browser, an outline drawn in parts plays its own scene under the mouse (iconArt.tsx, lib/iconHover.ts).
  if (Platform.OS === 'web' && (drawn === 'regular' || drawn === 'bold') && isArt(name)) {
    return (
      <Svg width={size} height={size} viewBox="0 0 256 256" style={NO_TOUCH} {...({ 'data-gg-icon': 'art', 'data-gg-art': name } as object)}>
        {ART[name](color, drawn === 'bold' ? 24 : 16)}
      </Svg>
    );
  }
  const paths = set[drawn] ?? set.duotone ?? set.regular ?? set.fill ?? [];
  // No blur-in when it changes (Icon has one): these are the tab bar's and the sidebar's, which change on
  // every move, and what's used most should animate least.
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" style={NO_TOUCH} {...(Platform.OS === 'web' ? ({ 'data-gg-icon': iconMotion(name) } as object) : null)}>
      {paths.map((path, index) => (
        <Path
          key={index}
          d={path.d}
          fill={path.o !== undefined && accent ? accent : color}
          opacity={path.o !== undefined ? (accent ? 0.4 : path.o) : 1}
        />
      ))}
    </Svg>
  );
}
