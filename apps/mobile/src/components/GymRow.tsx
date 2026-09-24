/**
 * One gym in the results list: its photo (or a friendly tile when nobody has
 * shared one), the name and how far away it is, one status chip, and the
 * price where the eye lands last.
 */

import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { GymSearchResult } from '@gymgo/domain';
import { distanceLabel } from '@/lib/places';
import { TIER, accessLine } from '@/lib/copy';
import { photoUrl } from '@/lib/api';
import { priceLine } from '@/lib/present';
import { color, face, radius, space } from '@/lib/theme';
import { haptic } from '@/lib/haptics';
import { BrandLogo, logoFor } from './BrandLogo';
import { Icon } from './Icon';
import { TIER_COLOUR, Txt } from './ui';

export function GymRow({
  result,
  visitMinute,
  cover,
  memberTypicalMinor = null,
  onPress,
}: {
  result: GymSearchResult;
  visitMinute: number;
  /** Server path of the gym's newest member photo, if it has one. */
  cover: string | null;
  /** What members typically paid, shown only when the gym publishes no price. */
  memberTypicalMinor?: number | null;
  onPress: () => void;
}) {
  const location = result.record.location;
  const tone = TIER_COLOUR[result.tier];
  const tier = TIER[result.tier];
  const price = priceLine(
    result.offers,
    memberTypicalMinor === null ? null : { typicalMinor: memberTypicalMinor, country: location.address.countryCode },
  );
  const access = accessLine(result.access.verdict, visitMinute);
  const coverUri = cover ? photoUrl(cover) : null;
  const where = [
    location.address.suburb,
    result.distanceKm !== null ? distanceLabel(result.distanceKm, result.record.location.address.countryCode) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${location.name}, ${where}. ${tier.label}: ${access}. ${price.headline} ${price.caption}.`}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.fill }]}
    >
      {coverUri ? (
        <Image source={{ uri: coverUri }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.tile, { backgroundColor: logoFor(location) ? '#FFFFFF' : color.brandTint }]}>
          {logoFor(location) ? <BrandLogo location={location} width={52} height={48} area={1500} /> : <Icon name="gym" size={24} color={color.brand} />}
        </View>
      )}

      <View style={styles.middle}>
        <Txt variant="headline" numberOfLines={1}>
          {location.name}
        </Txt>
        <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1}>
          {where}
        </Txt>
        <View style={[styles.chip, styles.chipRow, { backgroundColor: tone.tint }]}>
          <Icon name={tone.icon} size={11} color={tone.ink} />
          <Txt variant="caption" color={tone.ink} style={styles.chipText} numberOfLines={1}>
            {tier.label}
          </Txt>
        </View>
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
    paddingHorizontal: space[3],
    borderRadius: 18,
  },
  thumb: {
    width: 62,
    height: 62,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: color.fill,
  },
  tile: { alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, minWidth: 0, gap: 2 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chip: {
    alignSelf: 'flex-start',
    marginTop: 3,
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  chipText: face('bold'),
  trailing: { alignItems: 'flex-end', maxWidth: 96 },
});
