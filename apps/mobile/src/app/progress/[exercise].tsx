/**
 * One exercise over time: your records, every session you did it, and (Pro)
 * the chart of your estimated one-rep max and what to lift next.
 */

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { ProgressChart } from '@/components/ProgressChart';
import { PrimaryButton, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { color, radius, space, themed } from '@/lib/theme';
import { e1rmSeries, formatWeight, fromKg, personalRecords, setsSummary, unitFor } from '@/lib/training';
import { useTrainingLog } from '@/lib/useTraining';
import { EXERCISES } from '@/lib/workout';
import { usePageTitle } from '@/lib/pageTitle';

/** "25 Sep", with the year only when it isn't this one. */
const dayLabel = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
};

export default function ExerciseProgressScreen() {
  const { exercise: exerciseId = '' } = useLocalSearchParams<{ exercise: string }>();
  const { account, prefs, billing, openPro } = useApp();
  const token = account.state === 'signed_in' ? account.token : null;
  const log = useTrainingLog(token);
  const router = useRouter();
  const unit = unitFor(prefs.country);
  const exercise = EXERCISES.find((item) => item.id === exerciseId) ?? null;
  // An id GymGO doesn't list (a mistyped link, or an exercise since renamed): its words, readably.
  const title = exercise?.name ?? humanise(exerciseId);
  usePageTitle(title);
  const record = useMemo(() => personalRecords(log.sessions).get(exerciseId) ?? null, [log.sessions, exerciseId]);
  const series = useMemo(() => e1rmSeries(log.sessions, exerciseId), [log.sessions, exerciseId]);
  const done = log.sessions.filter((session) => session.exercises.some((item) => item.exerciseId === exerciseId));

  if (!exercise && done.length === 0 && log.status !== 'loading') {
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <Stack.Screen options={{ title: '' }} />
        <Txt variant="title2">No exercise by that name</Txt>
        <Txt variant="subhead" color={color.labelSecondary}>
          GymGO doesn’t list “{title}”, and you haven’t logged it. Your exercises are on the Progress page.
        </Txt>
        <PrimaryButton label="Back to Progress" tone="quiet" onPress={() => (router.canGoBack() ? router.back() : router.replace('/progress'))} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: '' }} />
      <Txt variant="largeTitle">{title}</Txt>

      {record && (
        <View style={styles.facts}>
          <Fact label="Heaviest" value={record.heaviestKg !== null ? `${formatWeight(Number(fromKg(record.heaviestKg, unit).toFixed(1)), unit)} × ${record.heaviestSet!.reps}` : '—'} />
          <Fact label="1-rep max (est.)" value={record.e1rmKg !== null ? `≈ ${formatWeight(Math.round(fromKg(record.e1rmKg, unit)), unit)}` : '—'} />
          <Fact label="Sessions" value={String(record.sessions)} />
        </View>
      )}

      {billing.isPro ? (
        <View style={styles.card}>
          {series.length > 0 ? (
            <ProgressChart points={series} unit={unit} />
          ) : (
            <Txt variant="subhead" color={color.labelSecondary}>
              The chart needs a weighted set of 12 reps or fewer.
            </Txt>
          )}
          <Txt variant="footnote" color={color.labelSecondary}>
            Each point is your best set that session, as an estimated 1-rep max. Your next target shows beside the exercise when you start a workout.
          </Txt>
        </View>
      ) : (
        <Pressable onPress={() => openPro('progress')} accessibilityRole="button" style={({ pressed }) => [styles.card, styles.pro, pressed && { opacity: 0.8 }]}>
          <Icon name="chart" size={22} color={color.brand} />
          <View style={styles.flex}>
            <Txt variant="headline">See it on a chart</Txt>
            <Txt variant="footnote" color={color.labelSecondary}>
              GymGO Pro draws your estimated 1-rep max for every exercise over time, and shows what to lift next while you train.
            </Txt>
          </View>
          <Icon name="chevron" size={13} color={color.labelTertiary} />
        </Pressable>
      )}

      <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
        EVERY TIME
      </Txt>
      <View style={styles.group}>
        {done.length === 0 && (
          <Txt variant="subhead" color={color.labelSecondary} style={styles.row}>
            {log.status === 'loading' ? 'Loading…' : 'Not logged yet.'}
          </Txt>
        )}
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

      <PrimaryButton label="Back to Progress" tone="quiet" onPress={() => (router.canGoBack() ? router.back() : router.replace('/progress'))} />
    </ScrollView>
  );
}

/** "barbell-back-squat" → "Barbell back squat". */
function humanise(id: string): string {
  const words = id.replace(/[-_]+/g, ' ').trim();
  return words ? words[0]!.toUpperCase() + words.slice(1) : 'This exercise';
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
  fact: { flex: 1, gap: 2, padding: space[3], borderRadius: radius.lg, backgroundColor: color.card },
  card: { backgroundColor: color.card, borderRadius: radius.lg, borderCurve: 'continuous', padding: space[4], gap: space[3] },
  pro: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  section: { marginTop: space[3], marginLeft: space[4] },
  group: { backgroundColor: color.card, borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
  date: { width: 80 },
}));
