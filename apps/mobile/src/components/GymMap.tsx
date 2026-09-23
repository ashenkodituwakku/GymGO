/**
 * The map, on iOS and Android.
 *
 * react-native-maps draws with Apple's MapKit on iPhone (no key, no account)
 * and Google Maps on Android. In Expo Go both work as-is; a standalone Android
 * build needs a Google Maps key — see docs/STATUS.md.
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
  { pins, selectedId, initialCentre, bottomInset, topInset, showsUserLocation, onSelect, onMapPress },
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
