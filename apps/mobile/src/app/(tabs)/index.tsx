/**
 * Home: a place to start, kept short. A greeting, the search, four
 * shortcuts (near me, 6 am, 6 pm, under $25 or the local equivalent), the workout builder, the gyms
 * near where you're looking, what you've saved and looked at, and places to
 * browse. How GymGO checks its facts lives in Profile → About.
 *
 * Every pick just sets the search and hands over to the Explore tab, so the
 * answers always come from the same rules as the map.
 */

import { dayPlan, nextProgrammeDay, programmeDayName, programmeDays, programmeProgress, programmeTitle, type Programme } from '@/lib/programmes';
import { useProgramme } from '@/lib/programmeStore';
import type { TemplateItem } from '@/lib/templates';
import { useFocusEffect, useRouter } from 'expo-router';
import { HOURS_LABELS } from '@gymgo/domain';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { GymCard } from '@/components/GymCard';
import { useGlassRedraw } from '@/components/Redrawn';
import { GymCardsSkeleton } from '@/components/Skeleton';
import { Pressable, Pressy } from '@/components/motion';
import { Icon, type IconName } from '@/components/Icon';
import { Flag } from '@/components/Flag';
import { AdSlot } from '@/components/AdSlot';
import { BrandFill } from '@/components/BrandFill';
import { Avatar } from '@/components/Avatar';
import { SearchButton, SectionHeader, TabScreen } from '@/components/ios';
import { Txt } from '@/components/ui';
import { startSession, useActiveSessionGlance } from '@/lib/activeSession';
import { WeekStrip } from '@/components/TrainingInsights';
import { CollectionStrip, HereNudge } from '@/components/CollectCard';
import { WeatherCompact, WeatherHours } from '@/components/Weather';
import { BodyWeightWidget, LastWorkoutWidget, MonthWidget, RecoveryWidget, ToolsWidget } from '@/components/HomeWidgets';
import { homeLayout, useHomeWidgets } from '@/lib/homeLayout';
import { setHomeEditing } from '@/lib/homeEditing';
import { availableWidgets, shownWidgets, type HomeWidgetId } from '@/lib/homeWidgets';
import { EditBar, EditableWidgets, EmptyWidget, WidgetGallery } from '@/components/HomeEditor';
import { useTrainingLog } from '@/lib/useTraining';
import { useCollection } from '@/lib/useCollection';
import { collectionStats } from '@/lib/collection';
import { useApp } from '@/lib/app-state';
import { lookupLine, noGymsLine, searchPrompt, visitWhen } from '@/lib/copy';
import { countryInSentence, countryName } from '@/lib/country';
import { haptic } from '@/lib/haptics';
import { PLACES, activeCities, cityNear, cityPlace, localBudget, moneyLabel, tracksPrices, worldCitiesIn, type AppPlace, type City, type WorldCity } from '@/lib/places';
import { YOUR_LOCATION, atPlace, atWorldCity, moveTo, nearLabel, nextVisitAt, nowIn, runSearchShared, visitIsLater, type Filters } from '@/lib/query';
import { todayThere, tripDatesLabel, tripToShow, tripWhen, useTrips } from '@/lib/trips';
import { resultsById } from '@/lib/results';
import { PAGE_COLUMN, color, dropShadow, face, radius, shadow, space, themed } from '@/lib/theme';
import { usePageTitle } from '@/lib/pageTitle';
import { templateDayName, upNext } from '@/lib/templates';
import { unitFor } from '@/lib/training';
import { exerciseName } from '@/lib/workout';
import { LIMITED } from '@/lib/limited';

/** Melbourne suburbs worth a tap, in the order people ask about them. */
const MELBOURNE_PICKS = ['Melbourne CBD', 'Fitzroy', 'Collingwood', 'Brunswick', 'Carlton', 'Richmond', 'South Melbourne', 'Northcote'];

function greeting(minute: number): string {
  if (minute < 12 * 60) return 'Good morning';
  if (minute < 17 * 60) return 'Good afternoon';
  return 'Good evening';
}

/** How many of a region's cities show before "N more". */
const CITIES_SHOWN = 12;


/** How Home groups the built-in cities. */
/** Other cities by where they are: the US and Australia on their own, the rest by continent (their clock's). */
const REGIONS: Array<{ label: string; country?: string; has: (city: City) => boolean }> = [
  { label: 'USA', country: 'US', has: (city) => city.country === 'US' },
  { label: 'Australia', country: 'AU', has: (city) => city.country === 'AU' },
  { label: 'Europe', has: (city) => city.timezone.startsWith('Europe/') },
  { label: 'The Americas', has: (city) => city.timezone.startsWith('America/') && city.country !== 'US' },
  { label: 'Asia and the Middle East', has: (city) => city.timezone.startsWith('Asia/') },
  { label: 'Africa', has: (city) => city.timezone.startsWith('Africa/') },
  { label: 'New Zealand and the Pacific', has: (city) => city.timezone.startsWith('Pacific/') },
];

export default function Home() {
  useGlassRedraw();
  usePageTitle(null);
  const { data, account, billing, filters, setFilters, recents, clearRecents, requestExplore, mayExplore, openPro, prefs, prefsReady, lookup, searchHere, here } = useApp();
  const active = useActiveSessionGlance();
  const trips = useTrips(nowIn(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC').date);
  // Your training log, shared with Progress; the week strip shows once there's something in it.
  const log = useTrainingLog(account.token);
  const collection = useCollection();
  // On a plan (a template done before) and no workout going: its next day, one tap away.
  // On a training programme (lib/programmes.ts): its next day comes first.
  const programme = useProgramme();
  const programmeNow = programme && !active ? programmeProgress(programme, log.sessions, new Date()) : null;
  const onProgramme = programme && programmeNow && !programmeNow.finished ? { programme, progress: programmeNow, day: nextProgrammeDay(programme, log.sessions) } : null;
  const plan = active || onProgramme ? null : upNext(log.sessions);
  const planDay = plan ? plan.template.days[plan.day]! : null;
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  const homeWidgets = useHomeWidgets();
  // Customise Home: Home itself in edit mode, the widget gallery over it, and a widget being dragged.
  const [editing, setEditing] = useState(false);
  const [gallery, setGallery] = useState(false);
  const [dragging, setDragging] = useState(false);
  // GymPal's tab keeps out of the editing bar's way.
  useEffect(() => {
    setHomeEditing(editing);
    return () => setHomeEditing(false);
  }, [editing]);
  // Leaving Home ends editing, as on an iPhone.
  useFocusEffect(
    useCallback(
      () => () => {
        setEditing(false);
        setGallery(false);
        setDragging(false);
      },
      [],
    ),
  );
  // Another country than yours, without Pro: no gyms listed, just the way to Pro.
  const locked = !mayExplore(filters.countryCode);
  const router = useRouter();
  // The narrowest phones (an iPhone SE's 320 points) stack the finders' icons over their words.
  const narrow = useWindowDimensions().width < 360;

  const asOf = useMemo(() => new Date(), [filters, data.records]);
  // Each gym once: not the map's own copy of one GymGO carries too.
  const outcome = useMemo(() => runSearchShared(filters, { records: data.listed, ratings: data.ratings }, asOf), [filters, data.listed, data.ratings, asOf]);
  const byId = useMemo(
    () => resultsById(filters, data.records, asOf, data.ratings, [...account.saved, ...recents]),
    [filters, data.records, asOf, data.ratings, account.saved, recents],
  );

  const nearby = locked ? [] : outcome.results.slice(0, 10);
  const saved = account.saved.map((id) => byId.get(id)).filter((result) => result !== undefined);
  const recent = recents.map((id) => byId.get(id)).filter((result) => result !== undefined);
  const clock = new Date();
  const name = account.face?.displayName.split(' ')[0];
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
  // Your own country first: the cities GymGO carries there, then its other
  // biggest (their gyms are read from the map when you go), bar where you are.
  const home = prefs.country;
  const homeCities: Array<City | WorldCity> = home
    ? [...otherCities.filter((item) => item.country === home), ...worldCitiesIn(home).filter((item) => item.name !== filters.placeName)]
    : [];
  const groups = [
    ...(home && homeCities.length ? [{ label: countryName(home), country: home, cities: homeCities }] : []),
    ...REGIONS.map(({ label, country, has }) => ({ label, country, cities: otherCities.filter((item) => has(item) && item.country !== home) })),
  ].filter((group) => group.cities.length > 0);

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
  const goToCity = (item: City | WorldCity) =>
    'id' in item ? goToPlace(cityPlace(item)) : pick((current) => moveTo(current, atWorldCity(item)));
  const visit = (minute: number) => {
    const next = nextVisitAt(minute, filters.timezone);
    return { visitDate: next.date, visitMinuteOfDay: next.minute, visitPicked: true };
  };

  const shortcuts: Array<{ icon: IconName; title: string; onPress: () => void }> = [
    { icon: 'locate', title: 'Near me', onPress: () => explore({ locate: true }) },
    { icon: 'sunrise', title: 'Early start', onPress: () => pick((current) => ({ ...current, ...visit(6 * 60) })) },
    { icon: 'moon', title: 'After work', onPress: () => pick((current) => ({ ...current, ...visit(18 * 60) })) },
    // A budget only where GymGO keeps prices; elsewhere, a lunchtime visit.
    tracksPrices(filters.countryCode)
      ? {
          icon: 'money',
          title: `Under ${moneyLabel(localBudget(2500, filters.countryCode), filters.countryCode)}`,
          onPress: () => pick((current) => ({ ...current, budgetMinor: localBudget(2500, current.countryCode) })),
        }
      : { icon: 'clock', title: 'Lunchtime', onPress: () => pick((current) => ({ ...current, ...visit(12 * 60) })) },
  ];

  const showWeek = log.status === 'ready' && log.sessions.length > 0;
  const collected = collectionStats(collection.gyms).gyms > 0;
  const today = nowIn(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', clock).date;
  const trip = tripToShow(trips.trips, today);
  const finders: Array<{ icon: IconName; title: string; detail: string; label: string; onPress: () => void }> = [
    { icon: 'target', title: 'Machines', detail: 'Who has what', label: 'Find a machine', onPress: () => router.push('/machines') },
    { icon: 'globe', title: 'Trips', detail: trips.trips.length ? `${trips.trips.length} planned` : 'Train away', label: 'Trips', onPress: () => router.push('/trips') },
  ];

  // Your Home, as you've set it out (Customise Home, lib/homeLayout.ts): only what this version can show.
  const chosen = shownWidgets(homeWidgets, LIMITED);
  // Quick searches first, as Home came: kept with the search, as one group.
  const shortcutsFirst = chosen[0] === 'shortcuts';
  const order = shortcutsFirst ? chosen.slice(1) : chosen;
  const weightUnit = unitFor(prefs.country);

  const shortcutsView = (
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
              <Icon name={item.icon} size={22} color={color.brand} />
              {/* Two lines on the narrowest phones, where "Under A$25" didn't fit on one. */}
              <Txt variant="footnote" style={[styles.center, face('medium')]} numberOfLines={2}>
                {item.title}
              </Txt>
            </Pressy>
          ))}
        </View>
  );

  /** One widget, or nothing while it has nothing to show (a place before your settings are read, a week with no workouts). */
  const widget = (id: HomeWidgetId): ReactNode => {
    switch (id) {
      case 'shortcuts':
        return shortcutsView;
      case 'workout':
        return (
          <View style={styles.group}>
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
                  <BrandFill round={radius.xl} />
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
                {/* Up next and the other templates: one card, two actions. */}
                <View style={styles.planCard}>
                {onProgramme && (
                  <ProgrammeUpNext
                    programme={onProgramme.programme}
                    dayIndex={onProgramme.day}
                    week={onProgramme.progress.week}
                    easier={onProgramme.progress.easier}
                    onStart={(name, items) => {
                      haptic.success();
                      startSession({ name, workoutId: null, gymId: null, gymName: null, unit: unitFor(prefs.country), items });
                      router.push('/train');
                    }}
                    onOpen={() => router.push('/programme')}
                  />
                )}
                {plan && planDay && (
                  <Pressy
                    scaleTo={0.98}
                    onPress={() => {
                      haptic.success();
                      startSession({ name: templateDayName(plan.template, planDay), workoutId: null, gymId: null, gymName: null, unit: unitFor(prefs.country), items: planDay.items });
                      router.push('/train');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Start ${planDay.name}, up next in ${plan.template.name}`}
                    style={styles.upNext}
                  >
                    <View style={styles.flex}>
                      <Txt variant="caption" color={color.brand} style={face('semibold')} numberOfLines={1}>
                        Up next · {plan.template.name}
                      </Txt>
                      <Txt variant="headline" numberOfLines={1}>
                        {planDay.name}
                      </Txt>
                      <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1}>
                        {planDay.items.map((item) => exerciseName(item.exerciseId)).join(', ')}
                      </Txt>
                    </View>
                    <View style={styles.startPill}>
                      <Txt variant="footnote" color={color.onBrand} style={face('semibold')}>
                        Start
                      </Txt>
                    </View>
                  </Pressy>
                )}

                <Pressable
                  onPress={() => router.push('/templates')}
                  accessibilityRole="link"
                  accessibilityLabel={plan || onProgramme ? 'Templates and programmes' : 'Start from a template or a training programme'}
                  style={({ pressed }) => [styles.templatesRow, ((!!plan && planDay) || !!onProgramme) && styles.templatesUnder, pressed && { backgroundColor: color.fill }]}
                >
                  <Icon name="list" size={15} color={color.brand} />
                  <Txt variant="footnote" color={color.brand} style={[face('semibold'), styles.flex]}>
                    {plan || onProgramme ? 'Templates and programmes' : 'Start from a template, or a programme planned over weeks'}
                  </Txt>
                  <Icon name="chevron" size={12} color={color.labelTertiary} />
                </Pressable>
                </View>
          </View>
        );
      case 'finders':
        return (
          <View style={styles.group}>
                {trip && (
                  <Pressy
                    scaleTo={0.97}
                    onPress={() => {
                      haptic.select();
                      router.push({ pathname: '/trips/[id]', params: { id: trip.id } });
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Trip to ${trip.placeName}, ${tripDatesLabel(trip)}, ${tripWhen(trip, todayThere(trip))}. See the gyms there`}
                    style={styles.trip}
                  >
                    <View style={styles.tripIcon}>
                      <Icon name="globe" size={18} color={color.onBrand} />
                    </View>
                    <View style={styles.flex}>
                      <Txt variant="headline" numberOfLines={1}>{`Trip to ${trip.placeName}`}</Txt>
                      <Txt variant="footnote" color={color.labelSecondary} numberOfLines={2}>
                        {`${tripWhen(trip, todayThere(trip))} · ${tripDatesLabel(trip)} · gyms that let visitors in`}
                      </Txt>
                    </View>
                    <Icon name="chevron" size={14} color={color.labelTertiary} />
                  </Pressy>
                )}
                <View style={styles.finders}>
                  {finders.map((item) => (
                    <Pressy key={item.title} scaleTo={0.95} onPress={item.onPress} accessibilityRole="button" accessibilityLabel={item.label} style={[styles.finder, narrow && styles.finderNarrow]}>
                      <Icon name={item.icon} size={20} color={color.brand} />
                      <View style={narrow ? styles.finderTextNarrow : styles.flex}>
                        <Txt variant="subhead" style={[face('semibold'), narrow && styles.center]} numberOfLines={1}>
                          {item.title}
                        </Txt>
                        <Txt variant="caption" color={color.labelSecondary} style={narrow && styles.center} numberOfLines={narrow ? 2 : 1}>
                          {item.detail}
                        </Txt>
                      </View>
                    </Pressy>
                  ))}
                </View>
          </View>
        );
      case 'weather':
        return <WeatherCompact />;
      case 'weatherHours':
        return <WeatherHours />;
      case 'week':
        return showWeek ? <WeekStrip sessions={log.sessions} goal={prefs.weeklyGoal} freezes={billing.isPro} onPress={() => router.push('/progress')} /> : null;
      case 'collection':
        return <CollectionStrip onPress={() => router.push('/collection')} />;
      case 'lastWorkout':
        return <LastWorkoutWidget log={log} busy={!!active} />;
      case 'month':
        return <MonthWidget log={log} unit={weightUnit} />;
      case 'recovery':
        return <RecoveryWidget log={log} />;
      case 'bodyWeight':
        return <BodyWeightWidget unit={weightUnit} />;
      case 'tools':
        return <ToolsWidget />;
      // Everything about a place waits for your settings, so it opens on your country's city rather than flashing the default.
      case 'nearby':
        return prefsReady ? (
          <>
                  <View style={styles.section}>
                    <SectionHeader
                      title={nearLabel(filters.placeName)}
                      action="Map"
                      onAction={() => explore({ recentre: true })}
                    />
                    <Txt variant="footnote" color={color.labelSecondary}>
                      For a visit {visitWhen(filters.visitMinuteOfDay, visitIsLater(filters))}
                      {filters.budgetMinor ? `, under ${moneyLabel(filters.budgetMinor, filters.countryCode)}` : ''}
                      {filters.equipment.length ? `, with ${filters.equipment.length} must-have${filters.equipment.length > 1 ? 's' : ''}` : ''}
                      {filters.hours ? `, ${HOURS_LABELS[filters.hours].toLowerCase()}` : ''}.
                      {/* The hold menu (save, share, compare) is the iPhone's own. */}
                      {Platform.OS === 'ios' ? ' Hold a card for more.' : ''}
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
                        {nearby.map((result) => (
                          <GymCard key={result.record.location.id} result={result} />
                        ))}
                      </Carousel>
                    ) : lookup?.state === 'ready' ? (
                      // Nothing built in here, and nothing is read from the map until asked.
                      <View style={styles.lookFailed}>
                        <Txt variant="subhead" color={color.labelSecondary}>
                          {lookupLine('ready', lookup.placeName)}
                        </Txt>
                        <Pressable
                          onPress={() => {
                            haptic.tap();
                            searchHere();
                          }}
                          accessibilityRole="button"
                          // 36 points tall, like the chips beside it; the slop makes it 44 to a finger.
                          hitSlop={4}
                          style={({ pressed }) => [styles.suburb, styles.retry, styles.searchHere, pressed && { opacity: 0.7 }]}
                        >
                          <Icon name="search" size={15} color={color.brand} />
                          <Txt variant="subhead" color={color.brand} style={face('semibold')}>
                            Search this area
                          </Txt>
                        </Pressable>
                      </View>
                    ) : lookup?.state === 'searching' ? (
                      <View style={styles.looking} aria-live="polite">
                        <Txt variant="subhead" color={color.labelSecondary}>
                          {lookupLine('searching', lookup.placeName)}
                        </Txt>
                        <GymCardsSkeleton count={2} label={lookupLine('searching', lookup.placeName)} />
                      </View>
                    ) : lookup?.state === 'failed' ? (
                      <View style={styles.lookFailed}>
                        <Txt variant="subhead" color={color.labelSecondary}>
                          {lookupLine('failed', lookup.placeName)} {lookup.problem}
                        </Txt>
                        <Pressable
                          onPress={() => {
                            haptic.tap();
                            searchHere();
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Try looking around ${lookup.placeName === YOUR_LOCATION ? 'you' : lookup.placeName} again`}
                          hitSlop={4}
                          style={({ pressed }) => [styles.suburb, styles.retry, pressed && { opacity: 0.7 }]}
                        >
                          <Txt variant="subhead" color={color.brand} style={face('semibold')}>
                            Try again
                          </Txt>
                        </Pressable>
                      </View>
                    ) : (
                      // Nothing in range at all: the list counts every gym, fits or not, so it isn't the filters.
                      <Txt variant="subhead" color={color.labelSecondary}>
                        {lookup?.state === 'done' && lookup.gyms === 0
                          ? lookupLine('none', lookup.placeName)
                          : noGymsLine(filters.placeName, filters.radiusKm, filters.countryCode)}
                      </Txt>
                    )}
                  </View>
            <AdSlot place="home" />
          </>
        ) : null;
      case 'saved':
        return prefsReady ? (
          <>
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
          </>
        ) : null;
      case 'recent':
        return prefsReady ? (
          <>
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
          </>
        ) : null;
      case 'browse':
        return prefsReady ? (
          <>
                  {city && browse.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader title={`Browse ${city.name}`} />
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
          </>
        ) : null;
      case 'cities':
        return prefsReady ? (
          <>
                  {groups.length > 0 && (
                    <View style={styles.section}>
                      <SectionHeader title={city ? 'Other cities' : 'Cities'} />
                      <Txt variant="footnote" color={color.labelSecondary} style={styles.anywhere}>
                        {LIMITED ? 'Every city built into this version of GymGO.' : 'Or anywhere in the world: type a town on the map, or move the map and tap Search this area.'}
                      </Txt>
                      {groups.map(({ label, country, cities }) => {
                        // A long list (the US has 40) shows its first dozen until asked for the rest.
                        const open = showAll[label] === true || cities.length <= CITIES_SHOWN + 2;
                        const list = open ? cities : cities.slice(0, CITIES_SHOWN);
                        // Said once over the group when it's all Pro, rather than "PRO" on every city.
                        const groupPro = cities.every((item) => !mayExplore(item.country));
                        return (
                          <View key={label} style={styles.country}>
                            {/* A country's group under its flag; a continent's under its name alone. */}
                            <View style={styles.countryHead}>
                              {country && <Flag code={country} size={18} />}
                              <Txt variant="footnote" color={color.labelSecondary} style={styles.countryLabel}>
                                {label.toUpperCase()}
                              </Txt>
                              {groupPro && (
                                <Txt variant="footnote" color={color.labelSecondary}>
                                  · with GymGO Pro
                                </Txt>
                              )}
                            </View>
                            <View style={styles.suburbs}>
                              {list.map((item) => {
                                const where = 'id' in item ? (label === 'Europe' ? item.region : countryName(item.country)) : countryName(item.country);
                                return (
                                  <Pressable
                                    key={'id' in item ? item.id : `${item.country}:${item.name}`}
                                    onPress={() => goToCity(item)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${item.name}, ${where}${mayExplore(item.country) ? '' : ', with GymGO Pro'}`}
                                    style={({ pressed }) => [styles.suburb, styles.cityChip, pressed && { opacity: 0.7 }]}
                                  >
                                    <Flag code={item.country} size={18} />
                                    <Txt variant="subhead" style={face('medium')}>
                                      {item.name}
                                    </Txt>
                                    {!groupPro && !mayExplore(item.country) && (
                                      <Txt variant="caption" color={color.brand} style={styles.proTag}>
                                        PRO
                                      </Txt>
                                    )}
                                  </Pressable>
                                );
                              })}
                              {!open && (
                                <Pressable
                                  onPress={() => {
                                    haptic.select();
                                    setShowAll((current) => ({ ...current, [label]: true }));
                                  }}
                                  accessibilityRole="button"
                                  accessibilityLabel={`${cities.length - CITIES_SHOWN} more cities in ${label}`}
                                  style={({ pressed }) => [styles.suburb, styles.moreChip, pressed && { opacity: 0.7 }]}
                                >
                                  <Txt variant="subhead" color={color.brand} style={face('semibold')}>
                                    {cities.length - CITIES_SHOWN} more
                                  </Txt>
                                </Pressable>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
          </>
        ) : null;
    }
  };

  // This week and the collection side by side when they're next to each other and both have something; otherwise one each.
  const blocks: ReactNode[] = [];
  for (let at = 0; at < order.length; at += 1) {
    const id = order[at]!;
    const next = order[at + 1];
    if (showWeek && collected && ((id === 'week' && next === 'collection') || (id === 'collection' && next === 'week'))) {
      blocks.push(
        <View key="week-collection" style={styles.finders}>
          <WeekStrip tile sessions={log.sessions} goal={prefs.weeklyGoal} freezes={billing.isPro} onPress={() => router.push('/progress')} />
          <CollectionStrip tile onPress={() => router.push('/collection')} />
        </View>,
      );
      at += 1;
      continue;
    }
    const view = widget(id);
    if (view) blocks.push(<Fragment key={id}>{view}</Fragment>);
  }

  /** Whether a widget has anything to show now: one that doesn't still has a place while editing, to move or take off. */
  const hasContent = (id: HomeWidgetId): boolean => {
    if (!prefsReady && ['nearby', 'saved', 'recent', 'browse', 'cities'].includes(id)) return false;
    if (id === 'week') return showWeek;
    if (id === 'collection') return collected;
    if (id === 'saved') return saved.length > 0;
    if (id === 'recent') return recent.length > 0;
    if (id === 'browse') return Boolean(city) && browse.length > 0;
    if (id === 'cities') return groups.length > 0;
    return true;
  };
  const shownWhileEditing = (id: HomeWidgetId): ReactNode => (hasContent(id) ? widget(id) : <EmptyWidget id={id} />);
  // The widgets not on Home, for More widgets and the gallery.
  const spare = availableWidgets(LIMITED).filter((each) => !chosen.includes(each.id));

  return (
    <TabScreen
      glow
      gap={space[6]}
      // Editing: + and Done over the top, and the page held still under a widget being dragged.
      overlay={editing ? <EditBar onAdd={() => setGallery(true)} onDone={() => setEditing(false)} /> : null}
      // Room under the last widget for the editing bar, so it never sits over one.
      bottomExtra={editing ? 72 : 0}
      scrollEnabled={!dragging}
      eyebrow={clock.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
      title={name ? `${greeting(clock.getHours() * 60)}, ${name}` : greeting(clock.getHours() * 60)}
      right={
        <Pressy
          scaleTo={0.9}
          onPress={() => router.navigate('/profile')}
          accessibilityRole="button"
          accessibilityLabel={account.face || LIMITED ? 'Your profile' : 'Sign in'}
          style={[styles.avatar, account.face && styles.avatarOn]}
        >
          {account.face ? (
            <Avatar account={account.face} size={40} variant="headline" />
          ) : (
            <Icon name="account" size={22} color={color.brand} />
          )}
        </Pressy>
      }
    >
      {/* The search, a workout under way and the gym you're at: always first, whatever else Home has (resting while you edit). */}
      <View style={[styles.group, editing && styles.resting]}>
      <SearchButton placeholder={prefsReady ? searchPrompt(prefs.country) : 'Search'} onPress={() => explore({ focusSearch: true })} />
      {shortcutsFirst && !editing && shortcutsView}
      </View>

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
              {active.name} · {active.setsDone} sets done
            </Txt>
          </View>
          <Icon name="chevron" size={14} color={color.labelTertiary} />
        </Pressy>
      )}
      <HereNudge here={here} records={data.listed} onOpen={(id) => router.push({ pathname: '/gym/[id]', params: { id } })} />

      {/* Your widgets, in your order; editing, as an iPhone's Home Screen is (components/HomeEditor.tsx). */}
      {editing ? (
        <View style={chosen[0] === 'shortcuts' ? styles.editStartsWithShortcuts : undefined}>
        <EditableWidgets
          ids={chosen}
          spare={spare}
          render={shownWhileEditing}
          onRemove={(id) => homeLayout.remove(id)}
          onMove={(id, to) => homeLayout.moveTo(id, to)}
          onAdd={(id) => homeLayout.add(id, 'end')}
          onDragging={setDragging}
        />
        </View>
      ) : (
        blocks
      )}

      {/* At the foot, once you've scrolled down: change what Home shows. (Editing, the bar has Done.) */}
      {!editing && (
        <View style={styles.customise}>
          {chosen.length === 0 && (
            <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
              Your Home has nothing on it yet. Add what you’d like to see.
            </Txt>
          )}
          <Pressable
            onPress={() => {
              haptic.select();
              setEditing(true);
            }}
            accessibilityRole="button"
            accessibilityHint="Move, take off and add the widgets on Home"
            style={({ pressed }) => [styles.customiseButton, pressed && { opacity: 0.7 }]}
          >
            <Icon name="customise" size={16} color={color.brand} />
            <Txt variant="subhead" color={color.brand} style={face('semibold')}>
              Customise Home
            </Txt>
          </Pressable>
        </View>
      )}

      <WidgetGallery
        visible={gallery}
        widgets={spare}
        render={shownWhileEditing}
        onAdd={(id) => {
          homeLayout.add(id);
          setGallery(false);
        }}
        onReset={() => {
          homeLayout.reset();
          setGallery(false);
        }}
        onClose={() => setGallery(false)}
      />
    </TabScreen>
  );
}

/** Home's Up next on a training programme: its next day, in one tap, and the way to the programme. */
function ProgrammeUpNext({
  programme,
  dayIndex,
  week,
  easier,
  onStart,
  onOpen,
}: {
  programme: Programme;
  dayIndex: number;
  week: number;
  easier: boolean;
  onStart: (name: string, items: TemplateItem[]) => void;
  onOpen: () => void;
}) {
  const day = programmeDays(programme.goal, programme.days)[dayIndex]!;
  const items = dayPlan(programme, dayIndex, easier);
  const caption = `Week ${week} of ${programme.weeks}${easier ? ', easier' : ''} · ${programmeTitle(programme.goal)}`;
  return (
    <View>
      <Pressy
        scaleTo={0.98}
        onPress={() => onStart(programmeDayName(programme, day), items)}
        accessibilityRole="button"
        accessibilityLabel={`Start ${day.name}, up next in your ${programmeTitle(programme.goal)}, ${caption}`}
        style={styles.upNext}
      >
        <View style={styles.flex}>
          <Txt variant="caption" color={color.brand} style={face('semibold')} numberOfLines={1}>
            {caption}
          </Txt>
          <Txt variant="headline" numberOfLines={1}>
            {day.name}
          </Txt>
          <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1}>
            {items.map((item) => exerciseName(item.exerciseId)).join(', ')}
          </Txt>
        </View>
        <View style={styles.startPill}>
          <Txt variant="footnote" color={color.onBrand} style={face('semibold')}>
            Start
          </Txt>
        </View>
      </Pressy>
      <Pressable
        onPress={onOpen}
        accessibilityRole="link"
        accessibilityLabel={`Your ${programmeTitle(programme.goal)}: its weeks and what to lift`}
        style={({ pressed }) => [styles.templatesRow, styles.templatesUnder, pressed && { backgroundColor: color.fill }]}
      >
        <Icon name="workout" size={15} color={color.brand} />
        <Txt variant="footnote" color={color.brand} style={[face('semibold'), styles.flex]}>
          Your programme
        </Txt>
        <Icon name="chevron" size={12} color={color.labelTertiary} />
      </Pressable>
    </View>
  );
}

function Carousel({ children }: { children: React.ReactNode }) {
  // On a phone the row runs to the screen's edges, as in iOS. On a wide
  // screen the page is a centred column, and running 16 points past it
  // just looks cut off, so the row keeps to the column there.
  const { width } = useWindowDimensions();
  const bleed = width < PAGE_COLUMN + space[4] * 2;
  const scroller = useRef<ScrollViewInstance>(null);
  const [view, setView] = useState({ x: 0, width: 0, content: 0 });
  // A mouse can't swipe: in a browser's wide layout, buttons page the row
  // along, and each shows only while there's more that way.
  const paged = Platform.OS === 'web' && !bleed;
  const track = (change: Partial<typeof view>) => setView((current) => ({ ...current, ...change }));
  const page = (direction: -1 | 1) => {
    const x = Math.max(0, Math.min(view.content - view.width, view.x + direction * view.width * 0.8));
    scroller.current?.scrollTo({ x, animated: true });
  };
  return (
    <View>
      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={bleed && styles.carousel}
        contentContainerStyle={[styles.carouselContent, !bleed && styles.carouselInColumn]}
        decelerationRate="fast"
        scrollEventThrottle={32}
        onScroll={paged ? (event) => track({ x: event.nativeEvent.contentOffset.x }) : undefined}
        onLayout={paged ? (event) => track({ width: event.nativeEvent.layout.width }) : undefined}
        onContentSizeChange={paged ? (content) => track({ content }) : undefined}
      >
        {children}
      </ScrollView>
      {paged && view.x > 4 && <PageButton side="back" onPress={() => page(-1)} />}
      {paged && view.x + view.width < view.content - 4 && <PageButton side="forward" onPress={() => page(1)} />}
    </View>
  );
}

function PageButton({ side, onPress }: { side: 'back' | 'forward'; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={side === 'back' ? 'Show earlier gyms' : 'Show more gyms'}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.pageButton,
        side === 'back' ? styles.pageBack : styles.pageForward,
        (pressed || hovered) && styles.pageButtonOn,
      ]}
    >
      <Icon name={side === 'back' ? 'chevronBack' : 'chevron'} size={16} color={color.label} />
    </Pressable>
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
  trip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[3],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: color.brandTint,
  },
  tripIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: color.brandFill, alignItems: 'center', justifyContent: 'center' },
  finders: { flexDirection: 'row', gap: space[3] },
  planCard: { borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, overflow: 'hidden', ...shadow.card },
  upNext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[3],
  },
  templatesRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: space[3] - 2, paddingHorizontal: space[3] },
  templatesUnder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
  startPill: { paddingHorizontal: space[3], paddingVertical: 7, borderRadius: radius.pill, backgroundColor: color.brandFill },
  finderNarrow: { flexDirection: 'column', gap: space[2] },
  finderTextNarrow: { alignSelf: 'stretch' },
  finder: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    padding: space[3],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: color.plate,
    ...shadow.plate,
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
    ...shadow.plate,
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
    backgroundColor: color.plate,
    ...shadow.plate,
  },
  center: { textAlign: 'center' },

  section: { gap: space[3] },
  /** Things that belong together, closer to each other than to the next group. */
  group: { gap: space[3] },
  carousel: { marginHorizontal: -space[4] },
  carouselContent: { paddingHorizontal: space[4], paddingBottom: space[2], gap: space[3] },
  carouselInColumn: { paddingHorizontal: 0 },
  // Holds the nearby row's room while settings load, so nothing jumps.
  waiting: { height: 290 },
  customise: { alignItems: 'center', gap: space[2], paddingTop: space[2] },
  resting: { opacity: 0.45, pointerEvents: 'none' },
  // Quick searches sit as close under the search while editing as they do on Home.
  editStartsWithShortcuts: { marginTop: space[3] - space[6] },
  customiseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[4],
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: color.brandTint,
  },
  pageButton: {
    position: 'absolute',
    top: '42%',
    width: 36,
    height: 36,
    marginTop: -18,
    borderRadius: 18,
    backgroundColor: color.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...dropShadow(0.18, 10, 3, 4),
  },
  pageButtonOn: { backgroundColor: color.fill },
  pageBack: { left: -18 },
  pageForward: { right: -18 },

  country: { gap: space[2] },
  countryLabel: { ...face('semibold'), letterSpacing: 0.6 },
  countryHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
  looking: { gap: space[3] },
  lookFailed: { gap: space[3], alignItems: 'flex-start' },
  retry: { backgroundColor: color.brandTint, ...dropShadow(0, 0, 0, 0) },
  searchHere: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  cityChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  moreChip: { backgroundColor: color.brandTint, ...dropShadow(0, 0, 0, 0) },
  suburbs: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  suburb: { paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: radius.pill, backgroundColor: color.plate, ...shadow.card },
  suburbOn: { backgroundColor: color.brandFill },
  city: {
    width: 150,
    gap: 2,
    padding: space[3],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: color.plate,
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
    backgroundColor: color.plate,
    ...shadow.plate,
  },
  note: { textAlign: 'center' },
}));
