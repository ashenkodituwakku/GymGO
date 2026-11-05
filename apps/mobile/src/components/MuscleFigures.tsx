/**
 * The muscles an exercise works, on the body: small figures, front and
 * back, the main muscles in the accent and the ones it works second in a
 * lighter tint. A picture of what the page says in words beside it, so it's
 * hidden from screen readers.
 */

import { View, StyleSheet } from 'react-native';
import { BodyFigure } from './body/BodyFigure';
import { useBodyGender } from '@/lib/bodyGender';
import { mix } from '@/lib/looks';
import { color } from '@/lib/theme';
import { MUSCLES, type Muscle } from '@/lib/workout';

const isMuscle = (slug: string): slug is Muscle => MUSCLES.some((muscle) => muscle.id === slug);

export function MuscleFigures({ primary, secondary, width = 48 }: { primary: readonly Muscle[]; secondary: readonly Muscle[]; width?: number }) {
  const gender = useBodyGender();
  const fillFor = (slug: string) =>
    !isMuscle(slug) ? color.bodyInert : primary.includes(slug) ? color.brand : secondary.includes(slug) ? mix(color.bodyIdle, color.brand, 0.4) : color.bodyIdle;
  return (
    <View style={styles.row} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {(['front', 'back'] as const).map((side) => (
        <BodyFigure
          key={side}
          gender={gender}
          side={side}
          width={width}
          height={width * 2}
          fillFor={fillFor}
          pickable={() => false}
          selected={() => false}
          labelFor={(slug) => slug}
          onPress={() => undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, alignItems: 'flex-start', pointerEvents: 'none' },
});
