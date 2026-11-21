/**
 * On a gym's page: "Can I do this workout here?" A workout you saved,
 * checked against what this gym is known to have, from its own published
 * equipment and members' reports (lib/workoutFit.ts). Each exercise is
 * there, missing or not known yet; for one that isn't there, a swap the
 * known kit allows. "Start it here" starts the workout at this gym with the
 * swaps you chose.
 */

import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { GymRecord } from '@gymgo/domain';
import { startSession, useActiveSessionGlance } from '@/lib/activeSession';
import { api, type EquipmentTally, type SavedWorkout } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { libraryTitle } from '@/lib/savedWorkouts';
import { color, face, radius, space, themed } from '@/lib/theme';
import { unitFor } from '@/lib/training';
import type { AccountApi } from '@/lib/useAccount';
import { KIT_LABEL, exerciseName, knownKit, type Kit } from '@/lib/workout';
import { checkWorkout, fitSummary, withSwaps, type FitItem } from '@/lib/workoutFit';
import { Icon } from './Icon';
import { Pressable } from './motion';
import { LinesSkeleton } from './Skeleton';
import { ChoiceChip, PrimaryButton, Txt } from './ui';

type Load =
  | { state: 'loading' }
  | { state: 'offline' }
  | { state: 'ready'; workouts: SavedWorkout[]; tallies: EquipmentTally[]; reporters: number };

/** "barbell and bench" (all needed), or "squat rack or power rack" (either). */
const kitList = (kit: readonly Kit[], joiner: 'and' | 'or' = 'and') => {
  const names = kit.map((item) => KIT_LABEL[item]?.toLowerCase() ?? item);
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} ${joiner} ${names[names.length - 1]}`;
};

export function WorkoutFit({ record, account, onSignIn }: { record: GymRecord; account: AccountApi; onSignIn: () => void }) {
  const router = useRouter();
  const { prefs } = useApp();
  const active = useActiveSessionGlance();
  const token = account.state === 'signed_in' ? account.token : null;
  const gymId = record.location.id;
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [chosen, setChosen] = useState<string | null>(null);
  const [swapped, setSwapped] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!token) return;
    let gone = false;
    setLoad({ state: 'loading' });
    Promise.all([api.workouts(token), api.equipment(gymId, token)])
      .then(([saved, kit]) => {
        if (!gone) setLoad({ state: 'ready', workouts: saved.workouts, tallies: kit.items, reporters: kit.reporters });
      })
      .catch(() => {
        if (!gone) setLoad({ state: 'offline' });
      });
    return () => {
      gone = true;
    };
  }, [token, gymId]);

  const workouts = load.state === 'ready' ? load.workouts : [];
  // Newest first; one saved for this gym comes first of all.
  const ordered = useMemo(
    () => [...workouts].sort((a, b) => Number(b.gymId === gymId) - Number(a.gymId === gymId) || b.createdAt.localeCompare(a.createdAt)),
    [workouts, gymId],
  );
  const workout = ordered.find((item) => item.id === chosen) ?? ordered[0] ?? null;
  const known = useMemo(() => knownKit(record, load.state === 'ready' ? load.tallies : []), [record, load]);
  const fit = useMemo(() => (workout ? checkWorkout(workout.plan.items, known) : null), [workout, known]);

  if (!token) {
    return (
      <View style={styles.box}>
        <Txt variant="subhead" color={color.labelSecondary}>
          Sign in to check a workout you saved against what members say this gym has.
        </Txt>
        <PrimaryButton label="Sign in" tone="quiet" onPress={onSignIn} />
      </View>
    );
  }
  if (load.state === 'loading') return <LinesSkeleton lines={3} label="Checking your workouts" />;
  if (load.state === 'offline') {
    return (
      <Txt variant="subhead" color={color.labelSecondary}>
        Can’t reach GymGO right now, so your saved workouts can’t be checked.
      </Txt>
    );
  }
  if (!workout || !fit) {
    return (
      <Txt variant="subhead" color={color.labelSecondary}>
        Save a workout from the builder (Build a workout here, above), then check it against any gym here.
      </Txt>
    );
  }

  const choose = (id: string) => {
    haptic.select();
    setChosen(id);
    setSwapped(new Set());
  };
  const toggleSwap = (index: number) => {
    haptic.select();
    setSwapped((now) => {
      const next = new Set(now);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };
  const start = () => {
    haptic.success();
    if (!active) {
      const items = withSwaps(workout.plan.items, fit, swapped);
      startSession({
        name: libraryTitle(workout.name, workout.plan.gymName),
        workoutId: swapped.size ? null : workout.id,
        gymId,
        gymName: record.location.name,
        unit: unitFor(prefs.country),
        items: items.map((item) => ({ exerciseId: item.exerciseId, sets: item.sets, reps: item.reps, restSeconds: item.restSeconds, group: item.group })),
      });
    }
    router.push('/train');
  };

  return (
    <View style={styles.box}>
      {ordered.length > 1 && (
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Your saved workouts">
          {ordered.slice(0, 8).map((item) => (
            <ChoiceChip key={item.id} label={libraryTitle(item.name, item.plan.gymName)} selected={item.id === workout.id} onPress={() => choose(item.id)} />
          ))}
        </View>
      )}
      <Txt variant="headline" style={face('semibold')}>
        {fitSummary(fit.counts)}
      </Txt>
      <Txt variant="footnote" color={color.labelSecondary}>
        {sourceLine(record.equipment.length > 0, load.reporters)}
      </Txt>
      <View style={styles.rows}>
        {fit.items.map((item, index) => (
          <FitRow key={`${item.exerciseId}-${index}`} item={item} swapped={swapped.has(index)} onSwap={() => toggleSwap(index)} />
        ))}
      </View>
      <PrimaryButton label={active ? 'Back to your workout' : swapped.size ? 'Start it here, with the swaps' : 'Start it here'} icon="play" onPress={start} />
      {active && (
        <Txt variant="footnote" color={color.labelSecondary}>
          You have a workout in progress: finish it first to start this one.
        </Txt>
      )}
    </View>
  );
}

/** Where the answers come from, and what "not known" means. */
function sourceLine(published: boolean, reporters: number): string {
  const members = reporters === 1 ? 'one member’s report' : `${reporters} members’ reports`;
  if (reporters > 0) return `From ${published ? `the gym’s own list and ${members}` : members}. Not known means nobody has said either way.`;
  return published
    ? 'From the gym’s own list; no member has reported yet. Not known means nobody has said either way.'
    : 'Neither the gym nor its members have said what equipment it has yet, so most of it is not known. Not known isn’t “no”.';
}

function FitRow({ item, swapped, onSwap }: { item: FitItem; swapped: boolean; onSwap: () => void }) {
  const icon = item.state === 'there' ? 'good' : item.state === 'missing' ? 'no' : 'maybe';
  const fill = item.state === 'there' ? color.good : item.state === 'missing' ? color.no : color.maybe;
  const detail =
    item.state === 'there'
      ? item.kit.length
        ? `Uses the ${kitList(item.kit)}`
        : 'Body weight: nothing needed'
      : item.state === 'missing'
        ? `Members say there’s no ${kitList(item.kit, 'or')}`
        : item.kit.length
          ? `Nobody has said whether there’s a ${kitList(item.kit)}`
          : 'GymGO no longer lists this exercise';
  return (
    <View style={styles.row}>
      <Icon name={icon} size={18} color={fill} />
      <View style={styles.flex}>
        <Txt variant="subhead" style={swapped ? styles.struck : undefined}>
          {exerciseName(item.exerciseId)}
        </Txt>
        <Txt variant="footnote" color={color.labelSecondary}>
          {detail}
        </Txt>
        {item.swap && (
          <Pressable
            onPress={onSwap}
            accessibilityRole="switch"
            aria-checked={swapped}
            accessibilityLabel={`Swap for ${item.swap.name}`}
            hitSlop={6}
            style={({ pressed }) => [styles.swap, swapped && styles.swapOn, pressed && styles.pressed]}
          >
            <Icon name={swapped ? 'good' : 'shuffle'} size={14} color={swapped ? color.onBrand : color.brand} />
            <Txt variant="footnote" color={swapped ? color.onBrand : color.brand} style={face('semibold')}>
              {swapped ? `Swapped for ${item.swap.name}` : `Swap for ${item.swap.name}`}
            </Txt>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    box: { gap: space[3] },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    rows: { gap: space[3] },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
    flex: { flex: 1, minWidth: 0, gap: 2 },
    struck: { textDecorationLine: 'line-through', color: color.labelSecondary },
    swap: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: space[1],
      paddingHorizontal: space[3],
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: color.brandTint,
    },
    swapOn: { backgroundColor: color.brandFill },
    pressed: { opacity: 0.75 },
  }),
);
