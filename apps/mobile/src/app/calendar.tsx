/**
 * Calendar: every day you trained, month by month, this month first and
 * going back to your first workout (lib/calendar.ts, components/MonthGrid).
 * Above them, your weeks in a row, this month and this year. Tap a day you
 * trained to see its workouts, each opening in full; tap a month's name for
 * its monthly report. Free.
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
import { PrimaryButton, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { calendarMonths, dayWords, yearSoFar, type CalendarDay } from '@/lib/calendar';
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
        <View style={styles.figures}>
          <Figure id="calendar.streak" icon="flame" value={streak} label={streak === 1 ? 'week in a row' : 'weeks in a row'} />
          <Figure id="calendar.month" icon="calendar" value={thisMonth.workouts} label="this month" />
          <Figure id="calendar.year" icon="chart" value={year.workouts} label={`in ${year.year}`} />
        </View>
      )}

      {log.error && (
        <Txt variant="footnote" color={color.dangerInk}>
          {log.error}
        </Txt>
      )}

      {months.map((month, index) => {
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
              canPick={(day) => day.sessions.length > 0}
              onPick={(day) => setPicked((now) => (now?.key === day.key ? null : day))}
            />
            {open && <DayList day={open} onOpen={(session) => router.push({ pathname: '/feed/[id]', params: { id: session.id } })} />}
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

      {more && (
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

/** The workouts on the day you tapped, each opening in full. */
function DayList({ day, onOpen }: { day: CalendarDay; onOpen: (session: TrainingSession) => void }) {
  return (
    <Animated.View entering={FADE_IN} style={styles.dayList}>
      <Txt variant="footnote" color={color.labelSecondary} style={face('semibold')} accessibilityRole="header">
        {dayWords(new Date(day.date))}
      </Txt>
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
  }),
);
