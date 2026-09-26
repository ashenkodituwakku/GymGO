/**
 * One side of a loaded barbell, side on: the collar, then the plates from
 * heaviest (nearest the collar) outwards, each drawn to its plate's size.
 * A diagram of the load worked out on the Plates screen, not a picture of a
 * real bar; the plates' numbers are listed beside it, and screen readers get
 * them from the card, so the drawing itself is hidden from them.
 */

import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { color } from '@/lib/theme';
import type { WeightUnit } from '@/lib/training';

const WIDTH = 320;
const HEIGHT = 112;
const MIDDLE = HEIGHT / 2;
const COLLAR = 104;
const SLEEVE_START = COLLAR + 8;
const SLEEVE_END = WIDTH - 4;

/** Each plate's height and thickness, as a share of the largest, by weight. */
const SIZES: Record<WeightUnit, Record<string, { height: number; thickness: number }>> = {
  kg: {
    25: { height: 1, thickness: 16 },
    20: { height: 1, thickness: 14 },
    15: { height: 0.86, thickness: 12 },
    10: { height: 0.72, thickness: 10 },
    5: { height: 0.54, thickness: 8 },
    2.5: { height: 0.42, thickness: 6 },
    1.25: { height: 0.34, thickness: 5 },
  },
  lb: {
    45: { height: 1, thickness: 16 },
    35: { height: 0.9, thickness: 14 },
    25: { height: 0.78, thickness: 11 },
    10: { height: 0.6, thickness: 9 },
    5: { height: 0.48, thickness: 7 },
    2.5: { height: 0.38, thickness: 6 },
  },
};

export function BarDiagram({ plates, unit }: { plates: number[]; unit: WeightUnit }) {
  const sizes = plates.map((plate) => SIZES[unit][String(plate)] ?? { height: 0.4, thickness: 6 });
  const gap = 2;
  const room = SLEEVE_END - SLEEVE_START - 4;
  const needed = sizes.reduce((sum, size) => sum + size.thickness + gap, 0);
  // A very heavy bar thins its plates to fit the sleeve rather than run off it.
  const squeeze = needed > room ? room / needed : 1;
  let x = SLEEVE_START + 2;

  return (
    <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet">
        {/* The grip, cut off to the left: the other side is the same. */}
        <Rect x={0} y={MIDDLE - 3} width={COLLAR} height={6} rx={3} fill={color.labelTertiary} />
        <Rect x={COLLAR} y={MIDDLE - 10} width={8} height={20} rx={2} fill={color.labelSecondary} />
        <Rect x={SLEEVE_START} y={MIDDLE - 6} width={SLEEVE_END - SLEEVE_START} height={12} rx={3} fill={color.labelTertiary} />
        {sizes.map((size, index) => {
          const thickness = Math.max(2, size.thickness * squeeze);
          const height = size.height * (HEIGHT - 8);
          const plate = (
            <Rect
              key={index}
              x={x}
              y={MIDDLE - height / 2}
              width={thickness}
              height={height}
              rx={Math.min(3, thickness / 2)}
              fill={color.brand}
              opacity={index % 2 === 0 ? 1 : 0.78}
            />
          );
          x += thickness + gap * squeeze;
          return plate;
        })}
      </Svg>
    </View>
  );
}
