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
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { BoundingBox } from '@gymgo/domain';
import { TIER_COLOUR } from './ui';
import type { GymMapHandle, GymMapProps } from './map-types';
import { mapItems, sameSpot, type MapItem } from '@/lib/cluster';
import { currentTheme, themed } from '@/lib/theme';

export type { GymMapHandle, MapPin } from './map-types';

import { DARK_STYLE_URL, STYLE_URL } from './mapPage';

/** A dumbbell, drawn as plain shapes so the preview needs no icon font. */
const DUMBBELL_SVG =
  '<svg viewBox="0 0 24 24" width="60%" height="60%" fill="white" aria-hidden="true">' +
  '<rect x="1.5" y="8" width="3" height="8" rx="1"/><rect x="4.5" y="6" width="3" height="12" rx="1"/>' +
  '<rect x="7.5" y="10.8" width="9" height="2.4"/>' +
  '<rect x="16.5" y="6" width="3" height="12" rx="1"/><rect x="19.5" y="8" width="3" height="8" rx="1"/></svg>';

/** A spring, as CSS easing: quick, a touch of overshoot, settles. */
const SPRING = 'cubic-bezier(0.34, 1.4, 0.64, 1)';

function pinElement(fill: string, selected: boolean, label: string): HTMLElement {
  const size = selected ? 44 : 30;
  const wrap = document.createElement('button');
  wrap.type = 'button';
  wrap.setAttribute('aria-label', label);
  // Out of the Tab order: the list beside the map has every one of these
  // gyms, in order, so the keyboard reaches the search and list first
  // rather than forty pins.
  wrap.tabIndex = -1;
  wrap.style.cssText =
    'display:flex;flex-direction:column;align-items:center;background:none;border:0;padding:0;cursor:pointer;';
  const disc = document.createElement('div');
  disc.style.cssText =
    `width:${size}px;height:${size}px;border-radius:50%;background:${fill};` +
    `border:${selected ? 3 : 2}px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);` +
    'display:flex;align-items:center;justify-content:center;transform-origin:50% 100%;';
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

/** Several gyms in one bubble, with how many. */
function bubbleElement(fill: string, count: number): HTMLElement {
  const size = count < 10 ? 34 : count < 100 ? 40 : 46;
  const wrap = document.createElement('button');
  wrap.type = 'button';
  wrap.setAttribute('aria-label', `${count} gyms here. Zoom in`);
  wrap.tabIndex = -1;
  wrap.style.cssText = 'display:flex;background:none;border:0;padding:0;cursor:pointer;';
  const disc = document.createElement('div');
  disc.style.cssText =
    `min-width:${size}px;height:${size}px;border-radius:${size / 2}px;background:${fill};` +
    'border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.28);box-sizing:border-box;padding:0 6px;' +
    'display:flex;align-items:center;justify-content:center;color:#fff;' +
    `font:600 ${count < 100 ? 15 : 13}px/1 -apple-system,system-ui,sans-serif;letter-spacing:-0.2px;`;
  disc.textContent = String(count);
  wrap.appendChild(disc);
  return wrap;
}

/** The system's Reduce Motion: pins just appear and go. */
function calm() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Grow in with a spring, the way a pin lands in Maps. */
function popIn(element: HTMLElement, from = 0.4) {
  if (calm()) return;
  const disc = element.firstElementChild as HTMLElement | null;
  disc?.animate?.([{ transform: `scale(${from})`, opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 320, easing: SPRING });
}

/** Shrink away, then go. */
function popOut(element: HTMLElement, done: () => void) {
  if (calm()) return done();
  const disc = element.firstElementChild as HTMLElement | null;
  const animation = disc?.animate?.([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.5)', opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
  if (!animation) return done();
  // Gone for certain even if the animation never finishes (a background
  // tab), so a gym can't be left on the map twice.
  let gone = false;
  const remove = () => {
    if (gone) return;
    gone = true;
    done();
  };
  animation.onfinish = remove;
  animation.oncancel = remove;
  setTimeout(remove, 400);
}

function signature(item: MapItem): string {
  return item.kind === 'pin' ? `pin:${item.pin.tier}:${item.selected}` : `cluster:${item.count}:${item.tier}`;
}


/**
 * The map's credit, as fixed text and links. MapLibre's own attribution
 * control would put the tile server's attribution HTML on the page through
 * its HTML sanitizer, which has a known way round it (fixed only in
 * MapLibre 6, whose worker Metro can't bundle yet), so nothing from the
 * tile server is ever put on the page as HTML.
 */
const CREDITS: Array<[string, string]> = [
  ['OpenFreeMap', 'https://openfreemap.org'],
  ['© OpenMapTiles', 'https://www.openmaptiles.org/'],
  ['© OpenStreetMap contributors', 'https://www.openstreetmap.org/copyright'],
];

class MapCredit implements maplibregl.IControl {
  private box: HTMLElement | null = null;

  onAdd(): HTMLElement {
    const box = document.createElement('div');
    box.className = 'maplibregl-ctrl maplibregl-ctrl-attrib';
    const inner = document.createElement('div');
    inner.className = 'maplibregl-ctrl-attrib-inner';
    CREDITS.forEach(([text, href], index) => {
      if (index > 0) inner.append(' ');
      const link = document.createElement('a');
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = text;
      inner.append(link);
    });
    box.append(inner);
    this.box = box;
    return box;
  }

  onRemove(): void {
    this.box?.remove();
    this.box = null;
  }
}

export const GymMap = forwardRef<GymMapHandle, GymMapProps>(function GymMap(
  { pins, selectedId, initialCentre, bottomInset, creditInset, topInset, leftInset = 0, userLocation = null, onSelect, onMapPress, onRegionChange },
  ref,
) {
  const host = useRef<View>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef(new Map<string, { marker: maplibregl.Marker; signature: string }>());
  // The zoom (256-point tile levels) and area on screen, for grouping pins.
  const [view, setView] = useState<{ zoom: number; box: BoundingBox } | null>(null);
  const handlers = useRef({ onSelect, onMapPress, onRegionChange });
  handlers.current = { onSelect, onMapPress, onRegionChange };
  // Where a flyTo is headed, while it's under way (see the padding effect).
  const flight = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const padded = useRef(false);

  useImperativeHandle(ref, () => ({
    flyTo(centre, span = 0.03) {
      const zoom = Math.log2(360 / span) - 0.6;
      const target = { center: [centre.lng, centre.lat] as [number, number], zoom };
      map.current?.flyTo({ ...target, duration: 450 });
      flight.current = target;
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
      style: currentTheme().scheme === 'dark' ? DARK_STYLE_URL : STYLE_URL,
      center: [initialCentre.lng, initialCentre.lat],
      zoom: 13.2,
      attributionControl: false,
    });
    // The tile licence requires the credit to stay visible, so it sits just
    // above the sheet's edge (see the padding effect), where Apple Maps puts
    // its own "Legal" link.
    instance.addControl(new MapCredit(), 'bottom-left');
    instance.on('click', () => handlers.current.onMapPress());
    // The area on screen, clear of the panels and sheet, whenever the map comes to rest.
    const noteView = () => {
      const bounds = instance.getBounds();
      // MapLibre's tiles are 512 pixels, so its zoom numbers are one less than Apple's.
      setView({ zoom: instance.getZoom() + 1, box: { north: bounds.getNorth(), south: bounds.getSouth(), west: bounds.getWest(), east: bounds.getEast() } });
    };
    instance.on('load', noteView);
    instance.on('moveend', () => {
      noteView();
      flight.current = null;
      const { top = 0, bottom = 0, left = 0, right = 0 } = instance.getPadding();
      const canvas = instance.getCanvas();
      const nw = instance.unproject([left, top]);
      const se = instance.unproject([canvas.clientWidth - right, Math.max(top + 1, canvas.clientHeight - bottom)]);
      handlers.current.onRegionChange?.({ north: nw.lat, south: se.lat, west: nw.lng, east: se.lng });
    });
    map.current = instance;
    if (__DEV__) (globalThis as { __gymgoMap?: maplibregl.Map }).__gymgoMap = instance;
    return () => instance.remove();
    // The map is created once; props update it through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const padding = { top: topInset, bottom: bottomInset, left: leftInset, right: 0 };
    // A sheet or panel moving eases the map with it. Mid-flight (a gym was
    // just picked and its card is rising), the flight is re-aimed with the
    // new padding: changing it outright would stop the map where it was.
    const target = flight.current;
    if (!padded.current) instance.setPadding(padding);
    else if (target && instance.isMoving()) {
      instance.flyTo({ ...target, padding, duration: 450 });
      flight.current = target;
    } else instance.easeTo({ padding, duration: 300 });
    padded.current = true;
    const corner = instance.getContainer().querySelector<HTMLElement>('.maplibregl-ctrl-bottom-left');
    if (corner) {
      corner.style.bottom = `${Math.max(bottomInset, creditInset ?? 0) + 6}px`;
      corner.style.left = `${leftInset}px`;
    }
  }, [bottomInset, creditInset, topInset, leftInset]);

  const items = useMemo(() => mapItems(pins, view?.zoom ?? 14, view?.box ?? null, selectedId), [pins, view, selectedId]);

  // Only what changed is redrawn: picking a gym touches two pins, not every one.
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const before = markers.current;
    const after = new Map<string, { marker: maplibregl.Marker; signature: string }>();
    for (const item of items) {
      const position: [number, number] = item.kind === 'pin' ? [item.pin.position.lng, item.pin.position.lat] : [item.position.lng, item.position.lat];
      const sig = signature(item);
      const kept = before.get(item.id);
      if (kept && kept.signature === sig) {
        kept.marker.setLngLat(position);
        after.set(item.id, kept);
        before.delete(item.id);
        continue;
      }
      const wasSelected = kept?.signature.endsWith(':true') ?? false;
      kept?.marker.remove();
      before.delete(item.id);
      let element: HTMLElement;
      if (item.kind === 'pin') {
        const { pin, selected } = item;
        element = pinElement(TIER_COLOUR[pin.tier].fill, selected, pin.name);
        element.addEventListener('click', (event) => {
          event.stopPropagation();
          handlers.current.onSelect(pin.id);
        });
        element.style.zIndex = selected ? '10' : pin.tier === 'confirmed' ? '3' : '1';
      } else {
        const { points, ids } = item;
        element = bubbleElement(TIER_COLOUR[item.tier].fill, item.count);
        element.style.zIndex = '4';
        element.addEventListener('click', (event) => {
          event.stopPropagation();
          // Gyms in one building never part by zooming: open the best of them.
          if (sameSpot(points)) return handlers.current.onSelect(ids[0]!);
          const bounds = new maplibregl.LngLatBounds([points[0]!.lng, points[0]!.lat], [points[0]!.lng, points[0]!.lat]);
          for (const point of points) bounds.extend([point.lng, point.lat]);
          instance.fitBounds(bounds, { padding: 80, duration: 450, maxZoom: 16 });
        });
      }
      const marker = new maplibregl.Marker({ element, anchor: item.kind === 'pin' && item.selected ? 'bottom' : 'center' }).setLngLat(position).addTo(instance);
      // A picked pin grows from its small self; one let go settles back.
      popIn(element, item.kind === 'pin' && item.selected ? 0.68 : wasSelected ? 1.3 : 0.4);
      after.set(item.id, { marker, signature: sig });
    }
    for (const { marker } of before.values()) popOut(marker.getElement(), () => marker.remove());
    markers.current = after;
  }, [items]);

  // You are here: the system-style blue dot with a soft halo.
  const userMarker = useRef<maplibregl.Marker | null>(null);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    userMarker.current?.remove();
    userMarker.current = null;
    if (!userLocation) return;
    userMarker.current = new maplibregl.Marker({ element: userDot(), anchor: 'center' })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(instance);
  }, [userLocation]);

  // MapLibre's stylesheet makes its container `position: relative`, which
  // would cancel an absolute fill — so the fill goes on a wrapper instead.
  // The wrapper is its own stacking layer, so a pin's z-index ranks it among
  // pins only, never over the buttons and sheets laid on the map.
  return (
    <View style={styles.fill}>
      <View ref={host} style={styles.host} />
    </View>
  );
});

const styles = themed(() => StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, zIndex: 0 },
  host: { width: '100%', height: '100%' },
}));

function userDot(): HTMLElement {
  const halo = document.createElement('div');
  halo.setAttribute('aria-label', 'You are here');
  halo.style.cssText =
    'width:36px;height:36px;border-radius:18px;background:rgba(0,122,255,0.18);display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:1000;';
  const dot = document.createElement('div');
  dot.style.cssText =
    'width:16px;height:16px;border-radius:8px;background:#007AFF;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);';
  halo.appendChild(dot);
  return halo;
}
