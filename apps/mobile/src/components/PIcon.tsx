/**
 * Phosphor icons (MIT), drawn with react-native-svg so they look the same on
 * iPhone, Android and the web. Outline and filled for the tab bar; two-tone
 * everywhere else, with the light layer in an accent colour.
 *
 * Only the icons in phosphor.ts are here; scripts/phosphor-icons.mjs adds more.
 */

import Svg, { Path } from 'react-native-svg';
import { PHOSPHOR, type IconPaths } from './phosphor';

export type PhosphorName = keyof typeof PHOSPHOR;
type Weight = 'regular' | 'fill' | 'duotone';

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
  const paths = set[weight] ?? set.duotone ?? set.regular ?? set.fill ?? [];
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" pointerEvents="none">
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
