/**
 * The Explore tab: a map, and sheets over it — the way Apple Maps works.
 *
 * On a phone the results sheet is always there (peeking, half, or full),
 * floating just above the tab bar; a gym's place card and the filters stack
 * on top of it. Your account is in the Profile tab.
 *
 * In a wide browser window (the PC), the same content sits in floating glass
 * panels down the left, the way Maps on a Mac lays out its sidebar and place
 * card, and the map fills the rest.
 */

import BottomSheet, {
  BottomSheetModal,
  BottomSheetModalProvider,
  type BottomSheetBackdropProps,
  BottomSheetBackdrop,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActionSheetIOS, ActivityIndicator, Keyboard, Platform, ScrollView, StyleSheet, View, useWindowDimensions, type TextInput } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { isWithinBox, type BoundingBox, type HoursNeed } from '@gymgo/domain';
import { withoutKnown } from '@gymgo/osm';
import { MELBOURNE_ATTRIBUTION } from '@gymgo/melbourne-data';
import { ApiError, api, problemText } from '@/lib/api';
import { EMPTY, locatedNotice, placeWords } from '@/lib/copy';
import { openingPlace } from '@/lib/country';
import { haptic } from '@/lib/haptics';
import { cityAt, cityNear, geocodePlace, localBudget, worldCityNamed, type AppPlace, type WorldCity } from '@/lib/places';
import { useApp } from '@/lib/app-state';
import { enterOpensGym, placeForEnter, suggestGyms } from '@/lib/gymSearch';
import { useBottomClearance, useOverhang } from '@/lib/layout';
import { resultFor } from '@/lib/results';
import { SORTS, THIS_AREA, YOUR_LOCATION, applyRelaxation, atPlace, atWorldCity, boxDrift, inArea, moveTo, nameForArea, runSearch } from '@/lib/query';
import { checkTimeZoneSupport } from '@/lib/selfcheck';
import { CHILD_TOUCH, NO_TOUCH, color, face, radius, shadow, space, themed } from '@/lib/theme';
import { FiltersContent } from '@/components/FiltersContent';
import { Glass } from '@/components/Glass';
import { GoogleModal } from '@/components/GoogleModal';
import { GymMap, type GymMapHandle, type MapPin } from '@/components/GymMap';
import { Icon } from '@/components/Icon';
import { MemberAccess } from '@/components/MemberAccess';
import { MemberKit } from '@/components/MemberKit';
import { MemberPrices } from '@/components/MemberPrices';
import { MemberStatus, StatusWarning } from '@/components/MemberStatus';
import { PhotoHero } from '@/components/PhotoHero';
import { PlaceCard, PlaceHeader } from '@/components/PlaceCard';
import { GymNotes } from '@/components/GymNotes';
import { CollectCard } from '@/components/CollectCard';
import { ResultsContent } from '@/components/ResultsContent';
import { ReviewsSection } from '@/components/ReviewsSection';
import { FloatingGlassBackground, FloatingSolidBackground, SHEET_GAP, SHEET_SCROLL_ONLY, SHEET_SIDE, SheetClip, SheetOpener, SheetScrollView } from '@/components/SheetBackground';
import { CloseButton, ControlCapsule, Txt } from '@/components/ui';
import { ARRIVE, DROP_IN, FADE_OUT, LEAVE, Pressable, usePressScale } from '@/components/motion';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { usePageTitle } from '@/lib/pageTitle';

const PEEK = 150;
/** Below this width the phone layout is used, even in a browser. */
const WIDE = 900;
const PANEL_WIDTH = 390;
const PANEL_GAP = 16;

// Made once: a component identity that changes would remount the sheet.

type Panel = 'place' | 'filters' | null;

export default function ExploreTab() {
  // Its own safe area provider, so the sheets measure from this screen.
  return (
    <SafeAreaProvider>
      <MapScreen />
    </SafeAreaProvider>
  );
}

function MapScreen() {
  const insets = useSafeAreaInsets();
  const clearance = useBottomClearance();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const wide = Platform.OS === 'web' && width >= WIDE;

  // The time-zone self-check runs once; its answer can't change mid-session.
  const selfCheck = useMemo(() => checkTimeZoneSupport(), []);

  const { data, account, filters, setFilters, addRecent, exploreRequest, here, locate: findMe, prefs, prefsReady, mayExplore, openPro, lookup, searchHere, billing, pack } = useApp();
  usePageTitle('Explore');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetTop, setSheetTop] = useState(PEEK);
  const [cardScrolled, setCardScrolled] = useState(false);
  // The gym whose Google Maps page is open, full screen over everything.
  const [googleFor, setGoogleFor] = useState<string | null>(null);
  // Desktop: which panel sits beside the results.
  const [panel, setPanel] = useState<Panel>(null);
  // Phone: whether the Filters sheet is up.
  const filtersShown = useRef(false);
  // Phone: where the results sheet was before a place card pushed it down,
  // so closing the card puts it back — as Maps does.
  const sheetIndex = useRef(1);
  const restoreIndex = useRef<number | null>(null);

  // The area on screen, and whether "Search this area" is reading the map.
  const [viewBox, setViewBox] = useState<BoundingBox | null>(null);
  const [areaBusy, setAreaBusy] = useState(false);
  const areaPress = usePressScale(0.94);

  const map = useRef<GymMapHandle>(null);
  const mainSheet = useRef<BottomSheet>(null);
  const placeSheet = useRef<BottomSheetModal>(null);
  const filterSheet = useRef<BottomSheetModal>(null);
  const searchInput = useRef<TextInput>(null);

  // "As of" is fixed per render pass so the list and the card agree on
  // freshness; it moves on whenever the filters or data do.
  const asOf = useMemo(() => new Date(), [filters, data.records]);
  // Another country than yours, without Pro: no pins or list, just the way to Pro (or home).
  const locked = mayExplore(filters.countryCode) ? null : { country: filters.countryCode, home: prefs.country ?? filters.countryCode };
  // Each gym once: not the map's own copy of one GymGO carries too.
  const loaded = useMemo(() => data.listed.filter((record) => mayExplore(record.location.address.countryCode)), [data.listed, mayExplore]);
  // Typing a gym's name also finds it among your country's gyms kept on this device.
  const { packNamed } = data;
  const packMatches = useMemo(
    () => (query.trim().length >= 2 && pack.index ? packNamed(query, filters.centre, 6) : []),
    [query, pack.index, packNamed, filters.centre],
  );
  const searchable = useMemo(() => {
    if (packMatches.length === 0) return loaded;
    return [...loaded, ...withoutKnown(packMatches, loaded)];
  }, [loaded, packMatches]);
  const outcome = useMemo(() => {
    const found = runSearch(filters, { records: data.listed, ratings: data.ratings }, asOf);
    return locked ? { ...found, results: [] } : found;
  }, [filters, data.listed, data.ratings, asOf, locked === null]);
  const pins: MapPin[] = useMemo(
    () =>
      outcome.results.map((result) => ({
        id: result.record.location.id,
        name: result.record.location.name,
        position: result.record.location.position,
        tier: result.tier,
      })),
    [outcome],
  );
  // The gym whose card is open. If the search moves on without it (back to
  // your location, another place, a filter that rules it out), its card
  // stays, weighed the same way, rather than emptying out from under you.
  const selected = useMemo(
    () =>
      outcome.results.find((result) => result.record.location.id === selectedId) ??
      resultFor(filters, data.records, selectedId ?? undefined, asOf, data.ratings) ??
      null,
    [outcome, selectedId, filters, data.records, asOf, data.ratings],
  );
  const showingDemo = outcome.results.some((result) => result.record.location.isDemoData);
  const city = cityAt(filters.centre);
  // Somewhere GymGO doesn't carry a city for: the gyms there came from the map.
  const outsideCities = cityNear(filters.centre) === null;

  // --- Moving around --------------------------------------------------------

  const pickPlace = useCallback(
    (place: AppPlace) => {
      Keyboard.dismiss();
      setQuery('');
      setFilters((current) => moveTo(current, atPlace(place)));
      setNotice(null);
      map.current?.flyTo(place.position, 0.045);
      mainSheet.current?.snapToIndex(1);
    },
    [],
  );

  /** One of a country's biggest cities GymGO has no gyms built in for: its gyms are read from the map there. */
  const pickWorldCity = useCallback(
    (city: WorldCity) => {
      Keyboard.dismiss();
      setQuery('');
      setFilters((current) => moveTo(current, atWorldCity(city)));
      setNotice(null);
      map.current?.flyTo(city.centre, 0.1);
      mainSheet.current?.snapToIndex(1);
    },
    [],
  );

  // openGym is defined below; the search reaches it through this ref.
  const openGymRef = useRef<(id: string) => void>(() => undefined);
  const mayExploreRef = useRef(mayExplore);
  mayExploreRef.current = mayExplore;
  const homeRef = useRef(prefs.country);
  homeRef.current = prefs.country;

  /**
   * Anywhere in the world: ask the server's place finder and go there. The
   * map's gyms there wait for Search this area, like anywhere else.
   */
  const findPlace = useCallback(async (text: string, orGym?: string) => {
    try {
      // Your own country's match first: "10001" is Manhattan to an American, not Cáceres.
      const places = (await api.places(text)).places;
      const home = homeRef.current;
      const ranked = [...places.filter((place) => place.countryCode === home), ...places.filter((place) => place.countryCode !== home)];
      const found = placeForEnter(text, ranked, orGym !== undefined);
      if (!found && orGym) return openGymRef.current(orGym);
      if (!found) {
        haptic.warn();
        setNotice(`Couldn’t find a place called “${text}”. Try ${placeWords(home)}.`);
        return;
      }
      setQuery('');
      // Another country, without Pro: the list says what Pro adds.
      if (!mayExploreRef.current(found.countryCode)) haptic.warn();
      setFilters((current) => moveTo(current, { centre: { lat: found.lat, lng: found.lng }, placeName: found.name, timezone: found.timezone, countryCode: found.countryCode }));
      setNotice(null);
      // A town gets about 11 km of map, a suburb about 5.
      map.current?.flyTo({ lat: found.lat, lng: found.lng }, found.kind === 'city' ? 0.1 : 0.045);
      mainSheet.current?.snapToIndex(1);
    } catch (error) {
      if (orGym) return openGymRef.current(orGym);
      haptic.warn();
      setNotice(problemText(error, EMPTY.outOfArea));
    }
  }, []);

  const submitSearch = useCallback(() => {
    const result = geocodePlace(query, cityAt(filters.centre).id);
    Keyboard.dismiss();
    if (result.place) return pickPlace(result.place);
    // One of a country's biggest cities, by its exact name: no need to look it up.
    const world = worldCityNamed(query.trim(), prefs.country);
    if (world) return pickWorldCity(world);
    // Not a place: maybe a gym's name. Open the best match if it's nearby
    // and the words aren't its town; otherwise look them up as a place
    // anywhere in the world first, falling back to the gym.
    const gym = suggestGyms(query, searchable, filters.centre, 1)[0];
    if (gym && enterOpensGym(query, gym, filters.centre, searchable)) return openGymRef.current(gym.location.id);
    if (result.outOfArea) void findPlace(query.trim(), gym?.location.id);
  }, [query, pickPlace, pickWorldCity, prefs.country, filters.centre, searchable, findPlace]);

  // Your precise position, used for this search on this device only.
  // While it's finding you the button spins, and another tap waits for this one.
  const [locating, setLocating] = useState(false);
  const locatingRef = useRef(false);
  const locate = useCallback(async () => {
    if (locatingRef.current) return;
    locatingRef.current = true;
    setLocating(true);
    try {
      const result = await findMe(true);
      setNotice(locatedNotice(result, prefs.country));
      if (result.kind === 'here' || result.kind === 'area') {
        haptic.success();
        map.current?.flyTo(result.fix.position, result.kind === 'area' ? 0.06 : 0.03);
        return;
      }
      haptic.warn();
      if (result.kind === 'nearest') map.current?.flyTo(result.city.centre, 0.06);
    } finally {
      locatingRef.current = false;
      setLocating(false);
    }
  }, [findMe, prefs.country]);

  // --- Search this area -------------------------------------------------------

  // Offered once the map has moved well away from what the list shows, as
  // in Apple Maps. Never in demo mode: it finds real gyms.
  const offerArea = useMemo(() => {
    if (!viewBox || prefs.demo) return false;
    if (filters.bbox) return boxDrift(filters.bbox, viewBox) > 0.35;
    const height = viewBox.north - viewBox.south;
    const width = viewBox.east - viewBox.west;
    const shift = Math.max(
      Math.abs((viewBox.north + viewBox.south) / 2 - filters.centre.lat) / height,
      Math.abs((viewBox.east + viewBox.west) / 2 - filters.centre.lng) / width,
    );
    // Moved more than half a screen, or zoomed well out past the search radius.
    return shift > 0.6 || height > ((filters.radiusKm * 2) / 111) * 2.5;
  }, [viewBox, prefs.demo, filters.bbox, filters.centre, filters.radiusKm]);

  /**
   * Search the area on screen for gyms: only ever when Search this area is
   * tapped, even where your country's gyms are kept on this device, so the
   * list never changes just because the map moved.
   */
  const searchBox = useCallback(
    async (box: BoundingBox) => {
      if (areaBusy) return;
      // Free covers the country you chose; until there is one, choose it first.
      if (!prefs.country) {
        router.push('/country');
        return;
      }
      haptic.tap();
      setAreaBusy(true);
      try {
        const answer = await data.searchArea(box, prefs.country, account.token);
        // What's loaded already, plus what's new (a gym found before counts once).
        const fresh = new Set(answer.gyms.map((record) => record.location.id));
        const inBox = [...answer.gyms, ...data.records.filter((record) => !fresh.has(record.location.id) && isWithinBox(record.location.position, box))];
        // The area's own clock and country (the server's word, else a gym's, else as before).
        const first = inBox[0]?.location;
        const area = answer.where ?? (first ? { timezone: first.timezone, countryCode: first.address.countryCode } : filters);
        setFilters((current) => inArea(current, box, nameForArea(inBox, box), { timezone: area.timezone, countryCode: area.countryCode }));
        setSelectedId(null);
        if (inBox.length === 0) {
          haptic.warn();
          setNotice('OpenStreetMap has no gyms mapped in this area yet.');
        } else {
          haptic.success();
          setNotice(
            answer.truncated
              ? `Lots of gyms here, so these are the ${answer.gyms.length} nearest the middle. Zoom in to see the rest.`
              : answer.gyms.length > 0
                ? `${answer.gyms.length} gym${answer.gyms.length === 1 ? '' : 's'} from OpenStreetMap in this area. Map-only, so call before you go.`
                : 'The map has no gyms here beyond the ones already shown.',
          );
        }
        if (!wide && sheetIndex.current === 0) mainSheet.current?.snapToIndex(1);
      } catch (error) {
        haptic.warn();
        if (error instanceof ApiError && error.code === 'pro_required' && typeof error.detail.countryCode === 'string') {
          // Another country, without Pro: the list says what Pro adds, and the way back.
          const countryCode = error.detail.countryCode;
          setFilters((current) => inArea(current, box, THIS_AREA, { timezone: current.timezone, countryCode }));
          setNotice(null);
        } else {
          setNotice(problemText(error, 'Couldn’t search this area. Try again?'));
        }
      } finally {
        setAreaBusy(false);
      }
    },
    [areaBusy, data, filters, setFilters, wide, prefs.country, account.token],
  );

  // Where the search has no gyms yet (a town with none built in, or where
  // you are), the button shows without moving the map: nothing is read
  // there until it's tapped. Moved away, it reads the area on screen.
  const lookupWaiting = lookup !== null && lookup.state !== 'done' && locked === null;
  const lookupBusy = lookup?.state === 'searching';
  const searchThisArea = useCallback(() => {
    if (offerArea && viewBox) void searchBox(viewBox);
    else searchHere();
  }, [offerArea, viewBox, searchBox, searchHere]);
  const searching = areaBusy || lookupBusy;

  const areaButton = (offerArea || searching || lookupWaiting) && !selectedId && (
    <Animated.View entering={DROP_IN} exiting={FADE_OUT}>
      <Animated.View style={areaPress.style}>
        <Glass style={styles.areaButton} interactive>
          <Pressable
            onPressIn={areaPress.onPressIn}
            onPressOut={areaPress.onPressOut}
            onPress={searchThisArea}
            disabled={searching}
            accessibilityRole="button"
            accessibilityLabel="Search this area"
            aria-busy={searching}
            style={styles.areaHit}
          >
            {searching ? <ActivityIndicator size="small" color={color.brand} /> : <Icon name="search" size={15} color={color.brand} />}
            <Txt variant="subhead" color={color.brand} style={face('semibold')}>
              {searching ? 'Searching the map…' : 'Search this area'}
            </Txt>
          </Pressable>
        </Glass>
      </Animated.View>
    </Animated.View>
  );

  /** Back to your own country's opening place, from one Free doesn't cover. */
  const goHome = useCallback(() => {
    const opening = prefs.country ? openingPlace(prefs.country) : null;
    if (!opening) return;
    haptic.tap();
    setFilters((current) => moveTo(current, opening));
    map.current?.flyTo(opening.centre, 0.06);
  }, [prefs.country, setFilters]);

  // --- Selecting a gym ------------------------------------------------------

  const openGym = useCallback(
    (id: string) => {
      // A gym kept on this device but not loaded yet (found by name) joins the loaded ones.
      const loadedRecord = data.records.find((item) => item.location.id === id);
      const record = loadedRecord ?? data.packGym(id);
      if (!record) return;
      if (!loadedRecord) void data.ensureGyms([id]);
      haptic.tap();
      Keyboard.dismiss();
      // Opened from the search box: the suggestions have done their job.
      setQuery('');
      // A saved gym can be outside the current search; bring the search to it.
      if (!outcome.results.some((item) => item.record.location.id === id)) {
        setFilters((current) =>
          moveTo(current, {
            centre: record.location.position,
            placeName: record.location.address.suburb,
            timezone: record.location.timezone,
            countryCode: record.location.address.countryCode,
          }),
        );
      }
      setSelectedId(id);
      setCardScrolled(false);
      addRecent(id);
      if (wide) {
        setPanel('place');
      } else {
        placeSheet.current?.present();
        if (restoreIndex.current === null) restoreIndex.current = sheetIndex.current;
        // The card takes the results' place, as in Maps: the list steps
        // aside rather than showing through the card's glass.
        mainSheet.current?.close();
      }
      map.current?.flyTo(record.location.position, 0.02);
    },
    [data.records, outcome, wide, addRecent, setFilters],
  );
  openGymRef.current = openGym;

  const closePlace = useCallback(() => {
    if (wide) {
      setPanel(null);
      setSelectedId(null);
    } else {
      placeSheet.current?.dismiss();
    }
  }, [wide]);

  // --- Filters and account ----------------------------------------------------

  const toggleEquipment = useCallback((id: string) => {
    setFilters((current) => {
      const has = current.equipment.includes(id);
      return {
        ...current,
        equipment: has ? current.equipment.filter((item) => item !== id) : [...current.equipment, id],
        dumbbellMinKg: id === 'dumbbells' && has ? null : current.dumbbellMinKg,
      };
    });
  }, []);

  const toggleBudget = useCallback(() => {
    // In the country's own sizes: A$30, but ¥3,000.
    setFilters((current) => ({ ...current, budgetMinor: current.budgetMinor !== null ? null : localBudget(3000, current.countryCode) }));
  }, []);

  const toggleHours = useCallback((need: HoursNeed) => {
    setFilters((current) => ({ ...current, hours: current.hours === need ? null : need }));
  }, []);

  const relax = useCallback(
    (index: number) => {
      const relaxation = outcome.relaxations[index];
      if (!relaxation) return;
      haptic.success();
      setFilters((current) => applyRelaxation(current, relaxation.patch));
    },
    [outcome],
  );

  const openFilters = useCallback(() => {
    Keyboard.dismiss();
    if (wide) setPanel('filters');
    else {
      filterSheet.current?.present();
      filtersShown.current = true;
    }
  }, [wide]);

  // In a browser, Escape closes what's on top: Filters, then a gym's card.
  // Only while this tab is showing, and not under Google's full-screen page
  // (which closes itself on Escape).
  const escape = useRef<() => boolean>(() => false);
  escape.current = () => {
    if (googleFor) return false;
    if (wide) {
      if (panel === 'filters') setPanel(selectedId ? 'place' : null);
      else if (panel === 'place') closePlace();
      else return false;
    } else if (filtersShown.current) filterSheet.current?.dismiss();
    else if (selectedId) closePlace();
    else return false;
    return true;
  };
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'web') return;
      const onKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && !event.defaultPrevented && escape.current()) event.preventDefault();
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, []),
  );

  // iPhone: Apple's action sheet. Elsewhere each tap moves to the next order.
  const chooseSort = useCallback(() => {
    const labels = SORTS.map((item) => item.label);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: 'Sort gyms by', options: [...labels, 'Cancel'], cancelButtonIndex: labels.length },
        (index) => {
          const chosen = SORTS[index];
          if (chosen) setFilters((current) => ({ ...current, sort: chosen.key }));
        },
      );
      return;
    }
    setFilters((current) => {
      const next = SORTS[(SORTS.findIndex((item) => item.key === current.sort) + 1) % SORTS.length]!;
      return { ...current, sort: next.key };
    });
  }, [setFilters]);

  // Your account lives in the Profile tab.
  const openAccount = useCallback(() => {
    Keyboard.dismiss();
    router.navigate('/profile');
  }, [router]);

  // --- Requests from the other tabs ------------------------------------------

  const latestFilters = useRef(filters);
  latestFilters.current = filters;
  const handledRequest = useRef(0);
  useEffect(() => {
    if (!exploreRequest || exploreRequest.nonce === handledRequest.current) return;
    handledRequest.current = exploreRequest.nonce;
    if (exploreRequest.recentre) map.current?.flyTo(latestFilters.current.centre, 0.045);
    if (exploreRequest.notice) setNotice(exploreRequest.notice);
    if (exploreRequest.gymId) openGym(exploreRequest.gymId);
    if (exploreRequest.locate) void locate();
    if (exploreRequest.focusSearch) {
      if (!wide) mainSheet.current?.snapToIndex(2);
      setTimeout(() => searchInput.current?.focus(), 350);
    }
  }, [exploreRequest, openGym, locate, wide]);

  // --- Shared content ---------------------------------------------------------

  const dataNote = showingDemo
    ? 'The Sydney gyms are invented demo data, for testing.'
    : city.mapOnly || filters.bbox || outsideCities
      ? `Real gyms from OpenStreetMap: names, addresses and sometimes opening hours, mapped by volunteers. Prices, guest hours and machines are unknown until a gym publishes them, so call first. ${MELBOURNE_ATTRIBUTION}.`
      : `Real gyms. Tap a fact to see where we read it; anything a gym doesn't publish is unknown. ${MELBOURNE_ATTRIBUTION}.`;

  const results = (inSheet: boolean) => (
    <ResultsContent
      outcome={outcome}
      filters={filters}
      query={query}
      onQueryChange={setQuery}
      onSearchFocus={() => mainSheet.current?.snapToIndex(2)}
      onPickPlace={pickPlace}
      onPickWorldCity={pickWorldCity}
      onSubmitSearch={submitSearch}
      onToggleEquipment={toggleEquipment}
      onToggleHours={toggleHours}
      onToggleBudget={toggleBudget}
      onOpenFilters={openFilters}
      onSelect={openGym}
      onApplyRelaxation={relax}
      notice={notice}
      inSheet={inSheet}
      me={account.account}
      onOpenAccount={openAccount}
      dataNote={dataNote}
      searchRef={searchInput}
      onSort={chooseSort}
      covers={data.covers}
      memberPrices={data.memberPrices}
      records={searchable}
      locked={locked}
      onSeePro={() => openPro('worldwide')}
      onGoHome={goHome}
      lookup={lookup}
      onSearchHere={searchHere}
      home={prefs.country}
    />
  );

  // The pop-up's full-screen button: the gym's own page, with a button there back to the map.
  const expandPlace = () => {
    if (selected) router.push({ pathname: '/gym/[id]', params: { id: selected.record.location.id, from: 'map' } });
  };

  const placeCard = (inSheet: boolean) =>
    selected && (
      <PlaceCard
        key={selected.record.location.id}
        result={selected}
        visitMinute={filters.visitMinuteOfDay}
        visitDate={filters.visitDate}
        saved={account.saved.includes(selected.record.location.id)}
        onToggleSave={() => account.toggleSave(selected.record.location.id)}
        onOpenGoogle={() => setGoogleFor(selected.record.location.id)}
        onOpenWorkout={() => router.push({ pathname: '/workout/[id]', params: { id: selected.record.location.id } })}
        asOf={asOf}
        photos={
          <PhotoHero
            gymId={selected.record.location.id}
            isDemo={selected.record.location.isDemoData}
            website={selected.record.location.website}
            account={account}
            onSignIn={openAccount}
            width={inSheet ? width - SHEET_SIDE * 2 : PANEL_WIDTH}
          />
        }
        memberKit={
          <MemberKit
            gymId={selected.record.location.id}
            isDemo={selected.record.location.isDemoData}
            account={account}
            inSheet={inSheet}
            onSignIn={openAccount}
          />
        }
        statusWarning={<StatusWarning gymId={selected.record.location.id} isDemo={selected.record.location.isDemoData} token={account.state === 'signed_in' ? account.token : null} />}
        memberStatus={<MemberStatus gymId={selected.record.location.id} isDemo={selected.record.location.isDemoData} account={account} onSignIn={openAccount} />}
        memberAccess={
          <MemberAccess gymId={selected.record.location.id} isDemo={selected.record.location.isDemoData} account={account} onSignIn={openAccount} />
        }
        memberPrices={
          <MemberPrices
            gymId={selected.record.location.id}
            isDemo={selected.record.location.isDemoData}
            country={selected.record.location.address.countryCode}
            account={account}
            inSheet={inSheet}
            onSignIn={openAccount}
          />
        }
        reviews={<ReviewsSection gymId={selected.record.location.id} account={account} inSheet={inSheet} onSignIn={openAccount} />}
        notes={selected.record.location.isDemoData ? null : <GymNotes gymId={selected.record.location.id} isPro={billing.isPro} inSheet={inSheet} onPro={() => openPro('notes')} />}
        collect={selected.record.location.isDemoData ? null : <CollectCard record={selected.record} onOpenCollection={() => router.push('/collection')} />}
      />
    );

  const googleRecord = googleFor ? data.records.find((record) => record.location.id === googleFor) : undefined;
  const googleModal = <GoogleModal record={googleRecord} onClose={() => setGoogleFor(null)} />;

  const pillPlace = filters.placeName === THIS_AREA ? 'This area' : filters.placeName === YOUR_LOCATION ? 'Near you' : filters.placeName;
  const statusPill = (
    <Glass style={styles.pill}>
      <View
        style={[
          styles.pillDot,
          { backgroundColor: locked ? color.brand : showingDemo ? color.maybe : data.status === 'live' ? color.good : color.no },
        ]}
      />
      <Txt variant="footnote" style={styles.pillText}>
        {locked
          ? `${pillPlace} · with GymGO Pro`
          : showingDemo
          ? 'Sydney · demo gyms'
          : filters.bbox || outsideCities
            ? `${pillPlace} · map data`
            : data.status === 'live'
            ? `${city.name} · live data`
            : data.status === 'offline'
              ? `${city.name} · offline copy`
              : city.name}
      </Txt>
    </Glass>
  );

  const controls = (
    <ControlCapsule
      buttons={[
        {
          icon: 'fit',
          accessibilityLabel: 'Show every gym in the list',
          onPress: () => map.current?.fitTo(pins.map((pin) => pin.position)),
        },
        { icon: 'locate', accessibilityLabel: locating ? 'Finding you' : 'Show gyms near me', onPress: () => void locate(), busy: locating },
      ]}
    />
  );

  const selfCheckBanner = !selfCheck.ok && (
    <View style={[styles.selfCheck, { top: insets.top + 64 }]}>
      <Icon name="maybe" size={16} color={color.maybeInk} />
      <Txt variant="footnote" color={color.maybeInk} style={styles.flex}>
        {`This device can't work out time zones reliably, so guest-hour answers may be an hour out. (${selfCheck.detail})`}
      </Txt>
    </View>
  );

  // --- Desktop ----------------------------------------------------------------

  if (wide) {
    // Filters only when asked for, and a card only while there's a gym to show.
    const shown = panel === 'filters' || (panel === 'place' && selected) ? panel : null;
    const panelsWidth = PANEL_GAP + PANEL_WIDTH + (shown ? PANEL_GAP + PANEL_WIDTH : 0);
    return (
      <View style={styles.root}>
        {/* The map opens where the search is, so it waits for your country. */}
        {prefsReady ? (
          <GymMap
            ref={map}
            pins={pins}
            selectedId={selectedId}
            initialCentre={filters.centre}
            topInset={PANEL_GAP}
            bottomInset={PANEL_GAP + clearance}
            leftInset={panelsWidth}
            showsUserLocation={here !== null}
            userLocation={here?.position ?? null}
            onSelect={openGym}
            onRegionChange={setViewBox}
            onMapPress={() => {
              if (panel === 'place') closePlace();
            }}
          />
        ) : (
          <View style={styles.mapWaiting} />
        )}

        <DesktopPanel left={PANEL_GAP} bottom={PANEL_GAP + clearance}>
          <View style={styles.panelTop}>{statusPill}</View>
          <ScrollView keyboardShouldPersistTaps="handled">{results(false)}</ScrollView>
        </DesktopPanel>

        {shown && (
          <DesktopPanel left={PANEL_GAP * 2 + PANEL_WIDTH} bottom={PANEL_GAP + clearance}>
            {shown === 'place' && selected ? (
              <ScrollView
                stickyHeaderIndices={[0]}
                onScroll={(event) => {
                  const past = event.nativeEvent.contentOffset.y > 4;
                  if (past !== cardScrolled) setCardScrolled(past);
                }}
                scrollEventThrottle={32}
              >
                <PlaceHeader result={selected} onClose={closePlace} onExpand={expandPlace} scrolled={cardScrolled} topPadding={space[4]} />
                {placeCard(false)}
              </ScrollView>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled">
                <View style={styles.panelClose}>
                  <CloseButton onPress={() => setPanel(selectedId ? 'place' : null)} />
                </View>
                <FiltersContent
                  filters={filters}
                  onChange={setFilters}
                  counts={outcome.counts}
                  onDone={() => setPanel(selectedId ? 'place' : null)}
                />
              </ScrollView>
            )}
          </DesktopPanel>
        )}

        <View style={[CHILD_TOUCH, styles.desktopControls, { top: PANEL_GAP }]}>
          {controls}
        </View>
        <View style={[CHILD_TOUCH, styles.areaRow, { top: PANEL_GAP, left: panelsWidth + PANEL_GAP, right: PANEL_GAP + 64 }]}>
          {areaButton}
        </View>
        {selfCheckBanner}
        {googleModal}
      </View>
    );
  }

  // --- Phone ------------------------------------------------------------------

  return (
    <PhoneShell
      insets={insets}
      clearance={clearance}
      setSheetTop={setSheetTop}
      sheetIndex={sheetIndex}
      restoreIndex={restoreIndex}
      mainSheet={mainSheet}
      placeSheet={placeSheet}
      filterSheet={filterSheet}
      map={
        // The map opens where the search is, so it waits for your country.
        prefsReady ? (
          <GymMap
            ref={map}
            pins={pins}
            selectedId={selectedId}
            initialCentre={filters.centre}
            topInset={insets.top}
            // Keep the map's idea of "centre" above the sheet, not behind it.
            bottomInset={Math.min(sheetTop, height * 0.5)}
            creditInset={sheetTop}
            showsUserLocation={here !== null}
            userLocation={here?.position ?? null}
            onSelect={openGym}
            onRegionChange={setViewBox}
            onMapPress={() => {
              Keyboard.dismiss();
              if (selectedId) closePlace();
            }}
          />
        ) : (
          <View style={styles.mapWaiting} />
        )
      }
      topBar={
        <>
          <View style={[CHILD_TOUCH, styles.areaRow, { top: insets.top + space[2] + 44, left: space[4], right: space[4] }]}>
            {areaButton}
          </View>
          <View style={[CHILD_TOUCH, styles.topBar, { top: insets.top + space[2] }]}>
            {statusPill}
            {controls}
          </View>
        </>
      }
      banner={selfCheckBanner}
      results={results(true)}
      place={
        selected && (
          <SheetScrollView
            stickyHeaderIndices={[0]}
            contentContainerStyle={{ paddingBottom: insets.bottom + space[6] }}
            onScroll={(event) => {
              const past = event.nativeEvent.contentOffset.y > 4;
              if (past !== cardScrolled) setCardScrolled(past);
            }}
          >
            <PlaceHeader result={selected} onClose={closePlace} onExpand={expandPlace} scrolled={cardScrolled} />
            {placeCard(true)}
          </SheetScrollView>
        )
      }
      onPlaceDismiss={() => {
        setSelectedId(null);
        setCardScrolled(false);
      }}
      filters={
        <FiltersContent
          filters={filters}
          onChange={setFilters}
          counts={outcome.counts}
          onDone={() => filterSheet.current?.dismiss()}
        />
      }
      onFiltersDismiss={() => {
        filtersShown.current = false;
      }}
      google={googleModal}
    />
  );
}

/** A floating glass panel down the left of a wide window. */
function DesktopPanel({ left, bottom, children }: { left: number; bottom: number; children: ReactNode }) {
  return (
    <View style={[styles.panel, { left, bottom, width: PANEL_WIDTH }]}>
      <Glass kind="sheet" style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

/** The phone layout: the results sheet, and the sheets that stack on it. */
function PhoneShell(props: {
  insets: { top: number; bottom: number };
  /** Room for the tab bar (and the home indicator) under the sheets. */
  clearance: number;
  setSheetTop: (value: number) => void;
  sheetIndex: React.MutableRefObject<number>;
  restoreIndex: React.MutableRefObject<number | null>;
  mainSheet: React.RefObject<BottomSheet | null>;
  placeSheet: React.RefObject<BottomSheetModal | null>;
  filterSheet: React.RefObject<BottomSheetModal | null>;
  map: ReactNode;
  topBar: ReactNode;
  banner: ReactNode;
  results: ReactNode;
  place: ReactNode;
  onPlaceDismiss: () => void;
  filters: ReactNode;
  onFiltersDismiss: () => void;
  google: ReactNode;
}) {
  const { insets } = props;
  const window = useWindowDimensions();
  // If the phone lays this tab out reaching below the screen, the sheets
  // (which sit on its bottom edge) are lifted by as much, so none of a sheet
  // or its last rows ends up out of sight.
  const { measureRef, onLayout: measure, overhang } = useOverhang();
  const clearance = props.clearance + overhang;
  // The height the sheets live in: the screen, less the tab bar and a gap.
  const [height, setHeight] = useState(window.height - clearance - SHEET_GAP);
  const bottomInset = 0;
  // The tallest a sheet may be: up to just under the status bar.
  const tallest = Math.max(PEEK + 80, height - bottomInset - insets.top - space[2]);
  // iOS sheet feel: critically damped, so a snap (or a fling) lands crisply,
  // without a wobble and without the long slow tail of an overdamped spring.
  const spring = useBottomSheetSpringConfigs({ damping: 40, stiffness: 380, mass: 1, overshootClamping: true });
  const snapPoints = useMemo(() => [PEEK, '48%', tallest], [tallest]);
  const placeSnaps = useMemo(() => ['56%', tallest], [tallest]);
  const tallSnaps = useMemo(() => [tallest], [tallest]);
  // Fully open, a sheet reaches the top of the map: the pill and buttons
  // there step aside rather than showing through its glass.
  const [mainFull, setMainFull] = useState(false);
  const [placeFull, setPlaceFull] = useState(false);
  const topHidden = mainFull || placeFull;
  const topOpacity = useSharedValue(1);
  useEffect(() => {
    topOpacity.value = withTiming(topHidden ? 0 : 1, topHidden ? LEAVE : ARRIVE);
  }, [topHidden, topOpacity]);
  const topFade = useAnimatedStyle(() => ({ opacity: topOpacity.value }));
  // How far up the screen each sheet reaches. The map keeps its centre, and
  // its credit, above whichever is higher: the gym you picked stays in view
  // over its card, not behind it.
  const [mainTop, setMainTop] = useState(PEEK);
  const [placeTop, setPlaceTop] = useState(0);
  const { setSheetTop } = props;
  useEffect(() => setSheetTop(Math.max(mainTop, placeTop)), [mainTop, placeTop, setSheetTop]);
  const topOf = (position: number) => Math.max(0, height + clearance + SHEET_GAP - position);
  // The same, for a detent the results sheet is about to return to.
  const detentTop = (index: number) => {
    const point = snapPoints[index] ?? PEEK;
    return (typeof point === 'number' ? point : (parseFloat(point) / 100) * height) + clearance + SHEET_GAP;
  };
  // On a phone, a drag in a sheet's list opens the sheet all the way first:
  // once, going by the detent each sheet is at or on its way to, so the
  // scrolls that follow while it opens don't start it again.
  const mainGoing = useRef(1);
  const placeGoing = useRef(-1);
  const { mainSheet, placeSheet } = props;
  const openMain = useCallback(() => {
    if (mainGoing.current >= snapPoints.length - 1) return;
    mainGoing.current = snapPoints.length - 1;
    mainSheet.current?.snapToIndex(snapPoints.length - 1);
  }, [mainSheet, snapPoints.length]);
  const openPlace = useCallback(() => {
    if (placeGoing.current < 0 || placeGoing.current >= placeSnaps.length - 1) return;
    placeGoing.current = placeSnaps.length - 1;
    placeSheet.current?.snapToIndex(placeSnaps.length - 1);
  }, [placeSheet, placeSnaps.length]);

  const backdrop = useCallback(
    (backdropProps: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...backdropProps} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.18} />
    ),
    [],
  );

  return (
    <View ref={measureRef} onLayout={measure} style={styles.root}>
      {props.map}
      {/* Pass-through as a prop: an animated view's styles reach the browser inline, where 'box-none' isn't understood and the layer would swallow every tap and drag on the map. */}
      <Animated.View style={[StyleSheet.absoluteFill, topFade]} pointerEvents={topHidden ? 'none' : 'box-none'}>
        {props.topBar}
      </Animated.View>
      {props.banner}

      {/* The sheets live in a layer that stops above the tab bar, so none of
          a sheet ever sits behind it (as in Find My). Its own sheet host
          also keeps a gym's card on this tab when you switch away. */}
      <View
        style={[CHILD_TOUCH, styles.sheetLayer, { bottom: clearance + SHEET_GAP }]}
        onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      >
        <BottomSheetModalProvider>

      <BottomSheet
        ref={props.mainSheet}
        index={1}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        animationConfigs={spring}
        backgroundComponent={FloatingGlassBackground}
        style={styles.floatingSheet}
        detached
        bottomInset={bottomInset}
        handleIndicatorStyle={styles.handle}
        enableContentPanningGesture={!SCROLL_ONLY}
        handleStyle={SCROLL_ONLY ? styles.grabArea : undefined}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onAnimate={(from, to, _fromPosition, toPosition) => {
          mainGoing.current = to;
          if (from !== to && to >= 0) haptic.select();
          // Moving the map with the sheet, not after it. Stepping aside for a
          // card waits for the card's own reach, so the map moves once.
          if (to >= 0) setMainTop(topOf(toPosition));
        }}
        onChange={(index, position) => {
          props.sheetIndex.current = index;
          mainGoing.current = index;
          setMainTop(index < 0 ? 0 : topOf(position));
          setMainFull(index === snapPoints.length - 1);
        }}
      >
        <SheetOpener.Provider value={SCROLL_ONLY ? openMain : null}>
          <SheetClip>
            <SheetScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space[4] }}>
              {props.results}
            </SheetScrollView>
          </SheetClip>
        </SheetOpener.Provider>
      </BottomSheet>

      <BottomSheetModal
        ref={props.placeSheet}
        snapPoints={placeSnaps}
        animationConfigs={spring}
        enableDynamicSizing={false}
        backgroundComponent={FloatingGlassBackground}
        style={styles.floatingSheet}
        detached
        bottomInset={bottomInset}
        handleIndicatorStyle={styles.handle}
        enableContentPanningGesture={!SCROLL_ONLY}
        handleStyle={SCROLL_ONLY ? styles.grabArea : undefined}
        keyboardBehavior="extend"
        onAnimate={(from, to, _fromPosition, toPosition) => {
          placeGoing.current = to;
          if (to >= 0) setPlaceTop(topOf(toPosition));
        }}
        onChange={(index, position) => {
          placeGoing.current = index;
          setPlaceFull(index === placeSnaps.length - 1);
          setPlaceTop(index < 0 ? 0 : topOf(position));
        }}
        onDismiss={() => {
          placeGoing.current = -1;
          setPlaceFull(false);
          setPlaceTop(0);
          props.onPlaceDismiss();
          if (props.restoreIndex.current !== null) {
            setMainTop(detentTop(props.restoreIndex.current));
            props.mainSheet.current?.snapToIndex(props.restoreIndex.current);
          }
          props.restoreIndex.current = null;
        }}
      >
        {props.place ? (
          <SheetOpener.Provider value={SCROLL_ONLY ? openPlace : null}>
            <SheetClip>{props.place}</SheetClip>
          </SheetOpener.Provider>
        ) : null}
      </BottomSheetModal>

      <BottomSheetModal
        ref={props.filterSheet}
        snapPoints={tallSnaps}
        animationConfigs={spring}
        enableDynamicSizing={false}
        backgroundComponent={FloatingSolidBackground}
        style={styles.floatingSheet}
        detached
        bottomInset={bottomInset}
        handleIndicatorStyle={styles.handle}
        enableContentPanningGesture={!SCROLL_ONLY}
        handleStyle={SCROLL_ONLY ? styles.grabArea : undefined}
        backdropComponent={backdrop}
        onDismiss={props.onFiltersDismiss}
      >
        <SheetClip>
          <SheetScrollView contentContainerStyle={{ paddingBottom: space[4] }}>{props.filters}</SheetScrollView>
        </SheetClip>
      </BottomSheetModal>
        </BottomSheetModalProvider>
      </View>
      {props.google}
    </View>
  );
}

/**
 * On a phone (the app, or a browser on one), a sheet's list only scrolls,
 * and the sheet moves by its top edge (see SHEET_SCROLL_ONLY). So that a
 * half-open sheet doesn't leave the rows a strip to scroll in, a drag in
 * the list opens its sheet all the way first (SheetScrollView).
 */
const SCROLL_ONLY = SHEET_SCROLL_ONLY;

const styles = themed(() => StyleSheet.create({
  mapWaiting: { ...StyleSheet.absoluteFill, backgroundColor: color.groupedBackground },
  root: { flex: 1, backgroundColor: color.groupedBackground },
  sheetLayer: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  floatingSheet: { marginHorizontal: SHEET_SIDE },
  flex: { flex: 1 },

  topBar: {
    position: 'absolute',
    left: space[4],
    right: space[4],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: space[3],
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  pillDot: { width: 7, height: 7, borderRadius: 3.5 },
  pillText: face('medium'),

  panel: {
    position: 'absolute',
    top: PANEL_GAP,
    borderRadius: radius.xl + 4,
    borderCurve: 'continuous',
    overflow: 'hidden',
    ...shadow.float,
  },
  panelTop: { paddingHorizontal: space[4], paddingTop: space[4], paddingBottom: space[2] },
  panelClose: { alignItems: 'flex-end', paddingHorizontal: space[4], paddingTop: space[4] },
  desktopControls: { position: 'absolute', right: PANEL_GAP },

  areaRow: { position: 'absolute', alignItems: 'center' },
  areaButton: { height: 38, borderRadius: 19, ...shadow.float },
  areaHit: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[4] },

  selfCheck: {
    position: 'absolute',
    left: space[4],
    right: space[4],
    flexDirection: 'row',
    gap: space[2],
    padding: space[3],
    borderRadius: 14,
    backgroundColor: color.warnBackground,
  },

  handle: { backgroundColor: color.handle, width: 36, height: 5 },
  // Room to catch the sheet by its top edge, the one place a phone drags it from.
  grabArea: { paddingTop: 12, paddingBottom: 14 },
}));
