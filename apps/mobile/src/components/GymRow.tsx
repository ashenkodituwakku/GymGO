/**
 * One gym in the results list: its photo (a demo gym's illustration, badged
 * as one; or a friendly tile when nobody has shared one), the name and how far away it is, one status chip, and the
 * price where the eye lands last.
 */

import { Image, StyleSheet, View } from 'react-native';
import { Pressable } from './motion';
import type { GymSearchResult } from '@gymgo/domain';
import { distanceLabel } from '@/lib/places';
import { TIER, accessLine } from '@/lib/copy';
import { photoUrl } from '@/lib/api';
import { demoPicture } from '@/lib/gymPicture';
import { priceLine, priceText } from '@/lib/present';
import { color, face, radius, space, themed } from '@/lib/theme';
import { haptic } from '@/lib/haptics';
import { MarkImage, useGymMark } from './BrandLogo';
import { Icon } from './Icon';
import { Illustration } from './Illustration';
import { NoPhoto, TIER_COLOUR, Txt } from './ui';

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
  const illustration = coverUri ? null : demoPicture(location);
  const mark = useGymMark(location);
  const suburb = location.address.suburb || null;
  const distance = result.distanceKm !== null ? distanceLabel(result.distanceKm, result.record.location.address.countryCode) : null;
  const where = [suburb, distance].filter(Boolean).join(' · ');

  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${location.name}, ${where}. ${tier.label}: ${access}. ${priceText(price)}.`}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.fill }]}
    >
      {coverUri ? (
        <Image source={{ uri: coverUri }} style={styles.thumb} resizeMode="cover" />
      ) : illustration ? (
        <Illustration picture={illustration} style={styles.thumb} />
      ) : mark ? (
        <View style={[styles.thumb, styles.tile, { backgroundColor: color.logoPlate }]}>
          <MarkImage mark={mark} name={location.name} width={52} height={48} area={1500} />
        </View>
      ) : (
        <NoPhoto compact style={styles.thumb} />
      )}

      <View style={styles.middle}>
        {/* A phone leaves this column narrow, so a long name takes a second
            line rather than losing its end, and a long suburb gives way
            before the distance does. */}
        <Txt variant="headline" numberOfLines={2}>
          {location.name}
        </Txt>
        <View style={styles.where}>
          {suburb ? (
            <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1} style={styles.shrink}>
              {suburb}
            </Txt>
          ) : null}
          {distance ? (
            // Non-breaking spaces: a plain one at the start of this line is dropped on the web.
            <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1} style={styles.keep}>
              {suburb ? `\u00a0·\u00a0${distance}` : distance}
            </Txt>
          ) : null}
        </View>
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
        <Txt variant="caption" color={color.labelSecondary} numberOfLines={2} style={styles.caption}>
          {price.caption}
        </Txt>
      </View>
    </Pressable>
  );
}

const styles = themed(() => StyleSheet.create({
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
  where: { flexDirection: 'row', minWidth: 0 },
  shrink: { flexShrink: 1 },
  keep: { flexShrink: 0 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chip: {
    alignSelf: 'flex-start',
    marginTop: 3,
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  chipText: face('semibold'),
  // Narrow, so the name gets the room: "price unknown" wraps onto two lines.
  trailing: { alignItems: 'flex-end', maxWidth: 76 },
  caption: { textAlign: 'right' },
}));
