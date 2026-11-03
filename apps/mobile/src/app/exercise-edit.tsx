/**
 * An exercise of your own (Pro): its name, the muscles it mainly works and
 * works second, what it needs, whether it's counted in reps or done for a
 * time, how to do it, and which of GymGO's moving icons it borrows (or a
 * plain one). Once kept it's offered beside GymGO's everywhere you pick an
 * exercise, and your records and history for it work like any other's.
 * `id` opens one you made, to change or delete it; deleting keeps its name
 * on workouts you logged with it.
 */

import { cleanOwnExercise, type OwnExerciseFields, type TrainingKit, type TrainingMuscle } from '@gymgo/domain';
import { useLocalSearchParams, usePreventRemove, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ExerciseTile } from '@/components/ExerciseGlyph';
import { Pressable } from '@/components/motion';
import { PageScroll } from '@/components/PageScroll';
import { useGlassRedraw } from '@/components/Redrawn';
import { ScreenOptions } from '@/components/ScreenOptions';
import { Card, Chip, Input, PrimaryButton, Segmented, TextField, Txt } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { askToDiscard } from '@/lib/askToDiscard';
import { matchesQuery } from '@/lib/exerciseLibrary';
import { haptic } from '@/lib/haptics';
import { addOwnExercise, changeOwnExercise, deleteOwnExercise, useOwnTraining } from '@/lib/ownTraining';
import { usePageTitle } from '@/lib/pageTitle';
import { color, face, radius, space, themed } from '@/lib/theme';
import { EXERCISES, KIT_LABEL, MUSCLES, type Kit } from '@/lib/workout';

/** The kit to pick from, the usual first. */
const KIT_ORDER: Kit[] = ['dumbbells', 'barbells', 'bench', 'cable_station', 'squat_rack', 'power_rack', 'smith_machine', 'lat_pulldown', 'leg_press', 'hack_squat', 'lifting_platform', 'treadmill', 'rower', 'assault_bike', 'turf_sled'];

const BLANK: OwnExerciseFields = { name: '', primary: [], secondary: [], kit: [], timed: false, cue: '', drawnAs: null };

export default function ExerciseEditScreen() {
  useGlassRedraw();
  const { id } = useLocalSearchParams<{ id?: string }>();
  usePageTitle(id ? 'Change exercise' : 'Your own exercise');
  const router = useRouter();
  const { account, billing, openPro } = useApp();
  const token = account.token;
  const own = useOwnTraining();
  const existing = id ? (own.exercises.find((exercise) => exercise.id === id && !exercise.archived) ?? null) : null;
  const [draft, setDraft] = useState<OwnExerciseFields | null>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (draft) return;
    if (id && !existing) return;
    const filled: OwnExerciseFields = existing
      ? { name: existing.name, primary: existing.primary, secondary: existing.secondary, kit: existing.kit, timed: existing.timed, cue: existing.cue, drawnAs: existing.drawnAs }
      : BLANK;
    setDraft(filled);
    setOriginal(JSON.stringify(filled));
  }, [id, existing, draft]);

  const changed = draft !== null && original !== null && JSON.stringify(draft) !== original;
  const stopAsking = usePreventRemove(changed && !leaving, ({ repeat }) =>
    askToDiscard(id ? 'this exercise' : 'your exercise', () => {
      setLeaving(true);
      repeat();
    }),
  );

  // Icons to borrow: GymGO's moves for the muscle it mainly works, or any found by name.
  const looks = useMemo(() => {
    if (!draft) return [];
    if (query.trim()) return EXERCISES.filter((exercise) => matchesQuery(exercise, query)).slice(0, 8);
    const main = draft.primary[0];
    const same = main ? EXERCISES.filter((exercise) => exercise.primary.includes(main)) : [];
    const chosen = draft.drawnAs ? EXERCISES.filter((exercise) => exercise.id === draft.drawnAs) : [];
    return [...chosen, ...same.filter((exercise) => exercise.id !== draft.drawnAs)].slice(0, 8);
  }, [draft, query]);

  if (!draft) {
    return (
      <PageScroll style={styles.page} contentContainerStyle={styles.content}>
        <ScreenOptions options={{ title: '' }} />
        <Txt variant="title2" accessibilityRole="header" level={1}>
          {own.fresh || !token ? 'That exercise isn’t in your account' : 'Loading your exercise…'}
        </Txt>
        <PrimaryButton label="Exercises" tone="quiet" onPress={() => router.replace('/exercises')} />
      </PageScroll>
    );
  }

  const set = (patch: Partial<OwnExerciseFields>) => setDraft({ ...draft, ...patch });
  const toggleMain = (muscle: TrainingMuscle) => {
    if (draft.primary.includes(muscle)) return set({ primary: draft.primary.filter((each) => each !== muscle) });
    // Two at most: a third replaces the first picked.
    const primary = [...draft.primary, muscle].slice(-2);
    set({ primary, secondary: draft.secondary.filter((each) => !primary.includes(each)) });
  };
  const toggleSecond = (muscle: TrainingMuscle) =>
    set({ secondary: draft.secondary.includes(muscle) ? draft.secondary.filter((each) => each !== muscle) : [...draft.secondary, muscle].slice(-4) });
  const toggleKit = (kit: TrainingKit) => set({ kit: draft.kit.includes(kit) ? draft.kit.filter((each) => each !== kit) : [...draft.kit, kit].slice(-3) });

  const save = async () => {
    if (!billing.isPro || !token) return openPro('exercises');
    const checked = cleanOwnExercise(draft);
    if (!checked.ok) {
      haptic.warn();
      return setProblem(checked.problem);
    }
    // One of GymGO's names would make two of the same in every list.
    if (EXERCISES.some((exercise) => exercise.name.toLowerCase() === checked.value.name.toLowerCase())) {
      haptic.warn();
      return setProblem(`GymGO already has “${checked.value.name}”: pick it from the list, or give yours a name of its own.`);
    }
    setProblem(null);
    setSaving(true);
    try {
      const kept = existing ? await changeOwnExercise(token, existing.id, checked.value) : await addOwnExercise(token, checked.value);
      haptic.success();
      setLeaving(true);
      stopAsking();
      if (existing) router.canGoBack() ? router.back() : router.replace('/exercises');
      else router.replace({ pathname: '/progress/[exercise]', params: { exercise: kept.id } });
    } catch (error) {
      setProblem(error instanceof ApiError ? error.message : 'Couldn’t reach the GymGO server. Your exercise is still here; try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing || !token) return;
    if (!deleting) return setDeleting(true);
    try {
      await deleteOwnExercise(token, existing.id);
      haptic.success();
      setLeaving(true);
      stopAsking();
      router.replace('/exercises');
    } catch {
      setProblem('Couldn’t delete it just now. Try again.');
    }
  };

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenOptions options={{ title: '' }} />
      <View style={styles.intro}>
        <Txt variant="largeTitle" accessibilityRole="header" level={1}>
          {id ? 'Change exercise' : 'Your own exercise'}
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary}>
          For a move GymGO doesn’t list. It’s offered beside GymGO’s wherever you pick one, with its own records and history.
        </Txt>
      </View>

      <Card style={styles.card}>
        <TextField label="Name" inSheet={false} value={draft.name} onChangeText={(name) => set({ name })} maxLength={60} placeholder="Landmine press" />
        <View style={styles.field}>
          <Txt variant="footnote" color={color.labelSecondary}>
            Counted in
          </Txt>
          <Segmented
            options={[
              { value: 'reps', label: 'Reps' },
              { value: 'time', label: 'Time (a hold)' },
            ]}
            value={draft.timed ? 'time' : 'reps'}
            onChange={(value: string) => set({ timed: value === 'time' })}
          />
        </View>
      </Card>

      <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
        MAINLY WORKS · ONE OR TWO
      </Txt>
      <View style={styles.chips} accessibilityLabel="The muscles it mainly works">
        {MUSCLES.map((muscle) => (
          <Chip key={muscle.id} label={muscle.label} selected={draft.primary.includes(muscle.id)} onPress={() => toggleMain(muscle.id)} />
        ))}
      </View>

      <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
        ALSO WORKS · UP TO FOUR, IF ANY
      </Txt>
      <View style={styles.chips} accessibilityLabel="The muscles it works second">
        {MUSCLES.filter((muscle) => !draft.primary.includes(muscle.id)).map((muscle) => (
          <Chip key={muscle.id} label={muscle.label} selected={draft.secondary.includes(muscle.id)} onPress={() => toggleSecond(muscle.id)} />
        ))}
      </View>

      <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
        {`NEEDS · ${draft.kit.length === 0 ? 'NOTHING: BODY WEIGHT' : 'UP TO THREE'}`}
      </Txt>
      <View style={styles.chips} accessibilityLabel="What it needs">
        {KIT_ORDER.map((kit) => (
          <Chip key={kit} label={KIT_LABEL[kit]} selected={draft.kit.includes(kit)} onPress={() => toggleKit(kit)} />
        ))}
      </View>

      <Card style={styles.card}>
        <Txt variant="footnote" color={color.labelSecondary}>
          How to do it (optional)
        </Txt>
        <Input
          value={draft.cue}
          onChangeText={(cue) => set({ cue })}
          placeholder="Feet planted, press up and out from one shoulder."
          multiline
          maxLength={200}
          accessibilityLabel="How to do it, in your words"
          style={styles.cue}
        />
      </Card>

      <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
        ITS ICON
      </Txt>
      <Card style={styles.card}>
        <View style={styles.preview}>
          <ExerciseTile exerciseId={draft.drawnAs ?? 'mine-preview'} size={56} moving={draft.drawnAs !== null} />
          <Txt variant="subhead" color={color.labelSecondary} style={styles.flex}>
            {draft.drawnAs ? `Moves like ${EXERCISES.find((exercise) => exercise.id === draft.drawnAs)?.name ?? 'that exercise'}.` : 'A plain one, or borrow the moving icon of a GymGO exercise that looks like it.'}
          </Txt>
        </View>
        <View style={styles.search}>
          <Input value={query} onChangeText={setQuery} placeholder="Find one by name" autoCorrect={false} autoCapitalize="none" accessibilityLabel="Find a GymGO exercise whose icon it borrows" style={styles.searchInput} />
        </View>
        <View style={styles.looks} role="radiogroup" accessibilityLabel="Its icon">
          <LookChoice label="Plain" exerciseId="mine-plain" selected={draft.drawnAs === null} onPress={() => set({ drawnAs: null })} />
          {looks.map((exercise) => (
            <LookChoice key={exercise.id} label={exercise.name} exerciseId={exercise.id} selected={draft.drawnAs === exercise.id} onPress={() => set({ drawnAs: exercise.id })} />
          ))}
        </View>
        {looks.length === 0 && (
          <Txt variant="footnote" color={color.labelSecondary}>
            {query.trim() ? 'No GymGO exercise by that name.' : 'Pick the muscle it mainly works to see some.'}
          </Txt>
        )}
      </Card>

      <View style={styles.actions}>
        {problem && (
          <Txt variant="footnote" color={color.dangerInk} style={styles.center}>
            {problem}
          </Txt>
        )}
        <PrimaryButton label={saving ? 'Saving…' : existing ? 'Save changes' : billing.isPro ? 'Keep this exercise' : 'Keep this exercise · Pro'} icon="save" disabled={saving} onPress={() => void save()} />
        {existing && <PrimaryButton label={deleting ? 'Tap again to delete it' : 'Delete this exercise'} icon="trash" tone="danger" onPress={() => void remove()} />}
        {existing && (
          <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
            Deleted, it’s no longer offered; workouts you logged with it keep its name.
          </Txt>
        )}
      </View>
    </PageScroll>
  );
}

function LookChoice({ label, exerciseId, selected, onPress }: { label: string; exerciseId: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="radio"
      aria-checked={selected}
      accessibilityLabel={label === 'Plain' ? 'A plain icon' : `Moves like ${label}`}
      style={({ pressed }) => [styles.look, selected && styles.lookOn, pressed && { opacity: 0.7 }]}
    >
      <ExerciseTile exerciseId={exerciseId} size={44} />
      <Txt variant="caption" numberOfLines={2} style={[styles.lookLabel, selected && face('semibold')]}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: 640, alignSelf: 'center' },
    intro: { gap: space[1] },
    card: { gap: space[3] },
    field: { gap: 6 },
    section: { marginTop: space[2], marginLeft: space[4] },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    cue: { minHeight: 72, padding: space[3], borderRadius: radius.md, backgroundColor: color.fill, color: color.label, fontSize: 15, textAlignVertical: 'top' },
    preview: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    flex: { flex: 1, minWidth: 0 },
    search: { paddingHorizontal: space[3], minHeight: 40, borderRadius: radius.pill, backgroundColor: color.fill, justifyContent: 'center' },
    searchInput: { fontSize: 16, color: color.label, borderWidth: 0, paddingVertical: space[2] },
    looks: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    look: { width: 76, alignItems: 'center', gap: 4, padding: 6, borderRadius: radius.md, borderWidth: 2, borderColor: 'transparent' },
    lookOn: { borderColor: color.brand, backgroundColor: color.brandTint },
    lookLabel: { textAlign: 'center' },
    actions: { gap: space[2], marginTop: space[2] },
    center: { textAlign: 'center' },
  }),
);
