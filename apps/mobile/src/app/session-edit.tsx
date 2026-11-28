/**
 * Changing a workout after it's logged (Progress → a workout → Edit): its
 * name, how long it took, the unit, and every set: weight, reps, kind and
 * RPE, sets added or removed, exercises added or removed. Saved to your
 * account (PATCH /api/training/:id), checked as a new workout is, and your
 * records and totals follow, since they're worked out from the log. The day
 * and start time can change too, picked on a small calendar and typed, so
 * a workout logged late (or on the wrong day) goes on the day it was.
 * Leaving with changes not saved (back, a swipe, Cancel, closing the tab)
 * asks first.
 */

import { useLocalSearchParams, usePreventRemove, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { AddExercise } from '@/components/AddExercise';
import { ChoiceSheet } from '@/components/ChoiceSheet';
import { ExerciseTile } from '@/components/ExerciseGlyph';
import { Icon } from '@/components/Icon';
import { MonthGrid } from '@/components/MonthGrid';
import { FADE_IN, Pressable } from '@/components/motion';
import { PageScroll } from '@/components/PageScroll';
import { useGlassRedraw } from '@/components/Redrawn';
import { ScreenOptions } from '@/components/ScreenOptions';
import { KIND_INK, KIND_MESSAGE, KIND_OPTIONS, RpeCell, RpeHead, RpePicker, askSetKindNatively } from '@/components/SetKinds';
import { ListSkeleton } from '@/components/Skeleton';
import { Input, PrimaryButton, Segmented, TextField, Txt, LiveLine, useAnnouncer } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { askToDiscard } from '@/lib/askToDiscard';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { calendarMonth, dayFromKey, dayKey, dayWords, shiftMonth, shortDay } from '@/lib/calendar';
import { checkEdits, clockText, draftsOf, minutesOf, whenFor, type EditedExercise } from '@/lib/sessionEdit';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { setTags, type DraftSet, type SetKind, type WeightUnit } from '@/lib/training';
import { useTrainingLog } from '@/lib/useTraining';
import { exerciseName, exerciseById, setMeasure, tracksDistance } from '@/lib/workout';

interface Draft {
  name: string;
  unit: WeightUnit;
  minutes: string;
  /** The day it started, "2026-11-24", and the time, as typed. */
  day: string;
  start: string;
  exercises: EditedExercise[];
}

type SetAt = { exercise: number; set: number };

/** Body-weight only: its weight column is weight added (a vest, a belt), blank for none. */
const bodyWeightOnly = (exerciseId: string) => {
  const exercise = exerciseById(exerciseId);
  return exercise ? exercise.needs.some((option) => option.length === 0) && !exercise.needs.some((option) => option.length > 0) : false;
};

export default function SessionEditScreen() {
  useGlassRedraw();
  usePageTitle('Edit workout');
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { account, prefs } = useApp();
  const token = account.token;
  const log = useTrainingLog(token);
  const router = useRouter();
  const session = log.sessions.find((item) => item.id === id) ?? null;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [typing, setTyping] = useState<SetAt | null>(null);
  const [rating, setRating] = useState<SetAt | null>(null);
  // The small calendar for the day, open or not, and the month it shows.
  const [pickingDay, setPickingDay] = useState(false);
  // Where an exercise moved, said to a screen reader.
  const { say, region } = useAnnouncer();
  const [shownMonth, setShownMonth] = useState<{ year: number; month: number } | null>(null);
  // The workout as it was logged, to tell whether anything's been changed.
  const [original, setOriginal] = useState<string | null>(null);
  // Saved, or discarded on purpose: leaving no longer asks.
  const [leaving, setLeaving] = useState(false);

  // Filled from the log once it's there; never again, so typing isn't undone by a reload.
  useEffect(() => {
    if (session && !draft) {
      const started = new Date(session.startedAt);
      const filled = { name: session.name, unit: session.unit, minutes: String(minutesOf(session)), day: dayKey(started), start: clockText(started), exercises: draftsOf(session) };
      setDraft(filled);
      setOriginal(JSON.stringify(filled));
    }
  }, [session, draft]);

  const changed = draft !== null && original !== null && JSON.stringify(draft) !== original;
  // Back, a swipe, Cancel or closing the tab with changes not saved: ask before they're lost.
  const stopAsking = usePreventRemove(changed && !leaving, ({ repeat }) =>
    askToDiscard('this workout', () => {
      setLeaving(true);
      repeat();
    }),
  );

  const inWorkout = useMemo(() => draft?.exercises.map((item) => item.exerciseId) ?? [], [draft?.exercises]);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/progress'));

  if (!token) {
    return (
      <PageScroll style={styles.page} contentContainerStyle={styles.content}>
        <ScreenOptions options={{ title: '' }} />
        <Txt variant="subhead" color={color.labelSecondary}>
          Sign in to change your workouts.
        </Txt>
        <PrimaryButton label="Sign in" onPress={() => router.push('/sign-in')} />
      </PageScroll>
    );
  }
  if (!session || !draft) {
    return (
      <PageScroll style={styles.page} contentContainerStyle={styles.content}>
        <ScreenOptions options={{ title: '' }} />
        {log.status === 'loading' || (session && !draft) ? (
          <ListSkeleton rows={3} label="Loading the workout" />
        ) : (
          <>
            <Txt variant="title2" accessibilityRole="header" level={1}>
              That workout isn’t in your log
            </Txt>
            <Txt variant="subhead" color={color.labelSecondary}>
              {log.error ?? 'It may have been deleted on another device.'}
            </Txt>
            <PrimaryButton label="Back to Progress" tone="quiet" onPress={() => router.replace('/progress')} />
          </>
        )}
      </PageScroll>
    );
  }

  const changeSets = (exercise: number, sets: DraftSet[]) =>
    setDraft((current) => current && { ...current, exercises: current.exercises.map((item, at) => (at === exercise ? { ...item, sets } : item)) });
  const changeSet = (where: SetAt, patch: (set: DraftSet) => DraftSet) =>
    changeSets(
      where.exercise,
      draft.exercises[where.exercise]!.sets.map((set, at) => (at === where.set ? patch(set) : set)),
    );
  const setKind = (where: SetAt, kind: SetKind | 'normal') => {
    changeSet(where, (set) => {
      // A warm-up is meant to be easy, so it has no RPE: one given before goes.
      const { kind: _old, rpe, ...rest } = set;
      if (kind === 'normal') return { ...rest, ...(rpe !== undefined ? { rpe } : {}) };
      return { ...rest, kind, ...(rpe !== undefined && kind !== 'warmup' ? { rpe } : {}) };
    });
    if (kind === 'warmup' && rating?.exercise === where.exercise && rating.set === where.set) setRating(null);
  };
  const setRpe = (where: SetAt, rpe: number | null) => {
    changeSet(where, (set) => {
      const { rpe: _old, ...rest } = set;
      return rpe === null ? rest : { ...rest, rpe };
    });
    setRating(null);
  };
  const pickKind = (where: SetAt, title: string) => {
    if (!askSetKindNatively(title, (kind) => setKind(where, kind))) setTyping(where);
  };

  const save = async () => {
    setProblem(null);
    const name = draft.name.trim().replace(/\s+/g, ' ');
    if (name.length < 1 || name.length > 80) return setProblem('Give it a name of up to 80 characters.');
    const when = whenFor(draft, session);
    if (!when.ok) return setProblem(when.problem);
    const checked = checkEdits(draft.exercises, draft.unit);
    if (!checked.ok) return setProblem(checked.problem);
    setSaving(true);
    try {
      const { session: saved } = await api.editTraining(token, session.id, { name, unit: draft.unit, startedAt: when.startedAt, finishedAt: when.finishedAt, exercises: checked.exercises });
      log.update(saved);
      haptic.success();
      // Saved: nothing to lose, so leaving doesn't ask.
      setLeaving(true);
      stopAsking();
      close();
    } catch (error) {
      setProblem(error instanceof ApiError ? error.message : 'Couldn’t reach the GymGO server. Your changes are still here; try again.');
    } finally {
      setSaving(false);
    }
  };

  const pickedDay = dayFromKey(draft.day) ?? new Date(session.startedAt);
  const calendarAt = shownMonth ?? { year: pickedDay.getFullYear(), month: pickedDay.getMonth() };
  const today = new Date();
  const atThisMonth = calendarAt.year === today.getFullYear() && calendarAt.month === today.getMonth();
  const typingSet = typing ? draft.exercises[typing.exercise]?.sets[typing.set] : undefined;

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <ScreenOptions options={{ title: '' }} />
      <View style={styles.intro}>
        <Txt variant="largeTitle" accessibilityRole="header" level={1}>
          Edit workout
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary}>
          Fix anything you got wrong. Records and totals update to match.
        </Txt>
      </View>

      <View style={styles.card}>
        <TextField label="Name" inSheet={false} value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} maxLength={80} />
        {/* When it was: the day on a small calendar, the start typed. */}
        <View style={styles.pair}>
          <View style={[styles.dayField, styles.field]}>
            <Txt variant="footnote" color={color.labelSecondary} style={face('medium')}>
              Day
            </Txt>
            <Pressable
              onPress={() => {
                haptic.select();
                setShownMonth(null);
                setPickingDay((open) => !open);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Day, ${dayWords(pickedDay)}. Change`}
              aria-expanded={pickingDay}
              style={({ pressed }) => [styles.dayButton, pickingDay && styles.dayButtonOpen, pressed && { opacity: 0.8 }]}
            >
              <Icon name="calendar" size={16} color={color.brand} />
              <Txt variant="body" numberOfLines={1} style={styles.flex}>
                {shortDay(pickedDay)}
              </Txt>
            </Pressable>
          </View>
          <View style={styles.flex}>
            <TextField
              label="Start time"
              inSheet={false}
              value={draft.start}
              onChangeText={(start) => setDraft({ ...draft, start })}
              placeholder="6:30 pm"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={12}
            />
          </View>
        </View>
        {pickingDay && (
          <Animated.View entering={FADE_IN} style={styles.dayPicker}>
            <View style={styles.monthBar}>
              <Pressable
                onPress={() => {
                  haptic.select();
                  setShownMonth(shiftMonth(calendarAt.year, calendarAt.month, -1));
                }}
                accessibilityRole="button"
                accessibilityLabel="Earlier month"
                hitSlop={8}
                style={({ pressed }) => [styles.monthStep, pressed && { opacity: 0.6 }]}
              >
                <View style={styles.chevronLeft}>
                  <Icon name="chevron" size={13} color={color.brand} />
                </View>
              </Pressable>
              <Txt variant="headline" accessibilityRole="header" style={[styles.flex, styles.centerText]}>
                {calendarMonth(calendarAt.year, calendarAt.month, new Map(), today).label}
              </Txt>
              <Pressable
                disabled={atThisMonth}
                onPress={() => {
                  haptic.select();
                  setShownMonth(shiftMonth(calendarAt.year, calendarAt.month, 1));
                }}
                accessibilityRole="button"
                accessibilityLabel="Later month"
                accessibilityState={{ disabled: atThisMonth }}
                hitSlop={8}
                style={({ pressed }) => [styles.monthStep, atThisMonth && { opacity: 0.3 }, pressed && { opacity: 0.6 }]}
              >
                <Icon name="chevron" size={13} color={color.brand} />
              </Pressable>
            </View>
            <MonthGrid
              month={calendarMonth(calendarAt.year, calendarAt.month, new Map(), today)}
              size={34}
              selected={draft.day}
              canPick={(day) => !day.future}
              onPick={(day) => {
                setDraft({ ...draft, day: day.key });
                setPickingDay(false);
              }}
            />
          </Animated.View>
        )}
        <View style={styles.pair}>
          <View style={styles.flex}>
            <TextField
              label="Minutes it took"
              inSheet={false}
              value={draft.minutes}
              onChangeText={(minutes) => setDraft({ ...draft, minutes: minutes.replace(/[^0-9]/g, '') })}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={4}
            />
          </View>
          <View style={styles.unit}>
            <Txt variant="footnote" color={color.labelSecondary} style={styles.unitLabel}>
              Weights in
            </Txt>
            <Segmented
              options={[
                { value: 'kg', label: 'kg' },
                { value: 'lb', label: 'lb' },
              ]}
              value={draft.unit}
              onChange={(unit: WeightUnit) => setDraft({ ...draft, unit })}
            />
          </View>
        </View>
        {/* The gym it was at: changed at once, apart from the rest of the edit. */}
        {session && (
          <Pressable
            onPress={() => router.push({ pathname: '/gym-tag', params: { session: session.id } })}
            accessibilityRole="button"
            accessibilityLabel={session.gymName ? `Gym: ${session.gymName}. Change gym` : 'No gym tagged. Tag a gym'}
            style={({ pressed }) => [styles.gymRow, pressed && { opacity: 0.7 }]}
          >
            <Icon name="pin" size={16} color={color.brand} />
            <Txt variant="body" style={styles.flex} numberOfLines={1}>
              {session.gymName ?? 'Tag the gym'}
            </Txt>
            <Txt variant="footnote" color={color.labelSecondary}>
              {session.gymName ? 'Change' : 'None'}
            </Txt>
            <Icon name="chevron" size={12} color={color.labelTertiary} />
          </Pressable>
        )}
      </View>

      {draft.exercises.map((item, exerciseAt) => {
        const name = exerciseName(item.exerciseId);
        const tags = setTags(item.sets);
        const bodyWeight = bodyWeightOnly(item.exerciseId);
        // A plank's sets are times, a carry's distances (with the weight carried).
        const timed = item.measure !== 'reps';
        // RPE's column: with it switched on, or for an exercise with a set that has one (never by the clock).
        const rpeColumn = !timed && (prefs.rpe || item.sets.some((set) => set.rpe !== undefined));
        return (
          <View key={`${item.exerciseId}-${exerciseAt}`} style={styles.card}>
            <View style={styles.head}>
              <ExerciseTile exerciseId={item.exerciseId} size={40} />
              <Txt variant="headline" style={styles.flex}>
                {name}
              </Txt>
              {/* The order you did them in: up and down, one place at a time. */}
              {draft.exercises.length > 1 &&
                ([-1, 1] as const).map((by) => {
                  const to = exerciseAt + by;
                  const can = to >= 0 && to < draft.exercises.length;
                  return (
                    <Pressable
                      key={by}
                      disabled={!can}
                      onPress={() => {
                        haptic.select();
                        setRating(null);
                        setTyping(null);
                        const next = [...draft.exercises];
                        [next[exerciseAt], next[to]] = [next[to]!, next[exerciseAt]!];
                        setDraft({ ...draft, exercises: next });
                        say(`${name} moved to ${to + 1} of ${next.length}`);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${name} ${by < 0 ? 'up' : 'down'}`}
                      accessibilityState={{ disabled: !can }}
                      hitSlop={4}
                      style={({ pressed }) => [styles.move, !can && styles.moveOff, pressed && { opacity: 0.6 }]}
                    >
                      <View style={by < 0 ? styles.chevronUp : styles.chevronDown}>
                        <Icon name="chevron" size={12} color={color.labelSecondary} />
                      </View>
                    </Pressable>
                  );
                })}
              <Pressable
                onPress={() => {
                  haptic.select();
                  setRating(null);
                  setTyping(null);
                  setDraft({ ...draft, exercises: draft.exercises.filter((_, at) => at !== exerciseAt) });
                }}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${name} from this workout`}
                hitSlop={8}
                style={({ pressed }) => [styles.textButton, pressed && { opacity: 0.6 }]}
              >
                <Txt variant="footnote" color={color.dangerInk} style={face('semibold')}>
                  Remove
                </Txt>
              </Pressable>
            </View>
            {item.sets.length > 0 && (
              <View style={[styles.setHead, rpeColumn && styles.tight]}>
                <Txt variant="caption" color={color.labelSecondary} style={styles.setCol}>
                  SET
                </Txt>
                {item.measure !== 'time' && (
                  <>
                    <Txt variant="caption" color={color.labelSecondary} style={[styles.inputCol, rpeColumn && styles.narrow]}>
                      {bodyWeight ? 'ADDED' : draft.unit.toUpperCase()}
                    </Txt>
                    <View style={styles.times} />
                  </>
                )}
                <Txt variant="caption" color={color.labelSecondary} style={[styles.inputCol, rpeColumn && styles.narrow]}>
                  {item.measure === 'time' ? 'TIME' : item.measure === 'distance' ? 'METRES' : 'REPS'}
                </Txt>
                {/* A rower's or treadmill's metres, beside its time. */}
                {item.measure === 'time' && tracksDistance(item.exerciseId) && (
                  <Txt variant="caption" color={color.labelSecondary} style={styles.inputCol}>
                    METRES
                  </Txt>
                )}
                <View style={styles.flex} />
                {rpeColumn && <RpeHead />}
                <View style={styles.removeCol} />
              </View>
            )}
            {item.sets.map((set, at) => {
              const where = { exercise: exerciseAt, set: at };
              const spoken = `${name}, ${tags[at]!.spoken}`;
              const rated = rating?.exercise === exerciseAt && rating.set === at;
              return (
                <View key={at}>
                  <View style={[styles.setRow, rpeColumn && styles.tight]}>
                    <Pressable
                      onPress={() => pickKind(where, spoken)}
                      accessibilityRole="button"
                      accessibilityLabel={`${spoken}${set.kind ? '' : ', an ordinary set'}. Change the kind of set`}
                      hitSlop={6}
                      style={({ pressed }) => [styles.setCol, pressed && { opacity: 0.6 }]}
                    >
                      <View style={[styles.tag, set.kind && styles.tagKind]}>
                        <Txt variant="subhead" color={set.kind ? KIND_INK[set.kind]() : color.labelSecondary} style={face('semibold')}>
                          {tags[at]!.tag}
                        </Txt>
                      </View>
                    </Pressable>
                    {item.measure !== 'time' && (
                      <>
                        <Input
                          value={set.weight}
                          onChangeText={(weight) => changeSet(where, (each) => ({ ...each, weight }))}
                          placeholder={bodyWeight && !timed ? 'BW' : '—'}
                          keyboardType="decimal-pad"
                          inputMode="decimal"
                          style={[styles.input, rpeColumn && styles.narrow]}
                          accessibilityLabel={`${spoken} weight in ${draft.unit}${timed ? ', blank for none' : bodyWeight ? ', blank for body weight' : ''}`}
                        />
                        {/* Between the boxes, decoration: the headings above say weight and reps. */}
                        <Txt variant="subhead" color={color.labelTertiary} style={styles.times} aria-hidden>
                          ×
                        </Txt>
                      </>
                    )}
                    {item.measure === 'reps' ? (
                      <Input
                        value={set.reps}
                        onChangeText={(reps) => changeSet(where, (each) => ({ ...each, reps }))}
                        placeholder="—"
                        keyboardType="number-pad"
                        inputMode="numeric"
                        style={[styles.input, rpeColumn && styles.narrow]}
                        accessibilityLabel={`${spoken} reps`}
                      />
                    ) : (
                      <Input
                        value={(item.measure === 'time' ? set.time : set.distance) ?? ''}
                        onChangeText={(text) => changeSet(where, (each) => (item.measure === 'time' ? { ...each, time: text } : { ...each, distance: text }))}
                        placeholder={item.measure === 'time' ? '0:00' : '—'}
                        keyboardType={item.measure === 'time' ? 'numbers-and-punctuation' : 'decimal-pad'}
                        inputMode={item.measure === 'time' ? 'text' : 'decimal'}
                        style={styles.input}
                        accessibilityLabel={`${spoken} ${item.measure === 'time' ? 'time, in minutes and seconds' : 'distance in metres'}`}
                      />
                    )}
                    {item.measure === 'time' && tracksDistance(item.exerciseId) && (
                      <Input
                        value={set.distance ?? ''}
                        onChangeText={(distance) => changeSet(where, (each) => ({ ...each, distance }))}
                        placeholder="—"
                        keyboardType="decimal-pad"
                        inputMode="decimal"
                        style={styles.input}
                        accessibilityLabel={`${spoken} distance in metres, blank for none`}
                      />
                    )}
                    <View style={styles.flex} />
                    {rpeColumn && (
                      <RpeCell value={set.rpe} label={spoken} open={rated} onPress={set.kind !== 'warmup' ? () => setRating(rated ? null : where) : null} />
                    )}
                    <Pressable
                      onPress={() => {
                        haptic.select();
                        setRating(null);
                        changeSets(exerciseAt, item.sets.filter((_, other) => other !== at));
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${spoken}`}
                      hitSlop={8}
                      style={({ pressed }) => [styles.removeCol, styles.remove, pressed && { opacity: 0.6 }]}
                    >
                      <Icon name="minus" size={16} color={color.dangerInk} />
                    </Pressable>
                  </View>
                  {rated && <RpePicker label={spoken} value={set.rpe ?? null} onPick={(rpe) => setRpe(where, rpe)} onClose={() => setRating(null)} />}
                </View>
              );
            })}
            <Pressable
              onPress={() => {
                haptic.select();
                const previous = item.sets[item.sets.length - 1];
                changeSets(exerciseAt, [
                  ...item.sets,
                  { weight: previous?.weight ?? '', reps: previous?.reps ?? '', done: true, ...(previous?.time ? { time: previous.time } : {}), ...(previous?.distance ? { distance: previous.distance } : {}) },
                ]);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Add set: ${name}`}
              style={({ pressed }) => [styles.textButton, styles.addSet, pressed && { opacity: 0.6 }]}
            >
              <Icon name="plus" size={13} color={color.brand} />
              <Txt variant="footnote" color={color.brand} style={face('semibold')}>
                Add set
              </Txt>
            </Pressable>
          </View>
        );
      })}

      <AddExercise
        inWorkout={inWorkout}
        onAdd={(exercise) =>
          setDraft({ ...draft, exercises: [...draft.exercises, { exerciseId: exercise.id, measure: setMeasure(exercise.id), sets: [{ weight: '', reps: '', done: true }] }] })
        }
      />

      <View style={styles.actions}>
        <PrimaryButton label={saving ? 'Saving…' : 'Save changes'} icon="check" disabled={saving} onPress={() => void save()} />
        <LiveLine>
          {problem && (
            <Txt variant="footnote" color={color.dangerInk} style={styles.center}>
              {problem}
            </Txt>
          )}
        </LiveLine>
        <PrimaryButton label="Cancel" tone="quiet" onPress={close} />
      </View>

      {typing && typingSet && (
        <ChoiceSheet
          title={`${exerciseName(draft.exercises[typing.exercise]!.exerciseId)}, ${setTags(draft.exercises[typing.exercise]!.sets)[typing.set]!.spoken}`}
          message={KIND_MESSAGE}
          options={KIND_OPTIONS}
          selected={typingSet.kind ?? 'normal'}
          onPick={(kind) => setKind(typing, kind)}
          onClose={() => setTyping(null)}
        />
      )}
      {region}
    </PageScroll>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    gymRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 44, paddingTop: space[2], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: 640, alignSelf: 'center' },
    intro: { gap: space[1] },
    card: { gap: space[2], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
    flex: { flex: 1, minWidth: 0 },
    pair: { flexDirection: 'row', alignItems: 'flex-end', gap: space[3] },
    field: { gap: 6 },
    dayButton: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 48, paddingHorizontal: space[3], borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: color.cardGlass, borderWidth: StyleSheet.hairlineWidth, borderColor: color.separator, ...shadow.rim },
    dayButtonOpen: { borderColor: color.brand },
    dayField: { flex: 1.3, minWidth: 0 },
    chevronLeft: { transform: [{ rotate: '180deg' }] },
    dayPicker: { gap: space[2], padding: space[3], borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: color.groupedBackground },
    monthBar: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    monthStep: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    centerText: { textAlign: 'center' },
    unit: { gap: 6, width: 120 },
    unitLabel: { marginLeft: space[1] },
    head: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    textButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: space[1] },
    addSet: { alignSelf: 'flex-start' },
    setHead: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[1] },
    setRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: 3 },
    setCol: { width: 36 },
    inputCol: { flex: 1, minWidth: 64, maxWidth: 112, textAlign: 'center' },
    times: { width: 10, textAlign: 'center' },
    removeCol: { width: 30 },
    remove: { height: 30, alignItems: 'center', justifyContent: 'center' },
    move: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: color.fill },
    moveOff: { opacity: 0.3 },
    chevronUp: { transform: [{ rotate: '-90deg' }] },
    chevronDown: { transform: [{ rotate: '90deg' }] },
    tag: { minWidth: 22, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
    tagKind: { backgroundColor: color.fill },
    input: {
      flex: 1,
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
    // With RPE's column: the row's gaps and fields close up to fit a 320-point phone.
    tight: { gap: 6 },
    narrow: { minWidth: 56 },
    actions: { gap: space[2], marginTop: space[2] },
    center: { textAlign: 'center' },
  }),
);
