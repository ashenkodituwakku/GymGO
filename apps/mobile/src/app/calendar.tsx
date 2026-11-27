/**
 * Calendar: every day you trained, month by month, this month first and
 * going back to your first workout (lib/calendar.ts, components/MonthGrid).
 * Above them, your weeks in a row, this month and this year. Tap a day you
 * trained to see its workouts, each opening in full; tap a month's name for
 * its monthly report. Year shows a whole year at once, twelve small months
 * stepped back to your first year, with its workouts, days and weeks. Free.
 */

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { CountUp } from '@/components/CountUp';
import { ExerciseTile } from '@/components/ExerciseGlyph';
import { HeroMark } from '@/components/HeroMark';
import { Icon, type IconName } from '@/components/Icon';
import { MonthGrid } from '@/components/MonthGrid';
import { EASE_OUT, FADE_IN, GLIDE, Pressable } from '@/components/motion';
import { PageScroll } from '@/components/PageScroll';
import { useGlassRedraw } from '@/components/Redrawn';
import { ScreenOptions } from '@/components/ScreenOptions';
import { ListSkeleton } from '@/components/Skeleton';
import { PrimaryButton, Segmented, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { calendarMonths, calendarYear, dayWords, yearSoFar, yearsWithTraining, type CalendarDay, type CalendarMonth } from '@/lib/calendar';
import { leadExercise } from '@/lib/exerciseGlyphs';
import { clockText } from '@/lib/sessionEdit';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { durationLabel, setCount, weekStreak, type TrainingSession } from '@/lib/training';
import { useTrainingLog } from '@/lib/useTraining';

/** Months shown at first, and added each time you ask for earlier ones. */
const STEP = 6;
const arrive = (index: number) => FadeInDown.duration(420).delay(Math.min(index, 3) * 70).easing(EASE_OUT).reduceMotion(ReduceMotion.System);

export default function CalendarScreen() {
  useGlassRedraw();
  usePageTitle('Calendar');
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { account } = useApp();
  const log = useTrainingLog(account.token);
  const [shown, setShown] = useState(STEP);
  const [picked, setPicked] = useState<CalendarDay | null>(null);
  const [view, setView] = useState<'month' | 'year'>('month');
  const [shownYear, setShownYear] = useState(() => new Date().getFullYear());
  // Which way the year last stepped, so the new one slides in from that side.
  const [forward, setForward] = useState<boolean | null>(null);
  const span = useMemo(() => yearsWithTraining(log.sessions), [log.sessions]);
  const yearView = useMemo(() => calendarYear(shownYear, log.sessions), [shownYear, log.sessions]);
  const { months, more } = useMemo(() => calendarMonths(log.sessions, new Date(), shown), [log.sessions, shown]);
  const year = useMemo(() => yearSoFar(log.sessions), [log.sessions]);
  const streak = useMemo(() => weekStreak(log.sessions), [log.sessions]);
  // Each day's circle from the width there is: the page is at most 560 wide, the card has padding.
  const size = Math.round(Math.max(30, Math.min(42, (Math.min(width, 560) - space[4] * 2 - space[4] * 2) / 7 - 10)));

  if (!account.token) {
    return (
      <PageScroll style={styles.page} contentContainerStyle={[styles.content, styles.centred]}>
        <ScreenOptions options={{ title: '' }} />
        <HeroMark icon="calendar" />
        <Txt variant="title2" accessibilityRole="header" level={1} style={styles.center}>
          Calendar
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
          Sign in to see every day you trained.
        </Txt>
        <View style={styles.button}>
          <PrimaryButton label="Sign in" onPress={() => router.push('/sign-in')} />
        </View>
      </PageScroll>
    );
  }

  if (log.status === 'loading' && log.sessions.length === 0) {
    return (
      <PageScroll style={styles.page} contentContainerStyle={styles.content}>
        <ScreenOptions options={{ title: '' }} />
        <Txt variant="largeTitle" accessibilityRole="header" level={1}>
          Calendar
        </Txt>
        <ListSkeleton rows={3} label="Loading your log" />
      </PageScroll>
    );
  }

  const thisMonth = months[0]!;
  const none = log.sessions.length === 0;

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <ScreenOptions options={{ title: '' }} />
      <Txt variant="largeTitle" accessibilityRole="header" level={1}>
        Calendar
      </Txt>

      {!none && (
        <Segmented
          options={[
            { value: 'month', label: 'Month' },
            { value: 'year', label: 'Year' },
          ]}
          value={view}
          onChange={(next: 'month' | 'year') => {
            haptic.select();
            setView(next);
          }}
        />
      )}

      {!none && view === 'month' && (
        <View style={styles.figures}>
          <Figure id="calendar.streak" icon="flame" value={streak} label={streak === 1 ? 'week in a row' : 'weeks in a row'} />
          <Figure id="calendar.month" icon="calendar" value={thisMonth.workouts} label="this month" />
          <Figure id="calendar.year" icon="chart" value={year.workouts} label={`in ${year.year}`} />
        </View>
      )}

      {!none && view === 'year' && (
        <>
          <View style={styles.yearBar}>
            <Pressable
              disabled={shownYear <= span.first}
              onPress={() => {
                haptic.select();
                setForward(false);
                setShownYear((value) => value - 1);
              }}
              accessibilityRole="button"
              accessibilityLabel="Earlier year"
              accessibilityState={{ disabled: shownYear <= span.first }}
              hitSlop={8}
              style={({ pressed }) => [styles.yearStep, shownYear <= span.first && styles.off, pressed && { opacity: 0.6 }]}
            >
              <View style={styles.flip}>
                <Icon name="chevron" size={14} color={color.brand} />
              </View>
            </Pressable>
            <Txt variant="title2" accessibilityRole="header" style={[styles.flex, styles.center, styles.tabular]}>
              {String(shownYear)}
            </Txt>
            <Pressable
              disabled={shownYear >= span.last}
              onPress={() => {
                haptic.select();
                setForward(true);
                setShownYear((value) => value + 1);
              }}
              accessibilityRole="button"
              accessibilityLabel="Later year"
              accessibilityState={{ disabled: shownYear >= span.last }}
              hitSlop={8}
              style={({ pressed }) => [styles.yearStep, shownYear >= span.last && styles.off, pressed && { opacity: 0.6 }]}
            >
              <Icon name="chevron" size={14} color={color.brand} />
            </Pressable>
          </View>
          <View style={styles.figures}>
            <Figure id="calendar.y.workouts" icon="workout" value={yearView.workouts} label={yearView.workouts === 1 ? 'workout' : 'workouts'} />
            <Figure id="calendar.y.days" icon="calendar" value={yearView.days} label={yearView.days === 1 ? 'day trained' : 'days trained'} />
            <Figure id="calendar.y.weeks" icon="flame" value={yearView.weeks} label={yearView.weeks === 1 ? 'week trained' : 'weeks trained'} />
          </View>
          {yearView.workouts > 0 && (
            <Pressable
              onPress={() => {
                haptic.select();
                router.push({ pathname: '/year-review', params: { year: String(shownYear) } });
              }}
              accessibilityRole="link"
              accessibilityLabel={`${shownYear} in review: your best month, longest run, top exercises and more`}
              style={({ pressed }) => [styles.reviewRow, pressed && { opacity: 0.8 }]}
            >
              <Icon name="sparkle" size={18} color={color.brand} />
              <View style={styles.flex}>
                <Txt variant="headline">{`${shownYear} in review`}</Txt>
                <Txt variant="footnote" color={color.labelSecondary}>
                  Your best month, longest run, top exercises and more
                </Txt>
              </View>
              <Icon name="chevron" size={13} color={color.labelTertiary} />
            </Pressable>
          )}
          <Animated.View key={shownYear} entering={forward === null ? undefined : FADE_IN} style={styles.yearGrid}>
            {yearView.months.map((month) => (
              <MiniMonth key={month.key} month={month} columns={width >= 640 ? 4 : width >= 340 ? 3 : 2} onOpen={() => router.push({ pathname: '/month', params: { m: month.key } })} />
            ))}
          </Animated.View>
        </>
      )}

      {log.error && (
        <Txt variant="footnote" color={color.dangerInk}>
          {log.error}
        </Txt>
      )}

      {(none || view === 'month') && months.map((month, index) => {
        const open = picked && month.weeks.some((week) => week.some((day) => day.inMonth && day.key === picked.key)) ? picked : null;
        const summary = month.workouts === 0 ? 'No workouts' : `${month.workouts} ${month.workouts === 1 ? 'workout' : 'workouts'} · ${month.days} ${month.days === 1 ? 'day' : 'days'}`;
        return (
          <Animated.View key={month.key} entering={arrive(index)} layout={GLIDE} style={styles.card}>
            <Pressable
              disabled={month.workouts === 0}
              onPress={() => {
                haptic.select();
                router.push({ pathname: '/month', params: { m: month.key } });
              }}
              accessibilityRole={month.workouts > 0 ? 'link' : 'header'}
              accessibilityLabel={month.workouts > 0 ? `${month.label}, ${summary}. Monthly report` : `${month.label}, ${summary}`}
              style={({ pressed }) => [styles.monthHead, pressed && { opacity: 0.7 }]}
            >
              <Txt variant="headline" style={styles.flex}>
                {month.label}
              </Txt>
              <Txt variant="footnote" color={color.labelSecondary}>
                {summary}
              </Txt>
              {month.workouts > 0 && <Icon name="chevron" size={12} color={color.labelTertiary} />}
            </Pressable>
            <MonthGrid
              month={month}
              size={size}
              selected={open?.key ?? null}
              canPick={(day) => day.sessions.length > 0 || day.today}
              onPick={(day) => setPicked((now) => (now?.key === day.key ? null : day))}
            />
            {open && <DayList day={open} onOpen={(session) => router.push({ pathname: '/feed/[id]', params: { id: session.id } })} onStart={() => router.push('/train')} />}
            {index === 0 && none && (
              <View style={styles.empty}>
                <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
                  Each day you train fills in here.
                </Txt>
                <PrimaryButton label="Start workout" icon="play" onPress={() => router.push('/train')} />
              </View>
            )}
          </Animated.View>
        );
      })}

      {more && view === 'month' && (
        <View style={styles.button}>
          <PrimaryButton
            label="Show earlier months"
            tone="quiet"
            onPress={() => {
              haptic.select();
              setShown((count) => count + STEP);
            }}
          />
        </View>
      )}
    </PageScroll>
  );
}

function Figure({ id, icon, value, label }: { id: string; icon: IconName; value: number; label: string }) {
  return (
    <View style={styles.figure} accessible accessibilityLabel={`${value} ${label}`}>
      <Icon name={icon} size={16} color={color.brand} />
      <CountUp id={id} value={value} variant="title" style={[face('bold'), styles.tabular]} />
      <Txt variant="footnote" color={color.labelSecondary} numberOfLines={2} style={styles.center}>
        {label}
      </Txt>
    </View>
  );
}

/**
 * A month, small, for the year view: its days as squares, filled for the
 * days you trained. Opens the monthly report when it had a workout.
 */
function MiniMonth({ month, columns, onOpen }: { month: CalendarMonth; columns: number; onOpen: () => void }) {
  const has = month.workouts > 0;
  const words = `${month.label}, ${has ? `${month.workouts} ${month.workouts === 1 ? 'workout' : 'workouts'} on ${month.days} ${month.days === 1 ? 'day' : 'days'}. Monthly report` : 'no workouts'}`;
  return (
    <Pressable
      disabled={!has}
      onPress={() => {
        haptic.select();
        onOpen();
      }}
      accessibilityRole={has ? 'link' : 'text'}
      accessibilityLabel={words}
      style={({ pressed }) => [styles.mini, { width: `${100 / columns}%` }, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.miniCard}>
        <View style={styles.miniHead}>
          <Txt variant="subhead" style={[face('semibold'), styles.flex]}>
            {month.label.slice(0, 3)}
          </Txt>
          {has && (
            <Txt variant="caption" color={color.brand} style={[face('semibold'), styles.tabular]}>
              {month.workouts}
            </Txt>
          )}
        </View>
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {month.weeks.map((week) => (
            <View key={week[0]!.key} style={styles.miniRow}>
              {week.map((day) => (
                <View key={day.key} style={styles.miniCell}>
                  {day.inMonth && (
                    <View
                      style={[
                        styles.miniDay,
                        day.sessions.length > 0 ? { backgroundColor: color.brandFill } : day.future ? styles.miniFuture : { backgroundColor: color.fill },
                        day.today && styles.miniToday,
                      ]}
                    />
                  )}
                </View>
              ))}
            </View>
          ))}
          {/* Every month six rows tall, so the year's cards line up. */}
          {Array.from({ length: 6 - month.weeks.length }, (_, index) => (
            <View key={`pad-${index}`} style={styles.miniRow}>
              {Array.from({ length: 7 }, (_, cell) => (
                <View key={cell} style={styles.miniCell} />
              ))}
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

/** The workouts on the day you tapped, each opening in full. */
function DayList({ day, onOpen, onStart }: { day: CalendarDay; onOpen: (session: TrainingSession) => void; onStart: () => void }) {
  return (
    <Animated.View entering={FADE_IN} style={styles.dayList}>
      <Txt variant="footnote" color={color.labelSecondary} style={face('semibold')} accessibilityRole="header">
        {day.today ? `Today, ${dayWords(new Date(day.date))}` : dayWords(new Date(day.date))}
      </Txt>
      {/* Today with nothing logged yet: one tap to start. */}
      {day.sessions.length === 0 && (
        <View style={styles.todayEmpty}>
          <Txt variant="subhead" color={color.labelSecondary} style={styles.flex}>
            No workout yet today.
          </Txt>
          <PrimaryButton label="Start workout" icon="play" onPress={onStart} />
        </View>
      )}
      {day.sessions.map((session) => {
        const sets = setCount(session);
        const line = `${clockText(new Date(session.startedAt))} · ${durationLabel(Date.parse(session.finishedAt) - Date.parse(session.startedAt))} · ${sets} ${sets === 1 ? 'set' : 'sets'}`;
        return (
          <Pressable
            key={session.id}
            onPress={() => {
              haptic.select();
              onOpen(session);
            }}
            accessibilityRole="link"
            accessibilityLabel={`${session.name}, ${line}${session.gymName ? `, at ${session.gymName}` : ''}`}
            style={({ pressed }) => [styles.session, pressed && { opacity: 0.75 }]}
          >
            <ExerciseTile exerciseId={leadExercise(session.exercises.map((logged) => logged.exerciseId))} size={36} />
            <View style={styles.flex}>
              <Txt variant="headline" numberOfLines={1}>
                {session.name}
              </Txt>
              <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1}>
                {session.gymName ? `${line} · ${session.gymName}` : line}
              </Txt>
            </View>
            <Icon name="chevron" size={12} color={color.labelTertiary} />
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], gap: space[4], width: '100%', maxWidth: 560, alignSelf: 'center' },
    centred: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
    center: { textAlign: 'center' },
    flex: { flex: 1, minWidth: 0 },
    tabular: { fontVariant: ['tabular-nums'] },
    button: { alignSelf: 'stretch' },
    figures: { flexDirection: 'row', gap: space[3] },
    figure: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space[3], paddingHorizontal: space[2], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
    card: { gap: space[3], padding: space[4], borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
    monthHead: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 32 },
    dayList: { gap: space[2], paddingTop: space[3], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
    session: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2] },
    empty: { gap: space[3], alignItems: 'stretch', paddingTop: space[2] },
    todayEmpty: { gap: space[3] },
    yearBar: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    reviewRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
    yearStep: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: color.plate, ...shadow.plate },
    off: { opacity: 0.35 },
    flip: { transform: [{ rotate: '180deg' }] },
    yearGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space[1] },
    mini: { padding: space[1] },
    miniCard: { gap: space[1], padding: space[2], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
    miniHead: { flexDirection: 'row', alignItems: 'baseline', gap: space[1], paddingHorizontal: 2 },
    miniRow: { flexDirection: 'row' },
    miniCell: { flex: 1, aspectRatio: 1, padding: 1.5 },
    miniDay: { flex: 1, borderRadius: 3 },
    miniFuture: { borderWidth: StyleSheet.hairlineWidth, borderColor: color.separator },
    miniToday: { borderWidth: 1.5, borderColor: color.brand },
  }),
);
