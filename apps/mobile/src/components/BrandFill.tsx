/**
 * The paint a special accent puts on filled buttons, selected chips and the
 * tab bar: Rainbow's gradient, or Camo's pattern. Laid behind a control's
 * content, clipped to its corners (the control needs `overflow: 'hidden'`,
 * or pass `round`). With an ordinary accent it draws nothing, and the
 * control's own brand colour shows.
 *
 * Both are decoration on controls, never a stand-in for a photo or a gym.
 */

import { useId } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { NO_TOUCH, currentPaint, type AccentPaint } from '@/lib/theme';

// Web takes CSS `backgroundImage`; React Native's own renderer takes `experimental_backgroundImage`.
const image = (value: string): ViewStyle =>
  (Platform.OS === 'web' ? { backgroundImage: value } : { experimental_backgroundImage: value }) as ViewStyle;

/** Woodland blobs on a 90-point tile that repeats without seams showing much. */
const BLOBS: Array<[number, string]> = [
  [1, 'M5 10 Q20 0 35 8 Q45 18 30 26 Q15 32 8 22 Z'],
  [2, 'M50 5 Q70 2 80 15 Q72 28 58 22 Q46 16 50 5 Z'],
  [3, 'M20 40 Q38 34 46 48 Q40 62 24 58 Q10 52 20 40 Z'],
  [1, 'M60 40 Q80 36 88 52 Q84 68 66 64 Q52 56 60 40 Z'],
  [2, 'M8 68 Q22 62 30 74 Q26 88 12 86 Q2 78 8 68 Z'],
  [3, 'M44 72 Q60 66 70 78 Q66 90 50 88 Q38 82 44 72 Z'],
  [2, 'M34 24 Q44 22 48 30 Q44 38 36 34 Q30 30 34 24 Z'],
];

export function BrandFill({
  opacity = 1,
  paint: given,
  round,
}: {
  opacity?: number;
  /** Another accent's paint (the Appearance swatches); the current one's by default. */
  paint?: AccentPaint | null;
  /** Clip to these corners, for a control that can't clip its own (it would clip its shadow). */
  round?: number;
}) {
  const id = `camo${useId().replace(/[^a-z0-9]/gi, '')}`;
  const paint = given === undefined ? currentPaint() : given;
  if (!paint) return null;
  const layer = [NO_TOUCH, StyleSheet.absoluteFill, { opacity }, round !== undefined && { borderRadius: round, overflow: 'hidden' as const }];
  if (paint.kind === 'gradient') {
    return (
      <View style={layer}>
        <View style={[StyleSheet.absoluteFill, image(`linear-gradient(100deg, ${paint.stops.join(', ')})`)]} />
        {/* A little shade over the brightest bands (the yellow), so white text still reads. */}
        <View style={[StyleSheet.absoluteFill, styles.shade]} />
      </View>
    );
  }
  const [base, ...rest] = paint.colors;
  return (
    <View style={layer}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} patternUnits="userSpaceOnUse" width={90} height={90}>
            <Rect width={90} height={90} fill={base} />
            {BLOBS.map(([shade, d], index) => (
              <Path key={index} d={d} fill={rest[(shade - 1) % rest.length]} />
            ))}
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  shade: { backgroundColor: 'rgba(0, 0, 0, 0.2)' },
});
