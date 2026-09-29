/**
 * The map, on iPhone.
 *
 * react-native-maps draws with Apple's MapKit (no key, no account). Android
 * uses GymMap.android.tsx instead, because Google Maps doesn't load in Expo
 * Go on Android at the moment.
 *
 * Apple's and Google's own points of interest are switched off: these are
 * invented demo gyms, and a real business label appearing beside one would
 * blur exactly the line the demo banner exists to draw.
 */

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import type { BoundingBox } from '@gymgo/domain';
import { assignSlots, mapItems, sameSpot, zoomOf, type MapItem } from '@/lib/cluster';
import { currentTheme } from '@/lib/theme';
import type { GymMapHandle, GymMapProps } from './map-types';
import { ClusterBubble, Pin } from './Pin';

export type { GymMapHandle, MapPin } from './map-types';

const HIDE_BUSINESSES = [{ featureType: 'poi.business', stylers: [{ visibility: 'off' }] }];

/** Where an empty marker slot waits: far south in the sea, see-through. */
const PARKED = { latitude: -84, longitude: -170 };
/**
 * Marker slots made with the map itself, before it's on screen, so Apple's
 * map first asks for their pictures once they have them. More are added
 * only when more is on screen than this.
 */
const POOL = 48;

/**
 * One marker slot (see assignSlots in lib/cluster.ts): a gym's pin, a bubble,
 * or nothing. It re-snapshots its picture briefly after it changes, then
 * stops: tracking view changes forever is the usual cause of janky custom
 * markers; never tracking them leaves the picture blank.
 *
 * Its own view is always there, whatever it shows (collapsable={false}, so
 * React Native never folds it away as layout-only). react-native-maps draws
 * Apple's red balloon for a marker that has no view of its own at the moment
 * Apple's map asks for its picture, and keeps it: an empty slot did, and
 * went on showing the balloon when a gym moved into it.
 */
function SlotMarker({ item, onPin, onCluster }: { item: MapItem | null; onPin: (id: string) => void; onCluster: (item: Extract<MapItem, { kind: 'cluster' }>) => void }) {
  const [tracking, setTracking] = useState(true);
  const face = item === null ? 'empty' : item.kind === 'pin' ? `pin:${item.id}:${item.pin.tier}:${item.selected}` : `cluster:${item.id}:${item.count}:${item.tier}`;
  useEffect(() => {
    setTracking(true);
    const timer = setTimeout(() => setTracking(false), 700);
    return () => clearTimeout(timer);
  }, [face]);

  const position = item === null ? null : item.kind === 'pin' ? item.pin.position : item.position;
  const selected = item?.kind === 'pin' && item.selected;
  return (
    <Marker
      coordinate={position ? { latitude: position.lat, longitude: position.lng } : PARKED}
      anchor={{ x: 0.5, y: selected ? 0.85 : 0.5 }}
      opacity={item ? 1 : 0}
      onPress={(event) => {
        event.stopPropagation();
        if (item?.kind === 'pin') onPin(item.id);
        else if (item) onCluster(item);
      }}
      tracksViewChanges={tracking}
      zIndex={!item ? 0 : selected ? 10 : item.kind === 'cluster' ? 4 : item.pin.tier === 'confirmed' ? 3 : item.pin.tier === 'needs_confirmation' ? 2 : 1}
      accessibilityLabel={!item ? undefined : item.kind === 'pin' ? item.pin.name : `${item.count} gyms here. Zoom in`}
    >
      {/* Keyed inside the slot's own view, so a new gym lands with its spring. */}
      <View collapsable={false} style={styles.slot}>
        {item === null ? (
          <View style={styles.empty} />
        ) : item.kind === 'pin' ? (
          <Pin key={item.id} tier={item.pin.tier} selected={item.selected} />
        ) : (
          <ClusterBubble key={item.id} tier={item.tier} count={item.count} />
        )}
      </View>
    </Marker>
  );
}

const boxOf = (region: Region): BoundingBox => ({
  north: region.latitude + region.latitudeDelta / 2,
  south: region.latitude - region.latitudeDelta / 2,
  east: region.longitude + region.longitudeDelta / 2,
  west: region.longitude - region.longitudeDelta / 2,
});

export const GymMap = forwardRef<GymMapHandle, GymMapProps>(function GymMap(
  { pins, selectedId, initialCentre, bottomInset, creditInset, topInset, showsUserLocation, onSelect, onMapPress, onRegionChange },
  ref,
) {
  const map = useRef<MapView>(null);
  const { width } = useWindowDimensions();

  // The zoom and area on screen, for grouping pins (see lib/cluster.ts).
  const [region, setRegion] = useState<Region>(() => ({ latitude: initialCentre.lat, longitude: initialCentre.lng, latitudeDelta: 0.045, longitudeDelta: 0.045 }));
  const items = useMemo(() => {
    return mapItems(pins, zoomOf((360 / region.longitudeDelta) * width), boxOf(region), selectedId);
  }, [pins, region, width, selectedId]);
  // Markers are never taken off Apple's map, only moved and redrawn (see assignSlots).
  const slotIds = useRef<Array<string | null>>(Array.from({ length: POOL }, () => null));
  const slots = useMemo(() => {
    const next = assignSlots(slotIds.current, items);
    slotIds.current = next.map((item) => item?.id ?? null);
    return next;
  }, [items]);

  // On iOS a tap on a pin also reaches the map's own tap handler, in either
  // order. Treated naively, the pin opens its card and the "map" tap closes it
  // again. So a map tap waits a beat and stands down if a pin was hit.
  const lastPinPress = useRef(0);
  const pendingMapPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (pendingMapPress.current) clearTimeout(pendingMapPress.current);
  }, []);

  const pressPin = (id: string) => {
    lastPinPress.current = Date.now();
    if (pendingMapPress.current) clearTimeout(pendingMapPress.current);
    onSelect(id);
  };

  useImperativeHandle(ref, () => ({
    flyTo(centre, span = 0.03) {
      map.current?.animateToRegion(
        { latitude: centre.lat, longitude: centre.lng, latitudeDelta: span, longitudeDelta: span },
        450,
      );
    },
    fitTo(points) {
      if (points.length === 0) return;
      map.current?.fitToCoordinates(
        points.map((point) => ({ latitude: point.lat, longitude: point.lng })),
        { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true },
      );
    },
  }));

  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      userInterfaceStyle={currentTheme().scheme}
      initialRegion={{
        latitude: initialCentre.lat,
        longitude: initialCentre.lng,
        latitudeDelta: 0.045,
        longitudeDelta: 0.045,
      }}
      mapPadding={{ top: topInset, right: 0, bottom: bottomInset, left: 0 }}
      // Apple's "Legal" link must stay visible: keep it above the sheet's edge.
      legalLabelInsets={{ top: 0, right: 0, bottom: Math.max(bottomInset, creditInset ?? 0) + 6, left: 16 }}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={false}
      showsCompass={false}
      showsPointsOfInterests={false}
      // Android's Google map ignores the flag above; a style rule hides
      // business labels there instead.
      customMapStyle={Platform.OS === 'android' ? HIDE_BUSINESSES : undefined}
      showsBuildings
      toolbarEnabled={false}
      pitchEnabled={Platform.OS === 'ios'}
      onRegionChangeComplete={(next) => {
        setRegion(next);
        onRegionChange?.(boxOf(next));
      }}
      onPress={(event) => {
        if (event.nativeEvent.action === 'marker-press') return;
        if (pendingMapPress.current) clearTimeout(pendingMapPress.current);
        pendingMapPress.current = setTimeout(() => {
          pendingMapPress.current = null;
          if (Date.now() - lastPinPress.current > 400) onMapPress();
        }, 220);
      }}
    >
      {slots.map((item, index) => (
        <SlotMarker
          // The slot is the identity here, on purpose: a marker is never taken away.
          key={index}
          item={item}
          onPin={pressPin}
          onCluster={(cluster) => {
            lastPinPress.current = Date.now();
            if (pendingMapPress.current) clearTimeout(pendingMapPress.current);
            // Gyms in one building never part by zooming: open the best of them.
            if (sameSpot(cluster.points)) return onSelect(cluster.ids[0]!);
            map.current?.fitToCoordinates(
              cluster.points.map((point) => ({ latitude: point.lat, longitude: point.lng })),
              { edgePadding: { top: 80, right: 80, bottom: 80, left: 80 }, animated: true },
            );
          }}
        />
      ))}
    </MapView>
  );
});

const styles = StyleSheet.create({
  slot: { alignItems: 'center' },
  empty: { width: 1, height: 1 },
});
