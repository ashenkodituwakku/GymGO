/**
 * One exercise in a workout: what to do, how much, and whether the gym is
 * known to have the kit for it. Used by the builder and by saved workouts.
 * In the builder it has a Swap button for another move for the same muscle.
 */

import { StyleSheet, View } from 'react-native';
import { Icon } from './Icon';
import { Pressable } from './motion';
import { color, face, radius, space, themed } from '@/lib/theme';
import { KIT_LABEL, muscleLabel, type Exercise, type Kit } from '@/lib/workout';
import { PIcon } from './PIcon';
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
  swapTo,
  onSwap,
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
  /** What Swap would put here instead; no button without one. */
  swapTo?: string | null;
  onSwap?: () => void;
}) {
  return (
    <View style={styles.exercise}>
      <View style={styles.number}>
        <Txt variant="subhead" color={color.onBrand} style={face('semibold')}>
          {index + 1}
        </Txt>
      </View>
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          <Txt variant="headline" style={styles.flex}>
            {exercise.name}
          </Txt>
          {onSwap && swapTo && <SwapButton name={exercise.name} swapTo={swapTo} onSwap={onSwap} />}
        </View>
        <Txt variant="subhead" color={color.brand} style={face('semibold')}>
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

/** Swap: another move for the same muscle (the machine's taken, or not there). */
export function SwapButton({ name, swapTo, onSwap }: { name: string; swapTo: string; onSwap: () => void }) {
  return (
    <Pressable
      onPress={onSwap}
      accessibilityRole="button"
      accessibilityLabel={`Swap ${name} for ${swapTo}`}
      hitSlop={8}
      style={({ pressed }) => [styles.swap, pressed && { opacity: 0.6 }]}
    >
      <Icon name="shuffle" size={14} color={color.brand} />
      <Txt variant="caption" color={color.brand} style={face('semibold')}>
        Swap
      </Txt>
    </Pressable>
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
      <View style={styles.kit}>
        <PIcon name="barbell" size={15} color={color.labelSecondary} accent={color.brand} />
        <Txt variant="caption" color={color.labelSecondary}>
          {names}
        </Txt>
      </View>
    );
  }
  return (
    <Txt variant="caption" color={confirmed ? color.goodInk : color.maybeInk}>
      {confirmed ? `✓ ${names}` : `? ${names} (not confirmed here)`}
    </Txt>
  );
}

const styles = themed(() => StyleSheet.create({
  flex: { flex: 1 },
  exercise: {
    flexDirection: 'row',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    backgroundColor: color.card,
  },
  number: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: color.brandFill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  swap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space[2] + 2,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: color.brandTint,
  },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2], marginTop: space[2] },
  kit: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tag: { paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.pill, backgroundColor: color.brandTint },
}));
