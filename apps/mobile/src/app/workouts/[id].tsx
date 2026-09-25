/** One saved workout, as it was when saved. */

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { ExerciseCard } from '@/components/ExerciseCard';
import { PrimaryButton, Txt } from '@/components/ui';
import { startSession, useActiveSession } from '@/lib/activeSession';
import { api, type SavedWorkout } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { workoutFromSaved } from '@/lib/savedWorkouts';
import { unitFor } from '@/lib/training';
import { color, radius, space, themed } from '@/lib/theme';
import { GOALS, muscleLabel, workoutText, type Muscle } from '@/lib/workout';

export default function SavedWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { account, prefs } = useApp();
  const active = useActiveSession();
  const router = useRouter();
  const [saved, setSaved] = useState<SavedWorkout | null | 'missing'>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const token = account.state === 'signed_in' ? account.token : null;

  useEffect(() => {
    if (!token) return;
    api
      .workouts(token)
      .then((result) => setSaved(result.workouts.find((item) => item.id === id) ?? 'missing'))
      .catch(() => setProblem('Couldn’t reach the GymGO server to load this workout.'));
  }, [token, id]);

  if (saved === 'missing' || !token) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: 'Workout' }} />
        <Txt variant="title2">Not found</Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
          {token ? 'This workout isn’t in your account any more.' : 'Sign in to see your saved workouts.'}
        </Txt>
        <PrimaryButton label="Back" tone="quiet" onPress={() => (router.canGoBack() ? router.back() : router.replace('/workouts'))} />
      </View>
    );
  }
  if (!saved) {
    return (
      <View style={styles.missing}>
        <Txt variant="subhead" color={problem ? color.dangerInk : color.labelSecondary}>
          {problem ?? 'Loading…'}
        </Txt>
      </View>
    );
  }

  const { workout, missing } = workoutFromSaved(saved.plan);
  const goal = GOALS.find((item) => item.id === saved.plan.goal)?.label;
  const remove = async () => {
    if (!confirmDelete) return setConfirmDelete(true);
    try {
      await api.deleteWorkout(token, saved.id);
      haptic.success();
      router.canGoBack() ? router.back() : router.replace('/workouts');
    } catch {
      setProblem('Couldn’t delete it just now. Try again.');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView style={styles.page} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.intro}>
          <Txt variant="largeTitle">{saved.name}</Txt>
          <Txt variant="subhead" color={color.labelSecondary}>
            {[goal, saved.plan.gymName && !saved.name.includes(saved.plan.gymName) ? saved.plan.gymName : null, `saved ${new Date(saved.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}`]
              .filter(Boolean)
              .join(' · ')}
          </Txt>
          {saved.plan.muscles.length > 0 && (
            <Txt variant="footnote" color={color.labelSecondary}>
              {saved.plan.muscles.map((muscle) => muscleLabel(muscle as Muscle)).join(' · ')}
            </Txt>
          )}
        </View>
        {workout.items.map((item, index) => (
          <ExerciseCard
            key={`${item.exercise.id}-${index}`}
            index={index}
            exercise={item.exercise}
            sets={item.sets}
            reps={item.reps}
            restSeconds={item.restSeconds}
            uses={item.uses}
            confirmed={item.confirmed}
            forGym={saved.gymId !== null}
          />
        ))}
        {missing > 0 && (
          <Txt variant="footnote" color={color.maybeInk}>
            {missing} exercise{missing === 1 ? ' is' : 's are'} no longer in GymGO, so {missing === 1 ? 'it’s' : 'they’re'} left out.
          </Txt>
        )}
        {saved.gymId !== null && (
          <Txt variant="footnote" color={color.labelSecondary}>
            ✓ and ? show what was confirmed at the gym when you saved it.
          </Txt>
        )}
        <View style={styles.buttons}>
          <PrimaryButton
            label={active ? 'Back to your workout' : 'Start workout'}
            icon="play"
            onPress={() => {
              haptic.success();
              if (!active) {
                startSession({
                  name: saved.name,
                  workoutId: saved.id,
                  gymId: saved.gymId,
                  gymName: saved.plan.gymName,
                  unit: unitFor(prefs.country),
                  items: workout.items.map((item) => ({ exerciseId: item.exercise.id, sets: item.sets, reps: item.reps, restSeconds: item.restSeconds })),
                });
              }
              router.push('/train');
            }}
          />
          <PrimaryButton
            label="Share"
            icon="share"
            tone="quiet"
            onPress={() => void Share.share({ message: workoutText(workout, saved.plan.gymName) }).catch(() => undefined)}
          />
          {saved.gymId && (
            <PrimaryButton
              label="Open the gym"
              icon="gym"
              tone="quiet"
              onPress={() => router.push({ pathname: '/gym/[id]', params: { id: saved.gymId! } })}
            />
          )}
          <PrimaryButton label={confirmDelete ? 'Tap again to delete' : 'Delete workout'} icon="trash" tone="danger" onPress={() => void remove()} />
          {problem && (
            <Txt variant="footnote" color={color.dangerInk}>
              {problem}
            </Txt>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = themed(() => StyleSheet.create({
  center: { textAlign: 'center' },
  page: { flex: 1, backgroundColor: color.groupedBackground },
  content: { padding: space[4], gap: space[3], paddingBottom: space[8], width: '100%', maxWidth: 640, alignSelf: 'center' },
  intro: { gap: 2, marginBottom: space[1] },
  buttons: { gap: space[2], marginTop: space[2] },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6], backgroundColor: color.groupedBackground, borderRadius: radius.xl },
}));
