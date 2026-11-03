/**
 * One exercise: how to do it, what it works and needs, swaps for the same
 * muscle (from the exercise library, app/exercises.tsx); then your records
 * (heaviest, strongest, biggest set, most in a session, and the heaviest for
 * each number of reps), every session you did it, and (Pro) a chart of any
 * of them over time.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/motion';
import { BrandFill, Sheen, accentGlow } from '@/components/BrandFill';
import { ExerciseGlyph, ExerciseTile } from '@/components/ExerciseGlyph';
import { Icon } from '@/components/Icon';
import { AskGymPal } from '@/components/AskGymPal';
import { ExerciseNote } from '@/components/ExerciseNote';
import { ProgressChart } from '@/components/ProgressChart';
import { useGlassRedraw } from '@/components/Redrawn';
import { Chip, PrimaryButton, Txt } from '@/components/ui';
import { ListSkeleton } from '@/components/Skeleton';
import { useApp } from '@/lib/app-state';
import { mix } from '@/lib/looks';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { EXERCISE_METRICS, exerciseSeries, formatWeight, fromKg, personalRecords, repRecords, repsWords, setsSummary, unitFor, type ExerciseMetric } from '@/lib/training';
import { useTrainingLog } from '@/lib/useTraining';
import { alternativesFor, kitText } from '@/lib/exerciseLibrary';
import { EXERCISES, KIT_LABEL, exerciseName, muscleLabel } from '@/lib/workout';
import { usePageTitle } from '@/lib/pageTitle';
import { PageScroll } from '@/components/PageScroll';
import { ProOffer } from '@/components/ProOffer';
import { ScreenOptions } from '@/components/ScreenOptions';

/** "25 Sep", with the year only when it isn't this one. */
const dayLabel = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
};

export default function ExerciseProgressScreen() {
  useGlassRedraw();
  const { exercise: exerciseId = '' } = useLocalSearchParams<{ exercise: string }>();
  const { account, prefs, billing, openPro } = useApp();
  // Kept while the server is away too: loading then fails and says so,
  // where a missing token would ask a signed-in person to sign in.
  const token = account.token;
  const log = useTrainingLog(token);
  const router = useRouter();
  const unit = unitFor(prefs.country);
  const exercise = EXERCISES.find((item) => item.id === exerciseId) ?? null;
  // An id GymGO doesn't list (a mistyped link, or an exercise since renamed): its words, readably.
  const title = exerciseName(exerciseId);
  usePageTitle(title);
  const record = useMemo(() => personalRecords(log.sessions).get(exerciseId) ?? null, [log.sessions, exerciseId]);
  const [metric, setMetric] = useState<ExerciseMetric>('e1rm');
  const [noting, setNoting] = useState(false);
  const series = useMemo(() => exerciseSeries(log.sessions, exerciseId, metric), [log.sessions, exerciseId, metric]);
  const shownMetric = EXERCISE_METRICS.find((item) => item.id === metric)!;
  const reps = useMemo(() => repRecords(log.sessions, exerciseId), [log.sessions, exerciseId]);
  /** A big weight with its thousands marked, in your unit: "4,250 kg". */
  const tonnage = (kg: number) => `${Math.round(fromKg(kg, unit)).toLocaleString()}\u00a0${unit}`;
  /** A weight from a record, in your unit, to a tenth. */
  const weightOf = (kg: number) => formatWeight(Number(fromKg(kg, unit).toFixed(1)), unit);
  const done = log.sessions.filter((session) => session.exercises.some((item) => item.exerciseId === exerciseId));
  const swaps = useMemo(() => (exercise ? alternativesFor(exercise) : []), [exercise]);

  if (!exercise && done.length === 0 && log.status !== 'loading') {
    return (
      <PageScroll style={styles.page} contentContainerStyle={styles.content}>
        <ScreenOptions options={{ title: '' }} />
        <Txt variant="title2" accessibilityRole="header" level={1}>
          No exercise by that name
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary}>
          GymGO doesn’t list “{title}”, and you haven’t logged it. Your exercises are on the Progress page.
        </Txt>
        <PrimaryButton label="Back to Progress" tone="quiet" onPress={() => (router.canGoBack() ? router.back() : router.replace('/progress'))} />
      </PageScroll>
    );
  }

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <ScreenOptions options={{ title: '' }} />
      <Txt variant="largeTitle" accessibilityRole="header" level={1}>
        {title}
      </Txt>

      {exercise && (
        <>
          {/* How to do it: the move going through its rep, on the accent, and its cue. */}
          <View style={[styles.hero, accentGlow(color.brandFill)]}>
            <BrandFill round={radius.xl} />
            <Sheen round={radius.xl} />
            <Txt variant="eyebrow" color={color.onBrandSoft}>
              {`HOW TO DO IT · ${exercise.cardio ? 'CONDITIONING' : exercise.compound ? 'COMPOUND' : 'ISOLATION'}`}
            </Txt>
            <View style={styles.how}>
              <View style={styles.glyph} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
                {/* The kit a pale tint of the accent, so a bar across the shoulders reads apart from the figure. */}
                <ExerciseGlyph exerciseId={exercise.id} size={84} ink={color.onBrand} accent={mix(color.brandFill, color.onBrand, 0.5)} moving />
              </View>
              <Txt variant="headline" color={color.onBrand} style={styles.flex}>
                {exercise.cue}
              </Txt>
            </View>
          </View>
          <View style={styles.card}>
            <Detail label="Works">
              {exercise.primary.length === 0 && <Pill text="Conditioning" strong />}
              {exercise.primary.map((muscle) => (
                <Pill key={muscle} text={muscleLabel(muscle)} strong />
              ))}
              {exercise.secondary.map((muscle) => (
                <Pill key={muscle} text={muscleLabel(muscle)} />
              ))}
            </Detail>
            <Detail label="Needs">
              {exercise.needs.map((option, index) => (
                <View key={index} style={styles.option}>
                  {index > 0 && (
                    <Txt variant="caption" color={color.labelSecondary}>
                      or
                    </Txt>
                  )}
                  <Pill text={option.length === 0 ? 'Body weight' : option.map((kit) => KIT_LABEL[kit]).join(' + ')} />
                </View>
              ))}
            </Detail>
          </View>
          <AskGymPal
            title="Ask GymPal about this exercise"
            detail="Form, common mistakes, what to swap in"
            request={{
              question: `How do I do ${exercise.name.toLowerCase()} well?`,
              about: exercise.name,
              context: [
                `Exercise: ${exercise.name} (${exercise.cardio ? 'conditioning' : exercise.compound ? 'compound' : 'isolation'}).`,
                `GymGO's cue: ${exercise.cue}`,
                `Works: ${[...exercise.primary, ...exercise.secondary].map(muscleLabel).join(', ') || 'conditioning'}.`,
                `Needs: ${exercise.needs.map((option) => (option.length === 0 ? 'body weight' : option.map((kit) => KIT_LABEL[kit]).join(' + '))).join(', or ')}.`,
              ].join('\n'),
            }}
          />
        </>
      )}

      {/* Your note on it, pinned in every workout with it too; kept on this device. */}
      <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
        YOUR NOTE
      </Txt>
      <View style={styles.card}>
        <ExerciseNote exerciseId={exerciseId} name={title} editing={noting} onEditing={setNoting} showAdd />
      </View>

      {record && (
        <View style={styles.facts}>
          <Fact label="Heaviest" value={record.heaviestKg !== null ? `${formatWeight(Number(fromKg(record.heaviestKg, unit).toFixed(1)), unit)} × ${record.heaviestSet!.reps}` : '—'} />
          <Fact label="1-rep max (est.)" value={record.e1rmKg !== null ? `≈ ${formatWeight(Math.round(fromKg(record.e1rmKg, unit)), unit)}` : '—'} />
          <Fact label="Sessions" value={String(record.sessions)} />
        </View>
      )}

      {record && (record.setVolumeSet || record.sessionVolumeKg !== null || record.mostReps !== null) && (
        <>
          <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
            RECORDS
          </Txt>
          <View style={styles.group}>
            {[
              record.setVolumeSet && record.setVolumeKg !== null
                ? { label: 'Biggest set', value: `${formatWeight(record.setVolumeSet.weight, record.setVolumeSet.unit)} × ${record.setVolumeSet.reps}`, detail: `${tonnage(record.setVolumeKg)} in one set · ${dayLabel(record.setVolumeSet.date)}` }
                : null,
              record.sessionVolumeKg !== null && record.sessionVolumeDate
                ? { label: 'Most in a session', value: tonnage(record.sessionVolumeKg), detail: `Every working set added up · ${dayLabel(record.sessionVolumeDate)}` }
                : null,
              record.mostReps !== null ? { label: 'Most reps', value: repsWords([record.mostReps]), detail: 'In one set at body weight' } : null,
            ]
              .filter((row): row is { label: string; value: string; detail: string } => row !== null)
              .map((row, index) => (
                <View key={row.label} style={[styles.row, index > 0 && styles.rowLine]} accessible accessibilityLabel={`${row.label}: ${row.value}. ${row.detail}`}>
                  <View style={styles.flex}>
                    <Txt variant="body">{row.label}</Txt>
                    <Txt variant="footnote" color={color.labelSecondary}>
                      {row.detail}
                    </Txt>
                  </View>
                  <Txt variant="headline">{row.value}</Txt>
                </View>
              ))}
          </View>
        </>
      )}

      {reps.length > 0 && (
        <>
          <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
            REP RECORDS
          </Txt>
          <View style={styles.group}>
            {reps.map((row, index) => (
              <View
                key={row.reps}
                style={[styles.row, index > 0 && styles.rowLine]}
                accessible
                accessibilityLabel={`${repsWords([row.reps])}: ${weightOf(row.kg)}, ${dayLabel(row.set.date)}`}
              >
                <Txt variant="body" style={styles.repCount}>
                  {repsWords([row.reps])}
                </Txt>
                <Txt variant="footnote" color={color.labelSecondary} style={styles.flex}>
                  {dayLabel(row.set.date)}
                </Txt>
                <Txt variant="headline">{weightOf(row.kg)}</Txt>
              </View>
            ))}
          </View>
          <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
            The heaviest you’ve lifted for each number of reps, up to 20. One beaten by a heavier set for more reps isn’t listed.
          </Txt>
        </>
      )}

      {billing.isPro ? (
        <View style={styles.card}>
          {/* What the chart follows: the estimated 1-rep max, the heaviest weight, the biggest set, the day's volume or reps. */}
          <View style={styles.metrics} role="radiogroup" accessibilityLabel="What the chart shows">
            {EXERCISE_METRICS.map((item) => (
              <Chip key={item.id} label={item.label} selected={metric === item.id} accessibilityLabel={item.title} onPress={() => setMetric(item.id)} />
            ))}
          </View>
          {series.length > 0 ? (
            <ProgressChart points={series} unit={unit} title={shownMetric.title} count={metric === 'reps' ? 'reps' : undefined} />
          ) : (
            <Txt variant="subhead" color={color.labelSecondary}>
              {metric === 'e1rm' ? 'This chart needs a weighted set of 12 reps or fewer.' : metric === 'reps' ? 'Nothing logged yet.' : 'This chart needs a set with a weight on it.'}
            </Txt>
          )}
          <Txt variant="footnote" color={color.labelSecondary}>
            {`${shownMetric.about} Your next target shows beside the exercise when you start a workout.`}
          </Txt>
        </View>
      ) : (
        <ProOffer
          icon="chart"
          title="See it on a chart"
          body="GymGO Pro draws every exercise over time (your estimated 1-rep max, heaviest weight, biggest set, volume or reps) and shows what to lift next while you train."
          onPress={() => openPro('progress')}
        />
      )}

      <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
        EVERY TIME
      </Txt>
      <View style={styles.group}>
        {done.length === 0 &&
          (log.status === 'loading' ? (
            <View style={styles.row}>
              <ListSkeleton rows={3} card={false} label="Loading your log" />
            </View>
          ) : (
            <Txt variant="subhead" color={color.labelSecondary} style={styles.row}>
              {log.error ?? 'Not logged yet.'}
            </Txt>
          ))}
        {done.map((session, index) => {
          const logged = session.exercises.find((item) => item.exerciseId === exerciseId)!;
          return (
            <View key={session.id} style={[styles.row, index > 0 && styles.rowLine]}>
              <Txt variant="footnote" color={color.labelSecondary} style={styles.date}>
                {dayLabel(session.finishedAt)}
              </Txt>
              <Txt variant="subhead" style={styles.flex}>
                {setsSummary(logged.sets, session.unit)}
              </Txt>
            </View>
          );
        })}
      </View>

      {swaps.length > 0 && (
        <>
          <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
            SWAP FOR
          </Txt>
          <View style={styles.group}>
            {swaps.map((swap, index) => (
              <Pressable
                key={swap.id}
                onPress={() => router.push({ pathname: '/progress/[exercise]', params: { exercise: swap.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${swap.name}. ${kitText(swap)}`}
                style={({ pressed }) => [styles.row, index > 0 && styles.rowLine, pressed && { backgroundColor: color.fill }]}
              >
                <ExerciseTile exerciseId={swap.id} size={40} />
                <View style={styles.flex}>
                  <Txt variant="body">{swap.name}</Txt>
                  <Txt variant="footnote" color={color.labelSecondary}>
                    {kitText(swap)}
                  </Txt>
                </View>
                <Icon name="chevron" size={13} color={color.labelTertiary} />
              </Pressable>
            ))}
          </View>
        </>
      )}

      <PrimaryButton label="Back" tone="quiet" onPress={() => (router.canGoBack() ? router.back() : router.replace('/progress'))} />
    </PageScroll>
  );
}

/** A labelled row of pills: what it works, what it needs. */
function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.detail}>
      <Txt variant="footnote" color={color.labelSecondary} style={styles.detailLabel}>
        {label}
      </Txt>
      <View style={styles.pills}>{children}</View>
    </View>
  );
}

/** A muscle or a piece of kit: `strong` for the muscles it mainly works. */
function Pill({ text, strong = false }: { text: string; strong?: boolean }) {
  return (
    <View style={[styles.pill, strong && styles.pillStrong]}>
      <Txt variant="footnote" color={strong ? color.brand : color.label} style={strong ? face('semibold') : undefined}>
        {text}
      </Txt>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Txt variant="caption" color={color.labelSecondary}>
        {label}
      </Txt>
      <Txt variant="headline">{value}</Txt>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  page: { flex: 1, backgroundColor: color.groupedBackground },
  content: { padding: space[4], gap: space[3], paddingBottom: space[8], width: '100%', maxWidth: 640, alignSelf: 'center' },
  flex: { flex: 1 },
  facts: { flexDirection: 'row', gap: space[2] },
  fact: { flex: 1, gap: 2, padding: space[3], borderRadius: radius.lg, backgroundColor: color.plate, ...shadow.plate },
  card: { backgroundColor: color.plate, borderRadius: radius.lg, borderCurve: 'continuous', padding: space[4], gap: space[3], ...shadow.plate },
  section: { marginTop: space[3], marginLeft: space[4] },
  group: { backgroundColor: color.plate, borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', ...shadow.plate },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
  date: { width: 80 },
  repCount: { width: 76 },
  note: { marginHorizontal: space[4] },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  hero: { gap: space[3], padding: space[4], paddingTop: space[4] + 2, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: color.brandFill },
  how: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  glyph: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center', borderRadius: Math.min(26, radius.xl), borderCurve: 'continuous', backgroundColor: color.onBrandFaint },
  detail: { gap: space[2] },
  detailLabel: { textTransform: 'uppercase', letterSpacing: 0.6 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
  option: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  pill: { paddingHorizontal: space[3], paddingVertical: 6, borderRadius: radius.pill, backgroundColor: color.fill },
  pillStrong: { backgroundColor: color.brandTint },
}));
