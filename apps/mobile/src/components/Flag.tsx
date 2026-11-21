/**
 * A country's flag as Google's Noto 3D picture (lib/flagImages.ts,
 * assets/flags/LICENSE.txt), so it looks the same on every phone, computer
 * and the website (Windows draws flag emoji as two letters). A country with
 * no picture gets the system's own flag emoji.
 *
 * Decoration unless given a label: the row or button it sits in names the
 * country or the city.
 */

import { Image, Text } from 'react-native';
import { flagOf } from '@/lib/country';
import { FLAG_IMAGES } from '@/lib/flagImages';

const HIDDEN = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants', 'aria-hidden': true } as const;

const labelled = (label: string | undefined) => (label ? ({ accessible: true, accessibilityRole: 'image', accessibilityLabel: label } as const) : HIDDEN);

/** Whether there's a flag picture for this country. */
export const hasFlag = (code: string): boolean => Boolean(FLAG_IMAGES[code.toUpperCase()]);

export function Flag({ code, size, label }: { code: string; size: number; label?: string }) {
  const source = FLAG_IMAGES[code.toUpperCase()];
  if (source) return <Image source={source} style={{ width: size, height: size }} resizeMode="contain" {...labelled(label)} />;
  if (!/^[A-Za-z]{2}$/.test(code)) return null;
  return (
    <Text style={{ fontSize: size * 0.85, lineHeight: size }} {...labelled(label)}>
      {flagOf(code)}
    </Text>
  );
}
