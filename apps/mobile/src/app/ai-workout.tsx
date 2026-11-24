/**
 * Build a workout with GymPal (GymGO Max). Say what you'd like ("45
 * minutes, upper body, dumbbells only") and GymPal builds it from GymGO's
 * exercises and your own, ready to start. The server keeps only exercises
 * this list offered and numbers within bounds (apps/server/src/gymPalMax.ts),
 * so what comes back is always a workout GymGO can run.
 *
 * Without Max: what it is, and the way to Max.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ExerciseTile } from '@/components/ExerciseGlyph';
import { Icon } from '@/components/Icon';
import { MaxBadge } from '@/components/MaxBadge';
import { PageScroll } from '@/components/PageScroll';
import { ScreenOptions } from '@/components/ScreenOptions';
import { Chip, LiveLine, PrimaryButton, TextField, Txt } from '@/components/ui';
import { useGlassRedraw } from '@/components/Redrawn';
import { startSession } from '@/lib/activeSession';
import { api, apiBase, problemText, type BuiltWorkout } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { color, face, radius, space, themed } from '@/lib/theme';
import { restLabel, unitFor } from '@/lib/training';
import { EXERCISES, exerciseName, ownExercises, setMeasure } from '@/lib/workout';

/** Ideas to start from, a tap each. */
const IDEAS = ['45 minutes, upper body', 'Legs, dumbbells only', 'Full body in 30 minutes', 'Core and carries, 20 minutes'];

export default function AiWorkoutScreen() {
  useGlassRedraw();
  usePageTitle('Build with GymPal');
  const router = useRouter();
  const { account, billing, prefs } = useApp();
  const [request, setRequest] = useState('');
  const [useLog, setUseLog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [built, setBuilt] = useState<BuiltWorkout | null>(null);
  const signedIn = account.state === 'signed_in';
  const serverless = apiBase() === null;

  const build = async () => {
    if (request.trim().length < 3) {
      setProblem('Describe the workout you want, like how long and which muscles.');
      return;
    }
    setBusy(true);
    setProblem(null);
    setBuilt(null);
    try {
      // GymGO's exercises and your own: GymPal chooses only from these.
      const exercises = [...EXERCISES, ...ownExercises()].map((exercise) => ({ id: exercise.id, name: exercise.name, measure: setMeasure(exercise.id) }));
      const { workout } = await api.gymPalWorkout({ request: request.trim(), exercises, useLog });
      setBuilt(workout);
      haptic.success();
    } catch (error) {
      setProblem(problemText(error, 'Couldn’t build a workout right now. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const start = () => {
    if (!built) return;
    startSession({ name: built.name, workoutId: null, gymId: null, gymName: null, unit: unitFor(prefs.country), items: built.items });
    haptic.tap();
    router.replace('/train');
  };

  return (
    <>
      <ScreenOptions options={{ title: 'Build with GymPal' }} />
      <PageScroll style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.titleRow}>
          <Txt variant="largeTitle" accessibilityRole="header" level={1} style={styles.flex}>
            Build with GymPal
          </Txt>
          <MaxBadge />
        </View>
        <Txt variant="body" color={color.labelSecondary}>
          Describe the workout you want and GymPal will build it for you.
        </Txt>

        {serverless || !signedIn ? (
          <View style={styles.card}>
            <Txt variant="subhead">{serverless ? 'GymPal isn’t available in this version of GymGO.' : 'Sign in to build workouts with GymPal.'}</Txt>
            {!serverless && <PrimaryButton label="Sign in" onPress={() => router.push('/sign-in')} />}
          </View>
        ) : !billing.isMax ? (
          <View style={styles.card}>
            <Txt variant="headline">Included with GymGO Max</Txt>
            <Txt variant="subhead" color={color.labelSecondary}>
              Get everything in Pro, plus AI workout building, coach notes after every workout and higher GymPal limits.
            </Txt>
            <PrimaryButton label="See GymGO Max" onPress={() => router.push({ pathname: '/pro', params: { reason: 'max' } })} />
          </View>
        ) : (
          <>
            <TextField
              label="Describe your workout"
              inSheet={false}
              value={request}
              onChangeText={setRequest}
              placeholder="45 minutes, upper body, dumbbells only"
              multiline
              maxLength={500}
              style={styles.request}
            />
            <View style={styles.ideas} accessibilityLabel="Ideas">
              {IDEAS.map((idea) => (
                <Chip key={idea} label={idea} selected={false} action onPress={() => setRequest(idea)} />
              ))}
            </View>
            <View style={styles.ideas}>
              <Chip label="Use my training log" icon="chart" selected={useLog} onPress={() => setUseLog((on) => !on)} />
            </View>
            <Txt variant="caption" color={color.labelSecondary}>
              {useLog
                ? 'GymPal can see your recent exercises, sets and weights. It can’t see your gyms or notes.'
                : 'Turn on to build from your recent workouts.'}{' '}
              Uses 1 GymPal message.
            </Txt>
            <PrimaryButton label={busy ? 'Building…' : built ? 'Build another' : 'Build workout'} busy={busy} onPress={() => void build()} />
          </>
        )}

        <LiveLine>
          {problem && (
            <Txt variant="footnote" color={color.dangerInk}>
              {problem}
            </Txt>
          )}
        </LiveLine>

        <LiveLine>
          {built && (
            <View style={styles.card}>
              <Txt variant="title2" accessibilityRole="header" level={2}>
                {built.name}
              </Txt>
              {built.note && (
                <Txt variant="subhead" color={color.labelSecondary}>
                  {built.note}
                </Txt>
              )}
              {built.items.map((item, index) => (
                <View key={item.exerciseId} style={[styles.item, index > 0 && styles.itemLine]}>
                  <ExerciseTile exerciseId={item.exerciseId} size={40} />
                  <View style={styles.flex}>
                    <Txt variant="subhead" style={face('semibold')}>
                      {exerciseName(item.exerciseId)}
                    </Txt>
                    <Txt variant="footnote" color={color.labelSecondary}>
                      {`${item.sets} × ${item.reps}${item.restSeconds ? ` · rest ${restLabel(item.restSeconds)}` : ''}`}
                    </Txt>
                  </View>
                </View>
              ))}
              <PrimaryButton label="Start workout" onPress={start} />
              <View style={styles.hint}>
                <Icon name="info" size={14} color={color.labelSecondary} />
                <Txt variant="caption" color={color.labelSecondary} style={styles.flex}>
                  You can swap, add or remove exercises during the workout.
                </Txt>
              </View>
            </View>
          )}
        </LiveLine>
      </PageScroll>
    </>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.background },
    content: { padding: space[4], gap: space[3], paddingBottom: space[6] },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    flex: { flex: 1, minWidth: 0 },
    card: { gap: space[3], padding: space[4], borderRadius: radius.lg, backgroundColor: color.card },
    request: { minHeight: 88, paddingTop: space[3], textAlignVertical: 'top' },
    ideas: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    item: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingTop: space[2] },
    itemLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
    hint: { flexDirection: 'row', gap: space[2], alignItems: 'flex-start' },
  }),
);
