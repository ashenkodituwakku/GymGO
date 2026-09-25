/**
 * A gym as a card in a horizontal row on the Home and Saved screens: its
 * photo (or a plain tile when nobody has shared one), its name, where it is,
 * one status chip and the price.
 *
 * On iPhone, pressing and holding shows a preview of the gym's page with a
 * menu (save, share, directions, compare), as Maps and Photos do. Elsewhere
 * a tap simply opens the page.
 */

import { Link } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { GymSearchResult } from '@gymgo/domain';
import { distanceLabel } from '@/lib/places';
import { openDirections, shareGym } from '@/lib/actions';
import { photoUrl } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { TIER } from '@/lib/copy';
import { haptic } from '@/lib/haptics';
import { priceLine } from '@/lib/present';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { MarkImage, useGymMark } from './BrandLogo';
import { rise, usePressScale } from './motion';
import { Icon } from './Icon';
import { TIER_COLOUR, Txt } from './ui';

/** `index`: its place in the row, so a row of cards rises into place one after another. */
export function GymCard({ result, width = 216, index = 0 }: { result: GymSearchResult; width?: number; index?: number }) {
  const { account, data, compare, toggleCompare } = useApp();
  const location = result.record.location;
  const id = location.id;
  const tone = TIER_COLOUR[result.tier];
  const tier = TIER[result.tier];
  const members = data.memberPrices[id];
  const price = priceLine(result.offers, members ? { typicalMinor: members.typicalMinor, country: location.address.countryCode } : null);
  const cover = data.covers[id] ? photoUrl(data.covers[id]!) : null;
  const mark = useGymMark(location);
  const press = usePressScale(0.97);
  const saved = account.saved.includes(id);
  const comparing = compare.includes(id);
  const where = [location.address.suburb, result.distanceKm !== null ? distanceLabel(result.distanceKm, result.record.location.address.countryCode) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link href={{ pathname: '/gym/[id]', params: { id } }} asChild>
      <Link.Trigger>
        <Pressable
          onPressIn={() => {
            haptic.tap();
            press.onPressIn();
          }}
          onPressOut={press.onPressOut}
          accessibilityRole="link"
          accessibilityLabel={`${location.name}, ${where}. ${tier.label}. ${price.headline} ${price.caption}.`}
          style={styles.press}
        >
          {/* Sized here, not on the Pressable: on the web the link wrapper
              replaces the Pressable's style. */}
          <Animated.View style={[styles.card, { width }, press.style]} entering={rise(index)}>
            {cover ? (
              <Image source={{ uri: cover }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={[styles.image, styles.tile, { backgroundColor: mark ? color.logoPlate : color.brandTint }]}>
                {mark ? <MarkImage mark={mark} name={location.name} width={width * 0.72} height={76} area={5200} /> : <Icon name="gym" size={36} color={color.brand} />}
              </View>
            )}
            <View style={styles.body}>
              <Txt variant="headline" numberOfLines={1}>
                {location.name}
              </Txt>
              <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1}>
                {where}
              </Txt>
              <View style={styles.foot}>
                <View style={[styles.chip, styles.chipRow, { backgroundColor: tone.tint }]}>
                  <Icon name={tone.icon} size={11} color={tone.ink} />
                  <Txt variant="caption" color={tone.ink} style={face('semibold')} numberOfLines={1}>
                    {tier.label}
                  </Txt>
                </View>
                <Txt variant="subhead" color={price.confirmed ? color.label : color.labelSecondary} style={face('semibold')}>
                  {price.headline}
                </Txt>
              </View>
            </View>
          </Animated.View>
        </Pressable>
      </Link.Trigger>
      <Link.Preview />
      <Link.Menu>
        <Link.MenuAction icon={saved ? 'bookmark.fill' : 'bookmark'} onPress={() => account.toggleSave(id)}>
          {saved ? 'Remove from Saved' : 'Save'}
        </Link.MenuAction>
        <Link.MenuAction icon="square.and.arrow.up" disabled={location.isDemoData} onPress={() => void shareGym(result.record)}>
          Share
        </Link.MenuAction>
        <Link.MenuAction
          icon="arrow.triangle.turn.up.right.diamond"
          disabled={location.isDemoData}
          onPress={() => void openDirections(result.record)}
        >
          Directions
        </Link.MenuAction>
        <Link.MenuAction icon="rectangle.split.3x1" onPress={() => toggleCompare(id)}>
          {comparing ? 'Remove from Compare' : 'Add to Compare'}
        </Link.MenuAction>
      </Link.Menu>
    </Link>
  );
}

const styles = themed(() => StyleSheet.create({
  press: { borderRadius: radius.xl },
  card: {
    backgroundColor: color.card,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    overflow: 'hidden',
    ...shadow.card,
  },
  image: { width: '100%', height: 118, backgroundColor: color.fill },
  tile: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: space[3], gap: 2 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2], marginTop: space[2] },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chip: { paddingHorizontal: space[2], paddingVertical: 3, borderRadius: radius.pill, flexShrink: 1 },
}));
