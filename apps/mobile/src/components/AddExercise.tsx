/**
 * Adding an exercise to a workout in progress: a search by name or muscle,
 * or, with nothing typed, moves for the muscles the workout already trains
 * (lib/exerciseLibrary.ts addableExercises). The one picked joins the end
 * of the workout, planned as the builder would plan it.
 */

import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { addableExercises, kitText } from '@/lib/exerciseLibrary';
import { haptic } from '@/lib/haptics';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import type { Exercise } from '@/lib/workout';
import { ExerciseTile } from './ExerciseGlyph';
import { Icon } from './Icon';
import { Pressable } from './motion';
import { Input, PrimaryButton, Txt } from './ui';

export function AddExercise({ inWorkout, onAdd }: { inWorkout: string[]; onAdd: (exercise: Exercise) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const found = useMemo(() => addableExercises(query, inWorkout, 8), [query, inWorkout]);
  const close = () => {
    setOpen(false);
    setQuery('');
  };

  if (!open) {
    return (
      <PrimaryButton
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
                {kitText(exercise)}
              </Txt>
            </View>
            <Icon name="plus" size={16} color={color.brand} />
          </Pressable>
        ))}
      </View>
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
  }),
);
