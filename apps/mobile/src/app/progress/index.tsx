/**
 * Progress: your streak, your records for every exercise, and every session
 * you've logged. All free; the chart for each exercise is Pro.
 */

import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { PrimaryButton, Txt } from '@/components/ui';
import { useActiveSession } from '@/lib/activeSession';
import { api } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { color, face, radius, space, themed } from '@/lib/theme';
import {
  durationLabel,
  formatWeight,
  fromKg,
  personalRecords,
  sessionsThisWeek,
  setCount,
  setsSummary,
  unitFor,
  volumeKg,
  weekStreak,
  type TrainingSession,
} from '@/lib/training';
import { useTrainingLog } from '@/lib/useTraining';
import { EXERCISES } from '@/lib/workout';

const nameOf = (id: string) => EXERCISES.find((exercise) => exercise.id === id)?.name ?? id;
const longDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

export default function ProgressScreen() {
  const { account, prefs } = useApp();
  const token = account.state === 'signed_in' ? account.token : null;
  const log = useTrainingLog(token);
  const active = useActiveSession();
  const router = useRouter();
  const unit = unitFor(prefs.country);
  const records = useMemo(() => [...personalRecords(log.sessions)].sort((a, b) => b[1].sessions - a[1].sessions || nameOf(a[0]).localeCompare(nameOf(b[0]))), [log.sessions]);
  const [open, setOpen] = useState<string | null>(null);

  const start = active ? (
    <PrimaryButton label="Back to your workout" icon="play" onPress={() => router.push('/train')} />
  ) : (
    <PrimaryButton label="Start a workout" icon="play" onPress={() => router.push({ pathname: '/workout/[id]', params: { id: 'any' } })} />
  );

  if (!token) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: 'Progress' }} />
        <Icon name="chart" size={34} color={color.brand} />
        <Txt variant="title2">Keep a training log</Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
          Sign in (it’s free) and every workout you finish is kept here, with your records and your streak.
        </Txt>
        <PrimaryButton label="Sign in" onPress={() => router.push('/sign-in')} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: 'Progress' }} />
      <View style={styles.stats}>
        <Stat icon="flame" tint={color.maybe} value={String(weekStreak(log.sessions))} label={weekStreak(log.sessions) === 1 ? 'week in a row' : 'weeks in a row'} />
        <Stat icon="calendar" tint={color.brand} value={String(sessionsThisWeek(log.sessions))} label="this week" />
        <Stat icon="workout" tint={color.good} value={String(log.sessions.length)} label={log.sessions.length === 1 ? 'workout' : 'workouts'} />
      </View>
      {start}

      {log.status === 'loading' && (
        <Txt variant="subhead" color={color.labelSecondary}>
          Loading your log…
        </Txt>
      )}
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

      {records.length > 0 && (
        <>
          <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
            YOUR RECORDS
          </Txt>
          <View style={styles.group}>
            {records.map(([exerciseId, record], index) => {
              const best = record.heaviestSet;
              return (
                <Pressable
                  key={exerciseId}
                  onPress={() => router.push({ pathname: '/progress/[exercise]', params: { exercise: exerciseId } })}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.row, index > 0 && styles.rowLine, pressed && { backgroundColor: color.fill }]}
                >
                  <View style={styles.flex}>
                    <Txt variant="body">{nameOf(exerciseId)}</Txt>
                    <Txt variant="footnote" color={color.labelSecondary}>
                      {best
                        ? `Heaviest ${formatWeight(Number(fromKg(record.heaviestKg!, unit).toFixed(1)), unit)} × ${best.reps}`
                        : record.mostReps !== null
                          ? `Most reps ${record.mostReps}`
                          : 'No sets yet'}
                      {record.e1rmKg !== null ? ` · 1-rep max ≈ ${formatWeight(Math.round(fromKg(record.e1rmKg, unit)), unit)}` : ''}
                    </Txt>
                  </View>
                  <Icon name="chevron" size={13} color={color.labelTertiary} />
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {log.sessions.length > 0 && (
        <>
          <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
            HISTORY
          </Txt>
          <View style={styles.group}>
            {log.sessions.map((session, index) => (
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
        </>
      )}

      <PrimaryButton label="Plate calculator" icon="plates" tone="quiet" onPress={() => router.push('/plates')} />
    </ScrollView>
  );
}

function Stat({ icon, tint, value, label }: { icon: IconName; tint: string; value: string; label: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <Icon name={icon} size={18} color={tint} />
      <Txt variant="title" style={face('bold')}>
        {value}
      </Txt>
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
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.fill }]}
      >
        <View style={styles.flex}>
          <Txt variant="body">{session.name}</Txt>
          <Txt variant="footnote" color={color.labelSecondary}>
            {[longDate(session.finishedAt), durationLabel(Date.parse(session.finishedAt) - Date.parse(session.startedAt)), `${setCount(session)} set${setCount(session) === 1 ? '' : 's'}`, volume > 0 ? `${Math.round(volume).toLocaleString()} ${session.unit}` : null]
              .filter(Boolean)
              .join(' · ')}
          </Txt>
        </View>
        <Icon name="chevron" size={13} color={color.labelTertiary} />
      </Pressable>
      {open && (
        <View style={styles.detail}>
          {session.exercises.map((logged) => (
            <Txt key={logged.exerciseId} variant="footnote">
              <Txt variant="footnote" style={face('semibold')}>
                {nameOf(logged.exerciseId)}
              </Txt>
              {`  ${setsSummary(logged.sets, session.unit)}`}
            </Txt>
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
  page: { flex: 1, backgroundColor: color.groupedBackground },
  content: { padding: space[4], gap: space[3], paddingBottom: space[8], width: '100%', maxWidth: 640, alignSelf: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6], backgroundColor: color.groupedBackground },
  center: { textAlign: 'center' },
  flex: { flex: 1, gap: 2 },
  stats: { flexDirection: 'row', gap: space[2] },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space[3], borderRadius: radius.lg, backgroundColor: color.card },
  problem: { gap: space[2] },
  section: { marginTop: space[3], marginLeft: space[4] },
  group: { backgroundColor: color.card, borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
  detail: { paddingHorizontal: space[4], paddingBottom: space[3], gap: space[1] },
  delete: { alignSelf: 'flex-start', paddingVertical: space[2] },
}));
