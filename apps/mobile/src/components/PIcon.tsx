/**
 * Phosphor icons (MIT), drawn with react-native-svg so they look the same on
 * iPhone, Android and the web. Outline and filled for the tab bar; two-tone
 * everywhere else, with the light layer in an accent colour. With Bold text
 * on (Appearance), an outline is drawn in its bold cut, so its stroke keeps
 * up with the heavier words.
 *
 * Only the icons in phosphor.ts are here; scripts/phosphor-icons.mjs adds more.
 */

import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSwapIn } from './motion';
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
  const paths = set[drawn] ?? set.duotone ?? set.regular ?? set.fill ?? [];
  // A tab's outline filling as you go to it (or any icon changing here) blurs in, in a browser.
  const swap = useSwapIn(`${name}:${weight}`);
  return (
    <View ref={swap} style={[NO_TOUCH, { width: size, height: size }]}>
    <Svg width={size} height={size} viewBox="0 0 256 256" style={NO_TOUCH}>
      {paths.map((path, index) => (
        <Path
          key={index}
          d={path.d}
          fill={path.o !== undefined && accent ? accent : color}
          opacity={path.o !== undefined ? (accent ? 0.4 : path.o) : 1}
        />
      ))}
    </Svg>
    </View>
  );
}
