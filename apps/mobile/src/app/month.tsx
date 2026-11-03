/**
 * A month of training (lib/monthReport.ts), from Progress: it opens on the
 * last finished month you trained in, and steps back and forth through the
 * months with a workout. The month's totals against the one before, the
 * records broken, what you did most, your sets for each muscle and the
 * biggest workout. Shared as a few lines, totals only. Free.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { monthLabel } from '@gymgo/domain';
import { ExerciseTile } from '@/components/ExerciseGlyph';
import { Icon } from '@/components/Icon';
import { Pressable } from '@/components/motion';
import { PageScroll } from '@/components/PageScroll';
import { useGlassRedraw } from '@/components/Redrawn';
import { ScreenOptions } from '@/components/ScreenOptions';
import { ListSkeleton } from '@/components/Skeleton';
import { PrimaryButton, Txt } from '@/components/ui';
import { shareText } from '@/lib/actions';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { changeWord, monthReport, monthShareText, monthsWithTraining, reportMonth, shiftMonth } from '@/lib/monthReport';
import { usePageTitle } from '@/lib/pageTitle';
import { RECORD_WORD } from '@/lib/records';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { durationLabel, fromKg, unitFor } from '@/lib/training';
import { useTrainingLog } from '@/lib/useTraining';
import { exerciseName } from '@/lib/workout';

const dayOf = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export default function MonthScreen() {
  useGlassRedraw();
  usePageTitle('Monthly report');
  const router = useRouter();
  const { m } = useLocalSearchParams<{ m?: string }>();
  const { account, prefs } = useApp();
  const log = useTrainingLog(account.token);
  const unit = unitFor(prefs.country);
  const months = useMemo(() => monthsWithTraining(log.sessions), [log.sessions]);
  const [picked, setPicked] = useState<string | null>(typeof m === 'string' && /^\d{4}-\d{2}$/.test(m) ? m : null);
  const month = picked && months.includes(picked) ? picked : reportMonth(log.sessions);
  const report = useMemo(() => (month ? monthReport(log.sessions, month) : null), [log.sessions, month]);
  const [shared, setShared] = useState<string | null>(null);

  if (!account.token) {
    return (
      <PageScroll style={styles.page} contentContainerStyle={styles.content}>
        <ScreenOptions options={{ title: '' }} />
        <Txt variant="subhead" color={color.labelSecondary}>
          Sign in to see your months of training.
        </Txt>
        <PrimaryButton label="Sign in" onPress={() => router.push('/sign-in')} />
      </PageScroll>
    );
  }
  if (!report || !month) {
    return (
      <PageScroll style={styles.page} contentContainerStyle={styles.content}>
        <ScreenOptions options={{ title: '' }} />
        <Txt variant="largeTitle" accessibilityRole="header" level={1}>
          Monthly report
        </Txt>
        {log.status === 'loading' ? (
          <ListSkeleton rows={3} label="Loading your log" />
        ) : (
          <Txt variant="subhead" color={color.labelSecondary}>
            {log.error ?? 'Log a workout, and each month gets its report here.'}
          </Txt>
        )}
      </PageScroll>
    );
  }

  const label = monthLabel(month);
  // The calendar month before, which the totals are against ("on September").
  const before = monthLabel(shiftMonth(month, -1));
  // Short on the tiles ("Aug"), so the comparison fits beside a big total.
  const [beforeYear, beforeNumber] = shiftMonth(month, -1).split('-').map(Number);
  const beforeShort = new Date(beforeYear!, beforeNumber! - 1, 1).toLocaleDateString(undefined, { month: 'short' });
  const at = months.indexOf(month);
  const newer = at > 0 ? months[at - 1]! : null;
  const older = at >= 0 && at < months.length - 1 ? months[at + 1]! : null;
  const weight = (kg: number) => `${Math.round(fromKg(kg, unit)).toLocaleString()} ${unit}`;
  const { totals } = report;
  const tiles: Array<{ label: string; value: string; change: string }> = [
    { label: 'Workouts', value: String(totals.workouts), change: changeWord(totals.workouts, report.before.workouts) },
    { label: 'Days trained', value: String(totals.days), change: changeWord(totals.days, report.before.days) },
    { label: 'Time', value: totals.minutes > 0 ? durationLabel(totals.minutes * 60_000) : '—', change: changeWord(totals.minutes, report.before.minutes) + (totals.minutes !== report.before.minutes ? ' min' : '') },
    { label: 'Sets', value: totals.sets.toLocaleString(), change: changeWord(totals.sets, report.before.sets) },
    { label: 'Lifted', value: weight(totals.volumeKg), change: changeWord(fromKg(totals.volumeKg, unit), fromKg(report.before.volumeKg, unit)) + (Math.round(totals.volumeKg) !== Math.round(report.before.volumeKg) ? `\u00a0${unit}` : '') },
    { label: 'Reps', value: totals.reps.toLocaleString(), change: changeWord(totals.reps, report.before.reps) },
  ];
  const most = Math.max(1, ...report.muscles.map((entry) => Math.max(entry.sets, entry.before)));
  const go = (next: string) => {
    haptic.select();
    setPicked(next);
    setShared(null);
  };

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <ScreenOptions options={{ title: '' }} />
      <View style={styles.headRow}>
        <Pressable
          onPress={() => older && go(older)}
          disabled={!older}
          accessibilityRole="button"
          accessibilityLabel={older ? `Earlier: ${monthLabel(older)}` : 'No earlier month with a workout'}
          hitSlop={8}
          style={[styles.step, !older && styles.stepOff]}
        >
          <Icon name="chevronBack" size={16} color={older ? color.brand : color.labelTertiary} />
        </Pressable>
        <View style={styles.flex}>
          <Txt variant="eyebrow" color={color.labelSecondary} style={styles.center}>
            MONTHLY REPORT
          </Txt>
          <Txt variant="title2" accessibilityRole="header" level={1} style={styles.center}>
            {label}
          </Txt>
        </View>
        <Pressable
          onPress={() => newer && go(newer)}
          disabled={!newer}
          accessibilityRole="button"
          accessibilityLabel={newer ? `Later: ${monthLabel(newer)}` : 'No later month with a workout'}
          hitSlop={8}
          style={[styles.step, !newer && styles.stepOff]}
        >
          <Icon name="chevron" size={16} color={newer ? color.brand : color.labelTertiary} />
        </Pressable>
      </View>

      <View style={styles.tiles}>
        {tiles.map((tile) => (
          <View key={tile.label} style={styles.tile} accessible accessibilityLabel={`${tile.label}: ${tile.value}, ${tile.change === 'same' ? `the same as ${before}` : `${tile.change} on ${before}`}`}>
            <Txt variant="caption" color={color.labelSecondary}>
              {tile.label}
            </Txt>
            <Txt variant="headline" numberOfLines={1}>
              {tile.value}
            </Txt>
            <Txt variant="caption" color={tile.change.startsWith('+') ? color.goodInk : color.labelSecondary} numberOfLines={2}>
              {tile.change === 'same' ? `Same as ${beforeShort}` : `${tile.change} on ${beforeShort}`}
            </Txt>
          </View>
        ))}
      </View>

      {report.records.length > 0 && (
        <>
          <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
            {`RECORDS · ${report.records.length}`}
          </Txt>
          <View style={styles.group}>
            {report.records.map((record, index) => (
              <View key={`${record.exerciseId}-${record.kind}-${record.date}`} style={[styles.row, index > 0 && styles.rowLine]}>
                <ExerciseTile exerciseId={record.exerciseId} size={32} />
                <View style={styles.flex}>
                  <Txt variant="body">{exerciseName(record.exerciseId)}</Txt>
                  <Txt variant="footnote" color={color.maybeInk}>
                    {RECORD_WORD[record.kind]}
                  </Txt>
                </View>
                <Txt variant="footnote" color={color.labelSecondary}>
                  {dayOf(record.date)}
                </Txt>
              </View>
            ))}
          </View>
        </>
      )}

      {report.topExercises.length > 0 && (
        <>
          <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
            DONE MOST
          </Txt>
          <View style={styles.group}>
            {report.topExercises.map((item, index) => (
              <Pressable
                key={item.exerciseId}
                onPress={() => router.push({ pathname: '/progress/[exercise]', params: { exercise: item.exerciseId } })}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}: ${item.sets} sets`}
                style={({ pressed }) => [styles.row, index > 0 && styles.rowLine, pressed && { backgroundColor: color.fill }]}
              >
                <ExerciseTile exerciseId={item.exerciseId} size={32} />
                <Txt variant="body" style={styles.flex}>
                  {item.name}
                </Txt>
                <Txt variant="headline">{`${item.sets} sets`}</Txt>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {report.muscles.length > 0 && (
        <>
          <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
            SETS FOR EACH MUSCLE
          </Txt>
          <View style={styles.card}>
            {report.muscles.map((entry) => (
              <View
                key={entry.muscle}
                style={styles.muscle}
                accessible
                accessibilityLabel={`${entry.label}: ${formatSets(entry.sets)} sets, ${formatSets(entry.before)} in ${before}`}
              >
                <View style={styles.muscleHead}>
                  <Txt variant="subhead" style={styles.flex}>
                    {entry.label}
                  </Txt>
                  <Txt variant="footnote" color={color.labelSecondary}>
                    {`${formatSets(entry.sets)} · ${formatSets(entry.before)} before`}
                  </Txt>
                </View>
                <View style={styles.track} aria-hidden>
                  <View style={[styles.fill, { width: `${Math.round((entry.sets / most) * 100)}%` }]} />
                </View>
                <View style={styles.trackBefore} aria-hidden>
                  <View style={[styles.fillBefore, { width: `${Math.round((entry.before / most) * 100)}%` }]} />
                </View>
              </View>
            ))}
            <Txt variant="caption" color={color.labelSecondary}>
              {`Working sets, a half for a muscle an exercise works second. The lighter bar is ${before}.`}
            </Txt>
          </View>
        </>
      )}

      {report.biggest && (
        <>
          <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
            BIGGEST WORKOUT
          </Txt>
          <View style={[styles.group, styles.row]} accessible>
            <View style={styles.flex}>
              <Txt variant="body">{report.biggest.name}</Txt>
              <Txt variant="footnote" color={color.labelSecondary}>
                {dayOf(report.biggest.date)}
              </Txt>
            </View>
            <Txt variant="headline">{weight(report.biggest.volumeKg)}</Txt>
          </View>
        </>
      )}

      <PrimaryButton
        label={shared ?? 'Share this month'}
        icon="share"
        tone="quiet"
        onPress={() =>
          void shareText(monthShareText(report, label, weight(totals.volumeKg)), `${label} on GymGO`).then((result) =>
            setShared(result === 'copied' ? 'Copied: paste it anywhere' : result === 'failed' ? 'Couldn’t share it' : null),
          )
        }
      />
      <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
        From your own log, by this device’s calendar. Sharing sends the totals, never which days you went.
      </Txt>
    </PageScroll>
  );
}

/** "12", "4.5": half sets for a muscle worked second. */
const formatSets = (sets: number) => String(Math.round(sets * 10) / 10);

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: 640, alignSelf: 'center' },
    flex: { flex: 1, minWidth: 0 },
    center: { textAlign: 'center' },
    headRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    step: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandTint },
    stepOff: { backgroundColor: color.fill },
    tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    tile: { flexGrow: 1, flexBasis: '30%', minWidth: 96, gap: 2, padding: space[3], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
    section: { marginTop: space[3], marginLeft: space[4] },
    group: { backgroundColor: color.plate, borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', ...shadow.plate },
    card: { gap: space[3], padding: space[4], backgroundColor: color.plate, borderRadius: radius.lg, borderCurve: 'continuous', ...shadow.plate },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
    rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
    muscle: { gap: 4 },
    muscleHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    track: { height: 8, borderRadius: 4, backgroundColor: color.fill, overflow: 'hidden' },
    fill: { height: 8, borderRadius: 4, backgroundColor: color.brandFill },
    trackBefore: { height: 4, borderRadius: 2, overflow: 'hidden' },
    fillBefore: { height: 4, borderRadius: 2, backgroundColor: color.labelTertiary },
    note: { marginHorizontal: space[4], textAlign: 'center' },
  }),
);
