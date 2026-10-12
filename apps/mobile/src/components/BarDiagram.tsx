/**
 * One side of a loaded barbell, side on: the collar, then the plates from
 * heaviest (nearest the collar) outwards, each drawn to its plate's size
 * in the colour plates of that weight usually are (red 25 kg, blue 20,
 * yellow 15, green 10, white 5; small change plates are steel), on a bar
 * lit from above.
 * A diagram of the load worked out on the Plates screen, not a picture of a
 * real bar; the plates' numbers are listed beside it, and screen readers get
 * them from the card, so the drawing itself is hidden from them.
 */

import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { mix } from '@/lib/looks';
import { color, currentTheme } from '@/lib/theme';
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
    2: { height: 0.4, thickness: 5 },
    1.25: { height: 0.34, thickness: 5 },
    1: { height: 0.32, thickness: 4 },
    0.5: { height: 0.28, thickness: 3 },
  },
  lb: {
    55: { height: 1, thickness: 18 },
    45: { height: 1, thickness: 16 },
    35: { height: 0.9, thickness: 14 },
    25: { height: 0.78, thickness: 11 },
    15: { height: 0.68, thickness: 10 },
    10: { height: 0.6, thickness: 9 },
    5: { height: 0.48, thickness: 7 },
    2.5: { height: 0.38, thickness: 6 },
    1.25: { height: 0.32, thickness: 5 },
  },
};

const RED = '#D63B3B';
const BLUE = '#2D6CD2';
const YELLOW = '#EDBE2F';
const GREEN = '#36A15A';
const WHITE = '#F2F2F2';
const STEEL = '#A7ADB5';

/** The colour plates of each weight usually come in (bumper plates' colours in pounds). */
const COLOURS: Record<WeightUnit, Record<string, string>> = {
  kg: { 25: RED, 20: BLUE, 15: YELLOW, 10: GREEN, 5: WHITE, 2.5: RED, 2: BLUE, 1.5: YELLOW, 1: GREEN, 0.5: WHITE },
  lb: { 55: RED, 45: BLUE, 35: YELLOW, 25: GREEN, 10: WHITE },
};

/** A plate's colour, for the diagram and the list beside it. */
export const plateColour = (plate: number, unit: WeightUnit): string => COLOURS[unit][String(plate)] ?? STEEL;

/** Outlines for a bar with nothing typed yet: where the plates will go. */
const GHOST: Record<WeightUnit, number[]> = { kg: [20, 10, 5], lb: [45, 25, 10] };

export function BarDiagram({ plates, unit, ghost = false }: { plates: number[]; unit: WeightUnit; ghost?: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const dark = currentTheme().scheme === 'dark';
  const outlined = ghost && plates.length === 0;
  const shown = outlined ? GHOST[unit] : plates;
  const sizes = shown.map((plate) => SIZES[unit][String(plate)] ?? { height: 0.4, thickness: 6 });
  const gap = 2;
  const room = SLEEVE_END - SLEEVE_START - 4;
  const needed = sizes.reduce((sum, size) => sum + size.thickness + gap, 0);
  // A very heavy bar thins its plates to fit the sleeve rather than run off it.
  const squeeze = needed > room ? room / needed : 1;
  let x = SLEEVE_START + 2;
  // Brushed steel, lit from above; a little darker in dark mode so it doesn't glare.
  const steel = dark ? ['#9AA0A8', '#6B7078', '#4A4E55'] : ['#E9ECEF', '#B3B8BF', '#868C94'];
  const colours = outlined ? [] : [...new Set(plates.map((plate) => plateColour(plate, unit)))];
  const gradient = (key: string, top: string, middle: string, bottom: string) => (
    <LinearGradient key={key} id={`${key}${id}`} x1="0" y1="0" x2="0" y2="1">
      <Stop offset="0" stopColor={top} />
      <Stop offset="0.5" stopColor={middle} />
      <Stop offset="1" stopColor={bottom} />
    </LinearGradient>
  );

  return (
    <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet">
        <Defs>
          {gradient('steel', steel[0]!, steel[1]!, steel[2]!)}
          {colours.map((fill) => gradient(`p${fill.slice(1)}`, mix(fill, '#FFFFFF', 0.32), fill, mix(fill, '#000000', 0.2)))}
        </Defs>
        {/* The grip, cut off to the left: the other side is the same. */}
        <Rect x={0} y={MIDDLE - 3} width={COLLAR} height={6} rx={3} fill={`url(#steel${id})`} />
        <Rect x={COLLAR} y={MIDDLE - 10} width={8} height={20} rx={2} fill={`url(#steel${id})`} />
        <Rect x={SLEEVE_START} y={MIDDLE - 6} width={SLEEVE_END - SLEEVE_START} height={12} rx={3} fill={`url(#steel${id})`} />
        {sizes.map((size, index) => {
          const thickness = Math.max(2, size.thickness * squeeze);
          const height = size.height * (HEIGHT - 8);
          const fill = plateColour(shown[index]!, unit);
          const plate = outlined ? (
            <Rect
              key={index}
              x={x}
              y={MIDDLE - height / 2}
              width={thickness}
              height={height}
              rx={Math.min(3, thickness / 2)}
              fill="none"
              stroke={color.labelTertiary}
              strokeWidth={1.25}
              strokeDasharray="3 3"
            />
          ) : (
            <Rect
              key={index}
              x={x}
              y={MIDDLE - height / 2}
              width={thickness}
              height={height}
              rx={Math.min(3, thickness / 2)}
              fill={`url(#p${fill.slice(1)}${id})`}
              // An edge, so a white plate shows on a white card and two of a colour stay two.
              stroke={mix(fill, '#000000', 0.32)}
              strokeOpacity={0.55}
              strokeWidth={0.75}
            />
          );
          x += thickness + gap * squeeze;
          return plate;
        })}
      </Svg>
    </View>
  );
}
