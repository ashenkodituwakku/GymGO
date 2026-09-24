/**
 * The workout generator: tap muscles on the body, pick a goal and a length,
 * and get a session built from the machines this gym actually has.
 *
 * "Actually has" means the gym's own published kit plus members' reports.
 * When that's too little to go on (most gyms publish nothing), it offers a
 * "typical gym" plan instead and says plainly that the kit isn't confirmed
 * here. `id` is a gym's id, or "any" for no particular gym.
 */

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View, useWindowDimensions } from 'react-native';
import { BodyPicker } from '@/components/BodyPicker';
import { Icon, type IconName } from '@/components/Icon';
import { Chip, PrimaryButton, Segmented, Txt } from '@/components/ui';
import { ExerciseCard } from '@/components/ExerciseCard';
import { ApiError, api } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { color, face, radius, space } from '@/lib/theme';
import {
  GOALS,
  KIT_LABEL,
  PRESETS,
  TYPICAL_KIT,
  generateWorkout,
  knownKit,
  muscleLabel,
  workoutText,
  type Goal,
  type Kit,
  type KitTally,
  type Length,
  type Muscle,
} from '@/lib/workout';

type KitMode = 'gym' | 'typical';

/** Short, so three fit side by side on a phone. */
const GOAL_LABEL: Record<Goal, string> = { strength: 'Strength', muscle: 'Muscle', endurance: 'Endurance' };

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, account, billing, openPro } = useApp();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const record = id && id !== 'any' ? (data.records.find((item) => item.location.id === id) ?? null) : null;
  const token = account.state === 'signed_in' ? account.token : null;

  const [tallies, setTallies] = useState<KitTally[]>([]);
  useEffect(() => {
    if (!record || record.location.isDemoData) return;
    api
      .equipment(record.location.id, token)
      .then((result) => setTallies(result.items))
      .catch(() => undefined);
  }, [record, token]);

  const kit = useMemo(() => knownKit(record, tallies), [record, tallies]);
  const [mode, setMode] = useState<KitMode | null>(null);
  // With too little confirmed kit to build a real session, start on typical.
  const effectiveMode: KitMode = record ? (mode ?? (kit.has.length >= 3 ? 'gym' : 'typical')) : 'typical';
  const available: Kit[] =
    effectiveMode === 'gym' ? kit.has : [...new Set<Kit>([...TYPICAL_KIT.filter((item) => !kit.lacks.includes(item)), ...kit.has])];

  const [muscles, setMuscles] = useState<Muscle[]>([]);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [goal, setGoal] = useState<Goal>('muscle');
  const [length, setLength] = useState<Length>(6);
  const [seed, setSeed] = useState(1);
  const [built, setBuilt] = useState(false);

  const workout = useMemo(
    () => generateWorkout({ muscles, available, confirmed: kit.has, goal, length, seed }),
    // `available` is derived from these.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [muscles, goal, length, seed, effectiveMode, kit],
  );

  const toggle = (muscle: Muscle) =>
    setMuscles((current) => (current.includes(muscle) ? current.filter((item) => item !== muscle) : [...current, muscle]));
  const gymName = record?.location.name ?? null;

  // Saving to the account's library is Pro. A new plan can be saved again.
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | string>('idle');
  useEffect(() => setSaveState('idle'), [workout]);
  const saveWorkout = async () => {
    if (!billing.isPro || account.state !== 'signed_in' || !account.token) {
      openPro('workouts');
      return;
    }
    setSaveState('saving');
    const name = [muscles.map(muscleLabel).slice(0, 3).join(', '), gymName].filter(Boolean).join(' · ').slice(0, 80) || 'Workout';
    try {
      await api.saveWorkout(account.token, {
        name,
        gymId: record?.location.id ?? null,
        plan: {
          muscles,
          goal,
          gymName,
          items: workout.items.map((item) => ({
            exerciseId: item.exercise.id,
            sets: item.sets,
            reps: item.reps,
            restSeconds: item.restSeconds,
            uses: item.uses,
            confirmed: item.confirmed,
          })),
          uncovered: workout.uncovered,
        },
      });
      haptic.success();
      setSaveState('saved');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'pro_required') {
        setSaveState('idle');
        openPro('workouts');
      } else {
        setSaveState(error instanceof ApiError ? error.message : 'Couldn’t reach the GymGO server to save it.');
      }
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Workout' }} />
      <ScrollView style={styles.page} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.intro}>
          <Txt variant="largeTitle">Build a workout</Txt>
          <Txt variant="subhead" color={color.labelSecondary}>
            {gymName ? `For ${gymName}. ` : ''}Tap the muscles you want to train.
          </Txt>
        </View>

        {/* The body --------------------------------------------------------- */}
        <View style={styles.card}>
          <View style={styles.bodyTop}>
            <Txt variant="headline" style={styles.flex}>
              {muscles.length ? `${muscles.length} picked` : 'Pick muscles'}
            </Txt>
            <View style={styles.genderSwitch}>
              <Segmented
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                ]}
                value={gender}
                onChange={setGender}
              />
            </View>
          </View>
          <BodyPicker selected={muscles} onToggle={toggle} gender={gender} maxWidth={width} />
          <View style={styles.chips}>
            {PRESETS.map((preset) => (
              <Chip
                key={preset.label}
                label={preset.label}
                selected={preset.muscles.every((muscle) => muscles.includes(muscle)) && preset.muscles.length === muscles.length}
                onPress={() => setMuscles(preset.muscles)}
              />
            ))}
            {muscles.length > 0 && <Chip label="Clear" selected={false} onPress={() => setMuscles([])} />}
          </View>
          {muscles.length > 0 && (
            <Txt variant="footnote" color={color.labelSecondary}>
              {muscles.map(muscleLabel).join(' · ')}
            </Txt>
          )}
        </View>

        {/* Options ------------------------------------------------------------ */}
        <View style={styles.card}>
          <Txt variant="footnote" color={color.labelSecondary} style={styles.caps}>
            GOAL
          </Txt>
          <Segmented options={GOALS.map((item) => ({ value: item.id, label: GOAL_LABEL[item.id] }))} value={goal} onChange={setGoal} />
          <Txt variant="footnote" color={color.labelSecondary} style={styles.caps}>
            LENGTH
          </Txt>
          <Segmented
            options={[
              { value: 4 as Length, label: 'Quick · 4' },
              { value: 6 as Length, label: 'Standard · 6' },
              { value: 8 as Length, label: 'Long · 8' },
            ]}
            value={length}
            onChange={setLength}
          />
          {record && (
            <>
              <Txt variant="footnote" color={color.labelSecondary} style={styles.caps}>
                MACHINES
              </Txt>
              <Segmented
                options={[
                  { value: 'gym' as KitMode, label: `This gym’s (${kit.has.length})` },
                  { value: 'typical' as KitMode, label: 'Typical gym' },
                ]}
                value={effectiveMode}
                onChange={setMode}
              />
            </>
          )}
          <KitNote mode={effectiveMode} has={kit.has} gymName={gymName} />
        </View>

        {!built ? (
          <PrimaryButton
            label={muscles.length ? 'Build my workout' : 'Pick at least one muscle'}
            icon={muscles.length ? 'sparkle' : undefined}
            disabled={muscles.length === 0}
            onPress={() => {
              haptic.success();
              setBuilt(true);
            }}
          />
        ) : (
          <View style={styles.result}>
            <Txt variant="title2">Your workout</Txt>
            <View style={styles.actions}>
              <ActionPill
                label="Shuffle"
                icon="shuffle"
                onPress={() => {
                  haptic.select();
                  setSeed((value) => value + 1);
                }}
              />
              {workout.items.length > 0 && (
                <ActionPill
                  label={saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving…' : `Save${billing.isPro ? '' : ' · Pro'}`}
                  icon={saveState === 'saved' ? 'saved' : 'save'}
                  disabled={saveState === 'saving' || saveState === 'saved'}
                  onPress={() => void saveWorkout()}
                />
              )}
              {workout.items.length > 0 && (
                <ActionPill
                  label="Share"
                  icon="share"
                  onPress={() => void Share.share({ message: workoutText(workout, gymName) }).catch(() => undefined)}
                />
              )}
            </View>

            {muscles.length === 0 && (
              <Txt variant="subhead" color={color.labelSecondary}>
                Pick at least one muscle on the body above.
              </Txt>
            )}
            {workout.uncovered.length > 0 && (
              <View style={styles.warn}>
                <Txt variant="footnote" color={color.maybeInk}>
                  Nothing here trains {workout.uncovered.map(muscleLabel).join(', ').toLowerCase()} with{' '}
                  {effectiveMode === 'gym' ? 'this gym’s confirmed machines' : 'typical gym kit'}.
                  {effectiveMode === 'gym' ? ' Try “Typical gym”.' : ''}
                </Txt>
              </View>
            )}

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
                forGym={record !== null}
              />
            ))}

            {saveState === 'saved' && (
              <Pressable onPress={() => router.push('/workouts')} accessibilityRole="link" style={styles.savedLink}>
                <Txt variant="subhead" color={color.brand} style={face('bold')}>
                  Saved to My workouts ›
                </Txt>
              </Pressable>
            )}
            {saveState !== 'idle' && saveState !== 'saving' && saveState !== 'saved' && (
              <Txt variant="footnote" color={color.dangerInk} style={styles.center}>
                {saveState}
              </Txt>
            )}

            {record && (
              <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
                Seen what machines {gymName} has? Add them on its page so the next plan fits better.
              </Txt>
            )}
            {record && (
              <PrimaryButton
                label="Back to the gym"
                tone="quiet"
                onPress={() => (router.canGoBack() ? router.back() : router.push({ pathname: '/gym/[id]', params: { id: record.location.id } }))}
              />
            )}
          </View>
        )}
        <Txt variant="caption" color={color.labelSecondary} style={styles.center}>
          General training ideas, not medical advice. Warm up, and pick weights you can move well.
        </Txt>
      </ScrollView>
    </>
  );
}

function ActionPill({ label, icon, onPress, disabled = false }: { label: string; icon: IconName; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      hitSlop={4}
      style={({ pressed }) => [styles.pill, pressed && { opacity: 0.7 }, disabled && { opacity: 0.6 }]}
    >
      <Icon name={icon} size={15} color={color.brand} />
      <Txt variant="subhead" color={color.brand} style={face('bold')}>
        {label}
      </Txt>
    </Pressable>
  );
}

function KitNote({ mode, has, gymName }: { mode: KitMode; has: Kit[]; gymName: string | null }) {
  if (!gymName) {
    return (
      <Txt variant="footnote" color={color.labelSecondary}>
        Built for a typical gym: dumbbells, barbells, a bench, cables, a squat rack and the common machines.
      </Txt>
    );
  }
  if (mode === 'gym') {
    return (
      <Txt variant="footnote" color={color.goodInk}>
        ✓ Uses only what {gymName} lists or members report: {has.map((kit) => KIT_LABEL[kit]).join(', ') || 'body weight'}.
      </Txt>
    );
  }
  return (
    <View style={styles.warn}>
      <Txt variant="footnote" color={color.maybeInk}>
        {has.length
          ? `${gymName} has only ${has.length} machine${has.length === 1 ? '' : 's'} confirmed, so this plan assumes a typical gym.`
          : `${gymName} hasn’t published its machines and no member has reported them yet, so this plan assumes a typical gym.`}{' '}
        Anything not confirmed is marked “?”. Check when you get there.
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  page: { flex: 1, backgroundColor: color.groupedBackground },
  content: { padding: space[4], gap: space[4], paddingBottom: space[8], width: '100%', maxWidth: 640, alignSelf: 'center' },
  intro: { gap: 2 },
  card: { backgroundColor: color.background, borderRadius: radius.xl, borderCurve: 'continuous', padding: space[4], gap: space[3] },
  bodyTop: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  genderSwitch: { width: 150 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  caps: { letterSpacing: 0.3, marginBottom: -space[1] },
  warn: { padding: space[3], borderRadius: radius.md, backgroundColor: color.maybeTint },
  result: { gap: space[3] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.pill, backgroundColor: color.brandTint },
  savedLink: { alignSelf: 'center', paddingVertical: space[1] },
  smallButton: { paddingVertical: space[1] },
  exercise: {
    flexDirection: 'row',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    backgroundColor: color.background,
  },
  number: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: color.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2], marginTop: space[2] },
  tag: { paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.pill, backgroundColor: color.brandTint },
});
