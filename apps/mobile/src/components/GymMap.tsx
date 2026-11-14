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
import MapView, { Marker, type MapMarker, type Region } from 'react-native-maps';
import type { BoundingBox } from '@gymgo/domain';
import { assignSlots, mapItems, sameSpot, zoomOf, type MapItem } from '@/lib/cluster';
import { currentTheme } from '@/lib/theme';
import type { GymMapHandle, GymMapProps } from './map-types';
import { ClusterBubble, PICKED_ANCHOR_Y, PICKED_CENTER_OFFSET, Pin } from './Pin';

export type { GymMapHandle, MapPin } from './map-types';

const HIDE_BUSINESSES = [{ featureType: 'poi.business', stylers: [{ visibility: 'off' }] }];

/** Where an empty marker slot waits: far south in the sea, see-through. */
const PARKED = { latitude: -84, longitude: -170 };
const NO_OFFSET = { x: 0, y: 0 };
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
  const marker = useRef<MapMarker>(null);
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
      ref={marker}
      coordinate={position ? { latitude: position.lat, longitude: position.lng } : PARKED}
      // The picked teardrop's tip on the gym; anything else, its middle.
      // This map is Apple's (the iPhone's; Android and the browser have their
      // own files), which ignores `anchor` and moves the marker by
      // `centerOffset`. `anchor` only matters if it's ever Google's.
      anchor={{ x: 0.5, y: selected ? PICKED_ANCHOR_Y : 0.5 }}
      centerOffset={selected ? PICKED_CENTER_OFFSET : NO_OFFSET}
      opacity={item ? 1 : 0}
      onPress={(event) => {
        event.stopPropagation();
        if (item?.kind === 'pin') onPin(item.id);
        else if (item) onCluster(item);
        // Apple's map keeps a tapped marker "selected", drawn above the rest
        // (the picked gym's teardrop included), and the slot keeps that when
        // it's given to another gym. Let it go.
        setTimeout(() => marker.current?.hideCallout(), 0);
      }}
      tracksViewChanges={tracking}
      zIndex={!item ? 0 : selected ? 10 : item.kind === 'cluster' ? 4 : item.pin.tier === 'confirmed' ? 3 : item.pin.tier === 'needs_confirmation' ? 2 : 1}
      accessibilityLabel={!item ? undefined : item.kind === 'pin' ? item.pin.name : sameSpot(item.points) ? `${item.count} gyms in one place. Opens the best match` : `${item.count} gyms here. Zoom in`}
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

/**
 * The part of the map you can see: Apple's region is the whole view, under
 * the sheet and the controls at the top too (the browser's and Android's
 * maps already leave those out), so Search this area searched gyms hidden
 * under the list.
 */
function visibleBox(region: Region, height: number, top: number, bottom: number): BoundingBox {
  const box = boxOf(region);
  if (height <= 0) return box;
  const perPoint = region.latitudeDelta / height;
  const north = box.north - Math.min(top, height / 2) * perPoint;
  const south = box.south + Math.min(bottom, height / 2) * perPoint;
  return north > south ? { ...box, north, south } : box;
}

/** A few gyms close together, or one: framed at about street level, not as close as Apple's map can go. */
const CLOSEST_SPAN = 0.006;

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

  // On iOS a tap on a pin also reaches the map's own tap handler, about a
  // third of a second later (the map waits to see if it's a double tap).
  // Treated naively, the pin opens its card and the "map" tap closes it
  // again. So each touch remembers whether it hit a pin, and the map's tap
  // for that touch stands down, however late it comes.
  const pinThisTouch = useRef(false);
  const pendingMapPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (pendingMapPress.current) clearTimeout(pendingMapPress.current);
  }, []);
  // The latest handlers, for a tap that lands after a redraw.
  const handlers = useRef({ onMapPress, onSelect, onRegionChange });
  handlers.current = { onMapPress, onSelect, onRegionChange };
  // The map's height and what covers it, for the part you can see.
  const [height, setHeight] = useState(0);
  const cover = useRef({ top: topInset, bottom: bottomInset, height: 0 });
  cover.current = { top: topInset, bottom: bottomInset, height };

  const hitPin = () => {
    pinThisTouch.current = true;
    if (pendingMapPress.current) clearTimeout(pendingMapPress.current);
  };
  const pressPin = (id: string) => {
    hitPin();
    onSelect(id);
  };

  /** Frame these places clear of the sheet and the controls, never closer than street level. */
  const frame = (points: Array<{ lat: number; lng: number }>, margin: number) => {
    if (points.length === 0) return;
    const lats = points.map((point) => point.lat);
    const lngs = points.map((point) => point.lng);
    const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
    if (span < CLOSEST_SPAN) {
      const centre = { latitude: (Math.max(...lats) + Math.min(...lats)) / 2, longitude: (Math.max(...lngs) + Math.min(...lngs)) / 2 };
      map.current?.animateToRegion({ ...centre, latitudeDelta: CLOSEST_SPAN * 1.6, longitudeDelta: CLOSEST_SPAN * 1.6 }, 450);
      return;
    }
    map.current?.fitToCoordinates(
      points.map((point) => ({ latitude: point.lat, longitude: point.lng })),
      { edgePadding: { top: cover.current.top + margin, right: margin, bottom: cover.current.bottom + margin, left: margin }, animated: true },
    );
  };

  useImperativeHandle(ref, () => ({
    flyTo(centre, span = 0.03) {
      map.current?.animateToRegion(
        { latitude: centre.lat, longitude: centre.lng, latitudeDelta: span, longitudeDelta: span },
        450,
      );
    },
    fitTo(points) {
      frame(points, 60);
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
      // North stays up and the map flat, as in the browser and on Android:
      // there's no compass to turn it back, and a turned or tilted map
      // groups the pins and sizes the area as if zoomed out.
      rotateEnabled={false}
      pitchEnabled={false}
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      // Apple's map says nothing about where it starts: ask, so the area is known before the first drag.
      onMapReady={() => {
        void map.current
          ?.getMapBoundaries()
          .then(({ northEast, southWest }) => {
            const next = {
              latitude: (northEast.latitude + southWest.latitude) / 2,
              longitude: (northEast.longitude + southWest.longitude) / 2,
              latitudeDelta: Math.abs(northEast.latitude - southWest.latitude),
              longitudeDelta: Math.abs(northEast.longitude - southWest.longitude),
            };
            if (!(next.latitudeDelta > 0 && next.longitudeDelta > 0)) return;
            setRegion(next);
            handlers.current.onRegionChange?.(visibleBox(next, cover.current.height, cover.current.top, cover.current.bottom));
          })
          .catch(() => {});
      }}
      onRegionChangeComplete={(next) => {
        setRegion(next);
        onRegionChange?.(visibleBox(next, height, topInset, bottomInset));
      }}
      // A new touch: it hasn't hit a pin yet.
      onTouchStart={() => {
        pinThisTouch.current = false;
      }}
      onPress={(event) => {
        if (event.nativeEvent.action === 'marker-press' || pinThisTouch.current) return;
        if (pendingMapPress.current) clearTimeout(pendingMapPress.current);
        // A beat, in case this touch's pin press is still on its way.
        pendingMapPress.current = setTimeout(() => {
          pendingMapPress.current = null;
          if (!pinThisTouch.current) handlers.current.onMapPress();
        }, 80);
      }}
    >
      {slots.map((item, index) => (
        <SlotMarker
          // The slot is the identity here, on purpose: a marker is never taken away.
          key={index}
          item={item}
          onPin={pressPin}
          onCluster={(cluster) => {
            hitPin();
            // Gyms in one building never part by zooming: open the best of them.
            if (sameSpot(cluster.points)) return handlers.current.onSelect(cluster.ids[0]!);
            frame(cluster.points, 80);
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
