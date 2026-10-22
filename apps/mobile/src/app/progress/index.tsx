/**
 * Progress: your streak, your week against your goal, your records for every
 * exercise, your milestones, and every session you've logged. All free; the
 * chart for each exercise and the muscle balance are Pro.
 */

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { GLIDE, Pressable } from '@/components/motion';
import { Icon, type IconName } from '@/components/Icon';
import { useGlassRedraw } from '@/components/Redrawn';
import { MilestonesCard, MuscleBalanceCard, WeekCard } from '@/components/TrainingInsights';
import { CountUp } from '@/components/CountUp';
import { ExerciseTile } from '@/components/ExerciseGlyph';
import { PrimaryButton, Txt } from '@/components/ui';
import { ListSkeleton } from '@/components/Skeleton';
import { weekRecap } from '@/lib/insights';
import { useCollection } from '@/lib/useCollection';
import { useActiveSessionGlance } from '@/lib/activeSession';
import { api } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { timeLabel } from '@/lib/copy';
import { haptic } from '@/lib/haptics';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import {
  durationLabel,
  formatWeight,
  fromKg,
  personalRecords,
  sessionsByDay,
  sessionsThisWeek,
  setCount,
  setsSummary,
  unitFor,
  volumeKg,
  streakOf,
  type TrainingSession,
} from '@/lib/training';
import { useTrainingLog } from '@/lib/useTraining';
import { downloadTrainingCsv } from '@/lib/exportData';
import { exerciseName } from '@/lib/workout';
import { usePageTitle } from '@/lib/pageTitle';
import { loadReminders } from '@/lib/reminders';
import { PageScroll } from '@/components/PageScroll';
import { SessionNote } from '@/components/SessionNote';
import { ScreenOptions } from '@/components/ScreenOptions';
import { BodyWeightCard } from '@/components/BodyWeightCard';
import { LIMITED } from '@/lib/limited';

const nameOf = exerciseName;
/** "65 kg × 6" on one line: a narrow phone wraps before it, not inside it. */
const keepTogether = (text: string) => text.replace(/ /g, '\u00A0');
/** How many days of history show at first, and how many more each "Show older" adds. */
const HISTORY_DAYS = 14;
/** How many exercises' icons a closed workout shows before "+2". */
const STRIP = 6;
/** When a session started, as "6:40 pm": the day it was is the heading above it. */
const startTime = (iso: string) => {
  const started = new Date(iso);
  return timeLabel(started.getHours() * 60 + started.getMinutes());
};

export default function ProgressScreen() {
  useGlassRedraw();
  usePageTitle('Progress');
  const { account, prefs, setPref, billing, openPro } = useApp();
  // Kept while the server is away too: loading then fails and says so,
  // where a missing token would ask a signed-in person to sign in.
  const token = account.token;
  const log = useTrainingLog(token);
  const known = log.status === 'ready';
  // Pro's streak freeze carries the run through one missed week a month; on Free, what one would have kept.
  const streak = useMemo(() => streakOf(log.sessions, new Date(), billing.isPro), [log.sessions, billing.isPro]);
  const couldKeep = useMemo(() => (billing.isPro ? null : streakOf(log.sessions, new Date(), true)), [log.sessions, billing.isPro]);
  const active = useActiveSessionGlance();
  const router = useRouter();
  const unit = unitFor(prefs.country);
  // Whether training reminders are on, read again each time Progress comes back into view (after Reminders).
  const [remindersOn, setRemindersOn] = useState<boolean | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') return;
      void loadReminders().then((kept) => setRemindersOn(kept.on));
    }, []),
  );
  // Your week as a picture to share: this week's, or last week's until this one has something.
  const { gyms } = useCollection();
  const recap = useMemo(() => weekRecap(log.sessions, gyms), [log.sessions, gyms]);
  const records = useMemo(() => [...personalRecords(log.sessions)].sort((a, b) => b[1].sessions - a[1].sessions || nameOf(a[0]).localeCompare(nameOf(b[0]))), [log.sessions]);
  const days = useMemo(() => sessionsByDay(log.sessions), [log.sessions]);
  // The latest days first, more on request: a year's log drawn at once (each
  // workout with its icons) would keep a phone busy for nothing.
  const [shownDays, setShownDays] = useState(HISTORY_DAYS);
  const olderSessions = days.slice(shownDays).reduce((sum, day) => sum + day.sessions.length, 0);
  const [open, setOpen] = useState<string | null>(null);

  const start = active ? (
    <PrimaryButton label="Back to your workout" icon="play" onPress={() => router.push('/train')} />
  ) : (
    <PrimaryButton label="Start a workout" icon="play" onPress={() => router.push({ pathname: '/workout/[id]', params: { id: 'any' } })} />
  );

  if (!token) {
    return (
      <View style={styles.empty}>
        <ScreenOptions options={{ title: 'Progress' }} />
        <Icon name="chart" size={34} color={color.brand} />
        <Txt variant="title2" style={styles.center}>
          Keep a training log
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
          {LIMITED
            ? 'With the full version of GymGO, every workout you finish is kept here, with your records and your streak. Workouts, templates and the timers all work in this one.'
            : 'Sign in (it’s free) and every workout you finish is kept here, with your records and your streak.'}
        </Txt>
        {!LIMITED && <PrimaryButton label="Sign in" onPress={() => router.push('/sign-in')} />}
      </View>
    );
  }

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <ScreenOptions options={{ title: 'Progress' }} />
      <Animated.View style={styles.stats}>
        <Stat icon="flame" tint={color.maybe} value={known ? streak.weeks : null} one="week in a row" many="weeks in a row" />
        <Stat icon="calendar" tint={color.brand} value={known ? sessionsThisWeek(log.sessions) : null} one="this week" many="this week" />
        <Stat icon="workout" tint={color.good} value={known ? log.sessions.length : null} one="workout" many="workouts" />
      </Animated.View>
      {known && streak.frozen.length > 0 && (
        <View style={styles.freeze} accessible>
          <Icon name="sparkle" size={18} color={color.brand} />
          <Txt variant="footnote" color={color.labelSecondary} style={styles.flex}>
            {`Streak freeze: you missed the week${streak.frozen.length > 1 ? 's' : ''} of ${streak.frozen
              .map((monday) => new Date(monday).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }))
              .join(' and ')}, and your run carried on. Pro covers one missed week a month.`}
          </Txt>
        </View>
      )}
      {known && couldKeep && couldKeep.weeks > streak.weeks && (
        <Pressable onPress={() => openPro('freeze')} accessibilityRole="button" style={({ pressed }) => [styles.freeze, pressed && { opacity: 0.7 }]}>
          <Icon name="sparkle" size={18} color={color.brand} />
          <Txt variant="footnote" color={color.labelSecondary} style={styles.flex}>
            {`A streak freeze would have kept your ${couldKeep.weeks}-week run going through the week you missed. GymGO Pro covers one missed week a month.`}
          </Txt>
          <Icon name="chevron" size={13} color={color.labelTertiary} />
        </Pressable>
      )}
      {start}

      {log.status === 'loading' && <ListSkeleton rows={4} label="Loading your log" />}
      {log.error && (
        <View style={styles.problem}>
          <Txt variant="footnote" color={color.dangerInk}>
            {log.error}
          </Txt>
          <PrimaryButton label="Try again" tone="quiet" onPress={log.reload} />
        </View>
      )}
      {log.status === 'ready' && log.sessions.length === 0 && (
        <Txt variant="subhead" color={color.labelSecondary}>
          Nothing logged yet. Build a workout, tap Start, and tick your sets as you go.
        </Txt>
      )}

      {known && (
        <>
          <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
            YOUR WEEKS
          </Txt>
          <Animated.View>
            <WeekCard sessions={log.sessions} goal={prefs.weeklyGoal} onGoal={(goal) => setPref('weeklyGoal', goal)} />
          </Animated.View>
          {recap && (
            <PrimaryButton label={recap.which === 'this' ? 'Share your week' : 'Share last week'} tone="quiet" icon="share" onPress={() => router.push('/recap')} />
          )}
          {/* A goal is easier kept with a nudge: offered here while reminders are off (phones only). */}
          {prefs.weeklyGoal !== null && remindersOn === false && (
            <PrimaryButton label="Remind me on training days" tone="quiet" icon="bell" onPress={() => router.push('/reminders')} />
          )}
        </>
      )}

      {known && (
        <>
          <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
            YOUR BODY
          </Txt>
          <BodyWeightCard unit={unit} />
        </>
      )}

      {known && log.sessions.length > 0 && (
        <Animated.View>
          <MuscleBalanceCard sessions={log.sessions} isPro={billing.isPro} onPro={() => openPro('balance')} />
        </Animated.View>
      )}

      {records.length > 0 && (
        <>
          <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
            YOUR RECORDS
          </Txt>
          <Animated.View layout={GLIDE} style={styles.group}>
            {records.map(([exerciseId, record], index) => {
              const best = record.heaviestSet;
              return (
                <Pressable
                  key={exerciseId}
                  onPress={() => router.push({ pathname: '/progress/[exercise]', params: { exercise: exerciseId } })}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.row, index > 0 && styles.rowLine, pressed && { backgroundColor: color.fill }]}
                >
                  <ExerciseTile exerciseId={exerciseId} size={40} />
                  <View style={styles.flex}>
                    <Txt variant="body" style={face('medium')}>
                      {nameOf(exerciseId)}
                    </Txt>
                    <Txt variant="footnote" color={color.labelSecondary}>
                      {best
                        ? `Heaviest ${keepTogether(`${formatWeight(Number(fromKg(record.heaviestKg!, unit).toFixed(1)), unit)} × ${best.reps}`)}`
                        : record.mostReps !== null
                          ? `Most reps ${record.mostReps}`
                          : 'No sets yet'}
                    </Txt>
                  </View>
                  {/* The estimated 1-rep max on the right, the figure to watch grow. */}
                  {record.e1rmKg !== null && (
                    <View style={styles.max} accessible accessibilityLabel={`1-rep max about ${formatWeight(Math.round(fromKg(record.e1rmKg, unit)), unit)}`}>
                      <Txt variant="headline" style={styles.figure}>
                        {`≈ ${formatWeight(Math.round(fromKg(record.e1rmKg, unit)), unit)}`}
                      </Txt>
                      <Txt variant="caption" color={color.labelSecondary}>
                        1-rep max
                      </Txt>
                    </View>
                  )}
                  <Icon name="chevron" size={13} color={color.labelTertiary} />
                </Pressable>
              );
            })}
          </Animated.View>
        </>
      )}

      {known && log.sessions.length > 0 && (
        <>
          <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
            MILESTONES
          </Txt>
          <Animated.View>
            <MilestonesCard sessions={log.sessions} />
          </Animated.View>
        </>
      )}

      {log.sessions.length > 0 && (
        <>
          <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
            HISTORY
          </Txt>
          <Animated.View layout={GLIDE} style={styles.days}>
            {days.slice(0, shownDays).map((day) => (
              <View key={day.key} style={styles.day}>
                <Txt variant="footnote" color={color.labelSecondary} accessibilityRole="header" style={[face('semibold'), styles.dayLabel]}>
                  {day.label}
                </Txt>
                <View style={styles.group}>
                  {day.sessions.map((session, index) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      first={index === 0}
                      open={open === session.id}
                      onToggle={() => setOpen(open === session.id ? null : session.id)}
                      onDelete={async () => {
                        await api.deleteTraining(token, session.id);
                        log.remove(session.id);
                      }}
                    />
                  ))}
                </View>
              </View>
            ))}
          </Animated.View>
        </>
      )}

      {olderSessions > 0 && (
        <PrimaryButton
          label={`Show older workouts (${olderSessions})`}
          icon="history"
          tone="quiet"
          onPress={() => setShownDays((shown) => shown + HISTORY_DAYS)}
        />
      )}
      <PrimaryButton label="Plate calculator" icon="plates" tone="quiet" onPress={() => router.push('/plates')} />
      {known && log.sessions.length > 0 && (
        <PrimaryButton
          label="Export your log (CSV)"
          icon="download"
          tone="quiet"
          onPress={() => void downloadTrainingCsv(log.sessions).catch(() => undefined)}
        />
      )}
      {known && log.sessions.length > 0 && (
        <Txt variant="footnote" color={color.labelSecondary} style={styles.healthNote}>
          A row for every set, for Excel, Numbers or Google Sheets. Apple Health and Google Fit can only be connected from a version of GymGO built
          for the App Store or Play Store, which Expo Go can’t run; this file is the way to take your log elsewhere until then.
        </Txt>
      )}
    </PageScroll>
  );
}

/** `value` is null until the log has loaded: a dash, not a zero, so a log that didn't load doesn't read as no training. */
function Stat({ icon, tint, value, one, many }: { icon: IconName; tint: string; value: number | null; one: string; many: string }) {
  const label = value === 1 ? one : many;
  return (
    <View style={styles.stat} accessible accessibilityLabel={value === null ? `${many}: not loaded` : `${value} ${label}`}>
      <Icon name={icon} size={18} color={tint} />
      {value === null ? (
        <Txt variant="title" style={face('bold')}>
          —
        </Txt>
      ) : (
        <CountUp id={`progress.${many}`} value={value} style={face('bold')} />
      )}
      <Txt variant="caption" color={color.labelSecondary} style={styles.center}>
        {label}
      </Txt>
    </View>
  );
}

function SessionRow({
  session,
  first,
  open,
  onToggle,
  onDelete,
}: {
  session: TrainingSession;
  first: boolean;
  open: boolean;
  onToggle: () => void;
  onDelete: () => Promise<void>;
}) {
  const [confirm, setConfirm] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const volume = fromKg(volumeKg(session), session.unit);
  return (
    <View style={[!first && styles.rowLine]}>
      <Pressable
        onPress={() => {
          haptic.select();
          setConfirm(false);
          onToggle();
        }}
        accessibilityRole="button"
        aria-expanded={open}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.fill }]}
      >
        <View style={styles.flex}>
          <Txt variant="body">{session.name}</Txt>
          <Txt variant="footnote" color={color.labelSecondary}>
            {[startTime(session.startedAt), durationLabel(Date.parse(session.finishedAt) - Date.parse(session.startedAt)), `${setCount(session)} set${setCount(session) === 1 ? '' : 's'}`, volume > 0 ? `${Math.round(volume).toLocaleString()} ${session.unit}` : null]
              .filter(Boolean)
              .join(' · ')}
          </Txt>
          {/* What it was, at a glance: each exercise's icon, closed. */}
          {!open && session.exercises.length > 0 && (
            <View style={styles.strip}>
              {session.exercises.slice(0, STRIP).map((logged, index) => (
                <ExerciseTile key={`${logged.exerciseId}-${index}`} exerciseId={logged.exerciseId} size={26} />
              ))}
              {session.exercises.length > STRIP && (
                <Txt variant="caption" color={color.labelSecondary} style={face('semibold')}>
                  {`+${session.exercises.length - STRIP}`}
                </Txt>
              )}
            </View>
          )}
          {/* The note's first line, closed; the whole note (to edit) when it's open. */}
          {session.note && !open && (
            <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1} style={styles.notePeek}>
              {session.note}
            </Txt>
          )}
        </View>
        <Icon name="chevron" size={13} color={color.labelTertiary} />
      </Pressable>
      {open && (
        <View style={styles.detail}>
          <SessionNote session={session} compact />
          {session.exercises.map((logged, index) => (
            <View key={`${logged.exerciseId}-${index}`} style={styles.logged}>
              <ExerciseTile exerciseId={logged.exerciseId} size={32} />
              <View style={styles.flex}>
                <Txt variant="footnote" style={face('semibold')}>
                  {nameOf(logged.exerciseId)}
                </Txt>
                <Txt variant="footnote" color={color.labelSecondary}>
                  {setsSummary(logged.sets, session.unit)}
                </Txt>
              </View>
            </View>
          ))}
          <Pressable
            onPress={() => {
              if (!confirm) return setConfirm(true);
              onDelete().catch(() => setProblem('Couldn’t delete it just now.'));
            }}
            accessibilityRole="button"
            style={styles.delete}
          >
            <Txt variant="footnote" color={color.dangerInk} style={face('semibold')}>
              {confirm ? 'Tap again to delete this workout' : 'Delete'}
            </Txt>
          </Pressable>
          {problem && (
            <Txt variant="footnote" color={color.dangerInk}>
              {problem}
            </Txt>
          )}
        </View>
      )}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  healthNote: { paddingHorizontal: space[4], textAlign: 'center' },
  page: { flex: 1, backgroundColor: color.groupedBackground },
  content: { padding: space[4], gap: space[3], paddingBottom: space[8], width: '100%', maxWidth: 640, alignSelf: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6], backgroundColor: color.groupedBackground },
  center: { textAlign: 'center' },
  flex: { flex: 1, gap: 2 },
  stats: { flexDirection: 'row', gap: space[2] },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space[3], borderRadius: radius.lg, backgroundColor: color.plate, ...shadow.plate },
  freeze: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], borderRadius: radius.lg, backgroundColor: color.brandTint },
  problem: { gap: space[2] },
  section: { marginTop: space[3], marginLeft: space[4] },
  days: { gap: space[4] },
  day: { gap: space[2] },
  dayLabel: { marginLeft: space[4] },
  group: { backgroundColor: color.plate, borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', ...shadow.plate },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
  notePeek: { fontStyle: 'italic' },
  max: { alignItems: 'flex-end' },
  figure: { fontVariant: ['tabular-nums'] },
  strip: { flexDirection: 'row', alignItems: 'center', gap: space[1], marginTop: space[1] },
  logged: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: 2 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
  detail: { paddingHorizontal: space[4], paddingBottom: space[3], gap: space[2] },
  delete: { alignSelf: 'flex-start', paddingVertical: space[2] },
}));
