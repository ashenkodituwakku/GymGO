/**
 * The map, in the web preview only.
 *
 * react-native-maps has no web renderer, and the phone app never runs this
 * file — Metro picks GymMap.tsx for iOS and Android. It exists so the app can
 * be previewed and screenshotted in a browser with a real map under it rather
 * than an empty frame.
 *
 * Tiles are OpenFreeMap's, which are free to use with attribution and need no
 * key; the attribution control is left on because it is a licence condition.
 * OpenStreetMap's own tile servers are not used: their usage policy does not
 * cover an app.
 */

import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { TIER_COLOUR } from './ui';
import type { GymMapHandle, GymMapProps } from './map-types';

export type { GymMapHandle, MapPin } from './map-types';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** A dumbbell, drawn as plain shapes so the preview needs no icon font. */
const DUMBBELL_SVG =
  '<svg viewBox="0 0 24 24" width="60%" height="60%" fill="white" aria-hidden="true">' +
  '<rect x="1.5" y="8" width="3" height="8" rx="1"/><rect x="4.5" y="6" width="3" height="12" rx="1"/>' +
  '<rect x="7.5" y="10.8" width="9" height="2.4"/>' +
  '<rect x="16.5" y="6" width="3" height="12" rx="1"/><rect x="19.5" y="8" width="3" height="8" rx="1"/></svg>';

function pinElement(fill: string, selected: boolean, label: string): HTMLElement {
  const size = selected ? 44 : 30;
  const wrap = document.createElement('button');
  wrap.type = 'button';
  wrap.setAttribute('aria-label', label);
  wrap.style.cssText =
    'display:flex;flex-direction:column;align-items:center;background:none;border:0;padding:0;cursor:pointer;';
  const disc = document.createElement('div');
  disc.style.cssText =
    `width:${size}px;height:${size}px;border-radius:50%;background:${fill};` +
    `border:${selected ? 3 : 2}px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);` +
    'display:flex;align-items:center;justify-content:center;transition:transform 180ms cubic-bezier(.32,.72,0,1);';
  disc.innerHTML = DUMBBELL_SVG;
  wrap.appendChild(disc);
  if (selected) {
    const pointer = document.createElement('div');
    pointer.style.cssText =
      `width:0;height:0;margin-top:-2px;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid ${fill};`;
    wrap.appendChild(pointer);
  }
  return wrap;
}

export const GymMap = forwardRef<GymMapHandle, GymMapProps>(function GymMap(
  { pins, selectedId, initialCentre, bottomInset, topInset, leftInset = 0, onSelect, onMapPress },
  ref,
) {
  const host = useRef<View>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const handlers = useRef({ onSelect, onMapPress });
  handlers.current = { onSelect, onMapPress };

  useImperativeHandle(ref, () => ({
    flyTo(centre, span = 0.03) {
      const zoom = Math.log2(360 / span) - 0.6;
      map.current?.flyTo({ center: [centre.lng, centre.lat], zoom, duration: 450 });
    },
    fitTo(points) {
      const first = points[0];
      if (!map.current || !first) return;
      const bounds = new maplibregl.LngLatBounds([first.lng, first.lat], [first.lng, first.lat]);
      for (const point of points) bounds.extend([point.lng, point.lat]);
      map.current.fitBounds(bounds, { padding: 60, duration: 500, maxZoom: 15 });
    },
  }));

  useEffect(() => {
    const container = host.current as unknown as HTMLElement | null;
    if (!container) return;
    const instance = new maplibregl.Map({
      container,
      style: STYLE_URL,
      center: [initialCentre.lng, initialCentre.lat],
      zoom: 13.2,
      attributionControl: false,
    });
    // The tile licence requires the credit to stay visible, so it sits just
    // above the sheet's edge (see the padding effect), where Apple Maps puts
    // its own "Legal" link.
    instance.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    instance.on('click', () => handlers.current.onMapPress());
    map.current = instance;
    if (__DEV__) (globalThis as { __gymgoMap?: maplibregl.Map }).__gymgoMap = instance;
    return () => instance.remove();
    // The map is created once; props update it through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    instance.setPadding({ top: topInset, bottom: bottomInset, left: leftInset, right: 0 });
    const corner = instance.getContainer().querySelector<HTMLElement>('.maplibregl-ctrl-bottom-left');
    if (corner) {
      corner.style.bottom = `${bottomInset + 6}px`;
      corner.style.left = `${leftInset}px`;
    }
  }, [bottomInset, topInset, leftInset]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    for (const marker of markers.current) marker.remove();
    markers.current = pins.map((pin) => {
      const selected = pin.id === selectedId;
      const element = pinElement(TIER_COLOUR[pin.tier].fill, selected, pin.name);
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        handlers.current.onSelect(pin.id);
      });
      element.style.zIndex = selected ? '10' : pin.tier === 'confirmed' ? '3' : '1';
      return new maplibregl.Marker({ element, anchor: selected ? 'bottom' : 'center' })
        .setLngLat([pin.position.lng, pin.position.lat])
        .addTo(instance);
    });
  }, [pins, selectedId]);

  // MapLibre's stylesheet makes its container `position: relative`, which
  // would cancel an absolute fill — so the fill goes on a wrapper instead.
  return (
    <View style={StyleSheet.absoluteFill}>
      <View ref={host} style={styles.host} />
    </View>
  );
});

const styles = StyleSheet.create({
  host: { width: '100%', height: '100%' },
});
