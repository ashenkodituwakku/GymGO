/**
 * Progress's cards about the longer run: your week against the goal you
 * set, with the last twelve weeks as a calendar; your milestones; and, with
 * Pro, how your sets split across your muscles. Every one is drawn from your
 * own log and nothing else.
 */

import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Pressy } from './motion';
import { haptic } from '@/lib/haptics';
import {
  WEEKLY_GOALS,
  goalStreak,
  milestones,
  muscleBalance,
  trainingCalendar,
  type MilestoneKind,
} from '@/lib/insights';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { weekStreak, type TrainingSession } from '@/lib/training';
import { Icon, type IconName } from './Icon';
import { Txt } from './ui';

const WEEKS = 12;
const GOAL_MIN = WEEKLY_GOALS[0];
const GOAL_MAX = WEEKLY_GOALS[WEEKLY_GOALS.length - 1] ?? 7;
const ROW_LABELS = ['M', '', 'W', '', 'F', '', 'S'];

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

      <View
        style={styles.calendar}
        accessible
        accessibilityLabel={`The last ${WEEKS} weeks: you trained on ${daysTrained} day${daysTrained === 1 ? '' : 's'}${goal ? `, and met your goal in ${weeksMet} week${weeksMet === 1 ? '' : 's'}` : ''}.`}
      >
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
            {week.days.map((day) => (
              <View
                key={day.date}
                style={[
                  styles.day,
                  day.future ? styles.dayFuture : day.sessions > 0 ? styles.dayTrained : styles.dayRest,
                  day.date === today && styles.dayToday,
                ]}
              />
            ))}
            <View style={[styles.metDot, goal !== null && week.sessions >= goal && styles.metDotOn]} />
          </View>
        ))}
      </View>
      <Txt variant="caption" color={color.labelSecondary}>
        {`The last ${WEEKS} weeks, a square a day, Monday at the top.${goal ? ' A green dot marks a week you met your goal.' : ''}`}
      </Txt>
    </View>
  );
}

/** Home's one line on your week: the count against your goal, the streak, and a dot a day. Opens Progress. */
export function WeekStrip({ sessions, goal, onPress, now = new Date() }: { sessions: TrainingSession[]; goal: number | null; onPress: () => void; now?: Date }) {
  const week = useMemo(() => trainingCalendar(sessions, 1, now)[0]!, [sessions, now]);
  const streak = weekStreak(sessions, now);
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
      <View style={styles.flex}>
        <Txt variant="headline">{title}</Txt>
        <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1}>
          {goal && count >= goal && streak > 1 ? `Goal met · ${streak} weeks in a row` : detail}
        </Txt>
      </View>
      <View style={styles.stripDays}>
        {week.days.map((day) => (
          <View
            key={day.date}
            style={[styles.stripDay, day.sessions > 0 ? styles.dayTrained : day.future ? styles.stripFuture : styles.dayRest, day.date === today && styles.stripToday]}
          />
        ))}
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
      <Pressable onPress={onPro} accessibilityRole="button" style={({ pressed }) => [styles.card, styles.pro, pressed && { opacity: 0.8 }]}>
        <Icon name="body" size={22} color={color.brand} />
        <View style={styles.flex}>
          <Txt variant="headline">See your muscle balance</Txt>
          <Txt variant="footnote" color={color.labelSecondary}>
            GymGO Pro counts your sets for every muscle over the last four weeks, and names the ones you’ve missed.
          </Txt>
        </View>
        <Icon name="chevron" size={13} color={color.labelTertiary} />
      </Pressable>
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
    flex: { flex: 1, gap: 2 },
    card: { backgroundColor: color.card, borderRadius: radius.lg, borderCurve: 'continuous', padding: space[4], gap: space[3], ...shadow.plate },
    pro: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    head: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    goalRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    goalValue: { minWidth: 72, textAlign: 'center' },
    strip: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.card, ...shadow.plate },
    stripIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: color.maybe },
    stripDays: { flexDirection: 'row', gap: 4 },
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
    metDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
    metDotOn: { backgroundColor: color.good },

    group: { backgroundColor: color.card, borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', ...shadow.plate },
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
