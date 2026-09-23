/**
 * One gym in the results list, in the shape of a Maps search result: a round
 * category glyph in the colour of how well it fits, the name, a line about
 * guest entry, and the price where the eye lands last.
 */

import { Pressable, StyleSheet, View } from 'react-native';
import { formatDistanceKm, type GymSearchResult } from '@gymgo/domain';
import { accessLine } from '@/lib/copy';
import { priceLine } from '@/lib/present';
import { color, face, space } from '@/lib/theme';
import { haptic } from '@/lib/haptics';
import { Icon } from './Icon';
import { TIER_COLOUR, Txt } from './ui';

export function GymRow({
  result,
  visitMinute,
  onPress,
}: {
  result: GymSearchResult;
  visitMinute: number;
  onPress: () => void;
}) {
  const location = result.record.location;
  const tone = TIER_COLOUR[result.tier];
  const price = priceLine(result.offers);
  const access = accessLine(result.access.verdict, visitMinute);
  const accessInk =
    result.access.verdict === 'admits_visitor'
      ? color.goodInk
      : result.access.verdict === 'not_admitted'
        ? color.noInk
        : color.maybeInk;

  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${location.name}. ${access}. ${price.headline}.`}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.fill }]}
    >
      <View style={[styles.glyph, { backgroundColor: tone.fill }]}>
        <Icon name="gym" size={17} color={color.onBrand} weight="bold" />
      </View>

      <View style={styles.middle}>
        <Txt variant="headline" numberOfLines={1}>
          {location.name}
        </Txt>
        <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1}>
          {location.address.suburb}
          {result.distanceKm !== null ? ` · ${formatDistanceKm(result.distanceKm).replace(' straight line', '')}` : ''}
        </Txt>
        <Txt variant="footnote" color={accessInk} numberOfLines={1} style={styles.access}>
          {access}
        </Txt>
      </View>

      <View style={styles.trailing}>
        <Txt variant="figure" color={price.confirmed ? color.label : color.labelSecondary}>
          {price.headline}
        </Txt>
        <Txt variant="caption" color={color.labelSecondary} numberOfLines={1}>
          {price.caption}
        </Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderRadius: 14,
  },
  glyph: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: { flex: 1, minWidth: 0 },
  access: { ...face('medium'), marginTop: 1 },
  trailing: { alignItems: 'flex-end', maxWidth: 96 },
});
