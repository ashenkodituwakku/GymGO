/**
 * One exercise in a workout: what to do, how much, and whether the gym is
 * known to have the kit for it. Used by the builder and by saved workouts.
 */

import { StyleSheet, View } from 'react-native';
import { color, face, radius, space } from '@/lib/theme';
import { KIT_LABEL, muscleLabel, type Exercise, type Kit } from '@/lib/workout';
import { Txt } from './ui';

export function ExerciseCard({
  index,
  exercise,
  sets,
  reps,
  restSeconds,
  uses,
  confirmed,
  forGym,
}: {
  index: number;
  exercise: Exercise;
  sets: number;
  reps: string;
  restSeconds: number;
  uses: Kit[];
  confirmed: boolean;
  /** Built for a particular gym, so kit is marked confirmed or not. */
  forGym: boolean;
}) {
  return (
    <View style={styles.exercise}>
      <View style={styles.number}>
        <Txt variant="subhead" color={color.onBrand} style={face('bold')}>
          {index + 1}
        </Txt>
      </View>
      <View style={styles.flex}>
        <Txt variant="headline">{exercise.name}</Txt>
        <Txt variant="subhead" color={color.brand} style={face('bold')}>
          {exercise.cardio ? 'Finisher' : `${sets} × ${reps} · rest ${restSeconds} s`}
        </Txt>
        <Txt variant="footnote" color={color.labelSecondary}>
          {exercise.cue}
        </Txt>
        <View style={styles.meta}>
          {exercise.primary.map((muscle) => (
            <View key={muscle} style={styles.tag}>
              <Txt variant="caption" color={color.brand}>
                {muscleLabel(muscle)}
              </Txt>
            </View>
          ))}
          <KitUsed uses={uses} confirmed={confirmed} forGym={forGym} />
        </View>
      </View>
    </View>
  );
}

function KitUsed({ uses, confirmed, forGym }: { uses: Kit[]; confirmed: boolean; forGym: boolean }) {
  const names = uses.map((kit) => KIT_LABEL[kit] ?? kit).join(' + ');
  if (uses.length === 0) {
    return (
      <Txt variant="caption" color={color.goodInk}>
        ✓ Body weight
      </Txt>
    );
  }
  if (!forGym) {
    return (
      <Txt variant="caption" color={color.labelSecondary}>
        🏋️ {names}
      </Txt>
    );
  }
  return (
    <Txt variant="caption" color={confirmed ? color.goodInk : color.maybeInk}>
      {confirmed ? `✓ ${names}` : `? ${names} (not confirmed here)`}
    </Txt>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  exercise: {
    flexDirection: 'row',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    backgroundColor: color.background,
  },
  number: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: color.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2], marginTop: space[2] },
  tag: { paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.pill, backgroundColor: color.brandTint },
});
