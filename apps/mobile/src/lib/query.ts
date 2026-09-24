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
  search,
  type EquipmentRequirement,
  type GymRecord,
  type LatLng,
  type Review,
  type SearchOutcome,
  type SearchQuery,
  type SortKey,
  type Tri,
} from '@gymgo/domain';
import { DEMO_GYMS } from '@gymgo/demo-data';
import { MELBOURNE_GYMS } from '@gymgo/melbourne-data';
import { US_GYMS } from '@gymgo/usa-data';
import { CITIES, DEFAULT_PLACE, type AppPlace } from './places';

/**
 * The records bundled into the app: real Melbourne first, then the US cities
 * (map-only), then the Sydney demo. Used until the server answers, or when it
 * can't be reached.
 */
export const BUNDLED_GYMS: GymRecord[] = [...MELBOURNE_GYMS, ...US_GYMS, ...DEMO_GYMS];

export interface Filters {
  centre: LatLng;
  /** What the centre is called, for the summary line. */
  placeName: string;
  /** The time zone the visit time is in: the searched city's. */
  timezone: string;
  radiusKm: number;
  visitDate: string;
  visitMinuteOfDay: number;
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
 * The next time the clock reads `minute`: today if that is still ahead,
 * otherwise tomorrow. "Early start" picked at 9 am means tomorrow's 6 am.
 */
export function nextVisitAt(minute: number, timezone: string, now: Date = new Date()): { date: string; minute: number } {
  const today = nowIn(timezone, now);
  return { date: minute > today.minute ? today.date : addDays(today.date, 1), minute };
}

/** The part of the filters a place decides: where, what it's called, and its clock. */
export function atPlace(place: AppPlace): Pick<Filters, 'centre' | 'placeName' | 'timezone'> {
  return { centre: place.position, placeName: place.name, timezone: CITIES[place.city].timezone };
}

/**
 * Move the search somewhere else. In another time zone, "6 pm" stays 6 pm
 * but in the new city's clock, on the next day that's still ahead there.
 */
export function moveTo(current: Filters, where: Pick<Filters, 'centre' | 'placeName' | 'timezone'>, now: Date = new Date()): Filters {
  if (where.timezone === current.timezone) return { ...current, ...where };
  const visit = nextVisitAt(current.visitMinuteOfDay, where.timezone, now);
  return { ...current, ...where, visitDate: visit.date, visitMinuteOfDay: visit.minute };
}

/** What the search calls the spot you're standing on. */
export const YOUR_LOCATION = 'your location';

export function initialFilters(now: Date = new Date(), place: AppPlace = DEFAULT_PLACE): Filters {
  const where = atPlace(place);
  const visit = defaultVisit(now, where.timezone);
  return {
    ...where,
    radiusKm: 5,
    visitDate: visit.date,
    visitMinuteOfDay: visit.minute,
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
  data: { records?: GymRecord[]; reviews?: Record<string, Review[]> } = {},
  asOf: Date = new Date(),
): SearchOutcome {
  return search({
    records: data.records ?? BUNDLED_GYMS,
    reviewsByGymId: data.reviews ?? {},
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
  if (patch.visitMinuteOfDay !== undefined) next.visitMinuteOfDay = patch.visitMinuteOfDay;
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
