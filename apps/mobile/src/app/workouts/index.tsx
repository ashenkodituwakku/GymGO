/**
 * My workouts: the plans you've saved to your account (a Pro feature). They
 * stay here if Pro ends; only saving new ones stops.
 */

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { PrimaryButton, Txt } from '@/components/ui';
import { api, type SavedWorkout } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { color, face, radius, space } from '@/lib/theme';

export default function MyWorkouts() {
  const { account, billing, openPro } = useApp();
  const router = useRouter();
  const [workouts, setWorkouts] = useState<SavedWorkout[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const token = account.state === 'signed_in' ? account.token : null;

  // Reload whenever the screen shows, so a delete on the next screen is reflected.
  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      api
        .workouts(token)
        .then((result) => {
          setWorkouts(result.workouts);
          setProblem(null);
        })
        .catch(() => setProblem('Couldn’t reach the GymGO server to load your workouts.'));
    }, [token]),
  );

  if (!token) {
    return (
      <View style={styles.empty}>
        <Txt variant="title2">📒 Your workouts</Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
          Sign in to see the workouts you’ve saved.
        </Txt>
        <PrimaryButton label="Sign in" onPress={() => router.navigate('/profile')} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      {problem && (
        <Txt variant="footnote" color={color.dangerInk}>
          {problem}
        </Txt>
      )}
      {!billing.isPro && workouts !== null && workouts.length > 0 && (
        <Pressable onPress={() => openPro('workouts')} accessibilityRole="button" style={styles.notice}>
          <Txt variant="footnote" color={color.labelSecondary}>
            Your workouts stay here. Saving new ones is part of GymGO Pro. <Txt variant="footnote" color={color.brand}>See Pro ›</Txt>
          </Txt>
        </Pressable>
      )}
      {workouts === null && !problem && (
        <Txt variant="subhead" color={color.labelSecondary}>
          Loading…
        </Txt>
      )}
      {workouts !== null && workouts.length === 0 && (
        <View style={styles.emptyCard}>
          <Txt variant="headline">📒 No saved workouts yet</Txt>
          <Txt variant="subhead" color={color.labelSecondary}>
            {billing.isPro ? 'Build one, then tap 🔖 Save.' : 'With GymGO Pro, tap 🔖 Save on any workout you build to keep it here.'}
          </Txt>
          <PrimaryButton label="💪 Build a workout" onPress={() => router.push({ pathname: '/workout/[id]', params: { id: 'any' } })} />
        </View>
      )}
      {workouts !== null && workouts.length > 0 && (
        <View style={styles.list}>
          {workouts.map((workout, index) => (
            <Pressable
              key={workout.id}
              onPress={() => router.push({ pathname: '/workouts/[id]', params: { id: workout.id } })}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, index > 0 && styles.rowLine, pressed && { backgroundColor: color.fill }]}
            >
              <Txt style={styles.rowEmoji}>{workout.plan.goal === 'strength' ? '🏋️' : workout.plan.goal === 'endurance' ? '🔥' : '💪'}</Txt>
              <View style={styles.flex}>
                <Txt variant="headline" numberOfLines={1}>
                  {workout.name}
                </Txt>
                <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1}>
                  {[
                    `${workout.plan.items.length} exercise${workout.plan.items.length === 1 ? '' : 's'}`,
                    workout.plan.gymName,
                    new Date(workout.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Txt>
              </View>
              <Icon name="chevron" size={14} color={color.labelTertiary} />
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  page: { flex: 1, backgroundColor: color.groupedBackground },
  content: { padding: space[4], gap: space[3], paddingBottom: space[8], width: '100%', maxWidth: 640, alignSelf: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6], backgroundColor: color.groupedBackground },
  emptyCard: { backgroundColor: color.background, borderRadius: radius.xl, borderCurve: 'continuous', padding: space[4], gap: space[3] },
  notice: { padding: space[3], borderRadius: radius.md, backgroundColor: color.fill },
  list: { backgroundColor: color.background, borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
  rowEmoji: { fontSize: 24, lineHeight: 30, ...face('regular') },
});
