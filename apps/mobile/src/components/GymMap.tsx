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

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import type { GymMapHandle, GymMapProps, MapPin } from './map-types';
import { Pin } from './Pin';

export type { GymMapHandle, MapPin } from './map-types';

const HIDE_BUSINESSES = [{ featureType: 'poi.business', stylers: [{ visibility: 'off' }] }];

/**
 * A marker that re-snapshots its custom view briefly after it changes, then
 * stops. Tracking view changes forever is the usual cause of janky custom
 * markers; never tracking them leaves the glyph blank on first draw.
 */
function GymMarker({ pin, selected, onPress }: { pin: MapPin; selected: boolean; onPress: (id: string) => void }) {
  const [tracking, setTracking] = useState(true);

  useEffect(() => {
    setTracking(true);
    const timer = setTimeout(() => setTracking(false), 700);
    return () => clearTimeout(timer);
  }, [selected, pin.tier]);

  return (
    <Marker
      coordinate={{ latitude: pin.position.lat, longitude: pin.position.lng }}
      anchor={{ x: 0.5, y: selected ? 0.85 : 0.5 }}
      onPress={(event) => {
        event.stopPropagation();
        onPress(pin.id);
      }}
      tracksViewChanges={tracking}
      zIndex={selected ? 10 : pin.tier === 'confirmed' ? 3 : pin.tier === 'needs_confirmation' ? 2 : 1}
      accessibilityLabel={pin.name}
    >
      <Pin tier={pin.tier} selected={selected} />
    </Marker>
  );
}

export const GymMap = forwardRef<GymMapHandle, GymMapProps>(function GymMap(
  { pins, selectedId, initialCentre, bottomInset, creditInset, topInset, showsUserLocation, onSelect, onMapPress, onRegionChange },
  ref,
) {
  const map = useRef<MapView>(null);

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
      initialRegion={{
        latitude: initialCentre.lat,
        longitude: initialCentre.lng,
        latitudeDelta: 0.045,
        longitudeDelta: 0.045,
      }}
      mapPadding={{ top: topInset, right: 0, bottom: bottomInset, left: 0 }}
      // Apple's "Legal" link must stay visible: keep it above the sheet's edge.
      legalLabelInsets={{ top: 0, right: 0, bottom: Math.max(bottomInset, creditInset ?? 0) + 6, left: 12 }}
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
      onRegionChangeComplete={(region) =>
        onRegionChange?.({
          north: region.latitude + region.latitudeDelta / 2,
          south: region.latitude - region.latitudeDelta / 2,
          east: region.longitude + region.longitudeDelta / 2,
          west: region.longitude - region.longitudeDelta / 2,
        })
      }
      onPress={(event) => {
        if (event.nativeEvent.action === 'marker-press') return;
        if (pendingMapPress.current) clearTimeout(pendingMapPress.current);
        pendingMapPress.current = setTimeout(() => {
          pendingMapPress.current = null;
          if (Date.now() - lastPinPress.current > 400) onMapPress();
        }, 220);
      }}
    >
      {pins.map((pin) => (
        <GymMarker key={pin.id} pin={pin} selected={pin.id === selectedId} onPress={pressPin} />
      ))}
    </MapView>
  );
});
