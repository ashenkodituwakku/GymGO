/**
 * Your week, as a card to share (app/recap.tsx): workouts, sets, gyms and
 * records, the weight you moved, your streak, and the best card from the
 * gyms you checked in at. Totals only: never which days you went, or where
 * at what time.
 */

import type { GymRecord } from '@gymgo/domain';
import { StyleSheet, View } from 'react-native';
import { weekRange, type WeekRecap } from '@/lib/insights';
import { cardFor, cardName } from '@/lib/rarity';
import { color, face, radius, space, themed } from '@/lib/theme';
import { fromKg, type WeightUnit } from '@/lib/training';
import { AppBadge } from './BrandMark';
import { GemCard } from './GemCard';
import { Icon, type IconName } from './Icon';
import { Txt } from './ui';

export const RECAP_WIDTH = 320;

export function RecapCard({ recap, unit, record, cover }: { recap: WeekRecap; unit: WeightUnit; record: GymRecord | null; cover: string | null }) {
  const lifted = Math.round(fromKg(recap.volumeKg, unit) / (unit === 'kg' ? 10 : 25)) * (unit === 'kg' ? 10 : 25);
  const best = recap.bestCard;
  return (
    <View style={styles.card}>
      <Txt variant="eyebrow" color="rgba(255,255,255,0.75)">
        {recap.which === 'this' ? 'MY WEEK' : 'MY LAST WEEK'}
      </Txt>
      <Txt variant="title" color={color.onBrand} style={styles.range}>
        {weekRange(recap.start)}
      </Txt>

      <View style={styles.grid}>
        <Tile icon="workout" value={recap.workouts} one="workout" many="workouts" />
        <Tile icon="check" value={recap.sets} one="set" many="sets" />
        <Tile icon="gym" value={recap.gymsVisited} one="gym" many="gyms" />
        <Tile icon="trophy" value={recap.records} one="record" many="records" />
      </View>

      {(lifted > 0 || recap.streakWeeks > 1 || recap.newGyms > 0) && (
        <View style={styles.lines}>
          {lifted > 0 && <Line icon="bolt" text={`${lifted.toLocaleString('en-AU')} ${unit} lifted`} />}
          {recap.streakWeeks > 1 && <Line icon="flame" text={`${recap.streakWeeks}-week streak`} />}
          {recap.newGyms > 0 && <Line icon="sparkle" text={`${recap.newGyms} new gym${recap.newGyms === 1 ? '' : 's'} collected`} />}
        </View>
      )}

      {best && (
        <View style={styles.best}>
          <View style={styles.bestText}>
            <Txt variant="caption" color="rgba(255,255,255,0.75)">
              BEST CARD
            </Txt>
            <Txt variant="headline" color={color.onBrand}>
              {cardName(cardFor(best))}
            </Txt>
          </View>
          <GemCard entry={best} record={record} cover={cover} width={150} />
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

function Tile({ icon, value, one, many }: { icon: IconName; value: number; one: string; many: string }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${value} ${value === 1 ? one : many}`}>
      <Icon name={icon} size={16} color={color.onBrand} />
      <Txt variant="title" color={color.onBrand} style={styles.number}>
        {String(value)}
      </Txt>
      <Txt variant="caption" color="rgba(255,255,255,0.8)">
        {value === 1 ? one : many}
      </Txt>
    </View>
  );
}

function Line({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.line}>
      <Icon name={icon} size={15} color={color.onBrand} />
      <Txt variant="subhead" color={color.onBrand} style={face('medium')}>
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
    range: { marginTop: -space[2] },
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
    number: { fontVariant: ['tabular-nums'] },
    lines: { gap: space[1] },
    line: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    best: {
      alignItems: 'center',
      gap: space[3],
      padding: space[3],
      borderRadius: radius.lg,
      borderCurve: 'continuous',
      backgroundColor: 'rgba(255,255,255,0.14)',
    },
    bestText: { alignSelf: 'stretch', gap: 2 },
    footer: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[1] },
  }),
);
