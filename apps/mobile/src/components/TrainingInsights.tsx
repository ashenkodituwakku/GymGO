/**
 * Progress's cards about the longer run: your week against the goal you
 * set, with the last twelve weeks as a calendar; your milestones; and, with
 * Pro, how your sets split across your muscles. Every one is drawn from your
 * own log and nothing else.
 */

import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable, Pressy } from './motion';
import { haptic } from '@/lib/haptics';
import {
  WEEKLY_GOALS,
  goalStreak,
  milestones,
  muscleBalance,
  sessionsOnDay,
  trainingCalendar,
  type MilestoneKind,
} from '@/lib/insights';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { durationLabel, setCount, streakOf, type TrainingSession } from '@/lib/training';
import { ExerciseTile } from './ExerciseGlyph';
import { Icon, type IconName } from './Icon';
import { ProOffer } from './ProOffer';
import { Txt } from './ui';

const WEEKS = 12;
const GOAL_MIN = WEEKLY_GOALS[0];
const GOAL_MAX = WEEKLY_GOALS[WEEKLY_GOALS.length - 1] ?? 7;
const ROW_LABELS = ['M', '', 'W', '', 'F', '', 'S'];
/** "Wednesday 14 October", for a calendar day. */
const longDay = (date: number) => new Date(date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

/** This week against your goal, and the last twelve weeks, a square a day. */
export function WeekCard({
  sessions,
  goal,
  onGoal,
  now = new Date(),
}: {
  sessions: TrainingSession[];
  goal: number | null;
  onGoal: (goal: number | null) => void;
  now?: Date;
}) {
  const weeks = useMemo(() => trainingCalendar(sessions, WEEKS, now), [sessions, now]);
  const thisWeek = weeks[weeks.length - 1]!.sessions;
  const streak = goal ? goalStreak(sessions, goal, now) : 0;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const daysTrained = weeks.reduce((sum, week) => sum + week.days.filter((day) => day.sessions > 0).length, 0);
  const weeksMet = goal ? weeks.filter((week) => week.sessions >= goal).length : 0;
  // A trained day tapped: what you did that day, under the calendar.
  const [picked, setPicked] = useState<number | null>(null);
  const pickedSessions = picked === null ? [] : sessionsOnDay(sessions, picked);

  const status = goal
    ? thisWeek >= goal
      ? streak > 1
        ? `Goal of ${goal} met, ${streak} weeks in a row`
        : `Goal of ${goal} met. Nice work.`
      : `${goal - thisWeek} more to reach your goal`
    : 'Set a goal to aim for each week';

  const change = (by: number) => {
    const next = Math.min(GOAL_MAX, Math.max(GOAL_MIN, (goal ?? 3) + by));
    haptic.select();
    onGoal(next);
  };

  return (
    <View style={styles.card}>
      <View
        style={styles.head}
        accessible
        accessibilityLabel={`This week: ${goal ? `${thisWeek} of ${goal} workouts` : `${thisWeek} workout${thisWeek === 1 ? '' : 's'}`}. ${status}.`}
      >
        <View style={styles.flex}>
          <Txt variant="headline">This week</Txt>
          <Txt variant="footnote" color={color.labelSecondary}>
            {status}
          </Txt>
        </View>
        <Txt variant="title" style={face('bold')}>
          {/* "3 of 3" on the way; past it, just the count, as "6 of 2" reads oddly. */}
          {goal && thisWeek <= goal ? `${thisWeek} of ${goal}` : String(thisWeek)}
        </Txt>
      </View>

      {goal ? (
        <View style={styles.goalRow}>
          <Txt variant="subhead" color={color.labelSecondary} style={styles.flex}>
            Weekly goal
          </Txt>
          <Stepper icon="minus" label="Aim for one fewer a week" disabled={goal <= GOAL_MIN} onPress={() => change(-1)} />
          <Txt variant="subhead" style={[face('semibold'), styles.goalValue]}>
            {goal} a week
          </Txt>
          <Stepper icon="plus" label="Aim for one more a week" disabled={goal >= GOAL_MAX} onPress={() => change(1)} />
        </View>
      ) : (
        <Pressable onPress={() => change(0)} accessibilityRole="button" style={({ pressed }) => [styles.setGoal, pressed && { opacity: 0.7 }]}>
          <Icon name="target" size={16} color={color.brand} />
          <Txt variant="subhead" color={color.brand} style={face('semibold')}>
            Aim for 3 a week
          </Txt>
        </Pressable>
      )}

      <View style={styles.calendar}>
        <View style={styles.rowLabels}>
          {ROW_LABELS.map((label, index) => (
            <View key={index} style={styles.rowLabel}>
              <Txt variant="caption" color={color.labelTertiary}>
                {label}
              </Txt>
            </View>
          ))}
          <View style={styles.metDot} />
        </View>
        {weeks.map((week) => (
          <View key={week.start} style={styles.week}>
            {week.days.map((day) => {
              const look = [
                styles.day,
                day.future ? styles.dayFuture : day.sessions > 0 ? styles.dayTrained : styles.dayRest,
                day.date === today && styles.dayToday,
                day.date === picked && styles.dayPicked,
              ];
              // A trained day opens what you did; the rest are just squares.
              return day.sessions > 0 ? (
                <Pressable
                  key={day.date}
                  onPress={() => {
                    haptic.select();
                    setPicked(picked === day.date ? null : day.date);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${longDay(day.date)}: ${day.sessions} workout${day.sessions === 1 ? '' : 's'}`}
                  aria-expanded={picked === day.date}
                  hitSlop={2}
                  style={({ pressed }) => [...look, pressed && { opacity: 0.7 }]}
                />
              ) : (
                <View key={day.date} style={look} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
              );
            })}
            <View style={[styles.metDot, goal !== null && week.sessions >= goal && styles.metDotOn]} />
          </View>
        ))}
      </View>
      {picked !== null && pickedSessions.length > 0 && (
        <View style={styles.dayDetail}>
          <Txt variant="footnote" color={color.labelSecondary} style={face('semibold')}>
            {longDay(picked)}
          </Txt>
          {pickedSessions.map((session) => (
            <View key={session.id} style={styles.daySession}>
              <View style={styles.flex}>
                <Txt variant="subhead" style={face('semibold')} numberOfLines={1}>
                  {session.name}
                </Txt>
                <Txt variant="caption" color={color.labelSecondary}>
                  {`${durationLabel(Date.parse(session.finishedAt) - Date.parse(session.startedAt))} · ${setCount(session)} set${setCount(session) === 1 ? '' : 's'}`}
                </Txt>
              </View>
              <View style={styles.dayStrip}>
                {session.exercises.slice(0, 4).map((logged, index) => (
                  <ExerciseTile key={`${logged.exerciseId}-${index}`} exerciseId={logged.exerciseId} size={24} />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
      <View
        accessible
        accessibilityLabel={`The last ${WEEKS} weeks: you trained on ${daysTrained} day${daysTrained === 1 ? '' : 's'}${goal ? `, and met your goal in ${weeksMet} week${weeksMet === 1 ? '' : 's'}` : ''}. Tap a day you trained to see what you did.`}
      >
        <Txt variant="caption" color={color.labelSecondary}>
          {`The last ${WEEKS} weeks, a square a day, Monday at the top.${goal ? ' A green dot marks a week you met your goal.' : ''} Tap a day you trained to see what you did.`}
        </Txt>
      </View>
    </View>
  );
}

/** Home's one line on your week: the count against your goal, the streak, and a dot a day. Opens Progress. */
export function WeekStrip({
  sessions,
  goal,
  onPress,
  freezes = false,
  now = new Date(),
}: {
  sessions: TrainingSession[];
  goal: number | null;
  onPress: () => void;
  /** Pro's streak freeze: one missed week a month doesn't end the run. */
  freezes?: boolean;
  now?: Date;
}) {
  const week = useMemo(() => trainingCalendar(sessions, 1, now)[0]!, [sessions, now]);
  const streak = streakOf(sessions, now, freezes).weeks;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const count = week.sessions;
  const title = goal ? (count <= goal ? `${count} of ${goal} this week` : `${count} this week, goal ${goal}`) : `${count} workout${count === 1 ? '' : 's'} this week`;
  const detail = goal && count >= goal ? 'Goal met' : streak > 1 ? `${streak} weeks in a row` : goal ? `${goal - count} to go` : 'Tap to set a weekly goal';
  return (
    <Pressy
      scaleTo={0.97}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}. Open Progress`}
      style={styles.strip}
    >
      <View style={styles.stripIcon}>
        <Icon name="flame" size={16} color={color.onBrand} />
      </View>
      {/* The week's dots under the words, so a narrow phone keeps the title on one line. */}
      <View style={styles.flex}>
        <Txt variant="headline" numberOfLines={1}>
          {title}
        </Txt>
        <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1}>
          {goal && count >= goal && streak > 1 ? `Goal met · ${streak} weeks in a row` : detail}
        </Txt>
        <View style={styles.stripDays}>
          {week.days.map((day) => (
            <View
              key={day.date}
              style={[styles.stripDay, day.sessions > 0 ? styles.dayTrained : day.future ? styles.stripFuture : styles.dayRest, day.date === today && styles.stripToday]}
            />
          ))}
        </View>
      </View>
      <Icon name="chevron" size={14} color={color.labelTertiary} />
    </Pressy>
  );
}

function Stepper({ icon, label, disabled, onPress }: { icon: IconName; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [styles.stepper, disabled && { opacity: 0.35 }, pressed && { opacity: 0.6 }]}
    >
      <Icon name={icon} size={14} color={color.brand} />
    </Pressable>
  );
}

const LADDER_ICON: Record<MilestoneKind, IconName> = { workouts: 'workout', streak: 'flame', records: 'trophy', sets: 'check' };

/** Your milestones: for each, the steps you've passed and how far to the next. */
export function MilestonesCard({ sessions }: { sessions: TrainingSession[] }) {
  const ladders = useMemo(() => milestones(sessions), [sessions]);
  return (
    <View style={styles.group}>
      {ladders.map((ladder, index) => {
        const below = [...ladder.steps].reverse().find((step) => ladder.have >= step) ?? 0;
        const share = ladder.next === null ? 1 : Math.max(0, Math.min(1, (ladder.have - below) / (ladder.next - below)));
        return (
          <View
            key={ladder.kind}
            style={[styles.ladder, index > 0 && styles.rowLine]}
            accessible
            accessibilityLabel={`${ladder.title}: ${ladder.label}. ${ladder.next === null ? 'Every milestone reached.' : `Next milestone at ${ladder.next.toLocaleString('en')}.`}`}
          >
            <View style={[styles.ladderIcon, ladder.reached.length > 0 && styles.ladderIconOn]}>
              <Icon name={LADDER_ICON[ladder.kind]} size={16} color={ladder.reached.length > 0 ? color.onBrand : color.labelSecondary} />
            </View>
            <View style={styles.flex}>
              <View style={styles.ladderHead}>
                <Txt variant="body" style={styles.flex}>
                  {ladder.title}
                </Txt>
                <Txt variant="footnote" color={color.labelSecondary}>
                  {ladder.next === null ? 'All reached' : `Next: ${ladder.next.toLocaleString('en')}`}
                </Txt>
              </View>
              <Txt variant="footnote" color={color.labelSecondary}>
                {ladder.label}
              </Txt>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round(share * 100)}%` }]} />
              </View>
              <View style={styles.steps}>
                {ladder.steps.map((step) => {
                  const on = ladder.have >= step;
                  return (
                    <View key={step} style={[styles.step, on && styles.stepOn]}>
                      <Txt variant="caption" color={on ? color.onBrand : color.labelSecondary} style={face('semibold')}>
                        {step.toLocaleString('en')}
                      </Txt>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** With Pro: how your sets over the last four weeks split across your muscles. Without: what it would show. */
export function MuscleBalanceCard({ sessions, isPro, onPro, now = new Date() }: { sessions: TrainingSession[]; isPro: boolean; onPro: () => void; now?: Date }) {
  const balance = useMemo(() => muscleBalance(sessions, 28, now), [sessions, now]);
  if (!isPro) {
    return (
      <ProOffer
        icon="body"
        title="See your muscle balance"
        body="GymGO Pro counts your sets for every muscle over the last four weeks, and names the ones you’ve missed."
        onPress={onPro}
      />
    );
  }
  const trained = balance.muscles.filter((item) => item.sets > 0);
  const missed = balance.muscles.filter((item) => item.sets === 0);
  const top = Math.max(1, ...trained.map((item) => item.sets));
  const sets = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));
  return (
    <View style={styles.card}>
      <View>
        <Txt variant="headline">Muscle balance</Txt>
        <Txt variant="footnote" color={color.labelSecondary}>
          Sets in the last four weeks
        </Txt>
      </View>
      {trained.length === 0 ? (
        <Txt variant="subhead" color={color.labelSecondary}>
          Nothing logged in the last four weeks. Finish a workout and it shows here.
        </Txt>
      ) : (
        <View style={styles.bars}>
          {trained.map((item) => (
            <View key={item.muscle} style={styles.bar} accessible accessibilityLabel={`${item.label}: ${sets(item.sets)} sets`}>
              <Txt variant="footnote" style={styles.barLabel} numberOfLines={1}>
                {item.label}
              </Txt>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.max(4, Math.round((item.sets / top) * 100))}%` }]} />
              </View>
              <Txt variant="footnote" color={color.labelSecondary} style={styles.barValue}>
                {sets(item.sets)}
              </Txt>
            </View>
          ))}
        </View>
      )}
      {trained.length > 0 && missed.length > 0 && (
        <View style={styles.missed}>
          <Icon name="info" size={15} color={color.maybeInk} />
          <Txt variant="footnote" color={color.label} style={styles.flex}>
            {`Not trained in four weeks: ${missed.map((item) => item.label).join(', ')}.`}
          </Txt>
        </View>
      )}
      <Txt variant="caption" color={color.labelSecondary}>
        {`A set counts once for the muscles an exercise mainly works and half for those it helps.${
          balance.unknownSets > 0
            ? ` ${balance.unknownSets} set${balance.unknownSets === 1 ? '' : 's'} of exercises GymGO doesn’t list ${balance.unknownSets === 1 ? 'isn’t' : 'aren’t'} counted, as their muscles aren’t known.`
            : ''
        }`}
      </Txt>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0, gap: 2 },
    card: { backgroundColor: color.plate, borderRadius: radius.lg, borderCurve: 'continuous', padding: space[4], gap: space[3], ...shadow.plate },
    head: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    goalRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    goalValue: { minWidth: 72, textAlign: 'center' },
    strip: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
    stripIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: color.maybe },
    stripDays: { flexDirection: 'row', gap: 5, marginTop: 6 },
    stripDay: { width: 10, height: 10, borderRadius: 5 },
    stripFuture: { backgroundColor: color.fill, opacity: 0.5 },
    stripToday: { borderWidth: 1.5, borderColor: color.brand },
    stepper: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandTint },
    setGoal: { flexDirection: 'row', alignItems: 'center', gap: space[2], alignSelf: 'flex-start', paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.pill, backgroundColor: color.brandTint },

    calendar: { flexDirection: 'row', gap: 4 },
    rowLabels: { gap: 4, width: 12 },
    rowLabel: { flex: 1, aspectRatio: 1, maxHeight: 22, justifyContent: 'center' },
    week: { flex: 1, gap: 4, alignItems: 'center' },
    day: { width: '100%', aspectRatio: 1, maxWidth: 22, borderRadius: 5, borderCurve: 'continuous' },
    dayRest: { backgroundColor: color.fill },
    dayTrained: { backgroundColor: color.brand },
    dayFuture: { backgroundColor: 'transparent' },
    dayToday: { borderWidth: 2, borderColor: color.brand },
    // The day you tapped: ringed in the page's ink, so it shows on a filled square too.
    dayPicked: { borderWidth: 2, borderColor: color.label },
    dayDetail: { gap: space[2], padding: space[3], borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: color.fill },
    daySession: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    dayStrip: { flexDirection: 'row', gap: 3 },
    metDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
    metDotOn: { backgroundColor: color.good },

    group: { backgroundColor: color.plate, borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', ...shadow.plate },
    rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
    ladder: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
    ladderIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: color.fill, marginTop: 2 },
    ladderIconOn: { backgroundColor: color.brandFill },
    ladderHead: { flexDirection: 'row', alignItems: 'baseline', gap: space[2] },
    track: { height: 6, borderRadius: 3, backgroundColor: color.fill, overflow: 'hidden', marginTop: space[1] },
    fill: { height: '100%', borderRadius: 3, backgroundColor: color.brand },
    steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space[2] },
    step: { minWidth: 30, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: color.fill, alignItems: 'center' },
    stepOn: { backgroundColor: color.brandFill },

    bars: { gap: space[2] },
    bar: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    barLabel: { width: 92 },
    barTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: color.fill, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 5, backgroundColor: color.brand },
    barValue: { width: 34, textAlign: 'right' },
    missed: { flexDirection: 'row', gap: space[2], alignItems: 'flex-start', padding: space[3], borderRadius: radius.md, backgroundColor: color.maybeTint },
  }),
);
