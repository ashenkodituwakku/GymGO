/**
 * Small figures of the body, front and back, to show at a glance what the
 * words beside them say: the muscles an exercise works (MuscleFigures), or
 * when you last trained each one (Home's Muscles trained). Only a picture
 * of those words, so hidden from screen readers, and not tappable.
 */

import { View, StyleSheet } from 'react-native';
import { BodyFigure } from './body/BodyFigure';
import { inertFill } from './body/shapes';
import { useBodyGender } from '@/lib/bodyGender';
import { mix } from '@/lib/looks';
import { color } from '@/lib/theme';
import { MUSCLES, type Muscle } from '@/lib/workout';

const isMuscle = (slug: string): slug is Muscle => MUSCLES.some((muscle) => muscle.id === slug);

/** The figures, each muscle in the colour `fillFor` gives it (the body's idle grey if none). */
export function SmallFigures({ fillFor, width = 48 }: { fillFor: (muscle: Muscle) => string | undefined; width?: number }) {
  const gender = useBodyGender();
  const fill = (slug: string) => (isMuscle(slug) ? (fillFor(slug) ?? color.bodyIdle) : inertFill(slug));
  return (
    <View style={styles.row} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {(['front', 'back'] as const).map((side) => (
        <BodyFigure
          key={side}
          gender={gender}
          side={side}
          width={width}
          height={width * 2}
          fillFor={fill}
          pickable={() => false}
          selected={() => false}
          labelFor={(slug) => slug}
          onPress={() => undefined}
        />
      ))}
    </View>
  );
}

/** What an exercise works: the main muscles in the accent, the ones it works second in a lighter tint. */
export function MuscleFigures({ primary, secondary, width = 48 }: { primary: readonly Muscle[]; secondary: readonly Muscle[]; width?: number }) {
  return (
    <SmallFigures
      width={width}
      fillFor={(muscle) => (primary.includes(muscle) ? color.brand : secondary.includes(muscle) ? mix(color.bodyIdle, color.brand, 0.4) : undefined)}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, alignItems: 'flex-start', pointerEvents: 'none' },
});
