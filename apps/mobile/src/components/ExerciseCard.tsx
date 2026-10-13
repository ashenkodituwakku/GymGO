/**
 * One exercise in a workout: its icon, what to do and how much, and whether
 * the gym is known to have the kit for it. Used by the builder and by saved
 * workouts. In the builder it has a Swap button for another move for the
 * same muscle.
 */

import { StyleSheet, View } from 'react-native';
import { Icon } from './Icon';
import { Pressable } from './motion';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { KIT_LABEL, muscleLabel, type Exercise, type Kit } from '@/lib/workout';
import { repsMeasure } from '@/lib/workoutStats';
import { ExerciseTile } from './ExerciseGlyph';
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
  const muscles = exercise.primary.map(muscleLabel).join(' · ');
  return (
    <View style={styles.exercise}>
      <View style={styles.top}>
        {/* A few reps as the plan opens, then still: a long plan's every icon
            looping on and on, off screen too, kept a phone busy for nothing.
            In a workout, the exercise you're on keeps moving (train.tsx). */}
        <ExerciseTile exerciseId={exercise.id} size={58} moving delay={(index % 4) * 450} reps={PLAN_REPS} />
        <View style={styles.flex}>
          <Txt variant="eyebrow" color={color.brand} numberOfLines={1}>
            {`${String(index + 1).padStart(2, '0')}  ·  ${exercise.cardio ? 'FINISHER' : muscles.toUpperCase()}`}
          </Txt>
          <View style={styles.titleRow}>
            <Txt variant="headline" style={styles.flex}>
              {exercise.name}
            </Txt>
            {onSwap && swapTo && <SwapButton name={exercise.name} swapTo={swapTo} onSwap={onSwap} />}
          </View>
        </View>
      </View>
      {exercise.cardio ? (
        <Txt variant="subhead" color={color.label} style={[styles.finisher, face('medium')]}>
          {exercise.cue}
        </Txt>
      ) : (
        <>
          <Specs sets={sets} reps={reps} restSeconds={restSeconds} />
          <Txt variant="footnote" color={color.labelSecondary}>
            {exercise.cue}
          </Txt>
        </>
      )}
      <KitUsed uses={uses} confirmed={confirmed} forGym={forGym} />
    </View>
  );
}

/** How many reps a plan's icons show before they rest. */
const PLAN_REPS = 3;

/** Sets, reps and rest side by side, the numbers large. */
export function Specs({ sets, reps, restSeconds }: { sets: number; reps: string; restSeconds: number }) {
  // A hold's or a carry's second number is a time or a distance, not reps.
  const measure = repsMeasure(reps);
  const cells = [
    { value: String(sets), label: sets === 1 ? 'set' : 'sets' },
    { value: reps, label: measure.label },
    { value: restSeconds ? `${restSeconds} s` : '—', label: 'rest' },
  ];
  return (
    <View style={styles.specs} accessible accessibilityLabel={`${sets} ${cells[0]!.label} of ${measure.spoken}${restSeconds ? `, ${restSeconds} seconds rest` : ''}`}>
      {cells.map((cell, at) => (
        <View key={cell.label} style={[styles.spec, at > 0 && styles.specLine]}>
          <Txt variant="headline" style={styles.specValue} numberOfLines={1}>
            {cell.value}
          </Txt>
          <Txt variant="caption" color={color.labelSecondary}>
            {cell.label}
          </Txt>
        </View>
      ))}
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
  flex: { flex: 1, minWidth: 0 },
  exercise: {
    gap: space[3],
    padding: space[4],
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    backgroundColor: color.plate,
    ...shadow.plate,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2], marginTop: 2 },
  swap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space[2] + 2,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: color.brandTint,
  },
  specs: { flexDirection: 'row', borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: color.fill, paddingVertical: space[2] },
  spec: { flex: 1, alignItems: 'center', gap: 1, paddingHorizontal: space[1] },
  specLine: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: color.separator },
  specValue: { fontVariant: ['tabular-nums'] },
  finisher: { paddingVertical: space[2], paddingHorizontal: space[3], borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: color.fill, overflow: 'hidden' },
  kit: { flexDirection: 'row', alignItems: 'center', gap: 4 },
}));
