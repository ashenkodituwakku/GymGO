/**
 * Lifetime (GymGO Pro): every workout you've logged, added up (weight,
 * sets, reps, hours, records, your longest run), your favourites, and what
 * all that weight compares to (lib/lifetime.ts). Worked out on the device
 * from your own log. Without Pro, what it would show and the way to it.
 */

import { useRouter } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { BrandFill, Sheen, accentGlow } from '@/components/BrandFill';
import { ExerciseTile } from '@/components/ExerciseGlyph';
import { HeroMark } from '@/components/HeroMark';
import { Icon, type IconName } from '@/components/Icon';
import { Pressable } from '@/components/motion';
import { PageScroll } from '@/components/PageScroll';
import { useGlassRedraw } from '@/components/Redrawn';
import { ScreenOptions } from '@/components/ScreenOptions';
import { ServerAwayCard } from '@/components/ServerAwayCard';
import { ListSkeleton } from '@/components/Skeleton';
import { PrimaryButton, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { WEEKDAYS, heavyAs, lifetimeStats } from '@/lib/lifetime';
import { usePageTitle } from '@/lib/pageTitle';
import { color, radius, shadow, space, themed } from '@/lib/theme';
import { fromKg, unitFor } from '@/lib/training';
import { useTrainingLog } from '@/lib/useTraining';
import { exerciseName } from '@/lib/workout';

const monthYear = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const dayMonth = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const plural = (count: number, one: string, many = `${one}s`) => `${count.toLocaleString('en')} ${count === 1 ? one : many}`;

export default function LifetimeScreen() {
  useGlassRedraw();
  usePageTitle('Lifetime');
  const router = useRouter();
  const { account, billing, prefs, openPro } = useApp();
  const log = useTrainingLog(account.token);
  const life = useMemo(() => lifetimeStats(log.sessions), [log.sessions]);
  const unit = unitFor(prefs.country);

  // Not known yet whether you're on Pro (no answer from the server, nothing kept from last time):
  // say the server's away, or wait, rather than offering Pro to someone who may have it.
  if (!billing.isPro && !billing.planKnown) {
    return (
      <PageScroll style={styles.page} contentContainerStyle={styles.content}>
        <ScreenOptions options={{ title: 'Lifetime' }} />
        {account.state === 'unreachable' ? <ServerAwayCard /> : <ListSkeleton rows={4} label="Loading" />}
      </PageScroll>
    );
  }

  if (!billing.isPro) {
    return (
      <PageScroll style={styles.page} contentContainerStyle={[styles.content, styles.centred]}>
        <ScreenOptions options={{ title: 'Lifetime' }} />
        <HeroMark icon="trophy" />
        <Txt variant="title2" style={styles.center}>
          Your lifetime in numbers
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
          {`Every kilo, rep and hour you’ve logged${log.sessions.length ? ` across your ${plural(log.sessions.length, 'workout')}` : ''}, your favourite exercise and day, your biggest workout, and what all that weight compares to. Part of GymGO Pro.`}
        </Txt>
        <View style={styles.button}>
          <PrimaryButton label="See GymGO Pro" icon="crown" onPress={() => openPro('lifetime')} />
        </View>
      </PageScroll>
    );
  }

  if (log.status === 'loading') {
    return (
      <PageScroll style={styles.page} contentContainerStyle={styles.content}>
        <ScreenOptions options={{ title: 'Lifetime' }} />
        <ListSkeleton rows={4} label="Adding up your workouts" />
      </PageScroll>
    );
  }

  // The log didn't load: say so, rather than that there's nothing in it.
  if (log.error) {
    return (
      <PageScroll style={styles.page} contentContainerStyle={[styles.content, styles.centred]}>
        <ScreenOptions options={{ title: 'Lifetime' }} />
        <HeroMark icon="trophy" />
        <Txt variant="subhead" color={color.dangerInk} style={styles.center}>
          {log.error}
        </Txt>
        <View style={styles.button}>
          <PrimaryButton label="Try again" icon="refresh" tone="quiet" onPress={log.reload} />
        </View>
      </PageScroll>
    );
  }

  if (!life) {
    return (
      <PageScroll style={styles.page} contentContainerStyle={[styles.content, styles.centred]}>
        <ScreenOptions options={{ title: 'Lifetime' }} />
        <HeroMark icon="trophy" />
        <Txt variant="title2" style={styles.center}>
          Your lifetime starts here
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
          Finish a workout and it’s added up here: the weight, the sets, the hours, and your favourites.
        </Txt>
        <View style={styles.button}>
          <PrimaryButton label="Build a workout" icon="workout" onPress={() => router.push('/workout/any')} />
        </View>
      </PageScroll>
    );
  }

  const lifted = Math.round(fromKg(life.volumeKg, unit));
  const like = heavyAs(life.volumeKg);
  const hours = life.minutes / 60;
  const tiles: Array<{ icon: IconName; value: string; label: string }> = [
    { icon: 'workout', value: life.workouts.toLocaleString('en'), label: life.workouts === 1 ? 'workout' : 'workouts' },
    { icon: 'timer', value: hours < 10 ? hours.toFixed(1) : Math.round(hours).toLocaleString('en'), label: 'hours' },
    { icon: 'check', value: life.sets.toLocaleString('en'), label: life.sets === 1 ? 'set' : 'sets' },
    { icon: 'refresh', value: life.reps.toLocaleString('en'), label: life.reps === 1 ? 'rep' : 'reps' },
    { icon: 'trophy', value: life.records.toLocaleString('en'), label: life.records === 1 ? 'record' : 'records' },
    { icon: 'flame', value: String(life.longestStreakWeeks), label: life.longestStreakWeeks === 1 ? 'week, best run' : 'weeks, best run' },
  ];

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <ScreenOptions options={{ title: 'Lifetime' }} />
      {/* The headline figure on the accent: everything you've lifted. */}
      <View style={[styles.hero, accentGlow(color.brandFill)]} accessible accessibilityLabel={`Since ${monthYear(life.since)}: ${lifted.toLocaleString('en')} ${unit} lifted.${like ? ` About ${like.words}.` : ''}`}>
        <BrandFill round={radius.xl} />
        <Sheen round={radius.xl} />
        <Txt variant="eyebrow" color={color.onBrandSoft}>
          {`SINCE ${monthYear(life.since).toUpperCase()}`}
        </Txt>
        <Txt variant="largeTitle" color={color.onBrand}>
          {`${lifted.toLocaleString('en')} ${unit}`}
        </Txt>
        <Txt variant="subhead" color={color.onBrandSoft}>
          lifted, all told
        </Txt>
        {like && (
          <View style={styles.like}>
            <Txt variant="headline" color={color.onBrand}>
              {`About ${like.words}`}
            </Txt>
            <Txt variant="caption" color={color.onBrandSoft}>
              {`Taking a ${like.thing.one} as ${Math.round(fromKg(like.thing.kg, unit)).toLocaleString('en')} ${unit}, a round, typical figure.`}
            </Txt>
          </View>
        )}
      </View>

      <View style={styles.grid}>
        {tiles.map((tile) => (
          <View key={tile.label} style={styles.tile} accessible accessibilityLabel={`${tile.value} ${tile.label}`}>
            <Icon name={tile.icon} size={16} color={color.brand} />
            <Txt variant="figure">{tile.value}</Txt>
            <Txt variant="caption" color={color.labelSecondary} numberOfLines={1}>
              {tile.label}
            </Txt>
          </View>
        ))}
      </View>

      <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
        YOUR FAVOURITES
      </Txt>
      <View style={styles.group}>
        {life.favourite && (
          <Fact
            lead={<ExerciseTile exerciseId={life.favourite.exerciseId} size={40} />}
            title={exerciseName(life.favourite.exerciseId)}
            detail={`Your most-done exercise, in ${plural(life.favourite.workouts, 'workout')}`}
            onPress={() => router.push({ pathname: '/progress/[exercise]', params: { exercise: life.favourite!.exerciseId } })}
          />
        )}
        {life.busiestDay && (
          <Fact
            lead={<Mark icon="calendar" />}
            title={WEEKDAYS[life.busiestDay.weekday]!}
            detail={`Your busiest day, with ${plural(life.busiestDay.workouts, 'workout')}`}
          />
        )}
        <Fact
          lead={<Mark icon={life.timeOfDay === 'early' ? 'sunrise' : life.timeOfDay === 'evening' ? 'moon' : 'clock'} />}
          title={life.timeOfDay === 'early' ? 'Early bird' : life.timeOfDay === 'evening' ? 'Night owl' : 'Any time'}
          detail={
            life.timeOfDay === 'early'
              ? 'Most of your workouts start before 9 am'
              : life.timeOfDay === 'evening'
                ? 'Most of your workouts start after 5 pm'
                : 'You train at all hours, no one time most'
          }
        />
        {life.biggest && (
          <Fact
            lead={<Mark icon="bolt" />}
            title={`${Math.round(fromKg(life.biggest.volumeKg, unit)).toLocaleString('en')} ${unit} in one go`}
            detail={`Your biggest workout: ${life.biggest.name}, ${dayMonth(life.biggest.finishedAt)}`}
          />
        )}
      </View>
      <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
        Added up on this phone from the workouts in your log. Weight counts every set with a weight (weight × reps); body-weight sets count as sets and reps only. A workout left running counts as four hours at most.
      </Txt>
    </PageScroll>
  );
}

function Mark({ icon }: { icon: IconName }) {
  return (
    <View style={styles.mark}>
      <Icon name={icon} size={18} color={color.brand} />
    </View>
  );
}

function Fact({ lead, title, detail, onPress }: { lead: ReactNode; title: string; detail: string; onPress?: () => void }) {
  const body = (
    <>
      {lead}
      <View style={styles.flex}>
        <Txt variant="headline">{title}</Txt>
        <Txt variant="footnote" color={color.labelSecondary}>
          {detail}
        </Txt>
      </View>
      {onPress && <Icon name="chevron" size={13} color={color.labelTertiary} />}
    </>
  );
  return onPress ? (
    <PrimaryRow onPress={onPress} label={`${title}. ${detail}`}>
      {body}
    </PrimaryRow>
  ) : (
    <View style={styles.fact} accessible accessibilityLabel={`${title}. ${detail}`}>
      {body}
    </View>
  );
}

function PrimaryRow({ onPress, label, children }: { onPress: () => void; label: string; children: ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.fact, pressed && { backgroundColor: color.fill }]}>
      {children}
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: 560, alignSelf: 'center' },
    centred: { alignItems: 'center', paddingTop: space[8] },
    center: { textAlign: 'center' },
    button: { alignSelf: 'stretch', marginTop: space[2] },
    hero: { gap: space[1], padding: space[4], paddingTop: space[4] + 2, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: color.brandFill },
    like: { marginTop: space[3], paddingTop: space[3], gap: 2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.onBrandFaint },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    tile: { flexBasis: '30%', flexGrow: 1, alignItems: 'center', gap: 2, paddingVertical: space[3], paddingHorizontal: space[1], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
    section: { marginTop: space[3], marginLeft: space[4] },
    group: { backgroundColor: color.plate, borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', ...shadow.plate },
    fact: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
    mark: { width: 40, height: 40, borderRadius: radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandTint },
    flex: { flex: 1, minWidth: 0, gap: 2 },
    note: { marginHorizontal: space[4], marginTop: space[1] },
  }),
);
