/**
 * A workout of your own: name it, add exercises (GymGO's and yours), set
 * each one's sets, reps and rest, put them in order and make supersets.
 * Starting it is free, like the builder; keeping it in My workouts is Pro,
 * as saving a built plan is. Opened empty (Make your own), with the
 * builder's plan (Edit this plan), or on a saved workout (`id`, Pro) to
 * change it in place.
 *
 * Leaving with changes not kept asks first, as Edit workout does.
 */

import { useLocalSearchParams, usePreventRemove, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PageScroll } from '@/components/PageScroll';
import { PlanEditor } from '@/components/PlanEditor';
import { useGlassRedraw } from '@/components/Redrawn';
import { ScreenOptions } from '@/components/ScreenOptions';
import { ListSkeleton } from '@/components/Skeleton';
import { Card, PrimaryButton, TextField, Txt } from '@/components/ui';
import { startSession, useActiveSessionGlance } from '@/lib/activeSession';
import { ApiError, api, type SavedWorkout } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { askToDiscard } from '@/lib/askToDiscard';
import { haptic } from '@/lib/haptics';
import { useOwnTraining } from '@/lib/ownTraining';
import { usePageTitle } from '@/lib/pageTitle';
import { takePlan } from '@/lib/planDraft';
import { keptPlan, planProblem, type PlanItem } from '@/lib/planEdit';
import { color, space, themed } from '@/lib/theme';
import { unitFor } from '@/lib/training';

interface Draft {
  name: string;
  items: PlanItem[];
}

export default function WorkoutEditScreen() {
  useGlassRedraw();
  const { id } = useLocalSearchParams<{ id?: string }>();
  usePageTitle(id ? 'Change workout' : 'Your own workout');
  const router = useRouter();
  const { account, billing, openPro, prefs } = useApp();
  const token = account.token;
  const active = useActiveSessionGlance();
  // Redraws with your exercises as they arrive, so their names show.
  useOwnTraining();
  const [saved, setSaved] = useState<SavedWorkout | null | 'missing'>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const [gym, setGym] = useState<{ id: string | null; name: string | null }>({ id: null, name: null });
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // A new one: empty, or the plan the builder handed over. A saved one: from your account.
  useEffect(() => {
    if (id) {
      if (!token) return;
      api
        .workouts(token)
        .then(({ workouts }) => {
          const found = workouts.find((each) => each.id === id);
          if (!found) return setSaved('missing');
          setSaved(found);
          const filled = { name: found.name, items: found.plan.items.map(({ exerciseId, sets, reps, restSeconds, group }) => ({ exerciseId, sets, reps, restSeconds, ...(group ? { group } : {}) })) };
          setGym({ id: found.gymId, name: found.plan.gymName });
          setDraft(filled);
          setOriginal(JSON.stringify(filled));
        })
        .catch(() => setProblem('Couldn’t reach the GymGO server to load this workout.'));
      return;
    }
    const handed = takePlan();
    const filled = handed ? { name: handed.name, items: handed.items } : { name: '', items: [] };
    if (handed) setGym({ id: handed.gymId, name: handed.gymName });
    setDraft(filled);
    setOriginal(JSON.stringify(filled));
  }, [id, token]);

  const changed = draft !== null && original !== null && JSON.stringify(draft) !== original;
  const stopAsking = usePreventRemove(changed && !leaving, ({ repeat }) =>
    askToDiscard(id ? 'this workout' : 'your workout', () => {
      setLeaving(true);
      repeat();
    }),
  );
  const where = useMemo(() => draft?.name.trim() || 'this workout', [draft?.name]);

  if (id && (saved === 'missing' || !token)) {
    return (
      <PageScroll style={styles.page} contentContainerStyle={styles.content}>
        <ScreenOptions options={{ title: '' }} />
        <Txt variant="title2" accessibilityRole="header" level={1}>
          That workout isn’t in your account
        </Txt>
        <PrimaryButton label="My workouts" tone="quiet" onPress={() => router.replace('/workouts')} />
      </PageScroll>
    );
  }
  if (!draft) {
    return (
      <PageScroll style={styles.page} contentContainerStyle={styles.content}>
        <ScreenOptions options={{ title: '' }} />
        {problem ? (
          <Txt variant="subhead" color={color.dangerInk}>
            {problem}
          </Txt>
        ) : (
          <ListSkeleton rows={3} label="Loading the workout" />
        )}
      </PageScroll>
    );
  }

  const checked = () => {
    const wrong = planProblem(draft.items, where);
    if (wrong) {
      haptic.warn();
      setProblem(wrong);
      return null;
    }
    setProblem(null);
    return keptPlan(draft.items, where);
  };

  const start = () => {
    if (active) return router.push('/train');
    const items = checked();
    if (!items) return;
    haptic.success();
    // Starting is what it was made for: leaving for the workout doesn't ask.
    setLeaving(true);
    stopAsking();
    startSession({ name: draft.name.trim() || 'Your workout', workoutId: saved && saved !== 'missing' ? saved.id : null, gymId: gym.id, gymName: gym.name, unit: unitFor(prefs.country), items });
    router.replace('/train');
  };

  const save = async () => {
    if (!billing.isPro || !token) return openPro('workouts');
    const name = draft.name.trim().replace(/\s+/g, ' ');
    if (name.length < 1 || name.length > 80) {
      haptic.warn();
      return setProblem('Give it a name of up to 80 characters to keep it.');
    }
    const items = checked();
    if (!items) return;
    const plan = { muscles: [], goal: null, gymName: gym.name, items: items.map((item) => ({ ...item, uses: [], confirmed: false })), uncovered: [] };
    setSaving(true);
    try {
      const kept = saved && saved !== 'missing' ? await api.editWorkout(token, saved.id, { name, plan }) : await api.saveWorkout(token, { name, gymId: gym.id, plan });
      haptic.success();
      setLeaving(true);
      stopAsking();
      router.replace({ pathname: '/workouts/[id]', params: { id: kept.workout.id } });
    } catch (error) {
      setProblem(error instanceof ApiError ? error.message : 'Couldn’t reach the GymGO server. Your workout is still here; try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenOptions options={{ title: '' }} />
      <View style={styles.intro}>
        <Txt variant="largeTitle" accessibilityRole="header" level={1}>
          {id ? 'Change workout' : 'Your own workout'}
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary}>
          {id
            ? 'Its exercises, sets, reps and rest. Workouts you’ve already done with it stay as you did them.'
            : 'Pick the exercises, then the sets, reps and rest for each. Start it now, or keep it in My workouts.'}
        </Txt>
      </View>
      <Card style={styles.nameCard}>
        <TextField label="Name" inSheet={false} value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} maxLength={80} placeholder="Push day, Upper body…" />
        {gym.name && (
          <Txt variant="footnote" color={color.labelSecondary}>
            {`For ${gym.name}.`}
          </Txt>
        )}
      </Card>

      <PlanEditor items={draft.items} onChange={(items) => setDraft({ ...draft, items })} where={where} />

      <View style={styles.actions}>
        {problem && (
          <Txt variant="footnote" color={color.dangerInk} style={styles.center}>
            {problem}
          </Txt>
        )}
        <PrimaryButton label={active ? 'Back to your workout' : 'Start workout'} icon="play" disabled={draft.items.length === 0} onPress={start} />
        {active && (
          <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
            {`${active.name} is still going: finish or discard it before starting this one.`}
          </Txt>
        )}
        <PrimaryButton
          label={saving ? 'Saving…' : id ? 'Save changes' : billing.isPro ? 'Keep in My workouts' : 'Keep in My workouts · Pro'}
          icon="save"
          tone="quiet"
          disabled={saving || draft.items.length === 0}
          onPress={() => void save()}
        />
      </View>
    </PageScroll>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: 640, alignSelf: 'center' },
    intro: { gap: space[1] },
    nameCard: { gap: space[2] },
    actions: { gap: space[2], marginTop: space[2] },
    center: { textAlign: 'center' },
  }),
);
