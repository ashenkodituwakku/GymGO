/**
 * Adding an exercise to a workout in progress: a search by name or muscle,
 * or, with nothing typed, moves for the muscles the workout already trains
 * (lib/exerciseLibrary.ts addableExercises). The one picked joins the end
 * of the workout, planned as the builder would plan it. Your own exercises
 * (Pro) are offered with GymGO's; at the foot, a way to make one.
 *
 * The same picker replaces an exercise (its menu's Replace exercise), in
 * that exercise's place, suggesting moves for the same muscles first
 * (replacementsFor).
 */

import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type ViewInstance } from 'react-native';
import { addableExercises, kitShort, kitText, replacementsFor, type RecentExercise } from '@/lib/exerciseLibrary';
import { setsSummary } from '@/lib/training';
import { haptic } from '@/lib/haptics';
import { FIELD_FRAME, color, face, radius, shadow, space, themed } from '@/lib/theme';
import { useApp } from '@/lib/app-state';
import { useOwnTraining } from '@/lib/ownTraining';
import { EXERCISES, exerciseName, ownExercises, type Exercise } from '@/lib/workout';
import { ExerciseTile } from './ExerciseGlyph';
import { Icon } from './Icon';
import { Pressable } from './motion';
import { Input, PrimaryButton, Txt } from './ui';

export function AddExercise({
  inWorkout,
  onAdd,
  startOpen = false,
  recent = [],
}: {
  inWorkout: string[];
  onAdd: (exercise: Exercise) => void;
  startOpen?: boolean;
  /** What you've done lately, offered first (lib/exerciseLibrary.ts recentExercises). */
  recent?: RecentExercise[];
}) {
  const [open, setOpen] = useState(startOpen);
  // Closing hands keyboard focus back to the button that opened it, rather than to the page.
  const button = useRef<ViewInstance>(null);
  const close = () => {
    setOpen(false);
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
  return <ExercisePicker inWorkout={inWorkout} recent={recent} onPick={onAdd} onClose={close} />;
}

/** The picker itself: adding to the workout, or, with `replacing`, putting one in that exercise's place. */
export function ExercisePicker({
  inWorkout,
  replacing,
  recent = [],
  onPick,
  onClose,
}: {
  inWorkout: string[];
  /** The exercise being replaced, if this is Replace exercise. */
  replacing?: string;
  /** Adding with nothing typed: what you've done lately, first, with how it went. */
  recent?: RecentExercise[];
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { billing, openPro } = useApp();
  // Yours first, then GymGO's; read again when yours change.
  const own = useOwnTraining();
  const pool = useMemo(() => [...ownExercises(), ...EXERCISES], [own]);
  const found = useMemo(
    () => (replacing ? replacementsFor(query, inWorkout, replacing, 8, pool) : addableExercises(query, inWorkout, 8, pool)),
    [query, inWorkout, replacing, pool],
  );
  const oldName = replacing ? exerciseName(replacing) : null;
  // Recent first while browsing to add; the suggestions under them leave those out.
  const lately = !replacing && !query.trim() ? recent : [];
  const lateIds = new Set(lately.map((item) => item.exercise.id));
  const suggested = found.filter((exercise) => !lateIds.has(exercise.id));
  const close = () => {
    setQuery('');
    onClose();
  };
  /** One to pick: its picture, name, and its kit (or, for one done lately, how it went last time). */
  const pickRow = (exercise: Exercise, index: number, last?: string) => (
    <Pressable
      key={exercise.id}
      onPress={() => {
        haptic.success();
        onPick(exercise);
        close();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${oldName ? 'Use' : 'Add'} ${exercise.name}. ${last ? `Last time ${last}` : kitText(exercise)}`}
      style={({ pressed }) => [styles.row, index > 0 && styles.line, pressed && { backgroundColor: color.fill }]}
    >
      <ExerciseTile exerciseId={exercise.id} size={36} />
      <View style={styles.flex}>
        <Txt variant="subhead" style={face('semibold')} numberOfLines={2}>
          {exercise.name}
        </Txt>
        <Txt variant="caption" color={color.labelSecondary} numberOfLines={1}>
          {last ?? kitShort(exercise)}
        </Txt>
      </View>
      <Icon name={oldName ? 'shuffle' : 'plus'} size={16} color={color.brand} />
    </Pressable>
  );

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Txt variant="headline" style={styles.flex}>
          {oldName ? `Replace ${oldName}` : 'Add an exercise'}
        </Txt>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={oldName ? `Keep ${oldName}` : 'Close without adding'}
          hitSlop={10}
          style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }]}
        >
          <Icon name="close" size={14} color={color.labelSecondary} />
        </Pressable>
      </View>
      <View {...FIELD_FRAME} style={styles.search}>
        <Icon name="search" size={16} color={color.labelSecondary} />
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or muscle"
          accessibilityLabel={oldName ? `Search exercises to use instead of ${oldName}, by name or muscle` : 'Search exercises to add, by name or muscle'}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={styles.input}
        />
      </View>
      {lately.length > 0 && (
        <>
          <Txt variant="eyebrow" color={color.labelSecondary}>
            RECENT
          </Txt>
          <View>
            {lately.map((item, index) =>
              pickRow(item.exercise, index, `${setsSummary(item.sets, item.unit)} · ${new Date(item.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`),
            )}
          </View>
        </>
      )}
      <Txt variant="eyebrow" color={color.labelSecondary}>
        {query.trim() ? (found.length ? 'MATCHES' : 'NO MATCHES') : oldName ? 'FOR THE SAME MUSCLES' : 'FOR THE MUSCLES YOU’RE TRAINING'}
      </Txt>
      {query.trim() !== '' && found.length === 0 && (
        <Txt variant="footnote" color={color.labelSecondary}>
          No exercise matches. Try fewer letters, or a muscle, like “back”.
        </Txt>
      )}
      <View>{suggested.map((exercise, index) => pickRow(exercise, index))}</View>
      <Pressable
        onPress={() => {
          haptic.select();
          if (!billing.isPro) return openPro('exercises');
          router.push('/exercise-edit');
        }}
        accessibilityRole="button"
        accessibilityLabel={billing.isPro ? 'Make your own exercise' : 'Make your own exercise, with GymGO Pro'}
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
