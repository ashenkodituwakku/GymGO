/**
 * Doing a workout: tick each set as you go, with last time's numbers beside
 * it, a rest timer between sets, and the plates to put on the bar. Kept on
 * this device until you finish, then saved to your account, where it shows
 * any records you broke.
 */

import { Stack, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOutDown, ReduceMotion, ZoomIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { FADE_IN, usePop } from '@/components/motion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glass } from '@/components/Glass';
import { Icon } from '@/components/Icon';
import { Input, PrimaryButton, Segmented, Txt } from '@/components/ui';
import { endSession, updateSession, useActiveSession, type ActiveItem } from '@/lib/activeSession';
import { ApiError, api } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { CHILD_TOUCH, color, face, radius, space, themed } from '@/lib/theme';
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
  volumeKg,
  weightFor,
  type NewRecord,
  type Target,
  type TrainingSession,
  type WeightUnit,
} from '@/lib/training';
import { useTrainingLog } from '@/lib/useTraining';
import { EXERCISES } from '@/lib/workout';
import { usePageTitle } from '@/lib/pageTitle';

/** Ticks once a second while something on screen counts. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

const exerciseOf = (id: string) => EXERCISES.find((exercise) => exercise.id === id) ?? null;
/** Done for a time or a distance rather than for reps. */
const isTimed = (item: ActiveItem) => exerciseOf(item.exerciseId)?.cardio === true || repRange(item.reps) === null;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export default function TrainScreen() {
  usePageTitle('Workout');
  const session = useActiveSession();
  const { account, billing, openPro } = useApp();
  const token = account.state === 'signed_in' ? account.token : null;
  const log = useTrainingLog(token);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [done, setDone] = useState<{ session: TrainingSession; records: NewRecord[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const restEndsAt = session?.restEndsAt ?? null;
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
  const unitNow = session?.unit ?? 'kg';
  const openPlates = useCallback(
    (weight: string | null) => router.push({ pathname: '/plates', params: { weight: weight ?? '', unit: unitNow } }),
    [router, unitNow],
  );
  const showPro = useCallback(() => openPro('progress'), [openPro]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (done) return <Summary result={done} onClose={close} onProgress={() => router.replace('/progress')} />;

  if (!session) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: 'Workout' }} />
        <Icon name="workout" size={34} color={color.brand} />
        <Txt variant="title2">No workout in progress</Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
          Build one for your gym, or open one you saved, and tap Start.
        </Txt>
        <PrimaryButton label="Build a workout" icon="sparkle" onPress={() => router.replace({ pathname: '/workout/[id]', params: { id: 'any' } })} />
      </View>
    );
  }

  const typedAnyWeight = session.items.some((item) => item.sets.some((set) => set.weight.trim() !== ''));
  const ticked = session.items.reduce((sum, item) => sum + item.sets.filter((set) => set.done).length, 0);
  const planned = session.items.reduce((sum, item) => sum + item.sets.length, 0);

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
      setDone({ session: saved, records });
    } catch (error) {
      setProblem(error instanceof ApiError ? error.message : 'Couldn’t reach the GymGO server. Your workout is still here; try again.');
    } finally {
      setSaving(false);
    }
  };


  return (
    <View style={styles.page}>
      <Stack.Screen options={{ title: '' }} />
      <StayAwake />
      <ScrollView
        style={styles.page}
        contentContainerStyle={[styles.content, { paddingBottom: space[8] + (restEndsAt !== null ? 90 : 0) + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.intro}>
          <Txt variant="largeTitle">{session.name}</Txt>
          <Txt variant="subhead" color={color.labelSecondary}>
            {session.gymName ? `${session.gymName} · ` : ''}
            <Elapsed since={session.startedAt} /> so far · {ticked} of {planned} sets
          </Txt>
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
      </ScrollView>

      {restEndsAt !== null && <RestBar endsAt={restEndsAt} total={session.restTotal} bottom={insets.bottom} />}
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
}) {
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
        <View style={styles.number}>
          <Txt variant="footnote" color={color.brand} style={face('semibold')}>
            {index + 1}
          </Txt>
        </View>
        <View style={styles.flex}>
          <Txt variant="headline">{name}</Txt>
          <Txt variant="footnote" color={color.labelSecondary}>
            {timed ? exercise?.cue ?? item.reps : `${item.planned} × ${item.reps}${item.restSeconds ? ` · rest ${item.restSeconds} s` : ''}`}
          </Txt>
        </View>
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
          <Txt variant="caption" color={color.labelTertiary} style={styles.inputCol}>
            REPS
          </Txt>
        </View>
      )}

      {/* Each control's label names the exercise: moving from field to field,
          a screen reader would otherwise say "Set 1 done" once per exercise. */}
      {item.sets.map((set, at) => (
        <View key={at} style={[styles.setRow, set.done && styles.setDone]}>
          <Txt variant="subhead" color={color.labelSecondary} style={[styles.setCol, face('semibold')]}>
            {timed ? 'Done?' : at + 1}
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
              <Txt variant="subhead" color={color.labelTertiary}>
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
          <View style={styles.flex} />
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
function Tick({ done }: { done: boolean }) {
  const pop = usePop(done);
  return (
    <Animated.View style={pop}>
      <Icon name={done ? 'done' : 'todo'} size={30} color={done ? color.good : color.labelTertiary} />
    </Animated.View>
  );
}

/** The rest bar's fill, draining smoothly (not a step a second) until the rest is up. */
function Drain({ endsAt, total }: { endsAt: number; total: number }) {
  const share = useSharedValue(total > 0 ? Math.min(1, Math.max(0, (endsAt - Date.now()) / (total * 1000))) : 0);
  useEffect(() => {
    const left = Math.max(0, endsAt - Date.now());
    share.value = total > 0 ? Math.min(1, left / (total * 1000)) : 0;
    share.value = withTiming(0, { duration: left, easing: Easing.linear });
  }, [endsAt, total, share]);
  const fill = useAnimatedStyle(() => ({ width: `${share.value * 100}%` }));
  return <Animated.View style={[styles.restFill, fill]} />;
}

// --- Time ------------------------------------------------------------------------

/** "12:04", ticking by itself so the rest of the screen doesn't redraw every second. */
/** The screen stays on while this workout is open, so it isn't locked between sets. */
function StayAwake() {
  useKeepAwake('gymgo-workout', { suppressDeactivateWarnings: true });
  return null;
}

function Elapsed({ since }: { since: string }) {
  const now = useNow(true);
  return <>{clockLabel((now - Date.parse(since)) / 1000)}</>;
}

// --- Rest ------------------------------------------------------------------------

function RestBar({ endsAt, total, bottom }: { endsAt: number; total: number; bottom: number }) {
  const now = useNow(true);
  // The clock as it draws, not at the last tick: a rest started between ticks
  // (the next set ticked, or +15) would otherwise show a second too many.
  const left = Math.max(0, (endsAt - Math.max(now, Date.now())) / 1000);
  // The rest is over: a buzz, and the bar goes.
  useEffect(() => {
    if (now >= endsAt) {
      haptic.success();
      updateSession((current) => ({ ...current, restEndsAt: null }), { activity: false });
    }
  }, [now, endsAt]);
  const onChange = (seconds: number) => updateSession((current) => ({ ...current, restEndsAt: seconds > 0 ? Date.now() + seconds * 1000 : null }));
  return (
    <Animated.View entering={FadeInDown} exiting={FadeOutDown} style={[CHILD_TOUCH, styles.restWrap, { bottom: bottom + space[3] }]}>
      <Glass kind="control" style={styles.rest}>
        <View style={styles.restTrack}>
          <Drain endsAt={endsAt} total={total} />
        </View>
        <View style={styles.restRow}>
          <Icon name="timer" size={18} color={color.brand} />
          <View style={styles.flex} accessibilityLiveRegion="polite">
            <Txt variant="caption" color={color.labelSecondary}>
              Rest
            </Txt>
            <Txt variant="figure" style={styles.restClock}>
              {clockLabel(left)}
            </Txt>
          </View>
          <RestButton label="−15" onPress={() => onChange(Math.max(0, left - 15))} name="Fifteen seconds less" />
          <RestButton label="+15" onPress={() => onChange(left + 15)} name="Fifteen seconds more" />
          <RestButton label="Skip" onPress={() => onChange(0)} name="Skip the rest" strong />
        </View>
      </Glass>
    </Animated.View>
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

const RECORD_WORD: Record<NewRecord['kind'], string> = { heaviest: 'Heaviest yet', e1rm: 'Strongest set yet', reps: 'Most reps yet' };

function Summary({ result, onClose, onProgress }: { result: { session: TrainingSession; records: NewRecord[] }; onClose: () => void; onProgress: () => void }) {
  const { session, records } = result;
  const unit = session.unit;
  const volume = fromKg(volumeKg(session), unit);
  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, styles.summary]}>
      <Stack.Screen options={{ title: '' }} />
      <Animated.View entering={records.length ? ZoomIn.springify().damping(12).stiffness(180).reduceMotion(ReduceMotion.System) : FADE_IN} style={styles.bigIcon}>
        <Icon name={records.length ? 'trophy' : 'done'} size={40} color={records.length ? color.maybe : color.good} />
      </Animated.View>
      <Txt variant="largeTitle" style={styles.center}>
        {records.length ? `${records.length} new record${records.length === 1 ? '' : 's'}!` : 'Workout done'}
      </Txt>
      <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
        {[session.name, durationLabel(Date.parse(session.finishedAt) - Date.parse(session.startedAt)), `${setCount(session)} set${setCount(session) === 1 ? '' : 's'}`, volume > 0 ? `${Math.round(volume).toLocaleString()} ${unit} lifted` : null]
          .filter(Boolean)
          .join(' · ')}
      </Txt>
      {records.map((record) => {
        const logged = session.exercises.find((item) => item.exerciseId === record.exerciseId);
        return (
          <View key={`${record.exerciseId}-${record.kind}`} style={styles.record}>
            <Icon name="trophy" size={18} color={color.maybe} />
            <View style={styles.flex}>
              <Txt variant="headline">{exerciseOf(record.exerciseId)?.name ?? record.exerciseId}</Txt>
              <Txt variant="footnote" color={color.labelSecondary}>
                {RECORD_WORD[record.kind]} · {logged ? setsSummary(logged.sets, unit) : ''}
              </Txt>
            </View>
          </View>
        );
      })}
      <View style={styles.finish}>
        <PrimaryButton label="See your progress" icon="chart" onPress={onProgress} />
        <PrimaryButton label="Done" tone="quiet" onPress={onClose} />
      </View>
    </ScrollView>
  );
}

const styles = themed(() => StyleSheet.create({
  page: { flex: 1, backgroundColor: color.groupedBackground },
  content: { padding: space[4], gap: space[3], width: '100%', maxWidth: 640, alignSelf: 'center' },
  intro: { gap: 2, marginBottom: space[1] },
  center: { textAlign: 'center' },
  flex: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6], backgroundColor: color.groupedBackground },
  unitRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  unitSwitch: { width: 140 },
  card: { backgroundColor: color.card, borderRadius: radius.lg, borderCurve: 'continuous', padding: space[4], gap: space[2] },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  number: { width: 28, height: 28, borderRadius: 14, backgroundColor: color.brandTint, alignItems: 'center', justifyContent: 'center' },
  platesButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space[2], paddingVertical: 6, borderRadius: radius.pill, backgroundColor: color.brandTint },
  guides: { gap: space[1] },
  target: { flexDirection: 'row', alignItems: 'flex-start', gap: space[1], padding: space[2], borderRadius: radius.sm, backgroundColor: color.goodTint },
  proHint: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 2 },
  setHead: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[1] },
  setCol: { width: 44 },
  inputCol: { width: 76, textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: 2, borderRadius: radius.sm },
  setDone: { opacity: 0.85 },
  input: {
    width: 64,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: color.fill,
    textAlign: 'center',
    fontSize: 17,
    color: color.label,
    ...face('semibold'),
  },
  inputDone: { backgroundColor: color.goodTint, color: color.goodInk },
  setButtons: { flexDirection: 'row', gap: space[3], marginTop: space[1] },
  smallButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: space[1] },
  finish: { gap: space[2], marginTop: space[3] },
  restWrap: { position: 'absolute', left: space[4], right: space[4], alignItems: 'center' },
  rest: { width: '100%', maxWidth: 520, borderRadius: radius.xl, overflow: 'hidden' },
  restTrack: { height: 3, backgroundColor: color.fill },
  restFill: { height: 3, backgroundColor: color.brand },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[4], paddingVertical: space[3] },
  restClock: { fontVariant: ['tabular-nums'] },
  restButton: { paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.pill, backgroundColor: color.brandTint },
  restButtonStrong: { backgroundColor: color.brandFill },
  summary: { alignItems: 'stretch', paddingTop: space[8] },
  bigIcon: { alignSelf: 'center', width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: color.card },
  record: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4], borderRadius: radius.lg, backgroundColor: color.card },
}));

