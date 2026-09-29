/**
 * Your gym collection: every gym you've checked in at, as a trading card.
 * Each card has a rarity and a gem, rolled by luck (see lib/rarity.ts), and
 * a visit tier (Bronze to Platinum) that only going back can raise. Above
 * them, how many gyms, cities and countries, and the badges they earn.
 *
 * A card shows the gym's own logo or a member's photo when there is one,
 * and says "No photo supplied" when there isn't: the gem frame is
 * decoration, and nothing is drawn in to stand for a gym.
 */

import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { GemCard } from '@/components/GemCard';
import { Icon, type IconName } from '@/components/Icon';
import { GLIDE } from '@/components/motion';
import { PrimaryButton, Segmented, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { shareText } from '@/lib/actions';
import { badges, collectionShareText, collectionStats } from '@/lib/collection';
import { FOIL_ONE_IN, cardFor, oddsLine, rarityRank } from '@/lib/rarity';
import { usePageTitle } from '@/lib/pageTitle';
import { color, face, radius, space, themed } from '@/lib/theme';
import { useCollection } from '@/lib/useCollection';
import { useScreenBottom } from '@/lib/layout';

const COLUMN = 640;

export default function CollectionScreen() {
  usePageTitle('Collection');
  const screenBottom = useScreenBottom();
  const router = useRouter();
  const { data, requestExplore } = useApp();
  const { loaded, gyms } = useCollection();
  const { width } = useWindowDimensions();
  const cardWidth = (Math.min(width, COLUMN) - space[4] * 2 - space[3]) / 2;
  const [order, setOrder] = useState<'newest' | 'rarest' | 'visits'>('newest');
  const entries = useMemo(() => {
    const newest = Object.values(gyms).sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
    if (order === 'rarest') {
      const rank = new Map(newest.map((entry) => [entry.id, rarityRank(cardFor(entry).rarity) * 2 + (cardFor(entry).foil ? 1 : 0)]));
      return [...newest].sort((a, b) => rank.get(b.id)! - rank.get(a.id)!);
    }
    if (order === 'visits') return [...newest].sort((a, b) => b.days.length - a.days.length);
    return newest;
  }, [gyms, order]);
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
          At a gym, open its page and tap I’m here. GymGO checks your location on this phone and gives you the gym’s card, with a rarity and a gem rolled by luck. Every day you go back rolls again, and the card climbs from Bronze to Platinum.
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
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingBottom: screenBottom }]} contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: 'Collection' }} />

      <Animated.View style={styles.stats}>
        <Stat value={stats.gyms} one="gym" many="gyms" icon="gym" />
        <Stat value={stats.cities} one="city" many="cities" icon="pin" />
        <Stat value={stats.countries} one="country" many="countries" icon="globe" />
        <Stat value={stats.visits} one="visit" many="visits" icon="check" />
      </Animated.View>

      <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
        BADGES
      </Txt>
      <Animated.View style={styles.badges}>
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
        YOUR CARDS
      </Txt>
      {entries.length > 1 && (
        <Segmented
          options={[
            { value: 'newest', label: 'Newest' },
            { value: 'rarest', label: 'Rarest' },
            { value: 'visits', label: 'Most visits' },
          ]}
          value={order}
          onChange={setOrder}
        />
      )}
      <View style={styles.grid}>
        {entries.map((entry) => (
          // Re-sorting slides each card to its new place rather than jumping.
          <Animated.View key={entry.id} layout={GLIDE} style={{ width: cardWidth }}>
            <GemCard
              entry={entry}
              record={data.records.find((record) => record.location.id === entry.id) ?? null}
              cover={data.covers[entry.id] ?? null}
              width={cardWidth}
              onPress={() => router.push({ pathname: '/gym/[id]', params: { id: entry.id } })}
            />
          </Animated.View>
        ))}
      </View>
      <View style={styles.how}>
        <View style={styles.howHead}>
          <Icon name="gem" size={16} color={color.brand} />
          <Txt variant="headline">How cards work</Txt>
        </View>
        <Txt variant="footnote" color={color.labelSecondary}>
          {`Each day you check in at a gym rolls its card: ${oddsLine()}. The card keeps its best roll, so going back is how it gets rarer. Its gem (its colour) is picked at random when you first collect the gym, and 1 in ${FOIL_ONE_IN} cards is Foil.`}
        </Txt>
        <Txt variant="footnote" color={color.labelSecondary}>
          Rarity is luck, not a rating of the gym, and it can’t be bought. The tier (Bronze to Platinum) counts your visits.
        </Txt>
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
    how: { gap: space[2], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.card },
    howHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    note: { marginTop: space[2], paddingHorizontal: space[4], textAlign: 'center' },
  }),
);
