/**
 * The one screen: a map, and sheets over it — the way Apple Maps works.
 *
 * The results sheet is always there (peeking, half, or full). Tapping a pin or
 * a row stacks the gym's place card on top of it; the filter button stacks the
 * filters. Dismiss either and you're back where you were, map and all.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomSheet, {
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
  BottomSheetBackdrop,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haversineKm, type LatLng } from '@gymgo/domain';
import { PILOT_CENTRE, geocode, type Place } from '@gymgo/demo-data';
import { EMPTY } from '@/lib/copy';
import { haptic } from '@/lib/haptics';
import { applyRelaxation, initialFilters, runSearch, type Filters } from '@/lib/query';
import { checkTimeZoneSupport } from '@/lib/selfcheck';
import { color, face, space } from '@/lib/theme';
import { FiltersContent } from '@/components/FiltersContent';
import { Glass } from '@/components/Glass';
import { GymMap, type GymMapHandle, type MapPin } from '@/components/GymMap';
import { Icon } from '@/components/Icon';
import { PlaceCard, PlaceHeader } from '@/components/PlaceCard';
import { ResultsContent } from '@/components/ResultsContent';
import { SHEET_GAP, SolidSheetBackground, floatingGlassBackground } from '@/components/SheetBackground';
import { ControlCapsule, Txt } from '@/components/ui';

const SAVED_KEY = 'gymgo.saved.v1';
/** Beyond this from the pilot centre, "near you" would list nothing useful. */
const PILOT_REACH_KM = 15;
const PEEK = 150;

// Made once: a component identity that changes would remount the sheet.
const ResultsBackground = floatingGlassBackground(2);
const PlaceBackground = floatingGlassBackground(1);

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  // The time-zone self-check runs once; its answer can't change mid-session.
  const selfCheck = useMemo(() => checkTimeZoneSupport(), []);

  const [filters, setFilters] = useState<Filters>(() => initialFilters());
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [locationShown, setLocationShown] = useState(false);
  const [sheetTop, setSheetTop] = useState(PEEK);
  const [cardScrolled, setCardScrolled] = useState(false);
  // Where the results sheet was before a place card pushed it down, so
  // closing the card puts it back — as Maps does.
  const sheetIndex = useRef(1);
  const restoreIndex = useRef<number | null>(null);

  const map = useRef<GymMapHandle>(null);
  const mainSheet = useRef<BottomSheet>(null);
  const placeSheet = useRef<BottomSheetModal>(null);
  const filterSheet = useRef<BottomSheetModal>(null);

  // "As of" is fixed per render pass so the list and the card agree on
  // freshness; it moves on whenever the filters do.
  const asOf = useMemo(() => new Date(), [filters]);
  const outcome = useMemo(() => runSearch(filters, {}, asOf), [filters, asOf]);
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

  // Saved gyms live on the device and nowhere else.
  useEffect(() => {
    AsyncStorage.getItem(SAVED_KEY)
      .then((raw) => {
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) setSaved(parsed.filter((id): id is string => typeof id === 'string'));
      })
      .catch(() => undefined);
  }, []);

  const toggleSave = useCallback((id: string) => {
    setSaved((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      AsyncStorage.setItem(SAVED_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  // --- Moving around --------------------------------------------------------

  const goTo = useCallback((centre: LatLng, placeName: string, message: string | null = null) => {
    setFilters((current) => ({ ...current, centre, placeName }));
    setNotice(message);
    map.current?.flyTo(centre, 0.045);
  }, []);

  const pickPlace = useCallback(
    (place: Place) => {
      Keyboard.dismiss();
      setQuery('');
      goTo(place.position, place.name);
      mainSheet.current?.snapToIndex(1);
    },
    [goTo],
  );

  const submitSearch = useCallback(() => {
    const result = geocode(query);
    Keyboard.dismiss();
    if (result.place) return pickPlace(result.place);
    if (result.outOfArea) {
      haptic.warn();
      setQuery('');
      goTo(PILOT_CENTRE, 'Surry Hills', EMPTY.outOfArea);
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
      if (haversineKm(here, PILOT_CENTRE) > PILOT_REACH_KM) {
        haptic.warn();
        goTo(PILOT_CENTRE, 'Surry Hills', EMPTY.locationFar);
        return;
      }
      haptic.success();
      goTo(here, 'your location');
    } catch {
      setNotice("Couldn't get a fix on where you are. Search a suburb instead.");
    }
  }, [goTo]);

  // --- Selecting a gym ------------------------------------------------------

  const select = useCallback(
    (id: string) => {
      const result = outcome.results.find((item) => item.record.location.id === id);
      if (!result) return;
      haptic.tap();
      Keyboard.dismiss();
      setSelectedId(id);
      placeSheet.current?.present();
      if (restoreIndex.current === null) restoreIndex.current = sheetIndex.current;
      mainSheet.current?.snapToIndex(0);
      map.current?.flyTo(result.record.location.position, 0.02);
    },
    [outcome],
  );

  const closePlace = useCallback(() => placeSheet.current?.dismiss(), []);

  // --- Filters --------------------------------------------------------------

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
    filterSheet.current?.present();
  }, []);

  // --- Layout ---------------------------------------------------------------

  // iOS sheet feel: quick, settles without wobbling.
  const spring = useBottomSheetSpringConfigs({ damping: 80, stiffness: 500, overshootClamping: true });
  const snapPoints = useMemo(() => [PEEK + insets.bottom, '50%', '92%'], [insets.bottom]);
  const placeSnaps = useMemo(() => ['58%', '92%'], []);
  const filterSnaps = useMemo(() => ['92%'], []);

  const backdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.18} />
    ),
    [],
  );

  return (
    <View style={styles.root}>
      <GymMap
        ref={map}
        pins={pins}
        selectedId={selectedId}
        initialCentre={filters.centre}
        topInset={insets.top}
        // Keep the map's idea of "centre" above the sheet, not behind it.
        bottomInset={Math.min(sheetTop, height * 0.5)}
        showsUserLocation={locationShown}
        onSelect={select}
        onMapPress={() => {
          Keyboard.dismiss();
          if (selectedId) closePlace();
        }}
      />

      {/* Floating controls ------------------------------------------------ */}
      <View style={[styles.topBar, { top: insets.top + space[2] }]} pointerEvents="box-none">
        <Glass style={styles.demoPill}>
          <View style={styles.demoDot} />
          <Txt variant="footnote" style={styles.demoText}>
            Demo gyms
          </Txt>
        </Glass>

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
      </View>

      {!selfCheck.ok && (
        <View style={[styles.selfCheck, { top: insets.top + 64 }]}>
          <Icon name="maybe" size={16} color={color.maybeInk} />
          <Txt variant="footnote" color={color.maybeInk} style={styles.flex}>
            This phone can't do Sydney time zones reliably, so guest-hour answers may be an hour out. (
            {selfCheck.detail})
          </Txt>
        </View>
      )}

      {/* The results sheet ------------------------------------------------- */}
      <BottomSheet
        ref={mainSheet}
        index={1}
        snapPoints={snapPoints}
        animationConfigs={spring}
        backgroundComponent={ResultsBackground}
        detached
        bottomInset={SHEET_GAP}
        handleIndicatorStyle={styles.handle}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onAnimate={(from, to) => {
          if (from !== to && to >= 0) haptic.select();
        }}
        onChange={(index, position) => {
          sheetIndex.current = index;
          setSheetTop(Math.max(0, height - position));
        }}
      >
        <BottomSheetScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom }}>
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
            onSelect={select}
            onApplyRelaxation={relax}
            notice={notice}
          />
        </BottomSheetScrollView>
      </BottomSheet>

      {/* A gym's place card, stacked on top -------------------------------- */}
      <BottomSheetModal
        ref={placeSheet}
        snapPoints={placeSnaps}
        animationConfigs={spring}
        enableDynamicSizing={false}
        backgroundComponent={PlaceBackground}
        detached
        bottomInset={SHEET_GAP}
        handleIndicatorStyle={styles.handle}
        onDismiss={() => {
          setSelectedId(null);
          setCardScrolled(false);
          if (restoreIndex.current !== null) mainSheet.current?.snapToIndex(restoreIndex.current);
          restoreIndex.current = null;
        }}
      >
        {selected && (
          <BottomSheetScrollView
            stickyHeaderIndices={[0]}
            contentContainerStyle={{ paddingBottom: insets.bottom + space[6] }}
            onScroll={(event) => {
              const past = event.nativeEvent.contentOffset.y > 4;
              if (past !== cardScrolled) setCardScrolled(past);
            }}
          >
            <PlaceHeader result={selected} onClose={closePlace} scrolled={cardScrolled} />
            <PlaceCard
              key={selected.record.location.id}
              result={selected}
              visitMinute={filters.visitMinuteOfDay}
              visitDate={filters.visitDate}
              saved={saved.includes(selected.record.location.id)}
              onToggleSave={() => toggleSave(selected.record.location.id)}
              asOf={asOf}
            />
          </BottomSheetScrollView>
        )}
      </BottomSheetModal>

      {/* Filters, stacked on top --------------------------------------- */}
      <BottomSheetModal
        ref={filterSheet}
        snapPoints={filterSnaps}
        animationConfigs={spring}
        enableDynamicSizing={false}
        backgroundComponent={SolidSheetBackground}
        handleIndicatorStyle={styles.handle}
        backdropComponent={backdrop}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: insets.bottom }}>
          <FiltersContent
            filters={filters}
            onChange={setFilters}
            resultCount={outcome.results.length}
            onDone={() => filterSheet.current?.dismiss()}
          />
        </BottomSheetScrollView>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.groupedBackground },
  flex: { flex: 1 },

  topBar: {
    position: 'absolute',
    left: space[4],
    right: space[4],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  demoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: space[3],
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.glassBorder,
  },
  demoDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: color.maybe },
  demoText: face('medium'),

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
