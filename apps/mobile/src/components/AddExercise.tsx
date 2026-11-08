/**
 * Adding an exercise to a workout in progress: a search by name or muscle,
 * or, with nothing typed, moves for the muscles the workout already trains
 * (lib/exerciseLibrary.ts addableExercises). The one picked joins the end
 * of the workout, planned as the builder would plan it. Your own exercises
 * (Pro) are offered with GymGO's; at the foot, a way to make one.
 */

import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type ViewInstance } from 'react-native';
import { addableExercises, kitShort, kitText } from '@/lib/exerciseLibrary';
import { haptic } from '@/lib/haptics';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { useApp } from '@/lib/app-state';
import { useOwnTraining } from '@/lib/ownTraining';
import { EXERCISES, ownExercises, type Exercise } from '@/lib/workout';
import { ExerciseTile } from './ExerciseGlyph';
import { Icon } from './Icon';
import { Pressable } from './motion';
import { Input, PrimaryButton, Txt } from './ui';

export function AddExercise({ inWorkout, onAdd }: { inWorkout: string[]; onAdd: (exercise: Exercise) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { billing, openPro } = useApp();
  // Yours first, then GymGO's; read again when yours change.
  const own = useOwnTraining();
  const pool = useMemo(() => [...ownExercises(), ...EXERCISES], [own]);
  const found = useMemo(() => addableExercises(query, inWorkout, 8, pool), [query, inWorkout, pool]);
  // Closing hands keyboard focus back to the button that opened it, rather than to the page.
  const button = useRef<ViewInstance>(null);
  const close = () => {
    setOpen(false);
    setQuery('');
    requestAnimationFrame(() => (button.current as unknown as { focus?: () => void } | null)?.focus?.());
  };

  if (!open) {
    return (
      <PrimaryButton
        focusRef={button}
        label="Add an exercise"
        icon="plus"
        tone="quiet"
        onPress={() => {
          haptic.tap();
          setOpen(true);
        }}
      />
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Txt variant="headline" style={styles.flex}>
          Add an exercise
        </Txt>
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close, adding nothing" hitSlop={10} style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }]}>
          <Icon name="close" size={14} color={color.labelSecondary} />
        </Pressable>
      </View>
      <View style={styles.search}>
        <Icon name="search" size={16} color={color.labelSecondary} />
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or muscle"
          accessibilityLabel="Search exercises to add, by name or muscle"
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={styles.input}
        />
      </View>
      <Txt variant="eyebrow" color={color.labelSecondary}>
        {query.trim() ? (found.length ? 'MATCHES' : 'NO MATCHES') : 'FOR THE MUSCLES YOU’RE TRAINING'}
      </Txt>
      {query.trim() !== '' && found.length === 0 && (
        <Txt variant="footnote" color={color.labelSecondary}>
          No exercise matches. Try fewer letters, or a muscle, like “back”.
        </Txt>
      )}
      <View>
        {found.map((exercise, index) => (
          <Pressable
            key={exercise.id}
            onPress={() => {
              haptic.success();
              onAdd(exercise);
              close();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Add ${exercise.name}. ${kitText(exercise)}`}
            style={({ pressed }) => [styles.row, index > 0 && styles.line, pressed && { backgroundColor: color.fill }]}
          >
            <ExerciseTile exerciseId={exercise.id} size={36} />
            <View style={styles.flex}>
              <Txt variant="subhead" style={face('semibold')} numberOfLines={2}>
                {exercise.name}
              </Txt>
              <Txt variant="caption" color={color.labelSecondary} numberOfLines={1}>
                {kitShort(exercise)}
              </Txt>
            </View>
            <Icon name="plus" size={16} color={color.brand} />
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={() => {
          haptic.select();
          if (!billing.isPro) return openPro('exercises');
          router.push('/exercise-edit');
        }}
        accessibilityRole="button"
        accessibilityLabel={billing.isPro ? 'Make an exercise of your own' : 'Making your own exercises is part of GymGO Pro'}
        style={({ pressed }) => [styles.make, pressed && { opacity: 0.6 }]}
      >
        <Icon name="plus" size={13} color={color.brand} />
        <Txt variant="footnote" color={color.brand} style={face('semibold')}>
          {billing.isPro ? 'Not here? Make your own exercise' : 'Not here? Make your own exercise · Pro'}
        </Txt>
      </Pressable>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    card: { gap: space[2], padding: space[4], borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
    head: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: color.fill },
    search: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[3], minHeight: 44, borderRadius: radius.pill, backgroundColor: color.fill },
    input: { flex: 1, minWidth: 0, fontSize: 17, paddingVertical: space[2], color: color.label, borderWidth: 0 },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2], paddingHorizontal: space[1], borderRadius: radius.md },
    line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
    flex: { flex: 1, minWidth: 0 },
    make: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: space[1] },
  }),
);
