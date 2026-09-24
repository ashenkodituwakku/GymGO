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
import { Chip, PrimaryButton, Segmented, Txt } from '@/components/ui';
import { api } from '@/lib/api';
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

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, account } = useApp();
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
                label={`${preset.emoji} ${preset.label}`}
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
          <Segmented options={GOALS.map((item) => ({ value: item.id, label: item.label }))} value={goal} onChange={setGoal} />
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
            label={muscles.length ? '✨ Build my workout' : 'Pick at least one muscle'}
            disabled={muscles.length === 0}
            onPress={() => {
              haptic.success();
              setBuilt(true);
            }}
          />
        ) : (
          <View style={styles.result}>
            <View style={styles.resultHead}>
              <Txt variant="title2" style={styles.flex}>
                Your workout
              </Txt>
              <Pressable
                onPress={() => {
                  haptic.select();
                  setSeed((value) => value + 1);
                }}
                accessibilityRole="button"
                hitSlop={8}
                style={({ pressed }) => [styles.smallButton, pressed && { opacity: 0.7 }]}
              >
                <Txt variant="subhead" color={color.brand} style={face('bold')}>
                  🔀 Shuffle
                </Txt>
              </Pressable>
              {workout.items.length > 0 && (
                <Pressable
                  onPress={() => void Share.share({ message: workoutText(workout, gymName) }).catch(() => undefined)}
                  accessibilityRole="button"
                  hitSlop={8}
                  style={({ pressed }) => [styles.smallButton, pressed && { opacity: 0.7 }]}
                >
                  <Txt variant="subhead" color={color.brand} style={face('bold')}>
                    Share
                  </Txt>
                </Pressable>
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
              <View key={`${item.exercise.id}-${index}`} style={styles.exercise}>
                <View style={styles.number}>
                  <Txt variant="subhead" color={color.onBrand} style={face('bold')}>
                    {index + 1}
                  </Txt>
                </View>
                <View style={styles.flex}>
                  <Txt variant="headline">{item.exercise.name}</Txt>
                  <Txt variant="subhead" color={color.brand} style={face('bold')}>
                    {item.exercise.cardio ? 'Finisher' : `${item.sets} × ${item.reps} · rest ${item.restSeconds} s`}
                  </Txt>
                  <Txt variant="footnote" color={color.labelSecondary}>
                    {item.exercise.cue}
                  </Txt>
                  <View style={styles.meta}>
                    {item.exercise.primary.map((muscle) => (
                      <View key={muscle} style={styles.tag}>
                        <Txt variant="caption" color={color.brand}>
                          {muscleLabel(muscle)}
                        </Txt>
                      </View>
                    ))}
                    <KitUsed uses={item.uses} confirmed={item.confirmed} forGym={record !== null} />
                  </View>
                </View>
              </View>
            ))}

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
        <Txt variant="caption" color={color.labelTertiary} style={styles.center}>
          General training ideas, not medical advice. Warm up, and pick weights you can move well.
        </Txt>
      </ScrollView>
    </>
  );
}

function KitUsed({ uses, confirmed, forGym }: { uses: Kit[]; confirmed: boolean; forGym: boolean }) {
  const names = uses.map((kit) => KIT_LABEL[kit]).join(' + ');
  if (uses.length === 0) {
    return (
      <Txt variant="caption" color={color.goodInk}>
        ✓ Body weight
      </Txt>
    );
  }
  if (!forGym) {
    return (
      <Txt variant="caption" color={color.labelSecondary}>
        🏋️ {names}
      </Txt>
    );
  }
  return (
    <Txt variant="caption" color={confirmed ? color.goodInk : color.maybeInk}>
      {confirmed ? `✓ ${names}` : `? ${names} (not confirmed here)`}
    </Txt>
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
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
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
