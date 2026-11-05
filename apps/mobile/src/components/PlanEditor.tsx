/**
 * A plan of your own, exercise by exercise: a workout (app/workout-edit.tsx)
 * or a day of a split (app/split-edit.tsx). Each exercise has its sets (a
 * stepper), reps ("8", "8–10", "30 s"), rest, a place in the order and a
 * way out; neighbours can be a superset; the picker at the foot adds more,
 * GymGO's and your own (lib/planEdit.ts keeps it tidy).
 */

import { cleanReps } from '@gymgo/domain';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { haptic } from '@/lib/haptics';
import { PLAN_RESTS, moveItem, planItemFor, removeItem, withSets, type PlanItem } from '@/lib/planEdit';
import { groupName, groupOf, linkWithNext, unlink } from '@/lib/supersets';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { restLabel } from '@/lib/training';
import { exerciseById, exerciseName } from '@/lib/workout';
import { AddExercise } from './AddExercise';
import { ExerciseTile } from './ExerciseGlyph';
import { GroupControls, joinableNext } from './GroupControls';
import { Icon, type IconName } from './Icon';
import { Pressable } from './motion';
import { Chip, Input, Txt } from './ui';

const restWords = (seconds: number) => (seconds === 0 ? 'No rest' : `${restLabel(seconds)} rest`);

export function PlanEditor({ items, onChange, where }: { items: PlanItem[]; onChange: (items: PlanItem[]) => void; where: string }) {
  // The exercise whose rest is being picked.
  const [resting, setResting] = useState<number | null>(null);
  const change = (next: PlanItem[]) => {
    setResting(null);
    onChange(next);
  };
  const at = (index: number, patch: Partial<PlanItem>) => onChange(items.map((item, other) => (other === index ? { ...item, ...patch } : item)));

  return (
    <View style={styles.list}>
      {items.length === 0 && (
        <Txt variant="subhead" color={color.labelSecondary} style={styles.empty}>
          {`No exercises in ${where} yet. Add the first below.`}
        </Txt>
      )}
      {items.map((item, index) => {
        const name = exerciseName(item.exerciseId);
        const exercise = exerciseById(item.exerciseId);
        const group = groupOf(items, index);
        const repsOk = cleanReps(item.reps) !== null;
        const nextName = joinableNext(items, index, (other) => exerciseName(items[other]!.exerciseId));
        const finisher = exercise?.cardio === true;
        return (
          <View key={item.exerciseId} style={[styles.card, group && styles.grouped]}>
            <View style={styles.head}>
              <ExerciseTile exerciseId={item.exerciseId} size={44} />
              <View style={styles.flex}>
                <Txt variant="eyebrow" color={color.brand} numberOfLines={1}>
                  {`${String(index + 1).padStart(2, '0')}${group ? `  ·  ${groupName(group).toUpperCase()}` : ''}`}
                </Txt>
                <Txt variant="headline" numberOfLines={2}>
                  {name}
                </Txt>
              </View>
              <SmallButton icon="close" label={`Remove ${name} from ${where}`} onPress={() => change(removeItem(items, index))} danger />
            </View>

            {finisher ? (
              <Txt variant="footnote" color={color.labelSecondary}>
                {`Once, as its cue says: ${exercise?.cue ?? ''}`}
              </Txt>
            ) : (
              <View style={styles.dose}>
                <View style={styles.stepper} accessibilityLabel={`${name}: ${item.sets} sets`} role="group">
                  <SmallButton icon="minus" label={`One set fewer of ${name}`} disabled={item.sets <= 1} onPress={() => onChange(items.map((each, other) => (other === index ? withSets(each, each.sets - 1) : each)))} />
                  <Txt variant="headline" style={styles.sets}>
                    {item.sets}
                  </Txt>
                  <SmallButton icon="plus" label={`One set more of ${name}`} disabled={item.sets >= 10} onPress={() => onChange(items.map((each, other) => (other === index ? withSets(each, each.sets + 1) : each)))} />
                  <Txt variant="subhead" color={color.labelTertiary}>
                    ×
                  </Txt>
                </View>
                <Input
                  value={item.reps}
                  onChangeText={(reps) => at(index, { reps })}
                  onBlur={() => {
                    const tidy = cleanReps(item.reps);
                    if (tidy && tidy !== item.reps) at(index, { reps: tidy });
                  }}
                  placeholder="8–10"
                  autoCorrect={false}
                  autoCapitalize="none"
                  maxLength={12}
                  style={[styles.reps, !repsOk && styles.repsBad]}
                  accessibilityLabel={`${name}: reps, as a number (8), a range (8–10) or a time (30 s)${repsOk ? '' : '. Not one of those yet'}`}
                />
                <Pressable
                  onPress={() => {
                    haptic.select();
                    setResting(resting === index ? null : index);
                  }}
                  accessibilityRole="button"
                  aria-expanded={resting === index}
                  accessibilityLabel={`${name}: ${restWords(item.restSeconds)} after each set. Change it`}
                  style={({ pressed }) => [styles.rest, resting === index && styles.restOpen, pressed && { opacity: 0.6 }]}
                >
                  <Icon name="timer" size={14} color={color.brand} />
                  <Txt variant="footnote" color={color.brand} style={face('semibold')}>
                    {item.restSeconds === 0 ? 'No rest' : restLabel(item.restSeconds)}
                  </Txt>
                </Pressable>
              </View>
            )}
            {!repsOk && !finisher && (
              <Txt variant="caption" color={color.dangerInk}>
                Reps as a number (8), a range (8–10) or a time (30 s).
              </Txt>
            )}
            {resting === index && (
              <View style={styles.restChips} role="radiogroup" accessibilityLabel={`Rest after each set of ${name}`}>
                {PLAN_RESTS.map((seconds) => (
                  <Chip
                    key={seconds}
                    label={seconds === 0 ? 'None' : restLabel(seconds)}
                    selected={item.restSeconds === seconds}
                    accessibilityLabel={restWords(seconds)}
                    onPress={() => {
                      at(index, { restSeconds: seconds });
                      setResting(null);
                    }}
                  />
                ))}
              </View>
            )}
            {(group || nextName || items.length > 1) && (
            <View style={styles.foot}>
              <View style={styles.flex}>
                <GroupControls
                  name={name}
                  group={group}
                  nextName={nextName}
                  onLink={() => change(linkWithNext(items, index))}
                  onUnlink={() => change(unlink(items, index))}
                />
              </View>
              {items.length > 1 && (
                <View style={styles.order}>
                  <SmallButton icon="chevron" turn={-90} label={`Move ${name} up`} disabled={index === 0} onPress={() => change(moveItem(items, index, -1))} />
                  <SmallButton icon="chevron" turn={90} label={`Move ${name} down`} disabled={index === items.length - 1} onPress={() => change(moveItem(items, index, 1))} />
                </View>
              )}
            </View>
            )}
          </View>
        );
      })}
      <AddExercise inWorkout={items.map((item) => item.exerciseId)} onAdd={(exercise) => change([...items, planItemFor(exercise)])} />
    </View>
  );
}

function SmallButton({
  icon,
  label,
  onPress,
  disabled = false,
  danger = false,
  turn = 0,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** Degrees to turn the icon: a chevron pointing up or down. */
  turn?: number;
}) {
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        haptic.select();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [styles.small, disabled && styles.smallOff, pressed && { opacity: 0.6 }]}
    >
      <View style={turn ? { transform: [{ rotate: `${turn}deg` }] } : undefined}>
        <Icon name={icon} size={14} color={disabled ? color.labelTertiary : danger ? color.dangerInk : color.brand} />
      </View>
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    list: { gap: space[3] },
    empty: { textAlign: 'center', paddingVertical: space[2] },
    card: { gap: space[3], padding: space[4], borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
    // A superset's exercises share a bar down their left, as in a workout.
    grouped: { borderLeftWidth: 4, borderLeftColor: color.brand },
    head: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    flex: { flex: 1, minWidth: 0 },
    order: { flexDirection: 'row', gap: 6 },
    foot: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    small: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: color.fill },
    smallOff: { opacity: 0.5 },
    dose: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space[2] },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sets: { minWidth: 22, textAlign: 'center' },
    reps: { width: 84, height: 40, borderRadius: radius.sm, backgroundColor: color.fill, textAlign: 'center', fontSize: 16, color: color.label, ...face('semibold') },
    repsBad: { borderWidth: 2, borderColor: color.dangerInk },
    rest: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space[3], height: 40, borderRadius: radius.pill, backgroundColor: color.brandTint },
    restOpen: { borderWidth: 2, borderColor: color.brand },
    restChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  }),
);
