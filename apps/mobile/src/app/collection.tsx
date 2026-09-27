/**
 * Your gym collection: every gym you've checked in at, as a card that moves
 * up a tier (Bronze, Silver, Gold, Platinum) the more days you go. Above
 * them, how many gyms, cities and countries, and the badges they earn.
 *
 * A card shows the gym's own logo or a member's photo when there is one,
 * credited as on its page, and says "No photo supplied" when there isn't:
 * nothing is drawn in to stand for a gym.
 */

import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import type { GymRecord } from '@gymgo/domain';
import { MarkImage, useGymMark } from '@/components/BrandLogo';
import { TIER_METAL } from '@/components/CollectCard';
import { Icon, type IconName } from '@/components/Icon';
import { rise } from '@/components/motion';
import { NoPhoto, PrimaryButton, Txt } from '@/components/ui';
import { photoUrl } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { shareText } from '@/lib/actions';
import { badges, collectionShareText, collectionStats, flag, tierFor, type CollectedGym } from '@/lib/collection';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { color, face, radius, space, themed } from '@/lib/theme';
import { useCollection } from '@/lib/useCollection';

const COLUMN = 640;

export default function CollectionScreen() {
  usePageTitle('Collection');
  const router = useRouter();
  const { data, requestExplore } = useApp();
  const { loaded, gyms } = useCollection();
  const { width } = useWindowDimensions();
  const cardWidth = (Math.min(width, COLUMN) - space[4] * 2 - space[3]) / 2;
  const entries = useMemo(() => Object.values(gyms).sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1)), [gyms]);
  const stats = collectionStats(gyms);
  const earned = badges(stats);
  const [shared, setShared] = useState<string | null>(null);
  const share = async () => {
    const outcome = await shareText(collectionShareText(gyms), 'My GymGO collection');
    setShared(outcome === 'copied' ? 'Copied, ready to paste.' : outcome === 'failed' ? 'Sharing isn’t available here.' : null);
  };

  // Gyms found by searching an area aren't in the bundled data: fetch them, for their logos.
  const { ensureGyms } = data;
  useEffect(() => {
    if (entries.length) void ensureGyms(entries.map((entry) => entry.id));
  }, [entries, ensureGyms]);

  if (loaded && entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: 'Collection' }} />
        <View style={styles.emptyMedal}>
          <Icon name="trophy" size={34} color={color.onBrand} />
        </View>
        <Txt variant="title2" style={styles.center}>
          Start your collection
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
          At a gym, open its page and tap I’m here. GymGO checks your location on this phone and adds the gym to your collection. Go back on other days and its card climbs from Bronze to Platinum.
        </Txt>
        <PrimaryButton
          label="Find a gym"
          icon="map"
          onPress={() => {
            requestExplore({ recentre: true });
            router.navigate('/explore');
          }}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: 'Collection' }} />

      <Animated.View entering={rise(0)} style={styles.stats}>
        <Stat value={stats.gyms} one="gym" many="gyms" icon="gym" />
        <Stat value={stats.cities} one="city" many="cities" icon="pin" />
        <Stat value={stats.countries} one="country" many="countries" icon="globe" />
        <Stat value={stats.visits} one="visit" many="visits" icon="check" />
      </Animated.View>

      <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
        BADGES
      </Txt>
      <Animated.View entering={rise(1)} style={styles.badges}>
        {earned.map((badge) => (
          <View
            key={badge.id}
            style={[styles.badge, badge.earned && styles.badgeOn]}
            accessible
            accessibilityLabel={`${badge.title}: ${badge.detail}. ${badge.earned ? 'Earned' : 'Not yet'}`}
          >
            <Icon name={badge.earned ? 'trophy' : 'lock'} size={14} color={badge.earned ? color.brand : color.labelTertiary} />
            <View>
              <Txt variant="footnote" color={badge.earned ? color.label : color.labelSecondary} style={face('semibold')}>
                {badge.title}
              </Txt>
              <Txt variant="caption" color={color.labelSecondary}>
                {badge.detail}
              </Txt>
            </View>
          </View>
        ))}
      </Animated.View>

      <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
        YOUR GYMS
      </Txt>
      <View style={styles.grid}>
        {entries.map((entry, index) => (
          <Animated.View key={entry.id} entering={rise(Math.min(index, 6) + 2)} style={{ width: cardWidth }}>
            <GymCard
              entry={entry}
              record={data.records.find((record) => record.location.id === entry.id) ?? null}
              cover={data.covers[entry.id] ?? null}
              width={cardWidth}
              onPress={() => router.push({ pathname: '/gym/[id]', params: { id: entry.id } })}
            />
          </Animated.View>
        ))}
      </View>
      <PrimaryButton label="Share your collection" icon="share" tone="quiet" onPress={() => void share()} />
      {shared && (
        <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
          {shared}
        </Txt>
      )}
      <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
        Kept on this device. A visit counts once a day, when you check in at the gym; your location is only compared on the phone, never sent.
      </Txt>
    </ScrollView>
  );
}

function Stat({ value, one, many, icon }: { value: number; one: string; many: string; icon: IconName }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${value === 1 ? one : many}`}>
      <Icon name={icon} size={16} color={color.brand} />
      <Txt variant="title" style={face('bold')}>
        {value}
      </Txt>
      <Txt variant="caption" color={color.labelSecondary}>
        {value === 1 ? one : many}
      </Txt>
    </View>
  );
}

function GymCard({ entry, record, cover, width, onPress }: { entry: CollectedGym; record: GymRecord | null; cover: string | null; width: number; onPress: () => void }) {
  const visits = entry.days.length;
  const tier = tierFor(visits);
  const metal = TIER_METAL[tier.tier];
  const since = new Date(entry.firstAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  const toNext = tier.next ? visits / (visits + tier.next.visits) : 1;
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${entry.name}, ${entry.city}. ${tier.label}, ${visits} visit${visits === 1 ? '' : 's'}${tier.next ? `, ${tier.next.visits} more to ${tier.next.label}` : ''}`}
      // Fills its row's height, so cards side by side line up when one name takes two lines.
      style={({ pressed }) => [styles.card, { borderColor: metal }, pressed && { transform: [{ scale: 0.97 }] }]}
    >
      <View style={styles.art}>
        <CardArt record={record} cover={cover} name={entry.name} width={width - space[2] * 2} />
        <View style={[styles.ribbon, { backgroundColor: metal }]}>
          <Icon name="trophy" size={10} color={color.onBrand} />
          <Txt variant="caption" color={color.onBrand} style={[face('bold'), styles.ribbonText]}>
            {tier.label.toUpperCase()}
          </Txt>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Txt variant="headline" numberOfLines={2}>
          {entry.name}
        </Txt>
        <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1}>
          {`${flag(entry.countryCode)} ${entry.city}`.trim()}
        </Txt>
        <Txt variant="caption" color={color.labelSecondary} numberOfLines={2}>
          {`${visits} visit${visits === 1 ? '' : 's'} · since ${since}`}
        </Txt>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(toNext * 100)}%`, backgroundColor: metal }]} />
        </View>
      </View>
    </Pressable>
  );
}

/** The gym's own logo, else a member's photo, else "No photo supplied". */
function CardArt({ record, cover, name, width }: { record: GymRecord | null; cover: string | null; name: string; width: number }) {
  const uri = cover ? photoUrl(cover) : null;
  if (uri) return <Image source={{ uri }} style={styles.photo} resizeMode="cover" accessibilityLabel={`A member’s photo of ${name}`} />;
  if (record) return <Mark record={record} name={name} width={width} />;
  return <NoPhoto style={styles.photo} />;
}

function Mark({ record, name, width }: { record: GymRecord; name: string; width: number }) {
  const mark = useGymMark(record.location);
  if (!mark) return <NoPhoto style={styles.photo} />;
  return (
    <View style={[styles.photo, styles.plate]}>
      <MarkImage mark={mark} name={name} width={width - space[4]} height={56} area={2600} />
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], gap: space[3], paddingBottom: space[8], width: '100%', maxWidth: COLUMN, alignSelf: 'center' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6], backgroundColor: color.groupedBackground },
    emptyMedal: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C9971C' },
    center: { textAlign: 'center' },
    section: { marginTop: space[2], marginLeft: space[4] },
    stats: { flexDirection: 'row', gap: space[2] },
    stat: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space[3], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.card },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    badge: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.md, backgroundColor: color.fill },
    badgeOn: { backgroundColor: color.brandTint },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
    card: { flex: 1, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 2, backgroundColor: color.card, padding: space[2], gap: space[2] },
    art: { borderRadius: radius.md, overflow: 'hidden' },
    photo: { height: 96, width: '100%', borderRadius: radius.md },
    plate: { alignItems: 'center', justifyContent: 'center', backgroundColor: color.logoPlate },
    ribbon: { position: 'absolute', top: space[2], left: space[2], flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill },
    ribbonText: { letterSpacing: 0.5, fontSize: 10, lineHeight: 14 },
    cardBody: { flex: 1, gap: 2, paddingHorizontal: space[1], paddingBottom: space[1] },
    track: { height: 5, borderRadius: 3, backgroundColor: color.fill, overflow: 'hidden', marginTop: 'auto' },
    fill: { height: '100%', borderRadius: 3 },
    note: { marginTop: space[2], paddingHorizontal: space[4], textAlign: 'center' },
  }),
);
