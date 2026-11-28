/**
 * A gym's Apple Maps listing, read through SerpApi's Apple Maps search
 * (https://serpapi.com/apple-maps-api, engine `apple_maps`), and what it adds
 * to GymGO's record of the gym: its phone, website and opening hours, where
 * GymGO has none. It never overwrites a fact GymGO already holds, and every
 * fact it adds names its source ("Apple Maps listing, via SerpApi") and
 * when it was looked up.
 *
 * Apple's opening hours are when the doors are open: member hours, as
 * OpenStreetMap's are (packages/osm/src/record.ts), never staffed or
 * visitor hours. Hours that can't be read are left out: unknown, not
 * closed. Ratings and reviews (Apple shows Yelp's) aren't taken: they
 * aren't GymGO's, and come with Yelp's terms.
 *
 * The server looks listings up (apps/server/src/appleMaps.ts); this part is
 * pure, so the phone can apply a listing that comes in a country pack.
 */

import type { AccessSchedule, EvidenceSource, GymRecord, OpeningWindow, Provenance } from './types';

export interface AppleListing {
  /** Apple's place id. */
  muid: string;
  /** The place on Apple Maps, as the source to cite. */
  link: string | null;
  title: string;
  phone: string | null;
  website: string | null;
  /** [day (0 = Sunday), open minute, close minute], 'always', or null when Apple gives none it can read. */
  hours: Array<[number, number, number]> | 'always' | null;
  /** When it was looked up. */
  checkedAt: string;
}

/** A listing in a search's results, with where it is, for matching to a gym. */
export interface AppleResult extends AppleListing {
  lat: number;
  lng: number;
  /** Apple's category: "Gym", "Fitness Center"… */
  type: string | null;
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** "06:00", "6:00 AM", "6 PM", "12:30 a.m." → minutes after midnight; null if it doesn't read. */
function minuteOf(text: string): number | null {
  const match = /^(\d{1,2})(?::(\d{2}))?\s*([ap])?\.?\s*m?\.?$/i.exec(text.trim().replace(/ | /g, ' '));
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const half = match[3]?.toLowerCase();
  if (minute > 59) return null;
  if (half) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (half === 'p' ? 12 : 0);
  } else if (hour > 24) return null;
  return hour * 60 + minute;
}

/**
 * Apple's `weekly_hours` (each weekday a list of "06:00 - 22:00") as
 * windows, a window past midnight running on (20:00 - 02:00 closes at 26:00).
 * "Open 24 hours" every day is 'always'; "Closed" is a day with none. Null
 * when there are none, or any of them can't be read: unknown, never guessed.
 */
export function readWeeklyHours(weekly: unknown): Array<[number, number, number]> | 'always' | null {
  if (!weekly || typeof weekly !== 'object' || Array.isArray(weekly)) return null;
  const windows: Array<[number, number, number]> = [];
  let allDay = 0;
  let days = 0;
  for (const [key, value] of Object.entries(weekly as Record<string, unknown>)) {
    const day = DAYS.indexOf(key.toLowerCase());
    if (day < 0 || !Array.isArray(value)) return null;
    days += 1;
    for (const raw of value) {
      if (typeof raw !== 'string') return null;
      const text = raw.trim();
      if (/^closed$/i.test(text)) continue;
      if (/^(open )?24 hours$/i.test(text) || /^00:00\s*[-–]\s*(24:00|23:59|00:00)$/.test(text)) {
        windows.push([day, 0, 1440]);
        allDay += 1;
        continue;
      }
      const parts = text.split(/\s*[-–—]\s*|\s+to\s+/i);
      if (parts.length !== 2) return null;
      const open = minuteOf(parts[0]!);
      const close = minuteOf(parts[1]!);
      if (open === null || close === null) return null;
      windows.push([day, open, close <= open ? close + 1440 : close]);
    }
  }
  if (days === 0 || windows.length === 0) return null;
  if (days === 7 && allDay === 7) return 'always';
  return windows.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

/** A website as given, if it's a web address. */
function siteOf(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  // A scheme, a host with a dot in it, then whatever path there is ("/" when there's none).
  const match = /^(https?:\/\/)([^\s/?#]+)([^\s]*)$/i.exec(url);
  if (!match || !match[2]!.includes('.') || match[2]!.startsWith('.') || match[2]!.endsWith('.')) return null;
  return `${match[1]!.toLowerCase()}${match[2]!.toLowerCase()}${match[3] || '/'}`;
}

/** SerpApi's answer to an Apple Maps search, as listings; anything without a place id or a position left out. */
export function readAppleResults(data: unknown, checkedAt: string): AppleResult[] {
  const results = (data as { local_results?: unknown } | null)?.local_results;
  if (!Array.isArray(results)) return [];
  const out: AppleResult[] = [];
  for (const item of results) {
    if (!item || typeof item !== 'object') continue;
    const place = item as Record<string, unknown>;
    const muid = text(place.muid) ?? (typeof place.muid === 'number' ? String(place.muid) : null);
    const title = text(place.title);
    const gps = place.gps_coordinates as { latitude?: unknown; longitude?: unknown } | undefined;
    const lat = typeof gps?.latitude === 'number' ? gps.latitude : NaN;
    const lng = typeof gps?.longitude === 'number' ? gps.longitude : NaN;
    if (!muid || !title || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({
      muid,
      link: text(place.link),
      title,
      phone: text(place.phone_formatted) ?? text(place.phone),
      website: siteOf(place.website),
      hours: readWeeklyHours(place.weekly_hours),
      checkedAt,
      lat,
      lng,
      type: text(place.type),
    });
  }
  return out;
}

/** Only what a record needs from a listing, to keep and to send in a pack. */
export const listingOf = (result: AppleResult): AppleListing => ({
  muid: result.muid,
  link: result.link,
  title: result.title,
  phone: result.phone,
  website: result.website,
  hours: result.hours,
  checkedAt: result.checkedAt,
});

/** What a record lacks that a listing could give. */
export function appleGaps(record: GymRecord): { phone: boolean; website: boolean; hours: boolean } {
  return {
    phone: !record.location.phone,
    website: !record.location.website,
    hours: !record.schedules.some((schedule) => schedule.audience === 'member' && schedule.windows.length > 0),
  };
}

/**
 * The record with what the listing adds: a phone, website or member hours
 * it doesn't have, each cited to the listing. Unchanged when the listing
 * has nothing it lacks.
 */
export function withAppleListing(record: GymRecord, listing: AppleListing): GymRecord {
  const gaps = appleGaps(record);
  const phone = gaps.phone ? listing.phone : null;
  const website = gaps.website ? listing.website : null;
  const hours = gaps.hours ? listing.hours : null;
  if (!phone && !website && !hours) return record;
  const gave = [phone && 'phone', website && 'website', hours && 'opening hours'].filter(Boolean).join(', ');
  const source: EvidenceSource = {
    id: `ev-apple-${listing.muid}`,
    sourceType: 'licensed_dataset',
    evidenceRef: listing.link,
    label: `Apple Maps listing, via SerpApi (${gave})`,
    observedAt: listing.checkedAt,
    checkedAt: listing.checkedAt,
    reviewerId: null,
  };
  const fromApple: Provenance = { status: 'community_reported', sources: [source], conflictNote: null };
  let location = { ...record.location, externalRefs: { ...record.location.externalRefs, appleMaps: listing.muid } };
  if (phone || website) {
    location = {
      ...location,
      phone: location.phone || phone,
      website: location.website || website,
      provenance: { ...location.provenance, sources: [...location.provenance.sources.filter((each) => each.id !== source.id), source] },
    };
  }
  let schedules = record.schedules;
  if (hours) {
    const windows: OpeningWindow[] =
      hours === 'always' ? [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, openMinute: 0, closeMinute: 1440 })) : hours.map(([day, openMinute, closeMinute]) => ({ day, openMinute, closeMinute }));
    const member: AccessSchedule = {
      id: `${record.location.id}-member-apple`,
      gymId: record.location.id,
      audience: 'member',
      timezone: record.location.timezone,
      windows,
      exceptions: [],
      alwaysOpen: hours === 'always',
      provenance: fromApple,
    };
    // An empty member schedule (nothing established) gives way to the listing's.
    schedules = [...record.schedules.filter((schedule) => !(schedule.audience === 'member' && schedule.windows.length === 0)), member];
  }
  return { ...record, location, schedules };
}
