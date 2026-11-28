/**
 * A year in review (lib/yearReview.ts), from the calendar's Year view: the
 * year's workouts, hours, weight lifted, sets, days and records counting
 * up; a bar for each month (tap one for its monthly report); then the
 * highlights: the best month, the longest run of weeks, your favourite gym,
 * the muscle you trained most, your top exercises and the biggest workout.
 * Shared as a few lines, totals only. Free.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { CountUp } from '@/components/CountUp';
import { ExerciseTile } from '@/components/ExerciseGlyph';
import { HeroMark } from '@/components/HeroMark';
import { Icon, type IconName } from '@/components/Icon';
import { EASE_OUT, Pressable } from '@/components/motion';
import { PageScroll } from '@/components/PageScroll';
import { useGlassRedraw } from '@/components/Redrawn';
import { ScreenOptions } from '@/components/ScreenOptions';
import { ListSkeleton } from '@/components/Skeleton';
import { LiveLine, PrimaryButton, Txt } from '@/components/ui';
import { shareText } from '@/lib/actions';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { fromKg, unitFor } from '@/lib/training';
import { useTrainingLog } from '@/lib/useTraining';
import { yearReview, yearShareText } from '@/lib/yearReview';

const arrive = (index: number) => FadeInDown.duration(460).delay(Math.min(index, 6) * 80).easing(EASE_OUT).reduceMotion(ReduceMotion.System);

export default function YearReviewScreen() {
  useGlassRedraw();
  const { year: asked } = useLocalSearchParams<{ year?: string }>();
  const year = typeof asked === 'string' && /^\d{4}$/.test(asked) ? Number(asked) : new Date().getFullYear();
  usePageTitle(`${year} in review`);
  const router = useRouter();
  const narrow = useWindowDimensions().width < 360;
  const { account, prefs } = useApp();
  const log = useTrainingLog(account.token);
  const unit = unitFor(prefs.country);
  const review = useMemo(() => yearReview(log.sessions, year), [log.sessions, year]);
  const [shared, setShared] = useState<string | null>(null);
  const weight = (kg: number) => `${Math.round(fromKg(kg, unit)).toLocaleString('en')} ${unit}`;

  if (!account.token || (log.status !== 'loading' && review.totals.workouts === 0)) {
    return (
      <PageScroll style={styles.page} contentContainerStyle={[styles.content, styles.centred]}>
        <ScreenOptions options={{ title: '' }} />
        <HeroMark icon="calendar" />
        <Txt variant="title2" accessibilityRole="header" level={1} style={styles.center}>
          {`${year} in review`}
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
          {account.token ? `No workouts in ${year} yet. Your year fills in as you train.` : 'Sign in to see your year in review.'}
        </Txt>
        <View style={styles.button}>
          {account.token ? <PrimaryButton label="Start workout" icon="play" onPress={() => router.push('/train')} /> : <PrimaryButton label="Sign in" onPress={() => router.push('/sign-in')} />}
        </View>
      </PageScroll>
    );
  }
  if (log.status === 'loading' && log.sessions.length === 0) {
    return (
      <PageScroll style={styles.page} contentContainerStyle={styles.content}>
        <ScreenOptions options={{ title: '' }} />
        <Txt variant="largeTitle" accessibilityRole="header" level={1}>
          {`${year} in review`}
        </Txt>
        <ListSkeleton rows={3} label="Loading your log" />
      </PageScroll>
    );
  }

  const { totals } = review;
  const most = Math.max(1, ...review.months.map((month) => month.workouts));
  const figures: Array<{ id: string; value: number; label: string; suffix?: string }> = [
    { id: 'workouts', value: totals.workouts, label: totals.workouts === 1 ? 'workout' : 'workouts' },
    { id: 'hours', value: Math.round(totals.minutes / 60), label: 'hours' },
    { id: 'lifted', value: Math.round(fromKg(totals.volumeKg, unit)), label: `${unit} lifted` },
    { id: 'sets', value: totals.sets, label: 'sets' },
    { id: 'days', value: totals.days, label: totals.days === 1 ? 'day trained' : 'days trained' },
    { id: 'records', value: review.records, label: review.records === 1 ? 'record' : 'records' },
  ];
  const highlights: Array<{ icon: IconName; title: string; line: string; go?: () => void }> = [
    ...(review.bestMonth
      ? [{ icon: 'calendar' as IconName, title: 'Best month', line: `${review.bestMonth.label}, ${review.bestMonth.workouts} ${review.bestMonth.workouts === 1 ? 'workout' : 'workouts'}`, go: () => router.push({ pathname: '/month', params: { m: review.bestMonth!.key } }) }]
      : []),
    ...(review.longestRun > 0 ? [{ icon: 'flame' as IconName, title: 'Longest run', line: `${review.longestRun} ${review.longestRun === 1 ? 'week' : 'weeks in a row'}` }] : []),
    ...(review.favouriteGym ? [{ icon: 'pin' as IconName, title: 'Favourite gym', line: `${review.favouriteGym.name}, ${review.favouriteGym.visits} ${review.favouriteGym.visits === 1 ? 'visit' : 'visits'}` }] : []),
    ...(review.topMuscle ? [{ icon: 'body' as IconName, title: 'Trained most', line: `${review.topMuscle.label}, ${review.topMuscle.sets} sets` }] : []),
    ...(review.biggest
      ? [{ icon: 'trophy' as IconName, title: 'Biggest workout', line: `${review.biggest.name}, ${weight(review.biggest.volumeKg)}`, go: () => router.push({ pathname: '/feed/[id]', params: { id: review.biggest!.id } }) }]
      : []),
  ];

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <ScreenOptions options={{ title: '' }} />
      <Animated.View entering={arrive(0)} style={styles.intro}>
        <Txt variant="label" color={color.brand} style={face('semibold')}>
          Year in review
        </Txt>
        <Txt variant="largeTitle" accessibilityRole="header" level={1}>
          {`Your ${year}`}
        </Txt>
      </Animated.View>

      <Animated.View entering={arrive(1)} style={styles.figures}>
        {figures.map((figure) => (
          <View key={figure.id} style={[styles.figure, narrow && styles.figureHalf]} accessible accessibilityLabel={`${figure.value.toLocaleString('en-AU')} ${figure.label}`}>
            {/* A year's weight runs to six or seven digits, which broke over two lines in a third of a phone: shortened ("35.8k"), the label saying it all. */}
            <CountUp id={`year.${year}.${figure.id}`} value={figure.value} variant="title" compact={figure.id === 'lifted'} style={[face('bold'), styles.tabular]} />
            <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1}>
              {figure.label}
            </Txt>
          </View>
        ))}
      </Animated.View>

      {/* A bar for each month, the best in the accent; a month you trained in opens its report. */}
      <Animated.View entering={arrive(2)} style={styles.card}>
        <Txt variant="headline" accessibilityRole="header">
          Month by month
        </Txt>
        <View style={styles.bars}>
          {review.months.map((month) => {
            const best = review.bestMonth?.key === month.key;
            return (
              <Pressable
                key={month.key}
                disabled={month.workouts === 0}
                onPress={() => {
                  haptic.select();
                  router.push({ pathname: '/month', params: { m: month.key } });
                }}
                accessibilityRole={month.workouts > 0 ? 'link' : 'text'}
                accessibilityLabel={`${month.label}, ${month.workouts} ${month.workouts === 1 ? 'workout' : 'workouts'}`}
                style={({ pressed }) => [styles.barSlot, pressed && { opacity: 0.7 }]}
              >
                <Txt variant="caption" color={month.workouts ? color.labelSecondary : color.labelTertiary} style={styles.tabular}>
                  {month.workouts || ''}
                </Txt>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { height: `${Math.max(month.workouts ? 8 : 0, (month.workouts / most) * 100)}%`, backgroundColor: best ? color.brandFill : color.brandTint }]} />
                </View>
                <Txt variant="caption" color={best ? color.brand : color.labelSecondary} style={best ? face('semibold') : undefined}>
                  {month.label.slice(0, 1)}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      {highlights.length > 0 && (
        <Animated.View entering={arrive(3)} style={[styles.card, styles.list]}>
          {highlights.map((item, index) => {
            const body = (
              <>
                <View style={styles.badge}>
                  <Icon name={item.icon} size={18} color={color.brand} />
                </View>
                <View style={styles.flex}>
                  <Txt variant="footnote" color={color.labelSecondary}>
                    {item.title}
                  </Txt>
                  <Txt variant="headline" numberOfLines={2}>
                    {item.line}
                  </Txt>
                </View>
                {item.go && <Icon name="chevron" size={12} color={color.labelTertiary} />}
              </>
            );
            return item.go ? (
              <Pressable
                key={item.title}
                onPress={() => {
                  haptic.select();
                  item.go!();
                }}
                accessibilityRole="link"
                accessibilityLabel={`${item.title}, ${item.line}`}
                style={({ pressed }) => [styles.row, index > 0 && styles.rowLine, pressed && { opacity: 0.7 }]}
              >
                {body}
              </Pressable>
            ) : (
              <View key={item.title} style={[styles.row, index > 0 && styles.rowLine]} accessible accessibilityLabel={`${item.title}, ${item.line}`}>
                {body}
              </View>
            );
          })}
        </Animated.View>
      )}

      {review.topExercises.length > 0 && (
        <Animated.View entering={arrive(4)} style={[styles.card, styles.list]}>
          <Txt variant="headline" accessibilityRole="header" style={styles.listHead}>
            Top exercises
          </Txt>
          {review.topExercises.map((item, index) => (
            <Pressable
              key={item.exerciseId}
              onPress={() => router.push({ pathname: '/progress/[exercise]', params: { exercise: item.exerciseId } })}
              accessibilityRole="link"
              accessibilityLabel={`${index + 1}. ${item.name}, ${item.sets} sets`}
              style={({ pressed }) => [styles.row, styles.rowLine, pressed && { opacity: 0.7 }]}
            >
              <Txt variant="subhead" color={color.labelTertiary} style={[styles.rank, styles.tabular]}>
                {index + 1}
              </Txt>
              <ExerciseTile exerciseId={item.exerciseId} size={34} />
              <Txt variant="body" numberOfLines={1} style={styles.flex}>
                {item.name}
              </Txt>
              <Txt variant="footnote" color={color.labelSecondary} style={styles.tabular}>
                {`${item.sets} sets`}
              </Txt>
            </Pressable>
          ))}
        </Animated.View>
      )}

      <Animated.View entering={arrive(5)} style={styles.button}>
        <PrimaryButton
          label="Share your year"
          icon="share"
          tone="quiet"
          onPress={() =>
            void shareText(yearShareText(review, weight(totals.volumeKg)), `My ${year} on GymGO`).then((result) =>
              setShared(result === 'copied' ? 'Copied to clipboard' : result === 'failed' ? 'Couldn’t share it' : null),
            )
          }
        />
        <LiveLine>
          {shared && (
            <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
              {shared}
            </Txt>
          )}
        </LiveLine>
      </Animated.View>
    </PageScroll>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], gap: space[4], paddingBottom: space[8], width: '100%', maxWidth: 560, alignSelf: 'center' },
    centred: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
    center: { textAlign: 'center' },
    flex: { flex: 1, minWidth: 0 },
    tabular: { fontVariant: ['tabular-nums'] },
    button: { alignSelf: 'stretch', gap: space[2] },
    intro: { gap: 2 },
    figures: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
    // Two to a row on the narrowest phones (under 360 points), where a third was too tight for a number and its label.
    figureHalf: { flexBasis: '45%' },
    figure: { flexGrow: 1, flexBasis: '30%', gap: 2, padding: space[3], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
    card: { gap: space[3], padding: space[4], borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
    bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 140 },
    barSlot: { flex: 1, alignItems: 'center', gap: 4, height: '100%' },
    barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
    bar: { width: '70%', maxWidth: 22, borderRadius: 4 },
    list: { gap: 0, paddingVertical: space[2] },
    listHead: { paddingVertical: space[2] },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
    rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
    badge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandWash },
    rank: { width: 18, textAlign: 'center' },
  }),
);
