/**
 * Home: a place to start, kept short. A greeting, the search, four
 * shortcuts (near me, 6 am, 6 pm, under $25), the workout builder, the gyms
 * near where you're looking, what you've saved and looked at, and places to
 * browse. How GymGO checks its facts lives in Profile → About.
 *
 * Every pick just sets the search and hands over to the Explore tab, so the
 * answers always come from the same rules as the map.
 */

import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { GymCard } from '@/components/GymCard';
import { Icon, type IconName } from '@/components/Icon';
import { SearchButton, SectionHeader, TabScreen } from '@/components/ios';
import { Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { EMPTY, timeLabel } from '@/lib/copy';
import { haptic } from '@/lib/haptics';
import { PLACES, activeCities, cityAt, cityPlace, moneyLabel, type AppPlace } from '@/lib/places';
import { atPlace, moveTo, nearLabel, nextVisitAt, runSearch, type Filters } from '@/lib/query';
import { resultsById } from '@/lib/results';
import { color, face, radius, shadow, space } from '@/lib/theme';

/** Melbourne suburbs worth a tap, in the order people ask about them. */
const MELBOURNE_PICKS = ['Melbourne CBD', 'Fitzroy', 'Collingwood', 'Brunswick', 'Carlton', 'Richmond', 'South Melbourne', 'Northcote'];

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
  const clock = new Date();
  const name = account.account?.displayName.split(' ')[0];
  const city = cityAt(filters.centre);

  // Where to browse: this city's neighbourhoods, then the other cities.
  const browse = city.id === 'melbourne'
    ? MELBOURNE_PICKS.map((suburb) => PLACES.find((place) => place.name === suburb && place.city === 'melbourne')).filter((place) => place !== undefined)
    : PLACES.filter((place) => place.city === city.id && place.name !== city.name).slice(0, 10);
  // In demo mode there's only the demo, so no other cities.
  const otherCities = activeCities().filter((item) => item.id !== city.id);

  const explore = (request: Parameters<typeof requestExplore>[0] = {}) => {
    requestExplore(request);
    router.navigate('/explore');
  };
  const pick = (change: (current: Filters) => Filters) => {
    haptic.select();
    setFilters(change);
    explore({ recentre: true });
  };
  const goToPlace = (place: AppPlace) => pick((current) => moveTo(current, atPlace(place)));
  const visit = (minute: number) => {
    const next = nextVisitAt(minute, filters.timezone);
    return { visitDate: next.date, visitMinuteOfDay: next.minute };
  };

  const shortcuts: Array<{ icon: IconName; title: string; onPress: () => void }> = [
    { icon: 'locate', title: 'Near me', onPress: () => explore({ locate: true }) },
    { icon: 'sunrise', title: 'Early start', onPress: () => pick((current) => ({ ...current, ...visit(6 * 60) })) },
    { icon: 'moon', title: 'After work', onPress: () => pick((current) => ({ ...current, ...visit(18 * 60) })) },
    {
      icon: 'money',
      title: `Under ${moneyLabel(2500, city.country)}`,
      onPress: () => pick((current) => ({ ...current, budgetMinor: 2500 })),
    },
  ];

  return (
    <TabScreen
      eyebrow={clock.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
      title={name ? `${greeting(clock.getHours() * 60)}, ${name}` : greeting(clock.getHours() * 60)}
      right={
        <Pressable
          onPress={() => router.navigate('/profile')}
          accessibilityRole="button"
          accessibilityLabel={account.account ? 'Your profile' : 'Sign in'}
          style={({ pressed }) => [styles.avatar, account.account && styles.avatarOn, pressed && { opacity: 0.7 }]}
        >
          {account.account ? (
            <Txt variant="headline" color={color.onBrand}>
              {account.account.displayName.slice(0, 1).toUpperCase()}
            </Txt>
          ) : (
            <Icon name="account" size={22} color={color.brand} />
          )}
        </Pressable>
      }
    >
      <SearchButton placeholder="Search a suburb, city or gym" onPress={() => explore({ focusSearch: true })} />

      {/* Shortcuts --------------------------------------------------------- */}
      <View style={styles.shortcuts}>
        {shortcuts.map((item) => (
          <Pressable
            key={item.title}
            onPress={item.onPress}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            style={({ pressed }) => [styles.shortcut, pressed && { transform: [{ scale: 0.96 }] }]}
          >
            <View style={styles.shortcutIcon}>
              <Icon name={item.icon} size={20} color={color.brand} />
            </View>
            <Txt variant="footnote" style={[styles.center, face('medium')]} numberOfLines={1}>
              {item.title}
            </Txt>
          </Pressable>
        ))}
      </View>

      {/* Workout ----------------------------------------------------------- */}
      <Pressable
        onPress={() => {
          haptic.select();
          router.push({ pathname: '/workout/[id]', params: { id: 'any' } });
        }}
        accessibilityRole="button"
        accessibilityLabel="Build a workout: tap the muscles you want to train"
        style={({ pressed }) => [styles.workout, pressed && { transform: [{ scale: 0.98 }] }]}
      >
        <View style={styles.workoutIcon}>
          <Icon name="workout" size={22} color={color.onBrand} />
        </View>
        <View style={styles.flex}>
          <Txt variant="headline" color={color.onBrand}>
            Build a workout
          </Txt>
          <Txt variant="footnote" color="rgba(255, 255, 255, 0.86)">
            Pick muscles, get a plan
          </Txt>
        </View>
        <Icon name="chevron" size={14} color="rgba(255, 255, 255, 0.8)" />
      </Pressable>

      {/* Nearby ------------------------------------------------------------ */}
      <View style={styles.section}>
        <SectionHeader
          icon="map-pin"
          title={nearLabel(filters.placeName)}
          action="Map"
          onAction={() => explore({ recentre: true })}
        />
        <Txt variant="footnote" color={color.labelSecondary}>
          For a visit at {timeLabel(filters.visitMinuteOfDay)}
          {filters.budgetMinor ? `, under ${moneyLabel(filters.budgetMinor, city.country)}` : ''}
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
          <SectionHeader icon="bookmarks" title="Saved" action="See all" onAction={() => router.navigate('/saved')} />
          <Carousel>
            {saved.map((result) => (
              <GymCard key={result.record.location.id} result={result} width={176} />
            ))}
          </Carousel>
        </View>
      )}

      {recent.length > 0 && (
        <View style={styles.section}>
          <SectionHeader icon="clock-counter-clockwise" title="Recently viewed" action="Clear" onAction={clearRecents} />
          <Carousel>
            {recent.map((result) => (
              <GymCard key={result.record.location.id} result={result} width={176} />
            ))}
          </Carousel>
        </View>
      )}

      {/* Suburbs ----------------------------------------------------------- */}
      <View style={styles.section}>
        <SectionHeader icon="compass" title={`Browse ${city.name}`} />
        <View style={styles.suburbs}>
          {browse.map((place) => {
            const on = filters.placeName === place.name;
            return (
              <Pressable
                key={place.name}
                onPress={() => goToPlace(place)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.suburb, on && styles.suburbOn, pressed && { opacity: 0.7 }]}
              >
                <Txt variant="subhead" color={on ? color.onBrand : color.label} style={face('medium')}>
                  {place.name}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Other cities ------------------------------------------------------- */}
      {otherCities.length > 0 && (
        <View style={styles.section}>
          <SectionHeader icon="globe-hemisphere-west" title="Other cities" />
          {(['AU', 'US'] as const).map((country) => {
            const list = otherCities.filter((item) => item.country === country);
            if (list.length === 0) return null;
            const label = country === 'AU' ? 'Australia' : 'USA';
            return (
              <View key={country} style={styles.country}>
                <Txt variant="footnote" color={color.labelSecondary} style={styles.countryLabel}>
                  {label.toUpperCase()}
                </Txt>
                <View style={styles.suburbs}>
                  {list.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => goToPlace(cityPlace(item))}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.name}, ${label}`}
                      style={({ pressed }) => [styles.suburb, pressed && { opacity: 0.7 }]}
                    >
                      <Txt variant="subhead" style={face('medium')}>
                        {item.name}
                      </Txt>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}

    </TabScreen>
  );
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

  workout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    backgroundColor: color.brand,
  },
  workoutIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.2)', alignItems: 'center', justifyContent: 'center' },
  shortcuts: { flexDirection: 'row', gap: space[2] },
  shortcut: {
    flex: 1,
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[3],
    paddingHorizontal: space[1],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: color.background,
  },
  shortcutIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.brandTint, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },

  section: { gap: space[3] },
  carousel: { marginHorizontal: -space[4] },
  carouselContent: { paddingHorizontal: space[4], paddingBottom: space[2], gap: space[3] },

  country: { gap: space[2] },
  countryLabel: { ...face('semibold'), letterSpacing: 0.6 },
  suburbs: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  suburb: { paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: radius.pill, backgroundColor: color.background, ...shadow.card },
  suburbOn: { backgroundColor: color.brand },
  city: {
    width: 150,
    gap: 2,
    padding: space[3],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: color.background,
    ...shadow.card,
  },
  cityFlag: { fontSize: 24, lineHeight: 30 },

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
