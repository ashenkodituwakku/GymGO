/**
 * Filter state → the domain's SearchQuery.
 *
 * The phone runs the exact same search the website runs, from the same
 * @gymgo/domain package, on the device. That is the point of the shared
 * package: the rule that ranks the list and the rule that colours the pin are
 * one implementation, so they cannot drift apart.
 *
 * No React Native imports here, so it is unit-tested in Node.
 */

import {
  UNKNOWN_VISITOR,
  defaultQuery,
  haversineKm,
  type BoundingBox,
  search,
  type EquipmentRequirement,
  type GymRecord,
  type LatLng,
  type RatingSummary,
  type Review,
  type SearchOutcome,
  type SearchQuery,
  type SortKey,
  type Tri,
} from '@gymgo/domain';
import { DEMO_GYMS } from '@gymgo/demo-data';
import { MELBOURNE_GYMS } from '@gymgo/melbourne-data';
import { AU_GYMS } from '@gymgo/au-data';
import { US_GYMS } from '@gymgo/usa-data';
import { EU_GYMS } from '@gymgo/eu-data';
import { CITIES, DEFAULT_PLACE, type AppPlace } from './places';

/**
 * The records bundled into the app: real Melbourne first, then the other
 * Australian and the US cities (map-only), then the Sydney demo. Used until the server answers, or when it
 * can't be reached.
 */
export const BUNDLED_GYMS: GymRecord[] = [...MELBOURNE_GYMS, ...AU_GYMS, ...US_GYMS, ...EU_GYMS, ...DEMO_GYMS];

export interface Filters {
  centre: LatLng;
  /** What the centre is called, for the summary line. */
  placeName: string;
  /** The time zone the visit time is in: the searched city's. */
  timezone: string;
  /**
   * The country searched (ISO 3166-1: "AU", "US", "GB"): miles or
   * kilometres, and whether visit prices are tracked there.
   */
  countryCode: string;
  radiusKm: number;
  /**
   * Set by "Search this area": the results are the gyms inside this box,
   * and the radius is ignored. Picking a place or finding you clears it.
   */
  bbox: BoundingBox | null;
  visitDate: string;
  visitMinuteOfDay: number;
  /**
   * You picked the visit's day or time yourself. Until you do, it's the next
   * hour on the clock of wherever you search, so moving to a city in another
   * time zone works it out again there instead of keeping the old clock time.
   */
  visitPicked?: boolean;
  budgetMinor: number | null;
  equipment: string[];
  dumbbellMinKg: number | null;
  isLocalResident: Tri;
  sort: SortKey;
}

export const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: 'best_match', label: 'Best match' },
  { key: 'distance', label: 'Closest' },
  { key: 'visit_cost', label: 'Cheapest' },
  { key: 'rating', label: 'Top rated' },
];

/**
 * Local date and minute-of-day in a city's time zone: a 6 am visit in New
 * York means 6 am New York time, wherever the phone is.
 */
export function nowIn(timezone: string, now: Date = new Date()): { date: string; minute: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '0';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minute: (Number(get('hour')) % 24) * 60 + Number(get('minute')),
  };
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

/**
 * When someone opening the app probably wants to train: the next whole hour.
 *
 * Late at night that would be a time almost nowhere admits guests, so after
 * 10 pm it rolls to 7 am *tomorrow*, and in the small hours to 7 am today —
 * never to a time that has already passed.
 */
export function defaultVisit(now: Date = new Date(), timezone: string = CITIES.melbourne.timezone): { date: string; minute: number } {
  const { date, minute } = nowIn(timezone, now);
  const nextHour = (Math.floor(minute / 60) + 1) * 60;
  if (nextHour >= 22 * 60) return { date: addDays(date, 1), minute: 7 * 60 };
  if (nextHour < 6 * 60) return { date, minute: 7 * 60 };
  return { date, minute: nextHour };
}

/**
 * The visit moved on once it's well past (the app left open overnight, say):
 * a default visit becomes the next hour again, and a time you picked, the
 * next time the clock reads it. Within the hour after it, it stays, since
 * you may be on your way. Unchanged otherwise, so callers can compare.
 */
export function refreshVisit(filters: Filters, now: Date = new Date()): Filters {
  const today = nowIn(filters.timezone, now);
  const past = filters.visitDate < today.date || (filters.visitDate === today.date && filters.visitMinuteOfDay + 60 <= today.minute);
  if (!past) return filters;
  const visit = filters.visitPicked ? nextVisitAt(filters.visitMinuteOfDay, filters.timezone, now) : defaultVisit(now, filters.timezone);
  return { ...filters, visitDate: visit.date, visitMinuteOfDay: visit.minute };
}

/** The visit is on a later day than today, on the searched city's clock. */
export function visitIsLater(filters: Pick<Filters, 'visitDate' | 'timezone'>, now: Date = new Date()): boolean {
  return filters.visitDate > nowIn(filters.timezone, now).date;
}

/**
 * The next time the clock reads `minute`: today if that is still ahead,
 * otherwise tomorrow. "Early start" picked at 9 am means tomorrow's 6 am.
 */
export function nextVisitAt(minute: number, timezone: string, now: Date = new Date()): { date: string; minute: number } {
  const today = nowIn(timezone, now);
  return { date: minute > today.minute ? today.date : addDays(today.date, 1), minute };
}

/** Where a search is: the place, what it's called, its clock and its country. */
export type Whereabouts = Pick<Filters, 'centre' | 'placeName' | 'timezone' | 'countryCode'>;

/** The part of the filters a place decides: where, what it's called, its clock and country. */
export function atPlace(place: AppPlace): Whereabouts {
  const city = CITIES[place.city];
  return { centre: place.position, placeName: place.name, timezone: city.timezone, countryCode: city.country };
}

/**
 * Move the search somewhere else. In another time zone, "6 pm" stays 6 pm
 * but in the new city's clock, on the next day that's still ahead there. In
 * another country the budget goes: A$30 isn't $30, let alone ¥30.
 */
export function moveTo(current: Filters, where: Whereabouts & { bbox?: BoundingBox | null }, now: Date = new Date()): Filters {
  const next = {
    ...current,
    ...where,
    bbox: where.bbox ?? null,
    budgetMinor: where.countryCode === current.countryCode ? current.budgetMinor : null,
  };
  if (where.timezone === current.timezone) return next;
  const visit = current.visitPicked ? nextVisitAt(current.visitMinuteOfDay, where.timezone, now) : defaultVisit(now, where.timezone);
  return { ...next, visitDate: visit.date, visitMinuteOfDay: visit.minute };
}

/** The search as "the gyms in this box": what "Search this area" does. */
export function inArea(
  current: Filters,
  box: BoundingBox,
  placeName: string,
  where: Pick<Filters, 'timezone' | 'countryCode'>,
  now: Date = new Date(),
): Filters {
  const centre = { lat: (box.north + box.south) / 2, lng: (box.east + box.west) / 2 };
  return moveTo(current, { centre, placeName, ...where, bbox: box }, now);
}

/**
 * A box `span` degrees of latitude tall around a point, as wide on the
 * ground as it is tall (so a box in Hobart isn't squashed).
 */
export function boxAround(point: { lat: number; lng: number }, span: number): BoundingBox {
  const lngSpan = span / Math.max(0.2, Math.cos((point.lat * Math.PI) / 180));
  return { north: point.lat + span / 2, south: point.lat - span / 2, east: point.lng + lngSpan / 2, west: point.lng - lngSpan / 2 };
}

/**
 * The block of whole map tiles (a tenth of a degree each, as the server
 * reads the map) around a point: 3 × 3 tiles, about 30 km across. Used to
 * ask for the gyms around you without saying where you are: any two spots
 * in the same tile ask for exactly the same box.
 */
export function tilesAround(point: { lat: number; lng: number }): BoundingBox {
  const y = Math.floor(point.lat * 10);
  const x = Math.floor(point.lng * 10);
  return { south: (y - 1) / 10, north: (y + 2) / 10, west: (x - 1) / 10, east: (x + 2) / 10 };
}

/**
 * How wide to search around you: the usual 5 km, or 10 km when nothing is
 * mapped within 5 but something is within 10. No further, because the map
 * tiles asked for (tilesAround) are only sure to reach about 10 km out.
 */
export function reachFor(distancesKm: number[], usual = 5): { radiusKm: number; count: number } {
  for (const radiusKm of [usual, 10]) {
    const count = distancesKm.filter((km) => km <= radiusKm).length;
    if (count > 0) return { radiusKm, count };
  }
  return { radiusKm: usual, count: 0 };
}

/** How far the map has moved from a box: the larger of the centre's shift and the change in size, as a share of the box. */
export function boxDrift(from: BoundingBox, to: BoundingBox): number {
  const height = from.north - from.south;
  const width = from.east - from.west;
  if (height <= 0 || width <= 0) return Infinity;
  const shift = Math.max(
    Math.abs((to.north + to.south) / 2 - (from.north + from.south) / 2) / height,
    Math.abs((to.east + to.west) / 2 - (from.east + from.west) / 2) / width,
  );
  const zoom = Math.abs(Math.log2((to.north - to.south) / height));
  return Math.max(shift, zoom);
}

/** What the search calls the spot you're standing on. */
export const YOUR_LOCATION = 'your location';

/** What the search calls an area searched from the map that no gym names. */
export const THIS_AREA = 'this area';

/** The heading over the results: "Near you", "Near Fitzroy", "In this area". */
export function nearLabel(placeName: string): string {
  if (placeName === YOUR_LOCATION) return 'Near you';
  if (placeName === THIS_AREA) return 'In this area';
  return `Near ${placeName}`;
}

/**
 * What to call an area searched from the map: the suburb of the gym nearest
 * the middle of the screen, or "this area" when no gym there names one.
 */
export function nameForArea(records: GymRecord[], box: BoundingBox): string {
  const middle = { lat: (box.north + box.south) / 2, lng: (box.east + box.west) / 2 };
  let best: { name: string; distance: number } | null = null;
  for (const record of records) {
    const { position, address } = record.location;
    if (!address.suburb || position.lat > box.north || position.lat < box.south || position.lng > box.east || position.lng < box.west) continue;
    const distance = haversineKm(middle, position);
    if (!best || distance < best.distance) best = { name: address.suburb, distance };
  }
  return best ? best.name : THIS_AREA;
}

export function initialFilters(now: Date = new Date(), place: AppPlace = DEFAULT_PLACE): Filters {
  const where = atPlace(place);
  const visit = defaultVisit(now, where.timezone);
  return {
    ...where,
    radiusKm: 5,
    bbox: null,
    visitDate: visit.date,
    visitMinuteOfDay: visit.minute,
    visitPicked: false,
    budgetMinor: null,
    equipment: [],
    dumbbellMinKg: null,
    isLocalResident: 'unknown',
    sort: 'best_match',
  };
}

export function toQuery(filters: Filters): SearchQuery {
  const requiredEquipment: EquipmentRequirement[] = filters.equipment.map((id) => ({
    equipmentTypeId: id,
    minMaxWeightKg: id === 'dumbbells' ? filters.dumbbellMinKg : null,
  }));

  return defaultQuery({
    centre: filters.centre,
    radiusKm: filters.radiusKm,
    bbox: filters.bbox,
    budgetMinor: filters.budgetMinor,
    visitDate: filters.visitDate,
    visitMinuteOfDay: filters.visitMinuteOfDay,
    timezone: filters.timezone,
    requiredEquipment,
    profile: { ...UNKNOWN_VISITOR, isLocalResident: filters.isLocalResident },
    sort: filters.sort,
  });
}

export function runSearch(
  filters: Filters,
  data: { records?: GymRecord[]; reviews?: Record<string, Review[]>; ratings?: Record<string, RatingSummary> } = {},
  asOf: Date = new Date(),
): SearchOutcome {
  return search({
    records: data.records ?? BUNDLED_GYMS,
    reviewsByGymId: data.reviews ?? {},
    ratingsByGymId: data.ratings,
    query: toQuery(filters),
    asOf,
  });
}

/**
 * Apply one of the domain's suggested relaxations to the app's filters.
 *
 * The domain never applies these itself — silently dropping a requirement is
 * how someone ends up at a gym without the rack they came for — so this only
 * ever runs when the person taps the suggestion.
 */
export function applyRelaxation(filters: Filters, patch: Partial<SearchQuery>): Filters {
  const next = { ...filters };
  if (patch.requiredEquipment) {
    next.equipment = patch.requiredEquipment.map((item) => item.equipmentTypeId);
    const dumbbells = patch.requiredEquipment.find((item) => item.equipmentTypeId === 'dumbbells');
    next.dumbbellMinKg = dumbbells?.minMaxWeightKg ?? null;
  }
  if ('budgetMinor' in patch) next.budgetMinor = patch.budgetMinor ?? null;
  if (patch.radiusKm !== undefined) next.radiusKm = patch.radiusKm;
  if (patch.visitMinuteOfDay !== undefined) {
    next.visitMinuteOfDay = patch.visitMinuteOfDay;
    next.visitPicked = true;
  }
  return next;
}

/** How many filters are switched on, for the badge on the filter button. */
export function activeFilterCount(filters: Filters): number {
  return (
    filters.equipment.length +
    (filters.budgetMinor !== null ? 1 : 0) +
    (filters.isLocalResident !== 'unknown' ? 1 : 0)
  );
}

// --- Presets offered in the filter sheet ------------------------------------

export const TIME_PRESETS = [6 * 60, 9 * 60, 12 * 60, 17 * 60, 19 * 60, 21 * 60] as const;
export const BUDGET_PRESETS = [null, 1500, 2000, 2500, 3000, 4000] as const;
export const DUMBBELL_PRESETS = [null, 20, 30, 40, 50] as const;

/** The equipment offered as quick chips, most-asked first. */
export const QUICK_EQUIPMENT = [
  'squat_rack',
  'power_rack',
  'dumbbells',
  'cable_station',
  'bench',
  'lifting_platform',
  'leg_press',
  'hack_squat',
  'smith_machine',
  'rower',
  'treadmill',
  'assault_bike',
] as const;
