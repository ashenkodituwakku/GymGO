/**
 * Training programme (lib/programmes.ts): pick a goal, how many days a week
 * and how many weeks, and GymGO plans them. Once you're on one: which week
 * it is, how many of this week's workouts are done, the next day with its
 * exercises (swap any), and the rule for adding weight. Every fourth week is
 * easier. With Pro, each exercise shows exactly what to lift next, and
 * GymPal can suggest changes from your training log.
 *
 * The programme is kept on this device (lib/programmeStore.ts); its
 * workouts go to your log like any other.
 */

import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { AskGymPal } from '@/components/AskGymPal';
import { BrandFill } from '@/components/BrandFill';
import { ExerciseTile } from '@/components/ExerciseGlyph';
import { Icon } from '@/components/Icon';
import { Pressable } from '@/components/motion';
import { PageScroll } from '@/components/PageScroll';
import { useGlassRedraw } from '@/components/Redrawn';
import { ScreenOptions } from '@/components/ScreenOptions';
import { Card, Chip, PrimaryButton, Segmented, Txt } from '@/components/ui';
import { startSession, useActiveSessionGlance } from '@/lib/activeSession';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { LIMITED } from '@/lib/limited';
import { usePageTitle } from '@/lib/pageTitle';
import {
  PROGRAMME_DAYS,
  PROGRAMME_GOALS,
  PROGRAMME_WEEKS,
  dayKey,
  dayPlan,
  nextProgrammeDay,
  programmeDayName,
  programmeDays,
  programmeProgress,
  programmeTarget,
  programmeTitle,
  progressionRule,
  type Programme,
  type ProgrammeDays,
  type ProgrammeGoal,
  type ProgrammeWeeks,
} from '@/lib/programmes';
import { setProgramme, useProgramme } from '@/lib/programmeStore';
import { groupOf, groupName } from '@/lib/supersets';
import { color, face, radius, space, themed } from '@/lib/theme';
import { formatWeight, lastTime, setsSummary, unitFor } from '@/lib/training';
import { useTrainingLog } from '@/lib/useTraining';
import { TYPICAL_KIT, exerciseName, swapFor } from '@/lib/workout';
import { useTapAgain } from '@/lib/tapAgain';

export default function ProgrammeScreen() {
  useGlassRedraw();
  usePageTitle('Training programme');
  const programme = useProgramme();
  // Starting a programme, or going back to pick another, puts a different page here: show it from its top,
  // not from wherever the button was.
  const page = useRef<ScrollViewInstance | null>(null);
  const running = programme !== null;
  const wasRunning = useRef(running);
  useEffect(() => {
    if (wasRunning.current === running) return;
    wasRunning.current = running;
    page.current?.scrollTo({ y: 0, animated: false });
  }, [running]);
  return (
    <PageScroll ref={page} style={styles.page} contentContainerStyle={styles.content}>
      <ScreenOptions options={{ title: 'Programme' }} />
      {programme ? <Running programme={programme} /> : <Chooser />}
      <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
        A general plan, not advice for you. Start lighter than you think, leave a rep or two in the tank, and swap anything that hurts.
      </Txt>
    </PageScroll>
  );
}

// --- Picking one -------------------------------------------------------------

function Chooser() {
  const { prefs } = useApp();
  const [goal, setGoal] = useState<ProgrammeGoal>('muscle');
  const [days, setDays] = useState<ProgrammeDays>(3);
  const [weeks, setWeeks] = useState<ProgrammeWeeks>(8);
  const [shown, setShown] = useState(0);
  const plan = programmeDays(goal, days);
  const day = plan[Math.min(shown, plan.length - 1)]!;
  const unit = unitFor(prefs.country);
  return (
    <>
      <View style={styles.intro}>
        <Txt variant="largeTitle" accessibilityRole="header" level={1}>
          Training programme
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary}>
          Pick a goal and how often you can train: GymGO plans the weeks, takes turns through the days, and puts in an easier week every fourth.
        </Txt>
      </View>
      <Card style={styles.card}>
        <Txt variant="headline">Goal</Txt>
        <View style={styles.goals} accessibilityRole="radiogroup">
          {PROGRAMME_GOALS.map((option) => {
            const on = option.id === goal;
            return (
              <Pressable
                key={option.id}
                onPress={() => {
                  haptic.select();
                  setGoal(option.id);
                  setShown(0);
                }}
                accessibilityRole="radio"
                aria-checked={on}
                accessibilityLabel={`${option.label}: ${option.blurb}`}
                style={({ pressed }) => [styles.goal, on && styles.goalOn, pressed && styles.pressed]}
              >
                <Txt variant="headline" color={on ? color.brand : color.label}>
                  {option.label}
                </Txt>
                <Txt variant="footnote" color={color.labelSecondary}>
                  {option.blurb}
                </Txt>
              </Pressable>
            );
          })}
        </View>
        <Txt variant="headline">Days a week</Txt>
        <Segmented
          options={PROGRAMME_DAYS.map((value) => ({ value, label: `${value} days` }))}
          value={days}
          onChange={(value: ProgrammeDays) => {
            setDays(value);
            setShown(0);
          }}
        />
        <Txt variant="headline">How long</Txt>
        <Segmented options={PROGRAMME_WEEKS.map((value) => ({ value, label: `${value} weeks` }))} value={weeks} onChange={(value: ProgrammeWeeks) => setWeeks(value)} />
      </Card>
      <Card style={styles.card}>
        <Txt variant="headline">{`${plan.length} days, taking turns`}</Txt>
        <View style={styles.chips}>
          {plan.map((option, index) => (
            <Chip key={option.name} label={option.name} selected={option === day} onPress={() => setShown(index)} />
          ))}
        </View>
        <DayList items={day.items} />
        <Txt variant="footnote" color={color.labelSecondary}>
          {progressionRule(unit)}
        </Txt>
      </Card>
      <PrimaryButton
        label={`Start: ${PROGRAMME_GOALS.find((option) => option.id === goal)!.label}, ${days} days a week`}
        icon="play"
        onPress={() => {
          haptic.success();
          setProgramme({ goal, days, weeks, startedOn: dayKey(new Date()), swaps: {} });
        }}
      />
    </>
  );
}

// --- On one -----------------------------------------------------------------

function Running({ programme }: { programme: Programme }) {
  const router = useRouter();
  const { account, billing, openPro, prefs } = useApp();
  const log = useTrainingLog(account.token);
  const active = useActiveSessionGlance();
  const unit = unitFor(prefs.country);
  const progress = useMemo(() => programmeProgress(programme, log.sessions, new Date()), [programme, log.sessions]);
  const next = nextProgrammeDay(programme, log.sessions);
  const [picked, setPicked] = useState<number | null>(null);
  const plan = programmeDays(programme.goal, programme.days);
  const dayIndex = picked ?? next;
  const day = plan[dayIndex]!;
  const items = dayPlan(programme, dayIndex, progress.easier);
  const [ending, setEnding] = useTapAgain();
  const title = programmeTitle(programme.goal);

  const start = () => {
    haptic.success();
    if (!active) startSession({ name: programmeDayName(programme, day), workoutId: null, gymId: null, gymName: null, unit, items });
    router.push('/train');
  };
  // Swap: the next exercise along for the same muscle at a typical gym, kept for the rest of the programme.
  const swap = (index: number) => {
    haptic.select();
    const original = day.items[index]!.exerciseId;
    const next = swapFor(items, index, TYPICAL_KIT);
    if (!next) return;
    const swaps = { ...programme.swaps };
    if (next.id === original) delete swaps[original];
    else swaps[original] = next.id;
    setProgramme({ ...programme, swaps });
  };

  const summary = `${title}: ${programme.days} days a week for ${programme.weeks} weeks, started ${programme.startedOn}. Week ${progress.week}${progress.easier ? ' (an easier week)' : ''}, ${progress.doneThisWeek} of ${programme.days} workouts done this week, ${progress.doneInAll} in all. Days: ${plan
    .map((each, index) => `${each.name}: ${dayPlan(programme, index, false).map((entry) => `${exerciseName(entry.exerciseId)} ${entry.sets}×${entry.reps}`).join(', ')}`)
    .join('. ')}.`;

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.head}>
          <View style={styles.mark}>
            <BrandFill round={13} />
            <Icon name="workout" size={22} color={color.onBrand} />
          </View>
          <View style={styles.flex}>
            <Txt variant="title2" accessibilityRole="header" level={1}>
              {title}
            </Txt>
            <Txt variant="footnote" color={color.brand} style={face('semibold')}>
              {`${programme.days} days a week · ${programme.weeks} weeks`}
            </Txt>
          </View>
        </View>
        {progress.finished ? (
          <Txt variant="headline">{`Done: ${progress.doneInAll} workout${progress.doneInAll === 1 ? '' : 's'} in ${programme.weeks} weeks.`}</Txt>
        ) : (
          <>
            <Txt variant="headline">{`Week ${progress.week} of ${programme.weeks}`}</Txt>
            <WeekBar week={progress.week} weeks={programme.weeks} />
            <Txt variant="subhead" color={color.labelSecondary}>
              {`This week: ${progress.doneThisWeek} of ${programme.days} workouts done`}
            </Txt>
            {progress.easier && (
              <View style={styles.easier}>
                <Icon name="good" size={15} color={color.goodInk} />
                <Txt variant="footnote" color={color.goodInk} style={[styles.flex, face('medium')]}>
                  An easier week: half the sets, about 10% lighter. You’ll come back fresher.
                </Txt>
              </View>
            )}
          </>
        )}
        {!account.token && !LIMITED && (
          <Txt variant="footnote" color={color.maybeInk}>
            Sign in (it’s free) so your workouts are kept: the programme counts the ones in your log.
          </Txt>
        )}
        {LIMITED && (
          <Txt variant="footnote" color={color.maybeInk}>
            Keeping workouts comes with the full version of GymGO, so this one can’t count them here.
          </Txt>
        )}
      </Card>

      {progress.finished ? (
        <PrimaryButton label="Pick another programme" icon="refresh" onPress={() => setProgramme(null)} />
      ) : (
        <Card style={styles.card}>
          <Txt variant="headline">{picked === null || picked === next ? `Next: ${day.name}` : day.name}</Txt>
          <View style={styles.chips}>
            {plan.map((option, index) => (
              <Chip key={option.name} label={index === next ? `${option.name} (next)` : option.name} selected={index === dayIndex} onPress={() => setPicked(index)} />
            ))}
          </View>
          <View style={styles.list}>
            {items.map((entry, index) => (
              <ExerciseRow
                key={`${entry.exerciseId}-${index}`}
                exerciseId={entry.exerciseId}
                plan={`${entry.sets} × ${entry.reps}`}
                group={groupOf(items, index)}
                line={targetLine(entry.exerciseId, entry.reps)}
                onSwap={swapFor(items, index, TYPICAL_KIT) ? () => swap(index) : null}
              />
            ))}
          </View>
          {!billing.isPro && (
            <Pressable onPress={() => openPro('progress')} accessibilityRole="button" accessibilityLabel="Exact weights for each exercise are part of GymGO Pro" style={styles.proHint}>
              <Icon name="target" size={13} color={color.brand} />
              <Txt variant="caption" color={color.brand} style={face('semibold')}>
                Exactly what to lift next · Pro
              </Txt>
            </Pressable>
          )}
          <Txt variant="footnote" color={color.labelSecondary}>
            {progressionRule(unit)}
          </Txt>
          <PrimaryButton label={active ? 'Back to your workout' : `Start ${day.name}`} icon="play" onPress={start} />
          {active && (
            <Txt variant="footnote" color={color.labelSecondary}>
              {`${active.name} is still going: finish it first to start this one.`}
            </Txt>
          )}
        </Card>
      )}

      {!LIMITED && (
        <AskGymPal
          title="Ask GymPal to adjust it"
          detail={billing.isPro ? 'From how your training has gone' : 'What to change, and why'}
          request={{
            question: 'How should I adjust my training programme, from how my training has gone?',
            about: 'your programme',
            context: summary,
            withLog: billing.isPro,
          }}
        />
      )}

      <PrimaryButton
        label={ending ? 'Tap again to end it' : progress.finished ? 'Clear it' : 'End the programme'}
        tone="danger"
        onPress={() => {
          if (!ending) return setEnding(true);
          haptic.select();
          setProgramme(null);
        }}
      />
    </>
  );

  /** Pro: the exact weight next time. Everyone: last time's numbers, or that it's the first time. */
  function targetLine(exerciseId: string, reps: string): string {
    const last = lastTime(log.sessions, exerciseId);
    if (billing.isPro) {
      const target = programmeTarget(last, reps, unit, progress.easier);
      if (target) return `Next: ${target.weight !== null ? `${formatWeight(target.weight, unit)} × ` : ''}${target.reps}. ${target.why}`;
    }
    return last ? `Last time: ${setsSummary(last.sets, last.unit)}` : 'First time: start light.';
  }
}

function WeekBar({ week, weeks }: { week: number; weeks: number }) {
  return (
    <View style={styles.weeks} accessible accessibilityLabel={`Week ${week} of ${weeks}`}>
      {Array.from({ length: weeks }, (_, index) => (
        <View key={index} style={[styles.weekCell, index < week && styles.weekDone, (index + 1) % 4 === 0 && styles.weekEasier, index + 1 === week && styles.weekNow]} />
      ))}
    </View>
  );
}

function DayList({ items }: { items: ReadonlyArray<{ exerciseId: string; sets: number; reps: string; group?: string }> }) {
  return (
    <View style={styles.list}>
      {items.map((entry, index) => (
        <ExerciseRow key={`${entry.exerciseId}-${index}`} exerciseId={entry.exerciseId} plan={`${entry.sets} × ${entry.reps}`} group={groupOf(items, index)} line={null} onSwap={null} />
      ))}
    </View>
  );
}

function ExerciseRow({
  exerciseId,
  plan,
  group,
  line,
  onSwap,
}: {
  exerciseId: string;
  plan: string;
  group: ReturnType<typeof groupOf>;
  line: string | null;
  onSwap: (() => void) | null;
}) {
  const name = exerciseName(exerciseId);
  return (
    <View style={styles.row}>
      <ExerciseTile exerciseId={exerciseId} size={40} />
      <View style={styles.flex}>
        {group && (
          <Txt variant="caption" color={color.brand} style={face('semibold')}>
            {`${groupName(group)} (${group.position}/${group.members.length})`}
          </Txt>
        )}
        <Txt variant="subhead" numberOfLines={2}>
          {name}
        </Txt>
        {line && (
          <Txt variant="footnote" color={color.labelSecondary}>
            {line}
          </Txt>
        )}
      </View>
      <View style={styles.rowEnd}>
        <Txt variant="footnote" color={color.labelSecondary}>
          {plan}
        </Txt>
        {onSwap && (
          <Pressable onPress={onSwap} accessibilityRole="button" accessibilityLabel={`Swap ${name} for the rest of the programme`} hitSlop={6} style={styles.swap}>
            <Icon name="shuffle" size={13} color={color.brand} />
            <Txt variant="caption" color={color.brand} style={face('semibold')}>
              Swap
            </Txt>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: 560, alignSelf: 'center' },
    intro: { gap: space[1] },
    card: { gap: space[3] },
    head: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    mark: { width: 46, height: 46, borderRadius: 13, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandFill },
    flex: { flex: 1, minWidth: 0 },
    goals: { gap: space[2] },
    goal: { gap: 2, padding: space[3], borderRadius: radius.md, borderWidth: 1.5, borderColor: color.separator, backgroundColor: color.background },
    goalOn: { borderColor: color.brand, backgroundColor: color.brandTint },
    pressed: { opacity: 0.75 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    list: { gap: 2, padding: space[2], borderRadius: radius.md, backgroundColor: color.fill },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: 5, paddingHorizontal: space[1] },
    rowEnd: { alignItems: 'flex-end', gap: 4 },
    swap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space[2], paddingVertical: 3, borderRadius: radius.pill, backgroundColor: color.brandTint },
    easier: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2], padding: space[3], borderRadius: radius.md, backgroundColor: color.goodTint },
    weeks: { flexDirection: 'row', gap: 4 },
    weekCell: { flex: 1, height: 8, borderRadius: 4, backgroundColor: color.fill },
    weekDone: { backgroundColor: color.brandFill },
    weekEasier: { borderWidth: 1.5, borderColor: color.good },
    weekNow: { opacity: 0.6 },
    proHint: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
    note: { paddingHorizontal: space[4], textAlign: 'center' },
  }),
);
