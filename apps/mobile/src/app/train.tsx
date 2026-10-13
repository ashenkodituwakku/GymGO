/**
 * Doing a workout: tick each set as you go, with last time's numbers beside
 * it, a rest timer between sets, and the plates to put on the bar. Kept on
 * this device until you finish, then saved to your account, where it shows
 * any records you broke.
 */

import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { CURVES, EASE_IN, EASE_OUT, FADE_IN, POP_IN, Pressable, usePop } from '@/components/motion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glass } from '@/components/Glass';
import { Icon, type IconName } from '@/components/Icon';
import { CountUp } from '@/components/CountUp';
import { HeroMark } from '@/components/HeroMark';
import { useGlassRedraw } from '@/components/Redrawn';
import { Input, PrimaryButton, Segmented, Txt } from '@/components/ui';
import { leadExercise } from '@/lib/exerciseGlyphs';
import { endSession, updateSession, useActiveSession, type ActiveItem } from '@/lib/activeSession';
import { ApiError, api, type SavedWorkout } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { playSound } from '@/lib/sounds';
import { cancelRestAlert, scheduleRestAlert } from '@/lib/restAlert';
import { RECORD_WORD, bestRecord, recordLine } from '@/lib/records';
import { imageShareLine, shareViewAsImage } from '@/lib/shareImage';
import { workoutTitle } from '@/lib/templates';
import { Confetti, RecordCard } from '@/components/Celebrate';
import { alpha } from '@/lib/looks';
import { LOOKS, color, currentLook, face, radius, shadow, space, themed } from '@/lib/theme';
import {
  clockLabel,
  finishedAtFor,
  draftToLogged,
  durationLabel,
  formatWeight,
  fromKg,
  lastTime,
  nextTarget,
  parseReps,
  parseWeight,
  recordsBroken,
  repRange,
  setCount,
  setsSummary,
  toKg,
  unitFor,
  volumeKg,
  weightFor,
  type NewRecord,
  type Target,
  type TrainingSession,
  type WeightUnit,
} from '@/lib/training';
import { PageScroll } from '@/components/PageScroll';
import { ProgressRing } from '@/components/ProgressRing';
import { useOverhang } from '@/lib/layout';
import { libraryDetails, libraryTitle, startSavedWorkout } from '@/lib/savedWorkouts';
import { useTrainingLog } from '@/lib/useTraining';
import { EXERCISES, TYPICAL_KIT, exerciseName, knownKit, swapFor, type Kit } from '@/lib/workout';
import { SwapButton } from '@/components/ExerciseCard';
import { ExerciseTile } from '@/components/ExerciseGlyph';
import { shareText } from '@/lib/actions';
import { workoutShareText } from '@/lib/insights';
import { usePageTitle } from '@/lib/pageTitle';

/** Ticks once a second while something on screen counts. */
function useNow(active: boolean, every = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(timer);
  }, [active, every]);
  return now;
}

const exerciseOf = (id: string) => EXERCISES.find((exercise) => exercise.id === id) ?? null;
/** Done for a time or a distance rather than for reps. */
const isTimed = (item: ActiveItem) => exerciseOf(item.exerciseId)?.cardio === true || repRange(item.reps) === null;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/**
 * With nothing in progress: build a workout, or start one you saved (your
 * library, a Pro feature; what's saved stays startable if Pro ends).
 */
function NoWorkout({ token }: { token: string | null }) {
  const router = useRouter();
  const { prefs } = useApp();
  const [saved, setSaved] = useState<SavedWorkout[] | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      api
        .workouts(token)
        .then((result) => setSaved(result.workouts))
        .catch(() => setSaved(null));
    }, [token]),
  );
  const recent = (saved ?? []).slice(0, 4);
  const details = saved ? libraryDetails(saved) : new Map<string, string>();
  return (
    <PageScroll style={styles.page} contentContainerStyle={[styles.content, styles.noWorkout]}>
      <Stack.Screen options={{ title: 'Workout' }} />
      <View style={styles.noWorkoutHead}>
        <HeroMark icon="workout" />
        <Txt variant="title2">No workout in progress</Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
          {recent.length > 0 ? 'Start one you saved, build a new one, or pick a template.' : 'Build one for your gym, open one you saved, or pick a template (push, pull, legs; 5×5; full body).'}
        </Txt>
      </View>
      {recent.length > 0 && (
        <View style={styles.savedList}>
          <Txt variant="footnote" color={color.labelSecondary} style={styles.savedHeader}>
            YOUR WORKOUTS
          </Txt>
          <View style={styles.savedCard}>
            {recent.map((workout, index) => {
              const title = libraryTitle(workout.name, workout.plan.gymName);
              return (
                <Pressable
                  key={workout.id}
                  onPress={() => {
                    haptic.success();
                    startSavedWorkout(workout, unitFor(prefs.country));
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Start ${title}, ${details.get(workout.id) ?? ''}`}
                  style={({ pressed }) => [styles.savedRow, index > 0 && styles.savedLine, pressed && { backgroundColor: color.fill }]}
                >
                  <ExerciseTile exerciseId={leadExercise(workout.plan.items.map((item) => item.exerciseId))} size={42} />
                  <View style={styles.flex}>
                    <Txt variant="headline" numberOfLines={1}>
                      {title}
                    </Txt>
                    <Txt variant="footnote" color={color.labelSecondary} numberOfLines={2}>
                      {details.get(workout.id)}
                    </Txt>
                  </View>
                  <View style={styles.playDot}>
                    <Icon name="play" size={14} color={color.onBrand} />
                  </View>
                </Pressable>
              );
            })}
          </View>
          {(saved?.length ?? 0) > recent.length && (
            <Pressable onPress={() => router.push('/workouts')} accessibilityRole="link" hitSlop={8} style={styles.seeAll}>
              <Txt variant="subhead" color={color.brand}>
                All {saved!.length} workouts ›
              </Txt>
            </Pressable>
          )}
        </View>
      )}
      <PrimaryButton
        label="Build a workout"
        icon="sparkle"
        tone={recent.length > 0 ? 'quiet' : undefined}
        onPress={() => router.replace({ pathname: '/workout/[id]', params: { id: 'any' } })}
      />
      <PrimaryButton label="Start from a template" icon="list" tone="quiet" onPress={() => router.push('/templates')} />
    </PageScroll>
  );
}

export default function TrainScreen() {
  useGlassRedraw();
  usePageTitle('Workout');
  const session = useActiveSession();
  const { account, billing, openPro, data } = useApp();
  // Kept while the server is away too: loading then fails and says so,
  // where a missing token would ask a signed-in person to sign in.
  const token = account.token;
  const log = useTrainingLog(token);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const page = useOverhang();
  const [done, setDone] = useState<{ session: TrainingSession; records: NewRecord[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const restEndsAt = session?.restEndsAt ?? null;
  // The alert for a locked phone follows the rest: set when it starts or moves, gone when it's skipped or the workout ends.
  const upNextIndex = session?.items.findIndex((item) => item.sets.some((set) => !set.done)) ?? -1;
  const upNext = session?.items[upNextIndex]?.exerciseId ?? null;
  useEffect(() => {
    if (restEndsAt) void scheduleRestAlert(restEndsAt, upNext ? exerciseName(upNext) : null);
    else void cancelRestAlert();
    // Only when the rest itself changes, not with every set typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restEndsAt]);
  // Stable across renders, so a card only redraws when its own sets change.
  const changeSets = useCallback(
    (index: number, sets: ActiveItem['sets']) =>
      updateSession((current) => ({ ...current, items: current.items.map((other, at) => (at === index ? { ...other, sets } : other)) })),
    [],
  );
  const startRest = useCallback(
    (seconds: number) => updateSession((current) => ({ ...current, restEndsAt: seconds > 0 ? Date.now() + seconds * 1000 : null, restTotal: seconds })),
    [],
  );
  // What a swap can use: the gym's machines when it lists enough of them, else a typical gym's (as the builder starts).
  const gymRecord = session?.gymId ? (data.records.find((record) => record.location.id === session.gymId) ?? null) : null;
  const available = useMemo<Kit[]>(() => {
    const kit = knownKit(gymRecord);
    return kit.has.length >= 3 ? kit.has : [...new Set<Kit>([...TYPICAL_KIT.filter((item) => !kit.lacks.includes(item)), ...kit.has])];
  }, [gymRecord]);
  const swapExercise = useCallback(
    (index: number) => {
      haptic.select();
      updateSession((current) => {
        const next = swapFor(current.items, index, available);
        const item = current.items[index];
        if (!next || !item || item.sets.some((set) => set.done)) return current;
        const muscle = item.muscle ?? EXERCISES.find((exercise) => exercise.id === item.exerciseId)?.primary[0];
        const replaced: ActiveItem = { ...item, exerciseId: next.id, ...(muscle ? { muscle } : {}), sets: item.sets.map(() => ({ weight: '', reps: '', done: false })) };
        return { ...current, items: current.items.map((other, at) => (at === index ? replaced : other)) };
      });
    },
    [available],
  );
  const unitNow = session?.unit ?? 'kg';
  const openPlates = useCallback(
    (weight: string | null) => router.push({ pathname: '/plates', params: { weight: weight ?? '', unit: unitNow } }),
    [router, unitNow],
  );
  const showPro = useCallback(() => openPro('progress'), [openPro]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (done) return <Summary result={done} onClose={close} onProgress={() => router.replace('/progress')} />;

  if (!session) return <NoWorkout token={token} />;

  const typedAnyWeight = session.items.some((item) => item.sets.some((set) => set.weight.trim() !== ''));
  const ticked = session.items.reduce((sum, item) => sum + item.sets.filter((set) => set.done).length, 0);
  const planned = session.items.reduce((sum, item) => sum + item.sets.length, 0);
  const named = workoutTitle(session.name);

  const finish = async () => {
    setProblem(null);
    // Timed and distance work (a plank, an incline walk) isn't a set of reps, so it isn't logged as one.
    const exercises = draftToLogged(session.items.filter((item) => !isTimed(item)));
    if (exercises.length === 0) {
      setProblem('Tick at least one set of reps to log this workout, or discard it.');
      return;
    }
    if (!token) {
      setProblem('Sign in (it’s free) to keep your workouts. This one stays on this device until you do.');
      return;
    }
    setSaving(true);
    const body = {
      name: session.name,
      unit: session.unit,
      startedAt: session.startedAt,
      finishedAt: finishedAtFor(session.startedAt, session.lastActiveAt),
      workoutId: session.workoutId,
      gymId: session.gymId,
      exercises,
    };
    try {
      const { session: saved } = await api.logTraining(token, body);
      const records = recordsBroken(saved, log.sessions);
      log.add(saved);
      endSession();
      haptic.success();
      // A new record is worth a fanfare.
      if (records.length > 0) playSound('record', 250);
      setDone({ session: saved, records });
    } catch (error) {
      setProblem(error instanceof ApiError ? error.message : 'Couldn’t reach the GymGO server. Your workout is still here; try again.');
    } finally {
      setSaving(false);
    }
  };


  return (
    <View ref={page.measureRef} onLayout={page.onLayout} style={styles.page}>
      <Stack.Screen options={{ title: '' }} />
      <StayAwake />
      <PageScroll
        style={styles.page}
        contentContainerStyle={styles.content}
        // Room for the rest timer, so it never covers the last set.
        extraBottom={restEndsAt !== null ? 90 : 0}
      >
        <View style={styles.intro}>
          <Txt variant="largeTitle">{named.title}</Txt>
          <Txt variant="subhead" color={color.labelSecondary}>
            {named.plan ? `${named.plan} · ` : ''}
            {session.gymName ? `${session.gymName} · ` : ''}
            <Elapsed since={session.startedAt} /> so far · {ticked} of {planned} sets
          </Txt>
          <SetsBar done={ticked} planned={planned} />
        </View>

        {!typedAnyWeight && (
          <View style={styles.unitRow}>
            <Txt variant="footnote" color={color.labelSecondary}>
              Weights in
            </Txt>
            <View style={styles.unitSwitch}>
              <Segmented
                options={[
                  { value: 'lb', label: 'lb' },
                  { value: 'kg', label: 'kg' },
                ]}
                value={session.unit}
                onChange={(unit: WeightUnit) => updateSession((current) => ({ ...current, unit }))}
              />
            </View>
          </View>
        )}

        {session.items.map((item, index) => (
          <ExerciseLog
            key={`${item.exerciseId}-${index}`}
            index={index}
            item={item}
            unit={session.unit}
            history={log.sessions}
            isPro={billing.isPro}
            onPro={showPro}
            onPlates={openPlates}
            onChange={changeSets}
            onRest={startRest}
            swapTo={item.sets.some((set) => set.done) ? null : (swapFor(session.items, index, available)?.name ?? null)}
            onSwap={swapExercise}
            current={index === upNextIndex}
          />
        ))}

        <View style={styles.finish}>
          <PrimaryButton label={saving ? 'Saving…' : 'Finish workout'} icon="check" disabled={saving} onPress={() => void finish()} />
          {problem && (
            <Txt variant="footnote" color={color.dangerInk} style={styles.center}>
              {problem}
            </Txt>
          )}
          {problem && !token && <PrimaryButton label="Sign in" tone="quiet" onPress={() => router.push('/sign-in')} />}
          <PrimaryButton
            label={confirmDiscard ? 'Tap again to discard it' : 'Discard workout'}
            tone="danger"
            onPress={() => {
              if (!confirmDiscard) return setConfirmDiscard(true);
              endSession();
              close();
            }}
          />
          {log.status === 'error' && (
            <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
              {log.error} Last time’s numbers will show once it’s back.
            </Txt>
          )}
        </View>
      </PageScroll>

      {/* Above the bottom of the screen, even if the page reaches past it. */}
      {restEndsAt !== null && <RestBar endsAt={restEndsAt} total={session.restTotal} bottom={insets.bottom + page.overhang} />}
    </View>
  );
}

// --- One exercise ------------------------------------------------------------------

const ExerciseLog = memo(function ExerciseLog({
  index,
  item,
  unit,
  history,
  isPro,
  onPro,
  onPlates,
  onChange,
  onRest,
  swapTo,
  onSwap,
  current,
}: {
  index: number;
  item: ActiveItem;
  unit: WeightUnit;
  history: TrainingSession[];
  isPro: boolean;
  onPro: () => void;
  onPlates: (weight: string | null) => void;
  onChange: (index: number, sets: ActiveItem['sets']) => void;
  onRest: (seconds: number) => void;
  /** What Swap would put here: only before any of its sets is ticked. */
  swapTo: string | null;
  onSwap: (index: number) => void;
  /** The exercise you're on (the first with a set to tick): its icon moves. */
  current: boolean;
}) {
  // Memoised, so it doesn't redraw with the screen: Liquid Glass reaches its card itself.
  useGlassRedraw();
  const exercise = exerciseOf(item.exerciseId);
  const name = exercise?.name ?? item.exerciseId;
  const timed = isTimed(item);
  const bodyWeight = exercise ? exercise.needs.some((option) => option.length === 0) && !exercise.needs.some((option) => option.length > 0) : false;
  const barbell = exercise ? exercise.needs.some((option) => option.includes('barbells')) : false;
  const last = useMemo(() => lastTime(history, item.exerciseId), [history, item.exerciseId]);
  const target: Target | null = useMemo(() => (isPro && !timed ? nextTarget(last, item.reps, unit) : null), [isPro, timed, last, item.reps, unit]);
  const [hint, setHint] = useState<string | null>(null);

  // What to show until you type: the target, else last time, else the plan.
  const lastWeight = last?.sets.find((set) => set.weight)?.weight ?? null;
  const weightGuess = target?.weight ?? (lastWeight !== null && last ? Number(fromKg(toKg(lastWeight, last.unit), unit).toFixed(1)) : null);
  const repsGuess = target?.reps ?? repRange(item.reps)?.low ?? null;

  const setAt = (at: number, patch: Partial<ActiveItem['sets'][number]>) => onChange(index, item.sets.map((set, i) => (i === at ? { ...set, ...patch } : set)));

  const tick = (at: number) => {
    const set = item.sets[at]!;
    if (set.done) {
      setAt(at, { done: false });
      return;
    }
    const weight = set.weight.trim() || (bodyWeight || timed ? '' : weightFor(item.sets, at, weightGuess));
    const reps = timed ? '1' : set.reps.trim() || (repsGuess !== null ? String(repsGuess) : '');
    if (!timed && (parseReps(reps) === undefined || parseReps(reps) === 0)) return setHint('Type how many reps you did.');
    if (parseWeight(weight) === undefined) return setHint(`That weight doesn’t read as a number of ${unit}.`);
    setHint(null);
    haptic.tap();
    setAt(at, { done: true, weight, reps });
    // Rest after every set but the exercise's last.
    if (at < item.sets.length - 1 && item.restSeconds > 0) onRest(item.restSeconds);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        {/* Turns green once every set is ticked. */}
        <ExerciseTile exerciseId={item.exerciseId} size={52} done={item.sets.length > 0 && item.sets.every((set) => set.done)} moving={current} />
        {/* The name gets the card's full width; Swap and Plates sit on the line under it. */}
        <View style={styles.flex}>
          <Txt variant="eyebrow" color={color.brand} numberOfLines={1}>
            {`${String(index + 1).padStart(2, '0')}  ·  ${item.sets.filter((set) => set.done).length} OF ${item.sets.length} DONE`}
          </Txt>
          <Txt variant="headline">{name}</Txt>
          <View style={styles.metaRow}>
            <Txt variant="footnote" color={color.labelSecondary} style={styles.flex}>
              {timed && item.planned <= 1 ? exercise?.cue ?? item.reps : `${item.planned} × ${item.reps}${item.restSeconds ? ` · rest ${item.restSeconds} s` : ''}`}
            </Txt>
            {swapTo && <SwapButton name={name} swapTo={swapTo} onSwap={() => onSwap(index)} />}
            {barbell && (
              <Pressable
                onPress={() => onPlates(item.sets.find((set) => set.weight.trim())?.weight ?? (weightGuess !== null ? String(weightGuess) : null))}
                accessibilityRole="button"
                accessibilityLabel={`Plates to load on the bar for ${name}`}
                hitSlop={8}
                style={({ pressed }) => [styles.platesButton, pressed && { opacity: 0.6 }]}
              >
                <Icon name="plates" size={15} color={color.brand} />
                <Txt variant="caption" color={color.brand} style={face('semibold')}>
                  Plates
                </Txt>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {!timed && (
        <View style={styles.guides}>
          <Txt variant="footnote" color={color.labelSecondary}>
            {last ? `Last time (${shortDate(last.date)}): ${setsSummary(last.sets, last.unit)}` : 'First time logging this one.'}
          </Txt>
          {target ? (
            <View style={styles.target} accessible accessibilityLabel={`Next target: ${target.weight !== null ? formatWeight(target.weight, unit) + ' for ' : ''}${target.reps} reps. ${target.why}`}>
              <Icon name="target" size={14} color={color.goodInk} />
              <Txt variant="footnote" color={color.goodInk} style={[styles.flex, face('medium')]}>
                Aim: {target.weight !== null ? `${formatWeight(target.weight, unit)} × ` : ''}
                {target.reps}. {target.why}
              </Txt>
            </View>
          ) : (
            !isPro &&
            last && (
              <Pressable onPress={onPro} accessibilityRole="button" accessibilityLabel="Next-session targets are part of GymGO Pro" style={styles.proHint}>
                <Icon name="target" size={13} color={color.brand} />
                <Txt variant="caption" color={color.brand} style={face('semibold')}>
                  What to lift next · Pro
                </Txt>
              </Pressable>
            )
          )}
        </View>
      )}

      {!timed && (
        <View style={styles.setHead}>
          <Txt variant="caption" color={color.labelTertiary} style={styles.setCol}>
            SET
          </Txt>
          <Txt variant="caption" color={color.labelTertiary} style={styles.inputCol}>
            {bodyWeight ? 'ADDED' : unit.toUpperCase()}
          </Txt>
          <View style={styles.times} />
          <Txt variant="caption" color={color.labelTertiary} style={styles.inputCol}>
            REPS
          </Txt>
          <View style={styles.flex} />
          <View style={styles.tickCol} />
        </View>
      )}

      {/* Each control's label names the exercise: moving from field to field,
          a screen reader would otherwise say "Set 1 done" once per exercise. */}
      {item.sets.map((set, at) => (
        <View key={at} style={[styles.setRow, set.done && styles.setDone]}>
          {/* A hold or a run has nothing to type: a set of them reads "Set 2 · 30–45 s". */}
          <Txt variant="subhead" color={color.labelSecondary} style={[timed ? styles.flex : styles.setCol, face('semibold')]}>
            {!timed ? at + 1 : item.sets.length > 1 ? `Set ${at + 1} · ${item.reps}` : 'Done?'}
          </Txt>
          {!timed && (
            <>
              <Input
                value={set.weight}
                onChangeText={(weight) => setAt(at, { weight })}
                placeholder={bodyWeight ? 'BW' : weightFor(item.sets, at, weightGuess) || '—'}
                placeholderTextColor={color.labelTertiary}
                keyboardType="decimal-pad"
                inputMode="decimal"
                editable={!set.done}
                style={[styles.input, set.done && styles.inputDone]}
                accessibilityLabel={`${name}, set ${at + 1} weight in ${unit}${bodyWeight ? ', blank for body weight' : ''}`}
              />
              <Txt variant="subhead" color={color.labelTertiary} style={styles.times}>
                ×
              </Txt>
              <Input
                value={set.reps}
                onChangeText={(reps) => setAt(at, { reps })}
                placeholder={repsGuess !== null ? String(repsGuess) : '—'}
                placeholderTextColor={color.labelTertiary}
                keyboardType="number-pad"
                inputMode="numeric"
                editable={!set.done}
                style={[styles.input, set.done && styles.inputDone]}
                accessibilityLabel={`${name}, set ${at + 1} reps`}
              />
            </>
          )}
          {!timed && <View style={styles.flex} />}
          <Pressable
            onPress={() => tick(at)}
            accessibilityRole="checkbox"
            aria-checked={set.done}
            accessibilityLabel={`${name}, set ${at + 1} done`}
            hitSlop={8}
          >
            <Tick done={set.done} />
          </Pressable>
        </View>
      ))}

      {hint && (
        <Txt variant="footnote" color={color.maybeInk}>
          {hint}
        </Txt>
      )}

      {!timed && (
        <View style={styles.setButtons}>
          <Pressable
            onPress={() => {
              haptic.select();
              const previous = item.sets[item.sets.length - 1];
              onChange(index, [...item.sets, { weight: previous?.weight ?? '', reps: previous?.reps ?? '', done: false }]);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Add a set of ${name}`}
            style={({ pressed }) => [styles.smallButton, pressed && { opacity: 0.6 }]}
          >
            <Icon name="plus" size={13} color={color.brand} />
            <Txt variant="footnote" color={color.brand} style={face('semibold')}>
              Add set
            </Txt>
          </Pressable>
          {item.sets.length > 1 && !item.sets[item.sets.length - 1]!.done && (
            <Pressable
              onPress={() => {
                haptic.select();
                onChange(index, item.sets.slice(0, -1));
              }}
              accessibilityRole="button"
              accessibilityLabel={`Remove the last set of ${name}`}
              style={({ pressed }) => [styles.smallButton, pressed && { opacity: 0.6 }]}
            >
              <Icon name="minus" size={13} color={color.labelSecondary} />
              <Txt variant="footnote" color={color.labelSecondary} style={face('semibold')}>
                Remove set
              </Txt>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
});

/** The set's tick, which pops once when it's ticked. */
const standardLook = () => currentLook() === LOOKS.standard;

/** A ring to tick; ticked, a filled green disc with a white check and a little glow, popping as it lands. */
function Tick({ done }: { done: boolean }) {
  const pop = usePop(done);
  return (
    <Animated.View style={[styles.tick, done ? [styles.tickDone, standardLook() && { boxShadow: `0px 3px 10px ${alpha(color.good, 0.4)}` }] : styles.tickTodo, pop]}>
      {done && <Icon name="check" size={16} color="#FFFFFF" weight="bold" />}
    </Animated.View>
  );
}

// --- Time ------------------------------------------------------------------------

/** The screen stays on while this workout is open, so it isn't locked between sets. */
function StayAwake() {
  useKeepAwake('gymgo-workout', { suppressDeactivateWarnings: true });
  return null;
}

/** "12:04", ticking by itself so the rest of the screen doesn't redraw every second. */
function Elapsed({ since }: { since: string }) {
  const now = useNow(true);
  return <>{clockLabel((now - Date.parse(since)) / 1000)}</>;
}

// --- Rest ------------------------------------------------------------------------

/** Seconds left of a rest ending at `endsAt`, at `at` (both in ms); never below 0. */
const timeLeft = (endsAt: number, at: number) => Math.max(0, (endsAt - at) / 1000);

/** The rest bar rises from the bottom as a rest starts, and sinks away when it's up. */
const REST_IN = (CURVES ? FadeInDown.duration(300).easing(EASE_OUT) : FadeInDown.duration(300)).reduceMotion(ReduceMotion.System);
const REST_OUT = (CURVES ? FadeOutDown.duration(200).easing(EASE_IN) : FadeOutDown.duration(200)).reduceMotion(ReduceMotion.System);

function RestBar({ endsAt, total, bottom }: { endsAt: number; total: number; bottom: number }) {
  const now = useNow(true);
  // The clock as it draws, not at the last tick: a rest started between ticks
  // (the next set ticked, or +15) would otherwise show a second too many.
  const left = timeLeft(endsAt, Math.max(now, Date.now()));
  // Woken exactly when the rest is up, not at the next once-a-second tick.
  const [, wake] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => wake((n) => n + 1), Math.max(0, endsAt - Date.now()) + 15);
    return () => clearTimeout(timer);
  }, [endsAt]);
  const ended = left === 0;
  // The rest is over: a buzz, a chime, and the bar goes. Only this rest is
  // cleared (a set ticked in the same moment has started the next one), and
  // one that ended a while ago, while the phone was locked, goes quietly:
  // the lock-screen alert has already said so.
  useEffect(() => {
    if (!ended) return;
    if (Date.now() - endsAt < 3000) {
      haptic.success();
      playSound('rest-done');
    }
    updateSession((current) => (current.restEndsAt === endsAt ? { ...current, restEndsAt: null } : current), { activity: false });
  }, [ended, endsAt]);
  // What's left as the button is pressed, not at the last tick.
  const leftNow = () => timeLeft(endsAt, Date.now());
  // +15 past the rest's length stretches it (kept with the session, so the
  // ring drains against it after leaving the screen too); −15 leaves it.
  const onChange = (seconds: number) =>
    updateSession((current) => ({ ...current, restEndsAt: seconds > 0 ? Date.now() + seconds * 1000 : null, restTotal: Math.max(current.restTotal, Math.ceil(seconds)) }));
  return (
    // The prop, not a style: inline, a browser drops 'box-none' and the full-width wrap swallowed clicks beside the card.
    <Animated.View entering={REST_IN} exiting={REST_OUT} style={[styles.restWrap, { bottom: bottom + space[3] }]} pointerEvents="box-none">
      <Glass kind="control" style={styles.rest}>
        <View style={styles.restRow}>
          <RestRing endsAt={endsAt} total={total} />
          <View style={styles.flex} accessibilityLiveRegion="polite">
            <Txt variant="caption" color={color.labelSecondary}>
              Rest
            </Txt>
            <Txt variant="figure" style={styles.restClock}>
              {clockLabel(left)}
            </Txt>
          </View>
          <RestButton label="−15" onPress={() => onChange(Math.max(0, leftNow() - 15))} name="Fifteen seconds less" />
          <RestButton label="+15" onPress={() => onChange(leftNow() + 15)} name="Fifteen seconds more" />
          <RestButton label="Skip" onPress={() => onChange(0)} name="Skip the rest" strong />
        </View>
      </Glass>
    </Animated.View>
  );
}

/**
 * What's left of the rest, as a ring round the timer icon. It redraws four
 * times a second by itself, so it drains in small steps (not a jump a
 * second) without redrawing the whole bar.
 */
function RestRing({ endsAt, total }: { endsAt: number; total: number }) {
  const now = useNow(true, 250);
  const left = timeLeft(endsAt, Math.max(now, Date.now()));
  return (
    <ProgressRing size={38} stroke={3} progress={total > 0 ? left / total : 0} track={color.fill} tint={color.brand}>
      <Icon name="timer" size={16} color={color.brand} />
    </ProgressRing>
  );
}

function RestButton({ label, name, onPress, strong = false }: { label: string; name: string; onPress: () => void; strong?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [styles.restButton, strong && styles.restButtonStrong, pressed && { opacity: 0.7 }]}
    >
      <Txt variant="subhead" color={strong ? color.onBrand : color.brand} style={face('semibold')}>
        {label}
      </Txt>
    </Pressable>
  );
}

// --- Done ------------------------------------------------------------------------

function Summary({ result, onClose, onProgress }: { result: { session: TrainingSession; records: NewRecord[] }; onClose: () => void; onProgress: () => void }) {
  const { session, records } = result;
  const unit = session.unit;
  const volume = fromKg(volumeKg(session), unit);
  const [shared, setShared] = useState<string | null>(null);
  const share = async () => {
    const outcome = await shareText(workoutShareText(session, records), session.name);
    setShared(outcome === 'copied' ? 'Copied, ready to paste.' : outcome === 'failed' ? 'Sharing isn’t available here.' : null);
  };
  const best = bestRecord(records);
  const card = useRef<View>(null);
  const [sharingCard, setSharingCard] = useState(false);
  const shareCard = async () => {
    if (!best) return;
    setSharingCard(true);
    const outcome = await shareViewAsImage(card, { name: `record-${exerciseName(best.exerciseId)}`, title: 'My new personal record' });
    setSharingCard(false);
    setShared(imageShareLine(outcome));
  };
  return (
    <View style={styles.page}>
    <PageScroll style={styles.page} contentContainerStyle={[styles.content, styles.summary]}>
      <Stack.Screen options={{ title: '' }} />
      <Animated.View entering={records.length ? POP_IN : FADE_IN}>
        <HeroMark icon={records.length ? 'trophy' : 'check'} tint={records.length ? color.maybe : color.good} size={72} />
      </Animated.View>
      <Txt variant="largeTitle" style={styles.center}>
        {records.length ? `${records.length} new record${records.length === 1 ? '' : 's'}!` : 'Workout done'}
      </Txt>
      <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
        {session.name}
      </Txt>
      {/* The workout in three figures, counting up as the page arrives. */}
      <View style={styles.summaryStats}>
        <SummaryStat icon="timer" label="time" spoken={`Time, ${durationLabel(Date.parse(session.finishedAt) - Date.parse(session.startedAt))}`}>
          <Txt variant="figure">{durationLabel(Date.parse(session.finishedAt) - Date.parse(session.startedAt))}</Txt>
        </SummaryStat>
        <SummaryStat icon="check" label={setCount(session) === 1 ? 'set' : 'sets'} spoken={`${setCount(session)} ${setCount(session) === 1 ? 'set' : 'sets'}`}>
          <CountUp id={`summary.${session.id}.sets`} value={setCount(session)} variant="figure" />
        </SummaryStat>
        {volume > 0 && (
          <SummaryStat icon="plates" label={`${unit} lifted`} spoken={`${Math.round(volume).toLocaleString()} ${unit} lifted`}>
            <CountUp id={`summary.${session.id}.volume`} value={Math.round(volume)} variant="figure" />
          </SummaryStat>
        )}
      </View>
      {records.map((record) => {
        const logged = session.exercises.find((item) => item.exerciseId === record.exerciseId);
        return (
          <View key={`${record.exerciseId}-${record.kind}`} style={styles.record}>
            <Icon name="trophy" size={18} color={color.maybe} />
            <View style={styles.flex}>
              <Txt variant="headline">{exerciseName(record.exerciseId)}</Txt>
              <Txt variant="footnote" color={color.labelSecondary}>
                {RECORD_WORD[record.kind]} · {logged ? setsSummary(logged.sets, unit) : ''}
              </Txt>
            </View>
          </View>
        );
      })}
      {best && (
        <View style={styles.recordCard}>
          <RecordCard
            ref={card}
            exercise={exerciseName(best.exerciseId)}
            line={recordLine(session, best)}
            kind={best.kind}
            date={session.finishedAt}
            more={records.length - 1}
          />
        </View>
      )}
      <View style={styles.finish}>
        {best && <PrimaryButton label="Share your record" icon="share" busy={sharingCard} onPress={() => void shareCard()} />}
        <PrimaryButton label="See your progress" icon="chart" tone={best ? 'quiet' : undefined} onPress={onProgress} />
        <PrimaryButton label="Share this workout" icon="share" tone="quiet" onPress={() => void share()} />
        {shared && (
          <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
            {shared}
          </Txt>
        )}
        <PrimaryButton label="Done" tone="quiet" onPress={onClose} />
      </View>
    </PageScroll>
    {records.length > 0 && <Confetti />}
    </View>
  );
}

/** One of the summary's figures. Read out whole and final (`spoken`), not as it counts up. */
function SummaryStat({ icon, label, spoken, children }: { icon: IconName; label: string; spoken: string; children: ReactNode }) {
  return (
    <View style={styles.summaryStat} accessible accessibilityLabel={spoken}>
      <Icon name={icon} size={16} color={color.brand} />
      {children}
      <Txt variant="caption" color={color.labelSecondary} numberOfLines={1}>
        {label}
      </Txt>
    </View>
  );
}

/** How far through the workout's sets you are, filling as you tick them. */
function SetsBar({ done, planned }: { done: number; planned: number }) {
  const share = planned > 0 ? Math.min(1, done / planned) : 0;
  const shown = useSharedValue(share);
  useEffect(() => {
    shown.value = withTiming(share, { duration: 420, easing: EASE_OUT, reduceMotion: ReduceMotion.System });
  }, [share, shown]);
  const fill = useAnimatedStyle(() => ({ width: `${shown.value * 100}%` }));
  return (
    <View
      style={styles.barTrack}
      accessibilityRole="progressbar"
      accessibilityLabel={`${done} of ${planned} sets done`}
      accessibilityValue={{ min: 0, max: planned, now: done }}
    >
      <Animated.View style={[styles.barFill, fill]} />
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  page: { flex: 1, backgroundColor: color.groupedBackground },
  content: { padding: space[4], gap: space[3], width: '100%', maxWidth: 640, alignSelf: 'center' },
  intro: { gap: 2, marginBottom: space[1] },
  center: { textAlign: 'center' },
  flex: { flex: 1 },
  noWorkout: { flexGrow: 1, justifyContent: 'center', paddingVertical: space[8], gap: space[5] },
  noWorkoutHead: { alignItems: 'center', gap: space[3], paddingHorizontal: space[2] },
  savedList: { gap: space[2] },
  savedHeader: { paddingHorizontal: space[4], letterSpacing: 0.3 },
  savedCard: { backgroundColor: color.plate, borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', ...shadow.plate },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
  savedLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
  playDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: color.brandFill, alignItems: 'center', justifyContent: 'center' },
  seeAll: { alignSelf: 'flex-end', paddingHorizontal: space[4] },
  unitRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  unitSwitch: { width: 140 },
  card: { backgroundColor: color.plate, borderRadius: radius.xl, borderCurve: 'continuous', padding: space[4], gap: space[2], ...shadow.plate },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: space[1] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: 2 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: color.fill, overflow: 'hidden', marginTop: space[2] },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: color.brandFill },
  platesButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space[2], paddingVertical: 6, borderRadius: radius.pill, backgroundColor: color.brandTint },
  guides: { gap: space[1] },
  target: { flexDirection: 'row', alignItems: 'flex-start', gap: space[1], padding: space[2], borderRadius: radius.sm, backgroundColor: color.goodTint },
  proHint: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 2 },
  setHead: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[1] },
  setCol: { width: 36 },
  // Never narrower than the boxes' old fixed 64 points: the spacer beside them gives way first.
  inputCol: { flex: 1, minWidth: 64, maxWidth: 112, textAlign: 'center' },
  times: { width: 10, textAlign: 'center' },
  tickCol: { width: 30 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: 3, paddingHorizontal: space[2], marginHorizontal: -space[2], borderRadius: radius.md, borderCurve: 'continuous' },
  setDone: { backgroundColor: alpha(color.good, 0.08) },
  input: {
    flex: 1,
    // On a narrow phone they shared the room equally with the spacer and cut a weight like 102.5 short.
    minWidth: 64,
    maxWidth: 112,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: color.fill,
    textAlign: 'center',
    fontSize: 17,
    color: color.label,
    ...face('semibold'),
  },
  inputDone: { backgroundColor: color.goodTint, color: color.goodInk },
  tick: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  tickTodo: { borderWidth: 2, borderColor: color.labelTertiary },
  tickDone: { backgroundColor: color.good },
  setButtons: { flexDirection: 'row', gap: space[3], marginTop: space[1] },
  smallButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: space[1] },
  finish: { gap: space[2], marginTop: space[3] },
  recordCard: { marginTop: space[2] },
  restWrap: { position: 'absolute', left: space[4], right: space[4], alignItems: 'center' },
  rest: { width: '100%', maxWidth: 520, borderRadius: radius.xl, overflow: 'hidden' },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[4], paddingVertical: space[3] },
  restClock: { fontVariant: ['tabular-nums'] },
  restButton: { paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.pill, backgroundColor: color.brandTint },
  restButtonStrong: { backgroundColor: color.brandFill },
  summary: { alignItems: 'stretch', paddingTop: space[8] },
  summaryStats: { flexDirection: 'row', gap: space[2], marginVertical: space[2] },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: space[3],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: color.plate,
    ...shadow.plate,
  },
  record: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4], borderRadius: radius.lg, backgroundColor: color.plate, ...shadow.plate },
}));

