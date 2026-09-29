/**
 * Pins that would sit on top of each other are drawn as one bubble with a
 * count, the way Apple and Google Maps do. A city's worth of gyms at once
 * would otherwise be a blob no one can tap, and hundreds of pin views are
 * slow to draw on a phone.
 *
 * Grouping works on the map's own pixels at a whole zoom level: gyms nearer
 * than a bubble's width on screen share a bubble. Because it's on the
 * world's pixels (not the screen's), panning never regroups anything; only
 * zooming does. The gym you picked is always its own pin. Only what's on
 * screen (and half a screen round it) is drawn.
 *
 * The same function serves all three maps: Apple's on iPhone, and the
 * MapLibre maps on Android and in a browser.
 */

import type { BoundingBox, LatLng, ResultTier } from '@gymgo/domain';
import type { MapPin } from '@/components/map-types';

export type MapItem =
  | { kind: 'pin'; id: string; pin: MapPin; selected: boolean }
  | {
      kind: 'cluster';
      id: string;
      position: LatLng;
      count: number;
      /** The best fit among them, for the bubble's colour. */
      tier: ResultTier;
      /** Where its gyms are, to zoom to on a tap. */
      points: LatLng[];
      /** Its gyms, best fit first. */
      ids: string[];
    };

/** Closer than this on screen, in points, and two pins share a bubble. */
const RADIUS = 44;
/** At this zoom (street level and closer) every gym is its own pin. */
export const NO_CLUSTER_ZOOM = 16;

const RANK: Record<ResultTier, number> = { confirmed: 0, needs_confirmation: 1, ruled_out: 2 };

/** Web Mercator pixels, for a world `size` pixels wide. */
function project(point: LatLng, size: number): [number, number] {
  const sin = Math.min(Math.max(Math.sin((point.lat * Math.PI) / 180), -0.9999), 0.9999);
  return [((point.lng + 180) / 360) * size, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size];
}

/** The zoom level (256-point tiles) at which the world is `worldPoints` wide. */
export function zoomOf(worldPoints: number): number {
  return Math.log2(worldPoints / 256);
}

/** Half a box's size again on every side. */
function widen(box: BoundingBox): BoundingBox {
  const h = (box.north - box.south) / 2;
  const w = (box.east - box.west) / 2;
  return { south: box.south - h, north: box.north + h, west: box.west - w, east: box.east + w };
}

/**
 * What to draw: `zoom` in 256-point tile levels (Apple's; MapLibre's
 * numbers are one less), `view` the area on screen.
 */
export function mapItems(pins: readonly MapPin[], zoom: number, view: BoundingBox | null, selectedId: string | null): MapItem[] {
  const near = view ? widen(view) : null;
  const shown = near ? pins.filter((pin) => pin.id === selectedId || (pin.position.lat >= near.south && pin.position.lat <= near.north && pin.position.lng >= near.west && pin.position.lng <= near.east)) : [...pins];
  const level = Math.floor(zoom);
  if (level >= NO_CLUSTER_ZOOM || shown.length < 2) {
    return shown.map((pin) => ({ kind: 'pin', id: pin.id, pin, selected: pin.id === selectedId }));
  }
  const size = 256 * 2 ** level;
  // The same order every time, so the same gyms group the same way.
  const order = [...shown].sort((a, b) => RANK[a.tier] - RANK[b.tier] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const at = new Map(order.map((pin) => [pin.id, project(pin.position, size)]));
  // A grid of bubble-sized cells, so each pin only looks at its neighbours.
  const grid = new Map<string, MapPin[]>();
  const cell = ([x, y]: [number, number]) => `${Math.floor(x / RADIUS)}:${Math.floor(y / RADIUS)}`;
  for (const pin of order) {
    const key = cell(at.get(pin.id)!);
    const list = grid.get(key);
    if (list) list.push(pin);
    else grid.set(key, [pin]);
  }
  const taken = new Set<string>();
  const items: MapItem[] = [];
  for (const pin of order) {
    if (taken.has(pin.id)) continue;
    taken.add(pin.id);
    if (pin.id === selectedId) {
      items.push({ kind: 'pin', id: pin.id, pin, selected: true });
      continue;
    }
    const [x, y] = at.get(pin.id)!;
    const members = [pin];
    const [cx, cy] = [Math.floor(x / RADIUS), Math.floor(y / RADIUS)];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        for (const other of grid.get(`${cx + dx}:${cy + dy}`) ?? []) {
          if (taken.has(other.id) || other.id === selectedId) continue;
          const [ox, oy] = at.get(other.id)!;
          if ((ox - x) ** 2 + (oy - y) ** 2 <= RADIUS * RADIUS) {
            taken.add(other.id);
            members.push(other);
          }
        }
      }
    }
    if (members.length === 1) {
      items.push({ kind: 'pin', id: pin.id, pin, selected: false });
      continue;
    }
    const lat = members.reduce((sum, item) => sum + item.position.lat, 0) / members.length;
    const lng = members.reduce((sum, item) => sum + item.position.lng, 0) / members.length;
    items.push({
      kind: 'cluster',
      // Named by its first gym and the zoom level, so it stays the same bubble while you pan.
      id: `cluster:${level}:${pin.id}`,
      position: { lat, lng },
      count: members.length,
      tier: members.reduce<ResultTier>((best, item) => (RANK[item.tier] < RANK[best] ? item.tier : best), 'ruled_out'),
      points: members.map((item) => item.position),
      ids: members.map((item) => item.id),
    });
  }
  return items;
}

/** Whether a bubble's gyms are all in one spot (one building), so zooming in wouldn't part them. */
export function sameSpot(points: readonly LatLng[]): boolean {
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  return Math.max(...lats) - Math.min(...lats) < 0.0004 && Math.max(...lngs) - Math.min(...lngs) < 0.0004;
}
