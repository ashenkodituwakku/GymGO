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
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { GymCard } from '@/components/GymCard';
import { Pressy } from '@/components/motion';
import { Icon, type IconName } from '@/components/Icon';
import { SearchButton, SectionHeader, TabScreen } from '@/components/ios';
import { Txt } from '@/components/ui';
import { useActiveSession } from '@/lib/activeSession';
import { useApp } from '@/lib/app-state';
import { EMPTY, searchPrompt, timeLabel } from '@/lib/copy';
import { countryInSentence } from '@/lib/country';
import { haptic } from '@/lib/haptics';
import { PLACES, activeCities, cityNear, cityPlace, moneyLabel, tracksPrices, type AppPlace } from '@/lib/places';
import { atPlace, moveTo, nearLabel, nextVisitAt, runSearch, type Filters } from '@/lib/query';
import { resultsById } from '@/lib/results';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { usePageTitle } from '@/lib/pageTitle';

/** Melbourne suburbs worth a tap, in the order people ask about them. */
const MELBOURNE_PICKS = ['Melbourne CBD', 'Fitzroy', 'Collingwood', 'Brunswick', 'Carlton', 'Richmond', 'South Melbourne', 'Northcote'];

function greeting(minute: number): string {
  if (minute < 12 * 60) return 'Good morning';
  if (minute < 17 * 60) return 'Good afternoon';
  return 'Good evening';
}

/** How many of a region's cities show before "N more". */
const CITIES_SHOWN = 12;

/** The page's column width on wide screens (TabScreen's maxWidth). */
const COLUMN = 760;

/** How Home groups the built-in cities. */
const REGIONS: Array<{ label: string; has: (country: string) => boolean }> = [
  { label: 'USA', has: (country) => country === 'US' },
  { label: 'Australia', has: (country) => country === 'AU' },
  { label: 'Europe', has: (country) => country !== 'AU' && country !== 'US' },
];

export default function Home() {
  usePageTitle(null);
  const { data, account, filters, setFilters, recents, clearRecents, requestExplore, mayExplore, openPro, prefs } = useApp();
  const active = useActiveSession();
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  // Another country than yours, without Pro: no gyms listed, just the way to Pro.
  const locked = !mayExplore(filters.countryCode);
  const router = useRouter();

  const asOf = useMemo(() => new Date(), [filters, data.records]);
  const outcome = useMemo(() => runSearch(filters, { records: data.records }, asOf), [filters, data.records, asOf]);
  const byId = useMemo(() => resultsById(filters, data.records, asOf), [filters, data.records, asOf]);

  const nearby = locked ? [] : outcome.results.slice(0, 10);
  const saved = account.saved.map((id) => byId.get(id)).filter((result) => result !== undefined);
  const recent = recents.map((id) => byId.get(id)).filter((result) => result !== undefined);
  const clock = new Date();
  const name = account.account?.displayName.split(' ')[0];
  // The carried city the search is in; none out in the rest of the world.
  const city = cityNear(filters.centre);

  // Where to browse: this city's neighbourhoods, then the other cities.
  const browse = !city
    ? []
    : city.id === 'melbourne'
      ? MELBOURNE_PICKS.map((suburb) => PLACES.find((place) => place.name === suburb && place.city === 'melbourne')).filter((place) => place !== undefined)
      : PLACES.filter((place) => place.city === city.id && place.name !== city.name).slice(0, 10);
  // In demo mode there's only the demo, so no other cities.
  const otherCities = activeCities().filter((item) => item.id !== city?.id);

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
    // A budget only where GymGO keeps prices; elsewhere, a lunchtime visit.
    tracksPrices(filters.countryCode)
      ? {
          icon: 'money',
          title: `Under ${moneyLabel(2500, filters.countryCode)}`,
          onPress: () => pick((current) => ({ ...current, budgetMinor: 2500 })),
        }
      : { icon: 'clock', title: 'Lunchtime', onPress: () => pick((current) => ({ ...current, ...visit(12 * 60) })) },
  ];

  return (
    <TabScreen
      eyebrow={clock.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
      title={name ? `${greeting(clock.getHours() * 60)}, ${name}` : greeting(clock.getHours() * 60)}
      right={
        <Pressy
          scaleTo={0.9}
          onPress={() => router.navigate('/profile')}
          accessibilityRole="button"
          accessibilityLabel={account.account ? 'Your profile' : 'Sign in'}
          style={[styles.avatar, account.account && styles.avatarOn]}
        >
          {account.account ? (
            <Txt variant="headline" color={color.onBrand}>
              {account.account.displayName.slice(0, 1).toUpperCase()}
            </Txt>
          ) : (
            <Icon name="account" size={22} color={color.brand} />
          )}
        </Pressy>
      }
    >
      <SearchButton placeholder={searchPrompt(prefs.country)} onPress={() => explore({ focusSearch: true })} />

      {/* Shortcuts --------------------------------------------------------- */}
      <View style={styles.shortcuts}>
        {shortcuts.map((item) => (
          <Pressy
            key={item.title}
            scaleTo={0.93}
            onPress={item.onPress}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            style={styles.shortcut}
          >
            <View style={styles.shortcutIcon}>
              <Icon name={item.icon} size={20} color={color.brand} />
            </View>
            <Txt variant="footnote" style={[styles.center, face('medium')]} numberOfLines={1}>
              {item.title}
            </Txt>
          </Pressy>
        ))}
      </View>

      {/* Workout ----------------------------------------------------------- */}
      {active && (
        <Pressy
          scaleTo={0.97}
          onPress={() => {
            haptic.select();
            router.push('/train');
          }}
          accessibilityRole="button"
          accessibilityLabel={`Back to your workout: ${active.name}`}
          style={styles.resume}
        >
          <View style={styles.resumeIcon}>
            <Icon name="play" size={16} color={color.onBrand} />
          </View>
          <View style={styles.flex}>
            <Txt variant="headline">Back to your workout</Txt>
            <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1}>
              {active.name} · {active.items.reduce((sum, item) => sum + item.sets.filter((set) => set.done).length, 0)} sets done
            </Txt>
          </View>
          <Icon name="chevron" size={14} color={color.labelTertiary} />
        </Pressy>
      )}
      <Pressy
        scaleTo={0.97}
        onPress={() => {
          haptic.select();
          router.push({ pathname: '/workout/[id]', params: { id: 'any' } });
        }}
        accessibilityRole="button"
        accessibilityLabel="Build a workout: tap the muscles you want to train"
        style={styles.workout}
      >
        <View style={styles.workoutIcon}>
          <Icon name="workout" size={22} color={color.onBrand} />
        </View>
        <View style={styles.flex}>
          <Txt variant="headline" color={color.onBrand}>
            Build a workout
          </Txt>
          <Txt variant="footnote" color={color.onBrandSoft}>
            Pick muscles, get a plan
          </Txt>
        </View>
        <Icon name="chevron" size={14} color={color.onBrandSoft} />
      </Pressy>

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
          {filters.budgetMinor ? `, under ${moneyLabel(filters.budgetMinor, filters.countryCode)}` : ''}
          {filters.equipment.length ? `, with ${filters.equipment.length} must-have${filters.equipment.length > 1 ? 's' : ''}` : ''}. Hold a
          card for more.
        </Txt>
        {locked ? (
          <Pressable
            onPress={() => openPro('worldwide')}
            accessibilityRole="button"
            accessibilityLabel={`Gyms in ${countryInSentence(filters.countryCode)} are part of GymGO Pro. See GymGO Pro`}
            style={({ pressed }) => [styles.locked, pressed && { opacity: 0.8 }]}
          >
            <Icon name="globe" size={22} color={color.brand} />
            <View style={styles.lockedText}>
              <Txt variant="headline">Gyms in {countryInSentence(filters.countryCode)} are part of GymGO Pro</Txt>
              <Txt variant="footnote" color={color.labelSecondary}>
                Free covers {prefs.country ? countryInSentence(prefs.country) : 'your country'}. Pro finds gyms in every country.
              </Txt>
            </View>
            <Icon name="chevron" size={14} color={color.labelTertiary} />
          </Pressable>
        ) : nearby.length ? (
          <Carousel>
            {nearby.map((result, index) => (
              <GymCard key={result.record.location.id} result={result} index={index} />
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
            {saved.map((result, index) => (
              <GymCard key={result.record.location.id} result={result} width={176} index={index} />
            ))}
          </Carousel>
        </View>
      )}

      {recent.length > 0 && (
        <View style={styles.section}>
          <SectionHeader icon="clock-counter-clockwise" title="Recently viewed" action="Clear" onAction={clearRecents} />
          <Carousel>
            {recent.map((result, index) => (
              <GymCard key={result.record.location.id} result={result} width={176} index={index} />
            ))}
          </Carousel>
        </View>
      )}

      {/* Suburbs ----------------------------------------------------------- */}
      {city && browse.length > 0 && (
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
      )}

      {/* Other cities ------------------------------------------------------- */}
      {otherCities.length > 0 && (
        <View style={styles.section}>
          <SectionHeader icon="globe-hemisphere-west" title={city ? 'Other cities' : 'Cities GymGO knows well'} />
          <Txt variant="footnote" color={color.labelSecondary} style={styles.anywhere}>
            Or anywhere in the world: type a town on the map, or move the map and tap Search this area.
          </Txt>
          {REGIONS.map(({ label, has }) => {
            const all = otherCities.filter((item) => has(item.country));
            if (all.length === 0) return null;
            // A long list (the US has 40) shows its first dozen until asked for the rest.
            const open = showAll[label] === true || all.length <= CITIES_SHOWN + 2;
            const list = open ? all : all.slice(0, CITIES_SHOWN);
            return (
              <View key={label} style={styles.country}>
                <Txt variant="footnote" color={color.labelSecondary} style={styles.countryLabel}>
                  {label.toUpperCase()}
                </Txt>
                <View style={styles.suburbs}>
                  {list.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => goToPlace(cityPlace(item))}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.name}, ${label === 'Europe' ? item.region : label}${mayExplore(item.country) ? '' : ', with GymGO Pro'}`}
                      style={({ pressed }) => [styles.suburb, styles.cityChip, pressed && { opacity: 0.7 }]}
                    >
                      <Txt variant="subhead" style={face('medium')}>
                        {item.name}
                      </Txt>
                      {!mayExplore(item.country) && (
                        <Txt variant="caption" color={color.brand} style={styles.proTag}>
                          PRO
                        </Txt>
                      )}
                    </Pressable>
                  ))}
                  {!open && (
                    <Pressable
                      onPress={() => {
                        haptic.select();
                        setShowAll((current) => ({ ...current, [label]: true }));
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${all.length - CITIES_SHOWN} more cities in ${label}`}
                      style={({ pressed }) => [styles.suburb, styles.moreChip, pressed && { opacity: 0.7 }]}
                    >
                      <Txt variant="subhead" color={color.brand} style={face('semibold')}>
                        {all.length - CITIES_SHOWN} more
                      </Txt>
                    </Pressable>
                  )}
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
  // On a phone the row runs to the screen's edges, as in iOS. On a wide
  // screen the page is a centred column, and running 16 points past it
  // just looks cut off, so the row keeps to the column there.
  const { width } = useWindowDimensions();
  const bleed = width < COLUMN + space[4] * 2;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={bleed && styles.carousel}
      contentContainerStyle={[styles.carouselContent, !bleed && styles.carouselInColumn]}
      decelerationRate="fast"
    >
      {children}
    </ScrollView>
  );
}

const styles = themed(() => StyleSheet.create({
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  avatarOn: { backgroundColor: color.brandFill },

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

  resume: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[3],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: color.goodTint,
  },
  resumeIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: color.good, alignItems: 'center', justifyContent: 'center' },
  workout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    backgroundColor: color.brandFill,
  },
  workoutIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: color.onBrandFaint, alignItems: 'center', justifyContent: 'center' },
  shortcuts: { flexDirection: 'row', gap: space[2] },
  shortcut: {
    flex: 1,
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[3],
    paddingHorizontal: space[1],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: color.card,
  },
  shortcutIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.brandTint, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },

  section: { gap: space[3] },
  carousel: { marginHorizontal: -space[4] },
  carouselContent: { paddingHorizontal: space[4], paddingBottom: space[2], gap: space[3] },
  carouselInColumn: { paddingHorizontal: 0 },

  country: { gap: space[2] },
  countryLabel: { ...face('semibold'), letterSpacing: 0.6 },
  anywhere: { marginBottom: space[3] },
  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.brandTint,
  },
  proTag: { ...face('bold'), letterSpacing: 0.6 },
  lockedText: { flex: 1, gap: 2 },
  cityChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  moreChip: { backgroundColor: color.brandTint, shadowOpacity: 0 },
  suburbs: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  suburb: { paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: radius.pill, backgroundColor: color.card, ...shadow.card },
  suburbOn: { backgroundColor: color.brandFill },
  city: {
    width: 150,
    gap: 2,
    padding: space[3],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: color.card,
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
    backgroundColor: color.card,
  },
  note: { textAlign: 'center' },
}));
