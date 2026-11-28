/**
 * Import workouts (Progress → Import workouts): your log from another
 * workout app, as the CSV file it exports, or GymGO's own export. The
 * file is read on this device (lib/importLog.ts), shown before anything is
 * saved (how many workouts, when, and what each exercise became), then
 * logged one workout at a time. Ones already in your log are left out,
 * and the server keeps a workout sent twice as one, so trying again after
 * a dropped connection doesn't double anything.
 *
 * Choosing a file needs a browser for now; the phone apps say so.
 */

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { ExerciseTile } from '@/components/ExerciseGlyph';
import { Icon } from '@/components/Icon';
import { PageScroll } from '@/components/PageScroll';
import { useGlassRedraw } from '@/components/Redrawn';
import { ScreenOptions } from '@/components/ScreenOptions';
import { LiveLine, PrimaryButton, Segmented, Txt } from '@/components/ui';
import { problemText, api } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { newSessions, readExport, type ImportResult } from '@/lib/importLog';
import { usePageTitle } from '@/lib/pageTitle';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { unitFor, type WeightUnit } from '@/lib/training';
import { useTrainingLog } from '@/lib/useTraining';

/** Matches listed before "Show all". */
const SHOWN = 8;

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** A browser's file chooser, for a CSV; the file's text, or null when nothing was chosen. */
function chooseCsv(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv,text/plain';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      file.text().then(resolve, () => resolve(null));
    };
    input.click();
  });
}

export default function ImportScreen() {
  useGlassRedraw();
  usePageTitle('Import workouts');
  const router = useRouter();
  const { account, prefs } = useApp();
  const token = account.token;
  const log = useTrainingLog(token);
  const [text, setText] = useState<string | null>(null);
  const [unit, setUnit] = useState<WeightUnit>(unitFor(prefs.country));
  const [problem, setProblem] = useState<string | null>(null);
  const [allShown, setAllShown] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; state: 'going' | 'done' | 'stopped' } | null>(null);

  const result: ImportResult | null = useMemo(() => (text ? readExport(text, unit) : null), [text, unit]);
  const fresh = useMemo(() => (result ? newSessions(result.sessions, log.sessions, result.format) : []), [result, log.sessions]);
  const already = result ? result.sessions.length - fresh.length : 0;
  const unmatched = result ? result.matches.filter((match) => !match.exercise).length : 0;

  const choose = async () => {
    setProblem(null);
    setProgress(null);
    const chosen = await chooseCsv();
    if (chosen === null) return;
    if (!readExport(chosen, unit)) {
      setText(null);
      setProblem('That file isn’t one GymGO can read. Choose the CSV file of your workouts that your other app exports.');
      return;
    }
    haptic.select();
    setText(chosen);
    setAllShown(false);
  };

  const importAll = async () => {
    if (!token || fresh.length === 0) return;
    setProblem(null);
    setProgress({ done: 0, total: fresh.length, state: 'going' });
    for (const [at, session] of fresh.entries()) {
      try {
        await api.logTraining(token, { ...session, workoutId: null, gymId: null });
      } catch (error) {
        setProgress({ done: at, total: fresh.length, state: 'stopped' });
        setProblem(`${problemText(error, 'GymGO couldn’t save the rest.')} Try again: workouts already in won’t be added twice.`);
        log.reload();
        return;
      }
      setProgress({ done: at + 1, total: fresh.length, state: 'going' });
    }
    haptic.success();
    setProgress({ done: fresh.length, total: fresh.length, state: 'done' });
    log.reload();
  };

  const going = progress?.state === 'going';
  const shown = result ? (allShown ? result.matches : result.matches.slice(0, SHOWN)) : [];

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <ScreenOptions options={{ title: '' }} />
      <View style={styles.intro}>
        <Txt variant="largeTitle" accessibilityRole="header" level={1}>
          Import workouts
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary}>
          Bring your log from another workout app. Export it there as a CSV file, then choose the file here. GymGO’s own export works too.
        </Txt>
      </View>

      {!token ? (
        <View style={styles.card}>
          <Txt variant="body">Sign in to import workouts into your log.</Txt>
          <PrimaryButton label="Sign in" onPress={() => router.push('/sign-in')} />
        </View>
      ) : Platform.OS !== 'web' ? (
        <View style={styles.card}>
          <Txt variant="body">Choosing a file works in a browser. Open GymGO at gymgo.site on a computer to bring your workouts in.</Txt>
        </View>
      ) : (
        <>
          {progress?.state !== 'done' && <PrimaryButton label={result ? 'Choose another file' : 'Choose a file'} icon="download" tone={result ? 'quiet' : undefined} disabled={going} onPress={() => void choose()} />}

          {result && progress?.state !== 'done' && (
            <View style={styles.card}>
              <Txt variant="title2">{`${result.sessions.length} ${result.sessions.length === 1 ? 'workout' : 'workouts'}`}</Txt>
              {result.sessions.length > 0 && (
                <Txt variant="subhead" color={color.labelSecondary}>
                  {result.sessions.length === 1 ? day(result.sessions[0]!.startedAt) : `${day(result.sessions[0]!.startedAt)} to ${day(result.sessions[result.sessions.length - 1]!.startedAt)}`}
                </Txt>
              )}
              <Txt variant="subhead" color={color.labelSecondary}>
                {[
                  `${result.matches.length} ${result.matches.length === 1 ? 'exercise' : 'exercises'}`,
                  unmatched ? `${unmatched} kept under ${unmatched === 1 ? 'its' : 'their'} own ${unmatched === 1 ? 'name' : 'names'}` : null,
                  already ? `${already} already in your log` : null,
                  result.skipped ? `${result.skipped} with no sets to log, or dated after today, left out` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Txt>
              {!result.unitInFile && (
                <View style={styles.unitRow}>
                  <Txt variant="footnote" color={color.labelSecondary} style={styles.flex}>
                    The file doesn’t say its weights’ unit. They’re in
                  </Txt>
                  <View style={styles.unitSwitch}>
                    <Segmented
                      options={[
                        { value: 'kg', label: 'kg' },
                        { value: 'lb', label: 'lb' },
                      ]}
                      value={unit}
                      onChange={(next: WeightUnit) => setUnit(next)}
                    />
                  </View>
                </View>
              )}
            </View>
          )}

          {result && progress?.state !== 'done' && result.matches.length > 0 && (
            <>
              <Txt variant="eyebrow" color={color.labelSecondary} accessibilityRole="header" level={2}>
                EXERCISES
              </Txt>
              <View style={styles.group}>
                {shown.map((match, index) => (
                  <View key={match.source} style={[styles.row, index > 0 && styles.rowLine]} accessible accessibilityLabel={`${match.source}: ${match.exercise ? `GymGO’s ${match.exercise.name}` : 'kept under its own name'}`}>
                    <ExerciseTile exerciseId={match.exercise ? match.exercise.id : 'custom'} size={32} />
                    <View style={styles.flex}>
                      <Txt variant="subhead" style={face('semibold')} numberOfLines={2}>
                        {match.source}
                      </Txt>
                      <Txt variant="footnote" color={match.exercise ? color.labelSecondary : color.maybeInk}>
                        {match.exercise ? match.exercise.name : 'Kept under its own name'}
                      </Txt>
                    </View>
                    {match.exercise && <Icon name="check" size={14} color={color.goodInk} />}
                  </View>
                ))}
              </View>
              {result.matches.length > SHOWN && !allShown && <PrimaryButton label={`Show all ${result.matches.length}`} tone="quiet" onPress={() => setAllShown(true)} />}
            </>
          )}

          {result && fresh.length > 0 && progress?.state !== 'done' && (
            <PrimaryButton
              label={going && progress ? `Importing ${progress.done + 1} of ${progress.total}…` : `Import ${fresh.length} ${fresh.length === 1 ? 'workout' : 'workouts'}`}
              icon="check"
              disabled={going}
              onPress={() => void importAll()}
            />
          )}
          {result && result.sessions.length > 0 && fresh.length === 0 && progress?.state !== 'done' && (
            <Txt variant="subhead" color={color.labelSecondary}>
              Every workout in this file is already in your log.
            </Txt>
          )}

          {progress?.state === 'done' && (
            <View style={styles.card}>
              <View style={styles.doneHead}>
                <Icon name="good" size={22} color={color.good} />
                <Txt variant="title2">{`${progress.total} ${progress.total === 1 ? 'workout' : 'workouts'} imported`}</Txt>
              </View>
              <Txt variant="subhead" color={color.labelSecondary}>
                They’re in your log, your records and your charts now.
              </Txt>
              <PrimaryButton label="See your progress" onPress={() => router.replace('/progress')} />
            </View>
          )}

          <LiveLine>
            {problem && (
              <Txt variant="footnote" color={color.dangerInk}>
                {problem}
              </Txt>
            )}
            {progress?.state === 'stopped' && (
              <Txt variant="footnote" color={color.labelSecondary}>
                {`${progress.done} of ${progress.total} imported.`}
              </Txt>
            )}
          </LiveLine>
        </>
      )}
    </PageScroll>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], gap: space[3], width: '100%', maxWidth: 640, alignSelf: 'center' },
    intro: { gap: space[2], marginBottom: space[1] },
    card: { gap: space[2], padding: space[4], borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
    group: { backgroundColor: color.plate, borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', ...shadow.plate },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
    rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
    flex: { flex: 1, minWidth: 0 },
    unitRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[1] },
    unitSwitch: { width: 120 },
    doneHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  }),
);
