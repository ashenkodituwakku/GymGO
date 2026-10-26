/**
 * Your lifetime, as a card to share (app/lifetime.tsx, GymGO Pro): all you've
 * lifted and what it compares to, your workouts, hours, sets and records,
 * your best run and your favourite exercise. Totals only: never which days
 * you went, or where.
 *
 * No tabular digits here: the browser's picture-maker draws each digit on
 * its own without them, and a 1 then stands apart from its neighbour.
 */

import { StyleSheet, View } from 'react-native';
import { heavyAs, type Lifetime } from '@/lib/lifetime';
import { color, face, radius, space, themed } from '@/lib/theme';
import { fromKg, type WeightUnit } from '@/lib/training';
import { exerciseName } from '@/lib/workout';
import { AppBadge } from './BrandMark';
import type { IconName } from './Icon';
import { EmojiIcon } from './Emoji';
import { RECAP_WIDTH } from './RecapCard';
import { Txt } from './ui';

const monthYear = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

/** Hours to one decimal place under ten, whole hours after. */
export const hoursText = (minutes: number) => {
  const hours = minutes / 60;
  return hours < 10 ? hours.toFixed(1) : Math.round(hours).toLocaleString('en');
};

export function LifetimeCard({ life, unit, width = RECAP_WIDTH }: { life: Lifetime; unit: WeightUnit; width?: number }) {
  const lifted = Math.round(fromKg(life.volumeKg, unit));
  const like = heavyAs(life.volumeKg);
  return (
    <View style={[styles.card, { width }]}>
      <Txt variant="eyebrow" color={color.onBrandSoft}>
        {`MY LIFETIME · SINCE ${monthYear(life.since).toUpperCase()}`}
      </Txt>
      <View>
        <Txt variant="largeTitle" color={color.onBrand}>
          {`${lifted.toLocaleString('en')} ${unit}`}
        </Txt>
        <Txt variant="subhead" color={color.onBrandSoft}>
          lifted, all told
        </Txt>
      </View>
      {like && (
        <View style={styles.like}>
          <Txt variant="headline" color={color.onBrand}>
            {`About ${like.words}`}
          </Txt>
          <Txt variant="caption" color={color.onBrandSoft}>
            {`${like.thing.a[0]!.toUpperCase()}${like.thing.a.slice(1)} taken as ${Math.round(fromKg(like.thing.kg, unit)).toLocaleString('en')} ${unit}`}
          </Txt>
        </View>
      )}

      <View style={styles.grid}>
        <Tile icon="workout" value={life.workouts.toLocaleString('en')} label={life.workouts === 1 ? 'workout' : 'workouts'} />
        <Tile icon="timer" value={hoursText(life.minutes)} label="hours" />
        <Tile icon="check" value={life.sets.toLocaleString('en')} label={life.sets === 1 ? 'set' : 'sets'} />
        <Tile icon="trophy" value={life.records.toLocaleString('en')} label={life.records === 1 ? 'record' : 'records'} />
      </View>

      {(life.longestStreakWeeks > 1 || !!life.favourite) && (
        <View style={styles.lines}>
          {life.longestStreakWeeks > 1 && <Line icon="flame" text={`${life.longestStreakWeeks}-week best run`} />}
          {life.favourite && <Line icon="star" text={`Favourite: ${exerciseName(life.favourite.exerciseId)}`} />}
        </View>
      )}

      <View style={styles.footer}>
        <AppBadge size={22} />
        <Txt variant="subhead" color={color.onBrand} style={face('semibold')}>
          GymGO
        </Txt>
      </View>
    </View>
  );
}

function Tile({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${value} ${label}`}>
      <EmojiIcon name={icon} size={16} />
      <Txt variant="title" color={color.onBrand}>
        {value}
      </Txt>
      <Txt variant="caption" color={color.onBrandSoft}>
        {label}
      </Txt>
    </View>
  );
}

function Line({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.line}>
      <EmojiIcon name={icon} size={15} />
      <Txt variant="subhead" color={color.onBrand} style={[styles.flex, face('medium')]}>
        {text}
      </Txt>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    card: {
      width: RECAP_WIDTH,
      gap: space[3],
      padding: space[5],
      borderRadius: radius.xl,
      borderCurve: 'continuous',
      backgroundColor: color.brandFill,
    },
    like: { gap: 2, paddingTop: space[3], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.onBrandFaint },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    tile: {
      flexBasis: '47%',
      flexGrow: 1,
      gap: 2,
      padding: space[3],
      borderRadius: radius.lg,
      borderCurve: 'continuous',
      backgroundColor: 'rgba(255,255,255,0.14)',
    },
    lines: { gap: space[1] },
    line: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    flex: { flex: 1, minWidth: 0 },
    footer: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[1] },
  }),
);
