/**
 * My workouts: the plans you've saved to your account (a Pro feature). They
 * stay here if Pro ends; only saving new ones stops.
 */

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { PrimaryButton, Txt } from '@/components/ui';
import { ListSkeleton } from '@/components/Skeleton';
import { useActiveSession } from '@/lib/activeSession';
import { api, type SavedWorkout } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { libraryDetails, libraryTitle, startSavedWorkout } from '@/lib/savedWorkouts';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { unitFor } from '@/lib/training';
import { usePageTitle } from '@/lib/pageTitle';
import { PageScroll } from '@/components/PageScroll';

export default function MyWorkouts() {
  usePageTitle('My workouts');
  const { account, billing, openPro, prefs } = useApp();
  const active = useActiveSession();
  const router = useRouter();
  const [workouts, setWorkouts] = useState<SavedWorkout[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  // Kept while the server is away too: loading then fails and says so,
  // where a missing token would ask a signed-in person to sign in.
  const token = account.token;

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
        <Txt variant="title2">Your workouts</Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
          Sign in to see the workouts you’ve saved.
        </Txt>
        <PrimaryButton label="Sign in" onPress={() => router.push('/sign-in')} />
      </View>
    );
  }

  const details = workouts ? libraryDetails(workouts) : new Map<string, string>();
  const start = (workout: SavedWorkout) => {
    haptic.success();
    startSavedWorkout(workout, unitFor(prefs.country));
    router.push('/train');
  };

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      {active && (
        <Pressable onPress={() => router.push('/train')} accessibilityRole="button" style={styles.notice}>
          <Txt variant="footnote" color={color.labelSecondary}>
            {active.name} is in progress. <Txt variant="footnote" color={color.brand}>Back to it ›</Txt>
          </Txt>
        </Pressable>
      )}
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
      {workouts === null && !problem && <ListSkeleton rows={3} label="Loading your workouts" />}
      {workouts !== null && workouts.length === 0 && (
        <View style={styles.emptyCard}>
          <Txt variant="headline">No saved workouts yet</Txt>
          <Txt variant="subhead" color={color.labelSecondary}>
            {billing.isPro ? 'Build one, then tap Save.' : 'With GymGO Pro, tap Save on any workout you build to keep it here.'}
          </Txt>
          <PrimaryButton label="Build a workout" icon="workout" onPress={() => router.push({ pathname: '/workout/[id]', params: { id: 'any' } })} />
          <PrimaryButton label="Or start from a template" tone="quiet" onPress={() => router.push('/templates')} />
        </View>
      )}
      {workouts !== null && workouts.length > 0 && (
        <>
          <View style={styles.list}>
            {workouts.map((workout, index) => {
              const title = libraryTitle(workout.name, workout.plan.gymName);
              return (
                <View key={workout.id} style={[styles.row, index > 0 && styles.rowLine]}>
                  <Pressable
                    onPress={() => router.push({ pathname: '/workouts/[id]', params: { id: workout.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={`${title}, ${details.get(workout.id) ?? ''}`}
                    style={({ pressed }) => [styles.open, pressed && styles.pressed]}
                  >
                    <View style={styles.rowIcon}>
                      <Icon name={workout.plan.goal === 'endurance' ? 'bolt' : 'workout'} size={18} color={color.onBrand} />
                    </View>
                    <View style={styles.flex}>
                      <Txt variant="headline" numberOfLines={2}>
                        {title}
                      </Txt>
                      <Txt variant="footnote" color={color.labelSecondary} numberOfLines={2}>
                        {details.get(workout.id)}
                      </Txt>
                    </View>
                  </Pressable>
                  {!active && (
                    <Pressable
                      onPress={() => start(workout)}
                      accessibilityRole="button"
                      accessibilityLabel={`Start ${title}`}
                      hitSlop={6}
                      style={({ pressed }) => [styles.startPill, pressed && styles.pressed]}
                    >
                      <Icon name="play" size={13} color={color.brand} />
                      <Txt variant="subhead" color={color.brand} style={face('semibold')}>
                        Start
                      </Txt>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
          <Txt variant="footnote" color={color.labelSecondary} style={styles.footer}>
            Saved to your account, so they’re on any device you sign in on. Tap one to see it, share it or delete it.
          </Txt>
          {billing.isPro && (
            <PrimaryButton label="Build a workout" icon="sparkle" tone="quiet" onPress={() => router.push({ pathname: '/workout/[id]', params: { id: 'any' } })} />
          )}
        </>
      )}
    </PageScroll>
  );
}

const styles = themed(() => StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  page: { flex: 1, backgroundColor: color.groupedBackground },
  content: { padding: space[4], gap: space[3], paddingBottom: space[8], width: '100%', maxWidth: 640, alignSelf: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6], backgroundColor: color.groupedBackground },
  emptyCard: { backgroundColor: color.card, borderRadius: radius.xl, borderCurve: 'continuous', padding: space[4], gap: space[3], ...shadow.plate },
  notice: { padding: space[3], borderRadius: radius.md, backgroundColor: color.fill },
  list: { backgroundColor: color.card, borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', ...shadow.plate },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingRight: space[3] },
  open: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[3], paddingLeft: space[4], paddingRight: space[1], paddingVertical: space[3] },
  pressed: { opacity: 0.6 },
  startPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space[3], paddingVertical: 7, borderRadius: 999, backgroundColor: color.brandTint },
  footer: { paddingHorizontal: space[4] },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
  rowIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: color.brandFill, alignItems: 'center', justifyContent: 'center' },
}));
