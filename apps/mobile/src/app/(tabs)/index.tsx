/**
 * Home: a place to start. A greeting, the search, one-tap picks for the
 * common questions ("somewhere I can train at 6 am", "under A$25"), the gyms
 * near where you're looking, what you've saved and looked at, suburbs to
 * browse, and how GymGO decides what it tells you.
 *
 * Every pick just sets the search and hands over to the Explore tab, so the
 * answers always come from the same rules as the map.
 */

import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { GymCard } from '@/components/GymCard';
import { Group, Row, SearchButton, SectionHeader, TabScreen } from '@/components/ios';
import { Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { EMPTY, TIER, timeLabel } from '@/lib/copy';
import { haptic } from '@/lib/haptics';
import { PLACES, type AppPlace } from '@/lib/places';
import { atPlace, initialFilters, nextVisitAt, nowInPilot, runSearch, type Filters } from '@/lib/query';
import { resultsById } from '@/lib/results';
import { color, face, radius, shadow, space } from '@/lib/theme';

/** Suburbs worth a tap, in the order people ask about them. */
const SUBURBS = ['Melbourne CBD', 'Fitzroy', 'Collingwood', 'Brunswick', 'Carlton', 'Richmond', 'South Melbourne', 'Northcote'];

function greeting(minute: number): string {
  if (minute < 12 * 60) return 'Good morning';
  if (minute < 17 * 60) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const { data, account, filters, setFilters, recents, clearRecents, requestExplore } = useApp();
  const router = useRouter();

  const asOf = useMemo(() => new Date(), [filters, data.records]);
  const outcome = useMemo(() => runSearch(filters, { records: data.records }, asOf), [filters, data.records, asOf]);
  const byId = useMemo(() => resultsById(filters, data.records, asOf), [filters, data.records, asOf]);

  const nearby = outcome.results.slice(0, 10);
  const saved = account.saved.map((id) => byId.get(id)).filter((result) => result !== undefined);
  const recent = recents.map((id) => byId.get(id)).filter((result) => result !== undefined);
  const now = nowInPilot();
  const name = account.account?.displayName.split(' ')[0];

  // What GymGO actually knows about the real gyms, counted, not claimed.
  const real = data.records.filter((record) => !record.location.isDemoData);
  const withPrice = real.filter((record) => record.offers.some((offer) => offer.baseAmountMinor !== null)).length;
  const withGuestHours = real.filter((record) => record.schedules.some((item) => item.audience === 'visitor')).length;
  const withKit = real.filter((record) => record.equipment.some((item) => item.presence === 'yes')).length;

  const explore = (request: Parameters<typeof requestExplore>[0] = {}) => {
    requestExplore(request);
    router.navigate('/explore');
  };
  const pick = (change: (current: Filters) => Filters) => {
    haptic.select();
    setFilters(change);
    explore({ recentre: true });
  };
  const goToPlace = (place: AppPlace) => pick((current) => ({ ...current, ...atPlace(place) }));

  const picks: Array<{ emoji: string; title: string; line: string; tint: string; onPress: () => void }> = [
    {
      emoji: '🌅',
      title: 'Early start',
      line: 'Guests at 6 am',
      tint: '#FFF4D6',
      onPress: () => pick((current) => ({ ...current, ...visit(6 * 60) })),
    },
    {
      emoji: '🌙',
      title: 'After work',
      line: 'Guests at 6 pm',
      tint: '#E8E7FB',
      onPress: () => pick((current) => ({ ...current, ...visit(18 * 60) })),
    },
    {
      emoji: '💵',
      title: 'Under A$25',
      line: 'A visit that fits',
      tint: '#E3F6E8',
      onPress: () => pick((current) => ({ ...current, budgetMinor: 2500 })),
    },
    {
      emoji: '🏋️',
      title: 'Squat racks',
      line: 'Must have one',
      tint: '#FFE9E3',
      onPress: () =>
        pick((current) => ({
          ...current,
          equipment: current.equipment.includes('squat_rack') ? current.equipment : [...current.equipment, 'squat_rack'],
        })),
    },
    { emoji: '📍', title: 'Near me', line: 'Use my location', tint: '#E1F0FF', onPress: () => explore({ locate: true }) },
    {
      emoji: '✨',
      title: 'Everything',
      line: 'Clear my filters',
      tint: '#F1EAF9',
      onPress: () =>
        pick((current) => ({
          ...initialFilters(),
          centre: current.centre,
          placeName: current.placeName,
          timezone: current.timezone,
        })),
    },
  ];

  return (
    <TabScreen
      eyebrow={new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
      title={name ? `${greeting(now.minute)}, ${name}` : `${greeting(now.minute)} 👋`}
      right={
        <Pressable
          onPress={() => router.navigate('/profile')}
          accessibilityRole="button"
          accessibilityLabel={account.account ? 'Your profile' : 'Sign in'}
          style={({ pressed }) => [styles.avatar, account.account && styles.avatarOn, pressed && { opacity: 0.7 }]}
        >
          <Txt variant="headline" color={account.account ? color.onBrand : color.brand}>
            {account.account ? account.account.displayName.slice(0, 1).toUpperCase() : '👤'}
          </Txt>
        </Pressable>
      }
    >
      <SearchButton placeholder="Search a suburb or postcode" onPress={() => explore({ focusSearch: true })} />

      {/* Quick picks ------------------------------------------------------- */}
      <View style={styles.picks}>
        {picks.map((item) => (
          <Pressable
            key={item.title}
            onPress={item.onPress}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}: ${item.line}`}
            style={({ pressed }) => [styles.pick, { backgroundColor: item.tint }, pressed && { transform: [{ scale: 0.97 }] }]}
          >
            <Txt style={styles.pickEmoji}>{item.emoji}</Txt>
            <View style={styles.flex}>
              <Txt variant="headline" numberOfLines={1}>
                {item.title}
              </Txt>
              <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1}>
                {item.line}
              </Txt>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Nearby ------------------------------------------------------------ */}
      <View style={styles.section}>
        <SectionHeader
          title={filters.placeName === 'your location' ? 'Near you' : `Near ${filters.placeName}`}
          action="Map"
          onAction={() => explore({ recentre: true })}
        />
        <Txt variant="footnote" color={color.labelSecondary}>
          For a visit at {timeLabel(filters.visitMinuteOfDay)}
          {filters.budgetMinor ? `, under A$${filters.budgetMinor / 100}` : ''}
          {filters.equipment.length ? `, with ${filters.equipment.length} must-have${filters.equipment.length > 1 ? 's' : ''}` : ''}. Hold a
          card for more.
        </Txt>
        {nearby.length ? (
          <Carousel>
            {nearby.map((result) => (
              <GymCard key={result.record.location.id} result={result} />
            ))}
          </Carousel>
        ) : (
          <Txt variant="subhead" color={color.labelSecondary}>
            {EMPTY.results}
          </Txt>
        )}
      </View>

      {saved.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Saved" action="See all" onAction={() => router.navigate('/saved')} />
          <Carousel>
            {saved.map((result) => (
              <GymCard key={result.record.location.id} result={result} width={176} />
            ))}
          </Carousel>
        </View>
      )}

      {recent.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Recently viewed" action="Clear" onAction={clearRecents} />
          <Carousel>
            {recent.map((result) => (
              <GymCard key={result.record.location.id} result={result} width={176} />
            ))}
          </Carousel>
        </View>
      )}

      {/* Suburbs ----------------------------------------------------------- */}
      <View style={styles.section}>
        <SectionHeader title="Browse by suburb" />
        <View style={styles.suburbs}>
          {SUBURBS.map((suburb) => {
            const place = PLACES.find((item) => item.name === suburb && item.city === 'melbourne');
            if (!place) return null;
            const on = filters.placeName === place.name;
            return (
              <Pressable
                key={suburb}
                onPress={() => goToPlace(place)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.suburb, on && styles.suburbOn, pressed && { opacity: 0.7 }]}
              >
                <Txt variant="subhead" color={on ? color.onBrand : color.label} style={face('medium')}>
                  {suburb}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* What GymGO knows ---------------------------------------------------- */}
      <View style={styles.section}>
        <SectionHeader title="What we know so far" />
        <View style={styles.stats}>
          <Stat value={real.length} label="real gyms mapped" />
          <Stat value={withPrice} label="publish a price" />
          <Stat value={withGuestHours} label="publish guest hours" />
          <Stat value={withKit} label="list their machines" />
        </View>
        <Txt variant="footnote" color={color.labelSecondary}>
          Counted from each gym’s own website. The rest is unknown, so it says “Call first” rather than guessing. You can add
          what machines a gym has from its page.
        </Txt>
      </View>

      <Group header="How GymGO answers">
        <Row emoji={TIER.confirmed.emoji} title={TIER.confirmed.label} subtitle="Everything you asked for is confirmed by a source we checked." />
        <Row emoji={TIER.needs_confirmation.emoji} title={TIER.needs_confirmation.label} subtitle="Could work. The card says exactly what to ask." />
        <Row emoji={TIER.ruled_out.emoji} title={TIER.ruled_out.label} subtitle="Something you need is known not to be there." />
        <Row emoji="🔗" title="Every fact is linked" subtitle="Tap one to see the page it came from, and when." />
      </Group>

      <Txt variant="caption" color={color.labelTertiary} style={styles.note}>
        {EMPTY.crowd}
      </Txt>
    </TabScreen>
  );
}

function visit(minute: number) {
  const next = nextVisitAt(minute);
  return { visitDate: next.date, visitMinuteOfDay: next.minute };
}

function Carousel({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.carousel}
      contentContainerStyle={styles.carouselContent}
      decelerationRate="fast"
    >
      {children}
    </ScrollView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Txt variant="title" color={color.brand}>
        {value}
      </Txt>
      <Txt variant="footnote" color={color.labelSecondary}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  avatarOn: { backgroundColor: color.brand },

  picks: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  flex: { flex: 1 },
  pick: {
    flexBasis: '45%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
  },
  pickEmoji: { fontSize: 26, lineHeight: 32 },

  section: { gap: space[3] },
  carousel: { marginHorizontal: -space[4] },
  carouselContent: { paddingHorizontal: space[4], paddingBottom: space[2], gap: space[3] },

  suburbs: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  suburb: { paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: radius.pill, backgroundColor: color.background, ...shadow.card },
  suburbOn: { backgroundColor: color.brand },

  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  stat: {
    flexBasis: '45%',
    flexGrow: 1,
    padding: space[3],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: color.background,
  },
  note: { textAlign: 'center' },
});
