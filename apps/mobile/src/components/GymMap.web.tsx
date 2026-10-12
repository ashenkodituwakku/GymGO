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
import { Glass } from './Glass';
import { Pressable } from './motion';
import { TIER_COLOUR, Txt } from './ui';
import { alpha, mix } from '@/lib/looks';
import { DROP_PATH } from '@/lib/pinShape';
import type { GymMapHandle, GymMapProps } from './map-types';
import { mapItems, sameSpot, type MapItem } from '@/lib/cluster';
import { color, currentTheme, face, radius, space, themed } from '@/lib/theme';

export type { GymMapHandle, MapPin } from './map-types';

import { DARK_STYLE_URL, STYLE_URL } from './mapPage';

/** A dumbbell, drawn as plain rounded shapes so the preview needs no icon font. */
const DUMBBELL = (size: string) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="#fff" aria-hidden="true">` +
  '<rect x="2" y="8.6" width="2.6" height="6.8" rx="1.2"/><rect x="5" y="6.2" width="3.3" height="11.6" rx="1.5"/>' +
  '<rect x="8" y="10.9" width="8" height="2.2" rx="1.1"/>' +
  '<rect x="15.7" y="6.2" width="3.3" height="11.6" rx="1.5"/><rect x="19.4" y="8.6" width="2.6" height="6.8" rx="1.2"/></svg>';

/** A spring, as CSS easing: quick, a touch of overshoot, settles. */
const SPRING = 'cubic-bezier(0.34, 1.4, 0.64, 1)';

/** The teardrop of a picked pin, its tip at the foot of a 40 × 50 box (the map point). */
const DROP = DROP_PATH;

/** Lit from above: a lighter shade of the tier's colour at the top, the colour itself below. */
const lit = (fill: string) => `linear-gradient(180deg, ${mix(fill, '#ffffff', 0.28)} 0%, ${fill} 62%, ${mix(fill, '#000000', 0.08)} 100%)`;

/** Hover lift and the press, once per page: the markers are plain elements outside React. */
function ensurePinStyles() {
  if (document.getElementById('gymgo-pin-styles')) return;
  const sheet = document.createElement('style');
  sheet.id = 'gymgo-pin-styles';
  sheet.textContent =
    '.gg-pin .gg-face{transition:transform 160ms cubic-bezier(0.22,1,0.36,1);}' +
    '.gg-pin:hover .gg-face{transform:translateY(-2px) scale(1.08);}' +
    '.gg-pin:active .gg-face{transform:scale(0.94);}' +
    '@media (prefers-reduced-motion: reduce){.gg-pin .gg-face{transition:none;}.gg-pin:hover .gg-face{transform:none;}}';
  document.head.appendChild(sheet);
}

function pinElement(fill: string, selected: boolean, label: string): HTMLElement {
  ensurePinStyles();
  const wrap = document.createElement('button');
  wrap.type = 'button';
  wrap.className = 'gg-pin';
  wrap.setAttribute('aria-label', label);
  // Out of the Tab order: the list beside the map has every one of these
  // gyms, in order, so the keyboard reaches the search and list first
  // rather than forty pins.
  wrap.tabIndex = -1;
  // No `position` of its own: MapLibre's marker class makes it absolute at the
  // map's corner and moves it with a transform. Set to relative, every pin was
  // laid out below the one before it, so each sat further off its gym (28 px
  // more per pin) and slid across the map as it zoomed.
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;background:none;border:0;padding:0;cursor:pointer;';
  if (selected) {
    // One smooth teardrop (no seam where a pointer meets a disc), lit from above, with its shadow on the ground under the tip.
    const id = `gg${Math.random().toString(36).slice(2, 8)}`;
    const face = document.createElement('div');
    face.className = 'gg-face';
    face.style.cssText = 'position:relative;width:44px;height:55px;transform-origin:50% 100%;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.28)) drop-shadow(0 1px 1.5px rgba(0,0,0,0.25));';
    face.innerHTML =
      `<svg viewBox="0 0 40 50" width="44" height="55" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${mix(fill, '#ffffff', 0.3)}"/><stop offset="0.55" stop-color="${fill}"/><stop offset="1" stop-color="${mix(fill, '#000000', 0.1)}"/>` +
      `</linearGradient></defs><path d="${DROP}" fill="url(#${id})" stroke="#fff" stroke-width="2.2"/>` +
      '<circle cx="20" cy="20" r="12.5" fill="rgba(255,255,255,0.14)"/></svg>' +
      `<div style="position:absolute;left:0;right:0;top:0;height:44px;display:flex;align-items:center;justify-content:center;">${DUMBBELL('21')}</div>`;
    const ground = document.createElement('div');
    ground.style.cssText = 'position:absolute;bottom:-3px;left:50%;width:16px;height:6px;margin-left:-8px;border-radius:50%;background:radial-gradient(closest-side, rgba(0,0,0,0.32), rgba(0,0,0,0));pointer-events:none;';
    wrap.appendChild(ground);
    wrap.appendChild(face);
    return wrap;
  }
  const face = document.createElement('div');
  face.className = 'gg-face';
  face.style.cssText =
    `width:28px;height:28px;border-radius:50%;background:${lit(fill)};border:2px solid #fff;box-sizing:border-box;` +
    'box-shadow:0 1px 2px rgba(0,0,0,0.28),0 4px 10px rgba(0,0,0,0.18);' +
    'display:flex;align-items:center;justify-content:center;transform-origin:50% 50%;';
  face.innerHTML = DUMBBELL('16');
  wrap.appendChild(face);
  return wrap;
}

/** Several gyms in one bubble, with how many: a faint halo in its colour says there's more than one. */
function bubbleElement(fill: string, count: number): HTMLElement {
  ensurePinStyles();
  const size = count < 10 ? 32 : count < 100 ? 38 : 44;
  const wrap = document.createElement('button');
  wrap.type = 'button';
  wrap.className = 'gg-pin';
  wrap.setAttribute('aria-label', `${count} gyms here. Zoom in`);
  wrap.tabIndex = -1;
  wrap.style.cssText = 'display:flex;background:none;border:0;padding:0;cursor:pointer;';
  const face = document.createElement('div');
  face.className = 'gg-face';
  face.style.cssText =
    `min-width:${size}px;height:${size}px;border-radius:${size / 2}px;background:${lit(fill)};` +
    `border:2px solid #fff;box-shadow:0 0 0 4px ${alpha(fill, 0.22)},0 1px 2px rgba(0,0,0,0.28),0 5px 12px rgba(0,0,0,0.2);box-sizing:border-box;padding:0 7px;` +
    'display:flex;align-items:center;justify-content:center;color:#fff;font-variant-numeric:tabular-nums;' +
    `font:600 ${count < 100 ? 14 : 12.5}px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,system-ui,sans-serif;letter-spacing:-0.2px;text-shadow:0 1px 1px rgba(0,0,0,0.15);`;
  face.textContent = String(count);
  wrap.appendChild(face);
  return wrap;
}

/** The system's Reduce Motion: pins just appear and go. */
function calm() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Grow in with a spring, the way a pin lands in Maps. */
function popIn(element: HTMLElement, from = 0.4) {
  if (calm()) return;
  const disc = element.querySelector<HTMLElement>('.gg-face');
  disc?.animate?.([{ transform: `scale(${from})`, opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 320, easing: SPRING });
}

/** Shrink away, then go. */
function popOut(element: HTMLElement, done: () => void) {
  if (calm()) return done();
  const disc = element.querySelector<HTMLElement>('.gg-face');
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
  // The map's own pictures didn't come (offline, or a network that blocks
  // them): say so over the blank map, rather than leave it empty, with a way
  // to try again. The pins and the list work regardless.
  const [failed, setFailed] = useState(false);
  const retry = useRef<() => void>(() => {});

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
    // The map style names a few place icons (rowing, ATM, ferry…) its icon
    // set doesn't have. Each gets an empty one, rather than a warning in the
    // console for every icon, every time the map loads.
    instance.on('styleimagemissing', (event: { id: string }) => {
      if (!instance.hasImage(event.id)) instance.addImage(event.id, { width: 1, height: 1, data: new Uint8Array(4) });
    });
    instance.on('click', () => handlers.current.onMapPress());
    // Handled here, so MapLibre doesn't log every missing tile as an error.
    // The style never coming, or every tile so far failing, is a failed map;
    // the first tile to arrive clears it.
    let styled = false;
    let tileLoaded = false;
    let tileErrors = 0;
    let warned = false;
    instance.on('style.load', () => {
      styled = true;
    });
    instance.on('data', (event: { dataType?: string; tile?: unknown }) => {
      if (event.dataType === 'source' && event.tile) {
        tileLoaded = true;
        setFailed(false);
      }
    });
    instance.on('error', (event: { error?: Error; tile?: unknown }) => {
      if (__DEV__ && !warned) {
        warned = true;
        console.warn('[map]', event.error?.message ?? 'map error');
      }
      if (!styled) setFailed(true);
      else if (event.tile && !tileLoaded && ++tileErrors >= 3) setFailed(true);
    });
    retry.current = () => {
      styled = false;
      tileLoaded = false;
      tileErrors = 0;
      setFailed(false);
      instance.setStyle(currentTheme().scheme === 'dark' ? DARK_STYLE_URL : STYLE_URL, { diff: false });
    };
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
      {failed && (
        <View style={[styles.notice, { top: topInset, bottom: bottomInset, left: leftInset }, { pointerEvents: 'box-none' }]}>
          <Glass kind="control" style={styles.noticeCard}>
            <Txt variant="subhead" style={[face('semibold'), styles.center]}>
              The map didn’t load
            </Txt>
            <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
              The gym list still works.
            </Txt>
            <Pressable onPress={() => retry.current()} accessibilityRole="button" style={({ pressed }) => [styles.retry, pressed && { opacity: 0.7 }]}>
              <Txt variant="footnote" color={color.brand} style={face('semibold')}>
                Try again
              </Txt>
            </Pressable>
          </Glass>
        </View>
      )}
    </View>
  );
});

const styles = themed(() => StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, zIndex: 0 },
  host: { width: '100%', height: '100%' },
  notice: { position: 'absolute', right: 0, alignItems: 'center', justifyContent: 'center', padding: space[4] },
  noticeCard: { alignItems: 'center', gap: 2, paddingHorizontal: space[5], paddingVertical: space[3], borderRadius: radius.xl, maxWidth: 300 },
  center: { textAlign: 'center' },
  retry: { marginTop: space[1], paddingHorizontal: space[3], paddingVertical: space[1], borderRadius: radius.pill, backgroundColor: color.brandTint },
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
