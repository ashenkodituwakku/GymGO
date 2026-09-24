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
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
  BottomSheetBackdrop,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { ActionSheetIOS, Keyboard, Platform, ScrollView, StyleSheet, View, useWindowDimensions, type TextInput } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LatLng } from '@gymgo/domain';
import { MELBOURNE_ATTRIBUTION } from '@gymgo/melbourne-data';
import { EMPTY } from '@/lib/copy';
import { haptic } from '@/lib/haptics';
import { CITIES, DEFAULT_PLACE, cityNear, geocodePlace, type AppPlace, type City } from '@/lib/places';
import { useApp } from '@/lib/app-state';
import { useBottomClearance } from '@/lib/layout';
import { SORTS, applyRelaxation, atPlace, runSearch } from '@/lib/query';
import { checkTimeZoneSupport } from '@/lib/selfcheck';
import { color, face, radius, shadow, space } from '@/lib/theme';
import { FiltersContent } from '@/components/FiltersContent';
import { Glass } from '@/components/Glass';
import { GoogleModal } from '@/components/GoogleModal';
import { GymMap, type GymMapHandle, type MapPin } from '@/components/GymMap';
import { Icon } from '@/components/Icon';
import { MemberKit } from '@/components/MemberKit';
import { PhotoHero } from '@/components/PhotoHero';
import { PlaceCard, PlaceHeader } from '@/components/PlaceCard';
import { ResultsContent } from '@/components/ResultsContent';
import { ReviewsSection } from '@/components/ReviewsSection';
import { SHEET_GAP, SolidSheetBackground, floatingGlassBackground } from '@/components/SheetBackground';
import { CloseButton, ControlCapsule, Txt } from '@/components/ui';

const PEEK = 150;
/** Below this width the phone layout is used, even in a browser. */
const WIDE = 900;
const PANEL_WIDTH = 390;
const PANEL_GAP = 16;

// Made once: a component identity that changes would remount the sheet.
const ResultsBackground = floatingGlassBackground(2);
const PlaceBackground = floatingGlassBackground(1);

type Panel = 'place' | 'filters' | null;

export default function ExploreTab() {
  // Its own safe area, so the tab bar counts in the bottom inset.
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

  const { data, account, filters, setFilters, addRecent, exploreRequest } = useApp();
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locationShown, setLocationShown] = useState(false);
  const [sheetTop, setSheetTop] = useState(PEEK);
  const [cardScrolled, setCardScrolled] = useState(false);
  // The gym whose Google Maps page is open, full screen over everything.
  const [googleFor, setGoogleFor] = useState<string | null>(null);
  // Desktop: which panel sits beside the results.
  const [panel, setPanel] = useState<Panel>(null);
  // Phone: where the results sheet was before a place card pushed it down,
  // so closing the card puts it back — as Maps does.
  const sheetIndex = useRef(1);
  const restoreIndex = useRef<number | null>(null);

  const map = useRef<GymMapHandle>(null);
  const mainSheet = useRef<BottomSheet>(null);
  const placeSheet = useRef<BottomSheetModal>(null);
  const filterSheet = useRef<BottomSheetModal>(null);
  const searchInput = useRef<TextInput>(null);

  // "As of" is fixed per render pass so the list and the card agree on
  // freshness; it moves on whenever the filters or data do.
  const asOf = useMemo(() => new Date(), [filters, data.records]);
  const outcome = useMemo(() => runSearch(filters, { records: data.records }, asOf), [filters, data.records, asOf]);
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
  const selected = outcome.results.find((result) => result.record.location.id === selectedId) ?? null;
  const showingDemo = outcome.results.some((result) => result.record.location.isDemoData);

  // --- Moving around --------------------------------------------------------

  const goTo = useCallback((centre: LatLng, placeName: string, city: City, message: string | null = null) => {
    setFilters((current) => ({ ...current, centre, placeName, timezone: city.timezone }));
    setNotice(message);
    map.current?.flyTo(centre, 0.045);
  }, []);

  const pickPlace = useCallback(
    (place: AppPlace) => {
      Keyboard.dismiss();
      setQuery('');
      setFilters((current) => ({ ...current, ...atPlace(place) }));
      setNotice(null);
      map.current?.flyTo(place.position, 0.045);
      mainSheet.current?.snapToIndex(1);
    },
    [],
  );

  const submitSearch = useCallback(() => {
    const result = geocodePlace(query);
    Keyboard.dismiss();
    if (result.place) return pickPlace(result.place);
    if (result.outOfArea) {
      haptic.warn();
      setQuery('');
      goTo(DEFAULT_PLACE.position, DEFAULT_PLACE.name, CITIES.melbourne, EMPTY.outOfArea);
    }
  }, [query, pickPlace, goTo]);

  const locate = useCallback(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        haptic.warn();
        setNotice(EMPTY.locationDenied);
        return;
      }
      setLocationShown(true);
      const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      // Rounded to ~100 m: enough to sort by distance, not enough to pin a
      // doorway. Held in memory for this search only; never saved or sent.
      const here = {
        lat: Math.round(fix.coords.latitude * 1000) / 1000,
        lng: Math.round(fix.coords.longitude * 1000) / 1000,
      };
      const city = cityNear(here);
      if (!city) {
        haptic.warn();
        goTo(DEFAULT_PLACE.position, DEFAULT_PLACE.name, CITIES.melbourne, EMPTY.locationFar);
        return;
      }
      haptic.success();
      goTo(here, 'your location', city);
    } catch {
      setNotice("Couldn't get a fix on where you are. Search a suburb instead.");
    }
  }, [goTo]);

  // --- Selecting a gym ------------------------------------------------------

  const openGym = useCallback(
    (id: string) => {
      const record = data.records.find((item) => item.location.id === id);
      if (!record) return;
      haptic.tap();
      Keyboard.dismiss();
      // A saved gym can be outside the current search; bring the search to it.
      if (!outcome.results.some((item) => item.record.location.id === id)) {
        const city = cityNear(record.location.position) ?? CITIES.melbourne;
        setFilters((current) => ({ ...current, centre: record.location.position, placeName: record.location.address.suburb, timezone: city.timezone }));
      }
      setSelectedId(id);
      setCardScrolled(false);
      addRecent(id);
      if (wide) {
        setPanel('place');
      } else {
        placeSheet.current?.present();
        if (restoreIndex.current === null) restoreIndex.current = sheetIndex.current;
        mainSheet.current?.snapToIndex(0);
      }
      map.current?.flyTo(record.location.position, 0.02);
    },
    [data.records, outcome, wide, addRecent, setFilters],
  );

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
    setFilters((current) => ({ ...current, budgetMinor: current.budgetMinor === 3000 ? null : 3000 }));
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
    else filterSheet.current?.present();
  }, [wide]);

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
    : `Real gyms. Tap a fact to see where we read it; anything a gym doesn't publish is unknown. ${MELBOURNE_ATTRIBUTION}.`;

  const results = (inSheet: boolean) => (
    <ResultsContent
      outcome={outcome}
      filters={filters}
      query={query}
      onQueryChange={setQuery}
      onSearchFocus={() => mainSheet.current?.snapToIndex(2)}
      onPickPlace={pickPlace}
      onSubmitSearch={submitSearch}
      onToggleEquipment={toggleEquipment}
      onToggleBudget={toggleBudget}
      onOpenFilters={openFilters}
      onSelect={openGym}
      onApplyRelaxation={relax}
      notice={notice}
      inSheet={inSheet}
      accountInitial={account.account ? account.account.displayName.slice(0, 1).toUpperCase() : null}
      onOpenAccount={openAccount}
      dataNote={dataNote}
      searchRef={searchInput}
      onSort={chooseSort}
      covers={data.covers}
    />
  );

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
        asOf={asOf}
        photos={
          <PhotoHero
            gymId={selected.record.location.id}
            isDemo={selected.record.location.isDemoData}
            account={account}
            onSignIn={openAccount}
            width={inSheet ? undefined : PANEL_WIDTH}
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
        reviews={<ReviewsSection gymId={selected.record.location.id} account={account} inSheet={inSheet} onSignIn={openAccount} />}
      />
    );

  const googleRecord = googleFor ? data.records.find((record) => record.location.id === googleFor) : undefined;
  const googleModal = <GoogleModal record={googleRecord} onClose={() => setGoogleFor(null)} />;

  const statusPill = (
    <Glass style={styles.pill}>
      <View
        style={[
          styles.pillDot,
          { backgroundColor: showingDemo ? color.maybe : data.status === 'live' ? color.good : color.no },
        ]}
      />
      <Txt variant="footnote" style={styles.pillText}>
        {showingDemo
          ? 'Sydney · demo gyms'
          : data.status === 'live'
            ? 'Melbourne · live data'
            : data.status === 'offline'
              ? 'Melbourne · offline copy'
              : 'Melbourne'}
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
        { icon: 'locate', accessibilityLabel: 'Show gyms near me', onPress: () => void locate() },
      ]}
    />
  );

  const selfCheckBanner = !selfCheck.ok && (
    <View style={[styles.selfCheck, { top: insets.top + 64 }]}>
      <Icon name="maybe" size={16} color={color.maybeInk} />
      <Txt variant="footnote" color={color.maybeInk} style={styles.flex}>
        {`This device can't do Australian time zones reliably, so guest-hour answers may be an hour out. (${selfCheck.detail})`}
      </Txt>
    </View>
  );

  // --- Desktop ----------------------------------------------------------------

  if (wide) {
    const panelsWidth = PANEL_GAP + PANEL_WIDTH + (panel ? PANEL_GAP + PANEL_WIDTH : 0);
    return (
      <View style={styles.root}>
        <GymMap
          ref={map}
          pins={pins}
          selectedId={selectedId}
          initialCentre={filters.centre}
          topInset={PANEL_GAP}
          bottomInset={PANEL_GAP}
          leftInset={panelsWidth}
          showsUserLocation={locationShown}
          onSelect={openGym}
          onMapPress={() => {
            if (panel === 'place') closePlace();
          }}
        />

        <DesktopPanel left={PANEL_GAP}>
          <View style={styles.panelTop}>{statusPill}</View>
          <ScrollView keyboardShouldPersistTaps="handled">{results(false)}</ScrollView>
        </DesktopPanel>

        {panel && (
          <DesktopPanel left={PANEL_GAP * 2 + PANEL_WIDTH}>
            {panel === 'place' && selected ? (
              <ScrollView
                stickyHeaderIndices={[0]}
                onScroll={(event) => {
                  const past = event.nativeEvent.contentOffset.y > 4;
                  if (past !== cardScrolled) setCardScrolled(past);
                }}
                scrollEventThrottle={32}
              >
                <PlaceHeader result={selected} onClose={closePlace} scrolled={cardScrolled} topPadding={space[4]} />
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
                  resultCount={outcome.results.length}
                  onDone={() => setPanel(selectedId ? 'place' : null)}
                />
              </ScrollView>
            )}
          </DesktopPanel>
        )}

        <View style={[styles.desktopControls, { top: PANEL_GAP }]} pointerEvents="box-none">
          {controls}
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
      sheetTop={sheetTop}
      setSheetTop={setSheetTop}
      sheetIndex={sheetIndex}
      restoreIndex={restoreIndex}
      mainSheet={mainSheet}
      placeSheet={placeSheet}
      filterSheet={filterSheet}
      map={
        <GymMap
          ref={map}
          pins={pins}
          selectedId={selectedId}
          initialCentre={filters.centre}
          topInset={insets.top}
          // Keep the map's idea of "centre" above the sheet, not behind it.
          bottomInset={Math.min(sheetTop, height * 0.5)}
          showsUserLocation={locationShown}
          onSelect={openGym}
          onMapPress={() => {
            Keyboard.dismiss();
            if (selectedId) closePlace();
          }}
        />
      }
      topBar={
        <View style={[styles.topBar, { top: insets.top + space[2] }]} pointerEvents="box-none">
          {statusPill}
          {controls}
        </View>
      }
      banner={selfCheckBanner}
      results={results(true)}
      place={
        selected && (
          <BottomSheetScrollView
            stickyHeaderIndices={[0]}
            contentContainerStyle={{ paddingBottom: insets.bottom + space[6] }}
            onScroll={(event) => {
              const past = event.nativeEvent.contentOffset.y > 4;
              if (past !== cardScrolled) setCardScrolled(past);
            }}
          >
            <PlaceHeader result={selected} onClose={closePlace} scrolled={cardScrolled} />
            {placeCard(true)}
          </BottomSheetScrollView>
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
          resultCount={outcome.results.length}
          onDone={() => filterSheet.current?.dismiss()}
        />
      }
      google={googleModal}
    />
  );
}

/** A floating glass panel down the left of a wide window. */
function DesktopPanel({ left, children }: { left: number; children: ReactNode }) {
  return (
    <View style={[styles.panel, { left, width: PANEL_WIDTH }]}>
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
  sheetTop: number;
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
  google: ReactNode;
}) {
  const { insets, clearance } = props;
  const window = useWindowDimensions();
  // The height the sheets live in: the screen, less the tab bar and a gap.
  const [height, setHeight] = useState(window.height - clearance - SHEET_GAP);
  const bottomInset = 0;
  // The tallest a sheet may be: up to just under the status bar.
  const tallest = Math.max(PEEK + 80, height - bottomInset - insets.top - space[2]);
  // iOS sheet feel: quick, settles without wobbling.
  const spring = useBottomSheetSpringConfigs({ damping: 80, stiffness: 500, overshootClamping: true });
  const snapPoints = useMemo(() => [PEEK, '48%', tallest], [tallest]);
  const placeSnaps = useMemo(() => ['56%', tallest], [tallest]);
  const tallSnaps = useMemo(() => [tallest], [tallest]);

  const backdrop = useCallback(
    (backdropProps: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...backdropProps} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.18} />
    ),
    [],
  );

  return (
    <View style={styles.root}>
      {props.map}
      {props.topBar}
      {props.banner}

      {/* The sheets live in a layer that stops above the tab bar, so none of
          a sheet ever sits behind it (as in Find My). Its own sheet host
          also keeps a gym's card on this tab when you switch away. */}
      <View
        style={[styles.sheetLayer, { bottom: clearance + SHEET_GAP }]}
        pointerEvents="box-none"
        onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      >
        <BottomSheetModalProvider>

      <BottomSheet
        ref={props.mainSheet}
        index={1}
        snapPoints={snapPoints}
        animationConfigs={spring}
        backgroundComponent={ResultsBackground}
        detached
        bottomInset={bottomInset}
        handleIndicatorStyle={styles.handle}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onAnimate={(from, to) => {
          if (from !== to && to >= 0) haptic.select();
        }}
        onChange={(index, position) => {
          props.sheetIndex.current = index;
          props.setSheetTop(Math.max(0, height + clearance + SHEET_GAP - position));
        }}
      >
        <BottomSheetScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space[4] }}>
          {props.results}
        </BottomSheetScrollView>
      </BottomSheet>

      <BottomSheetModal
        ref={props.placeSheet}
        snapPoints={placeSnaps}
        animationConfigs={spring}
        enableDynamicSizing={false}
        backgroundComponent={PlaceBackground}
        detached
        bottomInset={bottomInset}
        handleIndicatorStyle={styles.handle}
        keyboardBehavior="extend"
        onDismiss={() => {
          props.onPlaceDismiss();
          if (props.restoreIndex.current !== null) props.mainSheet.current?.snapToIndex(props.restoreIndex.current);
          props.restoreIndex.current = null;
        }}
      >
        {props.place}
      </BottomSheetModal>

      <BottomSheetModal
        ref={props.filterSheet}
        snapPoints={tallSnaps}
        animationConfigs={spring}
        enableDynamicSizing={false}
        backgroundComponent={SolidSheetBackground}
        handleIndicatorStyle={styles.handle}
        backdropComponent={backdrop}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: space[4] }}>{props.filters}</BottomSheetScrollView>
      </BottomSheetModal>
        </BottomSheetModalProvider>
      </View>
      {props.google}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.groupedBackground },
  sheetLayer: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
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
    bottom: PANEL_GAP,
    borderRadius: radius.xl + 4,
    borderCurve: 'continuous',
    overflow: 'hidden',
    ...shadow.float,
  },
  panelTop: { paddingHorizontal: space[4], paddingTop: space[4], paddingBottom: space[2] },
  panelClose: { alignItems: 'flex-end', paddingHorizontal: space[4], paddingTop: space[4] },
  desktopControls: { position: 'absolute', right: PANEL_GAP },

  selfCheck: {
    position: 'absolute',
    left: space[4],
    right: space[4],
    flexDirection: 'row',
    gap: space[2],
    padding: space[3],
    borderRadius: 14,
    backgroundColor: '#FFF4E5',
  },

  handle: { backgroundColor: 'rgba(60, 60, 67, 0.3)', width: 36, height: 5 },
});
