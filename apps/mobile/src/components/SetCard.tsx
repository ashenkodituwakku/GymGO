/**
 * Collection sets on the Collection screen: a set still going is a row with
 * how far along it is and the gyms still to collect; a finished one is its
 * reward card, framed in gold, with the day it was finished.
 *
 * The reward card is lettering on a frame: it names the place, and draws no
 * picture of it or of any gym.
 */

import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { flag } from '@/lib/collection';
import type { GymSet } from '@/lib/sets';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { TIER_METAL } from './GemCard';
import { Icon } from './Icon';
import { POP_IN } from './motion';
import { Txt } from './ui';

const KIND: Record<GymSet['kind'], string> = { suburb: 'Suburb set', city: 'City set' };

/** "5 Sep 2026" from a local day ("2026-09-05"). */
export function dayLabel(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year!, month! - 1, date!).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** A finished set's reward card. `fresh` pops it in, as when a check-in has just finished it. */
export function SetReward({ set, fresh = false }: { set: GymSet; fresh?: boolean }) {
  const gold = TIER_METAL.gold;
  return (
    <Animated.View
      entering={fresh ? POP_IN : undefined}
      style={[styles.reward, { borderColor: gold }]}
      accessible
      accessibilityLabel={`${set.name} ${KIND[set.kind].toLowerCase()} complete: ${set.total} gyms, finished ${dayLabel(set.completedOn!)}`}
    >
      <View style={styles.rewardHead}>
        <View style={[styles.medal, { backgroundColor: gold }]}>
          <Icon name="trophy" size={16} color="#FFFFFF" />
        </View>
        <Txt variant="eyebrow" color={color.labelSecondary} style={styles.flex}>
          {`${KIND[set.kind].toUpperCase()} COMPLETE`}
        </Txt>
        <Txt variant="headline">{flag(set.countryCode)}</Txt>
      </View>
      <Txt variant="title2" numberOfLines={2}>
        {set.name}
      </Txt>
      <Txt variant="footnote" color={color.labelSecondary}>
        {set.kind === 'suburb' ? `Every gym GymGO lists here: all ${set.total}` : `${set.total} gyms in the city`}
      </Txt>
      <View style={[styles.rule, { backgroundColor: gold }]} />
      <Txt variant="caption" color={color.labelSecondary}>
        {`Finished ${dayLabel(set.completedOn!)}`}
      </Txt>
    </Animated.View>
  );
}

/** A set still going: how far, and (a suburb's) the gyms still to collect. */
export function SetProgress({ set, first }: { set: GymSet; first: boolean }) {
  const share = set.have / set.total;
  const still = set.missing.slice(0, 3).map((gym) => gym.name);
  return (
    <View
      style={[styles.row, !first && styles.rowLine]}
      accessible
      accessibilityLabel={`${set.name} ${KIND[set.kind].toLowerCase()}: ${set.have} of ${set.total} gyms${still.length ? `. Still to collect: ${still.join(', ')}` : ''}`}
    >
      <View style={styles.rowHead}>
        <View style={styles.flex}>
          <Txt variant="headline" numberOfLines={1}>
            {set.name}
          </Txt>
          <Txt variant="caption" color={color.labelSecondary}>
            {KIND[set.kind]}
          </Txt>
        </View>
        <Txt variant="subhead" style={[face('semibold'), styles.count]}>
          {`${set.have} of ${set.total}`}
        </Txt>
      </View>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${Math.round(share * 100)}%` }]} />
      </View>
      {still.length > 0 && (
        <Txt variant="footnote" color={color.labelSecondary} numberOfLines={2}>
          {`Still to collect: ${still.join(', ')}${set.missing.length > still.length ? ` and ${set.missing.length - still.length} more` : ''}`}
        </Txt>
      )}
      {set.kind === 'city' && (
        <Txt variant="footnote" color={color.labelSecondary}>
          {`Any ${set.total - set.have} more gym${set.total - set.have === 1 ? '' : 's'} in ${set.name}`}
        </Txt>
      )}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    flex: { flex: 1 },
    reward: {
      gap: space[1],
      padding: space[4],
      borderWidth: 3,
      borderRadius: radius.lg,
      borderCurve: 'continuous',
      backgroundColor: color.card,
      ...shadow.plate,
    },
    rewardHead: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginBottom: space[1] },
    medal: { width: 28, height: 28, borderRadius: Math.min(14, radius.pill), alignItems: 'center', justifyContent: 'center' },
    rule: { height: 2, borderRadius: 1, marginVertical: space[2], opacity: 0.7 },
    row: { gap: space[2], padding: space[4] },
    rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
    rowHead: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    count: { fontVariant: ['tabular-nums'] },
    bar: { height: 6, borderRadius: 3, backgroundColor: color.fill, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 3, backgroundColor: color.brand },
  }),
);
