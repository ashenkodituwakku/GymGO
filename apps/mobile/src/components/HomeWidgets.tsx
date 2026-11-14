/**
 * Home widgets of their own (lib/homeWidgets.ts lists them all): your last
 * workout, this month, the muscles you've trained lately, your body weight
 * and a row of tools. Each is made only from what you logged (your training
 * log on your account, your weigh-ins on this device), says plainly when
 * there's nothing yet, and opens the page it comes from.
 */

import { monthLabel } from '@gymgo/domain';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { startSession } from '@/lib/activeSession';
import { againPlan } from '@/lib/again';
import { localToday, useBodyWeight, weightChange } from '@/lib/bodyWeight';
import { agoLabel, daysAgo } from '@/lib/exerciseLibrary';
import { haptic } from '@/lib/haptics';
import { monthKeyOf, monthReport } from '@/lib/monthReport';
import { recoveryMap, type MuscleRest } from '@/lib/recovery';
import { heatShade } from './RecoveryMap';
import { SmallFigures } from './MuscleFigures';
import { workoutTitle } from '@/lib/templates';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { durationLabel, fromKg, volumeKg, type TrainingSession, type WeightUnit } from '@/lib/training';
import { ExerciseTile } from './ExerciseGlyph';
import { Icon, type IconName } from './Icon';
import { Pressable, Pressy } from './motion';
import { Txt } from './ui';

type LogState = { status: 'signed-out' | 'loading' | 'ready' | 'error'; sessions: TrainingSession[]; error?: string | null };

const plural = (count: number, word: string) => `${count.toLocaleString()} ${word}${count === 1 ? '' : 's'}`;
const weightText = (kg: number, unit: WeightUnit) => `${Math.round(fromKg(kg, unit)).toLocaleString()} ${unit}`;

/**
 * A widget's frame: a heading with its icon. One that opens somewhere is a
 * button with a chevron (`onPress`, `label`); one with a button of its own
 * inside (Last workout's Again) has a link in its heading instead (`link`),
 * as a button can't hold another.
 */
function Frame({
  icon,
  title,
  onPress,
  label,
  link,
  children,
}: {
  icon: IconName;
  title: string;
  onPress?: () => void;
  label?: string;
  link?: { text: string; label: string; onPress: () => void };
  children: React.ReactNode;
}) {
  const inner = (
    <>
      <View style={styles.head}>
        <Icon name={icon} size={14} color={color.brand} />
        <Txt variant="label" color={color.labelSecondary} style={styles.flex} numberOfLines={1}>
          {title}
        </Txt>
        {onPress && <Icon name="chevron" size={12} color={color.labelTertiary} />}
        {link && (
          <Pressable
            onPress={() => {
              haptic.select();
              link.onPress();
            }}
            accessibilityRole="link"
            accessibilityLabel={link.label}
            hitSlop={10}
            style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}
          >
            <Txt variant="footnote" color={color.brand} style={face('semibold')}>
              {link.text}
            </Txt>
            <Icon name="chevron" size={11} color={color.brand} />
          </Pressable>
        )}
      </View>
      {children}
    </>
  );
  if (!onPress) return <View style={styles.card}>{inner}</View>;
  return (
    <Pressy
      scaleTo={0.98}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.card}
    >
      {inner}
    </Pressy>
  );
}

/** What there is to say while the log loads, couldn't load, or is empty. */
function LogLine({ log, empty }: { log: LogState; empty: string }) {
  return (
    <Txt variant="footnote" color={color.labelSecondary}>
      {log.status === 'signed-out'
        ? 'Sign in (it’s free) to keep a training log, and this fills in.'
        : log.status === 'loading'
          ? 'Loading your log…'
          : log.status === 'error'
            ? (log.error ?? 'Your log couldn’t be loaded just now.')
            : empty}
    </Txt>
  );
}

/** Your last workout: what, when, how much, and the way to do it again. */
export function LastWorkoutWidget({ log, busy }: { log: LogState; /** A workout's already going: no second one from here. */ busy: boolean }) {
  const router = useRouter();
  const latest = useMemo(() => log.sessions.reduce<TrainingSession | null>((best, item) => (!best || item.finishedAt > best.finishedAt ? item : best), null), [log.sessions]);
  if (!latest) {
    return (
      <Frame icon="refresh" title="Last workout" onPress={() => router.push('/train')} label="Last workout: none logged yet. Start a workout">
        <LogLine log={log} empty="Your last workout shows here once you’ve logged one." />
      </Frame>
    );
  }
  const named = workoutTitle(latest.name);
  const sets = latest.exercises.reduce((sum, item) => sum + item.sets.filter((set) => set.kind !== 'warmup').length, 0);
  const plan = againPlan(latest);
  const ago = agoLabel(daysAgo(latest.finishedAt));
  const line = `${ago} · ${plural(latest.exercises.length, 'exercise')} · ${plural(sets, 'set')} · ${weightText(volumeKg(latest), latest.unit)}`;
  return (
    <Frame icon="refresh" title="Last workout" link={{ text: 'Log', label: 'Your training log, on Progress', onPress: () => router.push('/progress') }}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Txt variant="headline" numberOfLines={1}>
            {named.title}
          </Txt>
          <Txt variant="footnote" color={color.labelSecondary} numberOfLines={2}>
            {line}
          </Txt>
        </View>
        {plan && !busy && (
          <Pressy
            scaleTo={0.94}
            onPress={() => {
              haptic.success();
              startSession({ ...plan, gymName: null, unit: latest.unit });
              router.push('/train');
            }}
            accessibilityRole="button"
            accessibilityLabel={`Do ${named.title} again`}
            style={styles.pill}
          >
            <Icon name="refresh" size={13} color={color.onBrand} />
            <Txt variant="footnote" color={color.onBrand} style={face('semibold')}>
              Again
            </Txt>
          </Pressy>
        )}
      </View>
      <View style={styles.tiles}>
        {latest.exercises.slice(0, 6).map((item, index) => (
          <ExerciseTile key={`${item.exerciseId}-${index}`} exerciseId={item.exerciseId} size={30} />
        ))}
      </View>
    </Frame>
  );
}

/** This month so far: workouts, time, weight lifted and records, as the monthly report counts them. */
export function MonthWidget({ log, unit }: { log: LogState; unit: WeightUnit }) {
  const router = useRouter();
  const month = monthKeyOf(new Date().toISOString());
  const report = useMemo(() => monthReport(log.sessions, month), [log.sessions, month]);
  const totals = report.totals;
  const title = `This month · ${monthLabel(month)}`;
  if (totals.workouts === 0) {
    return (
      <Frame icon="calendar" title={title} onPress={() => router.push('/month')} label={`This month: no workouts yet. Open the monthly report`}>
        <LogLine log={log} empty="No workouts yet this month. Each one you log is added up here." />
      </Frame>
    );
  }
  const lifted = Math.round(fromKg(totals.volumeKg, unit)).toLocaleString();
  const stats = [
    { label: 'Workouts', value: totals.workouts.toLocaleString(), spoken: plural(totals.workouts, 'workout') },
    { label: 'Time', value: totals.minutes > 0 ? durationLabel(totals.minutes * 60_000) : '—', spoken: `time ${totals.minutes > 0 ? durationLabel(totals.minutes * 60_000) : 'none'}` },
    // The unit with the word, so the figure fits a third of a 320-point phone ("11,563 kg" was cut off).
    { label: `${unit} lifted`, value: lifted, spoken: `${lifted} ${unit} lifted` },
  ];
  const records = report.records.length;
  return (
    <Frame
      icon="calendar"
      title={title}
      onPress={() => router.push({ pathname: '/month', params: { m: month } })}
      label={`This month: ${stats.map((stat) => stat.spoken).join(', ')}, ${plural(records, 'record')}. Open the monthly report`}
    >
      <View style={styles.stats}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <Txt variant="subhead" style={face('bold')} numberOfLines={1}>
              {stat.value}
            </Txt>
            <Txt variant="caption" color={color.labelSecondaryOnFill}>
              {stat.label}
            </Txt>
          </View>
        ))}
      </View>
      <Txt variant="footnote" color={records > 0 ? color.brand : color.labelSecondary} style={records > 0 ? face('semibold') : undefined}>
        {records > 0 ? `${plural(records, 'record')} this month` : 'No records yet this month'}
      </Txt>
    </Frame>
  );
}

/** When you last trained each muscle, from the log: the latest, and the longest ago. Not whether one's ready. */
export function RecoveryWidget({ log }: { log: LogState }) {
  const router = useRouter();
  const window = useWindowDimensions();
  const map = useMemo(() => recoveryMap(log.sessions), [log.sessions]);
  const trained = map.filter((rest) => rest.days !== null);
  if (trained.length === 0) {
    return (
      <Frame icon="person" title="Muscles trained" onPress={() => router.push('/progress')} label="Muscles trained: nothing in your log yet. See your progress">
        <LogLine log={log} empty="When you last trained each muscle shows here once you’ve logged a workout." />
      </Frame>
    );
  }
  const latest = trained.slice(0, 3);
  const longest = [...map].reverse().filter((rest) => !latest.includes(rest)).slice(0, 3);
  const bands = new Map(map.map((rest) => [rest.muscle, rest.band]));
  const chip = (rest: MuscleRest) => `${rest.label} · ${rest.days === null ? 'not logged' : rest.days === 0 ? 'today' : rest.days === 1 ? 'yesterday' : `${rest.days} days`}`;
  return (
    <Frame
      icon="person"
      title="Muscles trained"
      onPress={() => router.push('/progress')}
      label={`Muscles trained. Lately: ${latest.map(chip).join(', ')}. Longest ago: ${longest.map(chip).join(', ')}. See your progress`}
    >
      <View style={styles.restBody}>
        <View style={styles.restLists}>
          {[
            { label: 'Lately', list: latest },
            { label: 'Longest ago', list: longest },
          ].map(({ label, list }) => (
            <View key={label} style={styles.restRow}>
              <Txt variant="caption" color={color.labelSecondary} style={styles.restLabel}>
                {label}
              </Txt>
              <View style={styles.chips}>
                {list.map((rest) => (
                  <View key={rest.muscle} style={[styles.chip, styles.heatChip]}>
                    {/* The recovery map's own colour for it, so the two read alike. */}
                    <View style={[styles.heatDot, { backgroundColor: heatShade(rest.band) }]} />
                    <Txt variant="caption" style={face('medium')} numberOfLines={1}>
                      {chip(rest)}
                    </Txt>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
        {/* The recovery map in small, for a glance at the whole body. */}
        <SmallFigures width={window.width < 360 ? 30 : 38} fillFor={(muscle) => heatShade(bands.get(muscle) ?? 'never')} />
      </View>
      <Txt variant="caption" color={color.labelTertiary}>
        From your log: when, not whether a muscle is ready.
      </Txt>
    </Frame>
  );
}

/** Your latest weigh-in and the change, from Progress → Body weight (on this device only). */
export function BodyWeightWidget({ unit }: { unit: WeightUnit }) {
  const router = useRouter();
  const { list } = useBodyWeight();
  const latest = list && list.length > 0 ? list.reduce((best, item) => (item.date > best.date ? item : best)) : null;
  const change = list ? weightChange(list) : null;
  const show = (kg: number) => `${(Math.round(fromKg(kg, unit) * 10) / 10).toLocaleString()} ${unit}`;
  const whenText = (date: string) => (date === localToday() ? 'today' : new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }));
  return (
    <Frame
      icon="body"
      title="Body weight"
      onPress={() => router.push('/progress')}
      label={latest ? `Body weight: ${show(latest.kg)}, ${whenText(latest.date)}. See your progress` : 'Body weight: none logged. Log it on Progress'}
    >
      {list === null ? (
        <Txt variant="footnote" color={color.labelSecondary}>
          Loading…
        </Txt>
      ) : latest ? (
        <View style={styles.row}>
          <Txt variant="title2" style={face('bold')}>
            {show(latest.kg)}
          </Txt>
          <View style={styles.flex}>
            <Txt variant="footnote" color={color.labelSecondary}>
              {`Weighed ${whenText(latest.date)}`}
            </Txt>
            {change && (
              <Txt variant="footnote" color={color.labelSecondary}>
                {`${change.kg > 0 ? '+' : change.kg < 0 ? '−' : '±'}${show(Math.abs(change.kg))} since ${whenText(change.since)}`}
              </Txt>
            )}
          </View>
        </View>
      ) : (
        <Txt variant="footnote" color={color.labelSecondary}>
          Log your weight on Progress now and then, and the latest shows here.
        </Txt>
      )}
      <Txt variant="caption" color={color.labelTertiary}>
        On this device only.
      </Txt>
    </Frame>
  );
}

const TOOLS: Array<{ icon: IconName; title: string; route: '/timer' | '/plates' | '/strength' | '/exercises' }> = [
  { icon: 'timer', title: 'Timer', route: '/timer' },
  { icon: 'plates', title: 'Plates', route: '/plates' },
  { icon: 'target', title: '1-rep max', route: '/strength' },
  { icon: 'book', title: 'Exercises', route: '/exercises' },
];

/** Four tools a tap away. */
export function ToolsWidget() {
  const router = useRouter();
  return (
    <View style={styles.toolRow} role="group" aria-label="Tools">
      {TOOLS.map((tool) => (
        <Pressy
          key={tool.route}
          scaleTo={0.93}
          onPress={() => {
            haptic.select();
            router.push(tool.route);
          }}
          accessibilityRole="button"
          accessibilityLabel={tool.title === 'Timer' ? 'Interval timer' : tool.title === 'Plates' ? 'Plate calculator' : tool.title}
          style={styles.tool}
        >
          <View style={styles.toolIcon}>
            <Icon name={tool.icon} size={18} color={color.brand} />
          </View>
          <Txt variant="caption" style={face('medium')} numberOfLines={1}>
            {tool.title}
          </Txt>
        </Pressy>
      ))}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    card: { gap: space[2], padding: space[3] + 2, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
    head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    link: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: space[3], height: 34, borderRadius: radius.pill, backgroundColor: color.brandFill },
    tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    stats: { flexDirection: 'row', gap: space[2] },
    stat: { flex: 1, minWidth: 0, gap: 1, paddingVertical: space[2], paddingHorizontal: space[2], borderRadius: radius.md, backgroundColor: color.fill },
    restBody: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    restLists: { flex: 1, minWidth: 0, gap: space[2] },
    restRow: { gap: 4 },
    restLabel: { textTransform: 'none' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: space[2], paddingVertical: 4, borderRadius: radius.pill, backgroundColor: color.fill },
    heatChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    heatDot: { width: 8, height: 8, borderRadius: 4 },
    toolRow: { flexDirection: 'row', gap: space[2] },
    tool: { flex: 1, minWidth: 0, alignItems: 'center', gap: 6, paddingVertical: space[3], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
    toolIcon: { width: 24, alignItems: 'center', justifyContent: 'center' },
  }),
);
