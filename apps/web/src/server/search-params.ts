/**
 * URL <-> search query.
 *
 * The URL is the search state. Everything the person chose is in it, so a
 * search can be shared, bookmarked, and restored by the browser's back button
 * without any client-side state to keep in sync.
 */

import {
  EQUIPMENT_TYPES,
  UNKNOWN_VISITOR,
  defaultQuery,
  isValidIsoDate,
  parseTimeOfDay,
  type AmenityId,
  type BoundingBox,
  type EquipmentRequirement,
  type SearchQuery,
  type SortKey,
  type Tri,
} from '@gymgo/domain';
import { AMENITIES } from '@gymgo/domain';
import { PILOT_AREA } from './config';
import { geocode } from './geocode';

export type ParamsRecord = Record<string, string | string[] | undefined>;

const EQUIPMENT_IDS = new Set(EQUIPMENT_TYPES.map((type) => type.id));
const AMENITY_IDS = new Set(AMENITIES.map((amenity) => amenity.id));
const SORT_KEYS = new Set<SortKey>(['best_match', 'distance', 'visit_cost', 'rating']);

function list(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap((item) => item.split(',')).filter(Boolean);
  return value.split(',').filter(Boolean);
}

function single(value: string | string[] | undefined): string | null {
  if (value === undefined) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function number(value: string | string[] | undefined): number | null {
  const raw = single(value);
  if (raw === null || raw.trim() === '') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function tri(value: string | string[] | undefined): Tri {
  const raw = single(value);
  return raw === 'yes' || raw === 'no' ? raw : 'unknown';
}

/** Budget is typed in dollars and stored in minor units. */
function parseBudget(value: string | string[] | undefined): number | null {
  const dollars = number(value);
  if (dollars === null || dollars < 0) return null;
  return Math.round(dollars * 100);
}

function parseBoundingBox(value: string | string[] | undefined): BoundingBox | null {
  const raw = single(value);
  if (!raw) return null;
  const parts = raw.split(',').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
  const [north, south, east, west] = parts as [number, number, number, number];
  if (north <= south || east <= west) return null;
  return { north, south, east, west };
}

/** Today in the pilot's time zone, so the default visit date is not yesterday. */
export function todayInPilotArea(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PILOT_AREA.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const lookup: Record<string, string> = {};
  for (const part of parts) lookup[part.type] = part.value;
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

export interface ParsedSearch {
  query: SearchQuery;
  /** The raw text the person typed, kept for the input field. */
  text: string;
  /** True when the text was understood but falls outside the pilot area. */
  outOfArea: boolean;
  /** The suburb we matched, for the results heading. */
  placeName: string | null;
  view: 'list' | 'map';
  selectedGymId: string | null;
  compareIds: string[];
  /** Set when the person asked for results near their device location. */
  usedDeviceLocation: boolean;
}

export function parseSearchParams(params: ParamsRecord, now: Date = new Date()): ParsedSearch {
  const text = single(params.q) ?? '';
  const geocoded = geocode(text);

  const lat = number(params.lat);
  const lng = number(params.lng);
  const usedDeviceLocation = single(params.near) === 'me' && lat !== null && lng !== null;

  const centre =
    lat !== null && lng !== null
      ? { lat, lng }
      : geocoded.place
        ? geocoded.place.position
        : text.trim() === ''
          ? PILOT_AREA.centre
          : null;

  const rawDate = single(params.date);
  const visitDate = rawDate && isValidIsoDate(rawDate) ? rawDate : todayInPilotArea(now);

  const rawTime = single(params.time);
  const parsedTime = rawTime ? parseTimeOfDay(rawTime) : null;

  const requiredEquipment: EquipmentRequirement[] = list(params.eq)
    .filter((id) => EQUIPMENT_IDS.has(id))
    .map((id) => ({
      equipmentTypeId: id,
      minMaxWeightKg: id === 'dumbbells' ? number(params.db) : null,
    }));

  const preferredEquipment: EquipmentRequirement[] = list(params.pref)
    .filter((id) => EQUIPMENT_IDS.has(id) && !requiredEquipment.some((item) => item.equipmentTypeId === id))
    .map((id) => ({ equipmentTypeId: id, minMaxWeightKg: null }));

  const requiredAmenities = list(params.am).filter((id): id is AmenityId => AMENITY_IDS.has(id as AmenityId));

  const rawSort = single(params.sort) as SortKey | null;
  const radius = number(params.r);

  const query = defaultQuery({
    text: text.trim() === '' ? null : text,
    centre,
    radiusKm: radius !== null && radius > 0 && radius <= 50 ? radius : 5,
    bbox: parseBoundingBox(params.bbox),
    budgetMinor: parseBudget(params.budget),
    visitDate,
    visitMinuteOfDay: parsedTime ?? 19 * 60,
    timezone: PILOT_AREA.timezone,
    requiredEquipment,
    preferredEquipment,
    requiredAmenities,
    profile: {
      ...UNKNOWN_VISITOR,
      isLocalResident: tri(params.resident),
      hasVisitedBefore: tri(params.visited),
      isAccompaniedByMember: tri(params.guest),
    },
    sort: rawSort && SORT_KEYS.has(rawSort) ? rawSort : 'best_match',
  });

  return {
    query,
    text,
    outOfArea: geocoded.outOfArea,
    placeName: geocoded.place?.name ?? (usedDeviceLocation ? 'your location' : null),
    view: single(params.view) === 'map' ? 'map' : 'list',
    selectedGymId: single(params.sel),
    compareIds: list(params.cmp).slice(0, 3),
    usedDeviceLocation,
  };
}

/** Rebuild a URL search string from a parsed search plus an override. */
export function buildSearchParams(
  current: ParamsRecord,
  overrides: Record<string, string | string[] | null>,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== '') params.append(key, item);
    }
  }

  for (const [key, value] of Object.entries(overrides)) {
    params.delete(key);
    if (value === null) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== '') params.append(key, item);
    }
  }

  return params.toString();
}

export function formatMinuteInput(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
