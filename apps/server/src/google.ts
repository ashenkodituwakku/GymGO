/**
 * Live Google Maps information for a gym, through the Places API (New).
 *
 * Off unless the owner of this computer sets GOOGLE_PLACES_API_KEY. That key
 * comes from their own Google Cloud project with billing enabled; GymGO never
 * ships one, and the key never leaves this server (photos are fetched as
 * short-lived Google URLs, not keyed links).
 *
 * Google's terms shape everything here:
 *  - Nothing Google returns is stored or cached. Only the place ID, which the
 *    terms exempt, is kept, so a gym is matched to its Google listing once.
 *  - The app shows this on its own full screen with no map, because the terms
 *    forbid Places content with or near a non-Google map, and GymGO's maps are
 *    Apple's and OpenStreetMap's.
 *  - Google is credited, photo and review authors are credited with links,
 *    and every item links back to Google Maps.
 *  - None of it feeds GymGO's own verdicts: Google's opening hours aren't
 *    guest hours, and its reviews aren't ours.
 *
 * https://developers.google.com/maps/documentation/places/web-service/policies
 */

import { haversineKm, type GymRecord } from '@gymgo/domain';
import type { Db } from './db';

const PLACES = 'https://places.googleapis.com/v1';

type Fetch = typeof fetch;

export interface GoogleAuthor {
  name: string;
  uri: string | null;
  photoUri: string | null;
}

export interface GooglePlace {
  placeId: string;
  name: string;
  address: string | null;
  rating: number | null;
  ratingCount: number | null;
  openNow: boolean | null;
  hours: string[];
  phone: string | null;
  website: string | null;
  googleMapsUri: string | null;
  businessStatus: string | null;
  /** Google's one-line description, when it has written one. */
  summary: string | null;
  /** "Gym", "Fitness center"… */
  type: string | null;
  phoneInternational: string | null;
  /** Yes/no details Google holds: accessibility, parking, payments. */
  details: Array<{ group: 'Accessibility' | 'Parking' | 'Payments'; label: string; value: boolean }>;
  photos: Array<{ uri: string; authors: GoogleAuthor[] }>;
  reviews: Array<{
    rating: number | null;
    text: string;
    when: string | null;
    author: GoogleAuthor;
    googleMapsUri: string | null;
  }>;
}

export type GoogleResult =
  | { configured: false }
  | { configured: true; found: false; reason: 'demo' | 'no_match' }
  | { configured: true; found: true; place: GooglePlace };

export class GoogleError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** How far a Google listing may be from our map position and still be this gym. */
const MATCH_RADIUS_KM = 0.15;
/** Closer than this, a listing Google calls a gym may be this gym under another name. */
const SAME_SPOT_KM = 0.04;
/** Bumped whenever the matching rule changes, so gyms matched by an older rule are matched again. */
const MATCH_RULE = 2;

const FILLER = new Set(['the', 'gym', 'gyms', 'fitness', 'health', 'club', 'clubs', 'centre', 'center', 'studio', 'studios', 'training', 'and', 'of', 'co']);
const FITNESS_TYPES = new Set(['gym', 'fitness_center', 'sports_club', 'sports_complex', 'sports_activity_location']);

function nameWords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .match(/[a-z0-9]+/g);
  return new Set((words ?? []).filter((word) => !FILLER.has(word)));
}

/**
 * Whether Google's name for a place is plausibly our gym's: they share a
 * word that isn't filler or the name of the place it's in ("Doherty's Gym"
 * and "Dohertys Gym City" share "dohertys"; "CrossFit Fitzroy" and "Fitzroy
 * Pharmacy" share only the suburb, so they don't match). Names that are all
 * filler must match exactly.
 */
export function sameName(ours: string, theirs: string, placeNames: string[] = []): boolean {
  const place = new Set(placeNames.flatMap((name) => [...nameWords(name)]));
  const a = new Set([...nameWords(ours)].filter((word) => !place.has(word)));
  const b = nameWords(theirs);
  if (a.size === 0 || b.size === 0) return ours.trim().toLowerCase() === theirs.trim().toLowerCase();
  return [...a].some((word) => b.has(word));
}

/**
 * Google bills each photo separately, so a page shows some, not all ten
 * Google offers. Six keeps the free monthly allowance going a fair way.
 */
const MAX_PHOTOS = 6;

/** Google's yes/no fields, and how to say them. */
const DETAILS: Array<{ group: 'Accessibility' | 'Parking' | 'Payments'; field: string; key: string; label: string }> = [
  { group: 'Accessibility', field: 'accessibilityOptions', key: 'wheelchairAccessibleEntrance', label: 'Wheelchair-accessible entrance' },
  { group: 'Accessibility', field: 'accessibilityOptions', key: 'wheelchairAccessibleRestroom', label: 'Wheelchair-accessible toilet' },
  { group: 'Accessibility', field: 'accessibilityOptions', key: 'wheelchairAccessibleParking', label: 'Wheelchair-accessible parking' },
  { group: 'Parking', field: 'parkingOptions', key: 'freeParkingLot', label: 'Free car park' },
  { group: 'Parking', field: 'parkingOptions', key: 'paidParkingLot', label: 'Paid car park' },
  { group: 'Parking', field: 'parkingOptions', key: 'freeStreetParking', label: 'Free street parking' },
  { group: 'Parking', field: 'parkingOptions', key: 'paidStreetParking', label: 'Paid street parking' },
  { group: 'Parking', field: 'parkingOptions', key: 'freeGarageParking', label: 'Free garage parking' },
  { group: 'Parking', field: 'parkingOptions', key: 'paidGarageParking', label: 'Paid garage parking' },
  { group: 'Payments', field: 'paymentOptions', key: 'acceptsCreditCards', label: 'Credit cards' },
  { group: 'Payments', field: 'paymentOptions', key: 'acceptsDebitCards', label: 'Debit cards' },
  { group: 'Payments', field: 'paymentOptions', key: 'acceptsNfc', label: 'Tap to pay' },
  { group: 'Payments', field: 'paymentOptions', key: 'acceptsCashOnly', label: 'Cash only' },
];

function author(raw: Record<string, unknown> | undefined): GoogleAuthor {
  return {
    name: typeof raw?.displayName === 'string' ? raw.displayName : 'Google user',
    uri: typeof raw?.uri === 'string' ? raw.uri : null,
    photoUri: typeof raw?.photoUri === 'string' ? raw.photoUri : null,
  };
}

export class GooglePlaces {
  constructor(
    private readonly db: Db,
    private readonly key: string | null,
    private readonly fetchImpl: Fetch = fetch,
  ) {
    db.exec(`create table if not exists google_places (
      gym_id text primary key,
      place_id text,
      matched_at text not null,
      rule integer not null default 1
    )`);
    const columns = db.prepare('pragma table_info(google_places)').all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'rule')) db.exec('alter table google_places add column rule integer not null default 1');
  }

  get configured(): boolean {
    return Boolean(this.key);
  }

  private async call(url: string, init: { method?: string; fieldMask?: string; body?: unknown } = {}) {
    const response = await this.fetchImpl(url, {
      method: init.method ?? 'GET',
      headers: {
        'X-Goog-Api-Key': this.key!,
        ...(init.fieldMask ? { 'X-Goog-FieldMask': init.fieldMask } : {}),
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, any>;
    if (!response.ok) {
      const message = typeof data.error?.message === 'string' ? data.error.message : `Google returned ${response.status}.`;
      throw new GoogleError(502, `Google Maps: ${message}`);
    }
    return data;
  }

  /**
   * The gym's Google place ID, found once and remembered. The listing must
   * be this gym, not merely near it: within 150 m and sharing a real word of
   * its name (or its brand's), or, failing that, a listing Google calls a gym
   * within 40 m. So the shopping centre it's in, or the café next door, never
   * lends the gym its photos.
   */
  async placeIdFor(record: GymRecord): Promise<string | null> {
    const known = this.db.prepare('select place_id, rule from google_places where gym_id = ?').get(record.location.id) as
      | { place_id: string | null; rule: number }
      | undefined;
    if (known && known.rule >= MATCH_RULE) return known.place_id;

    const { location } = record;
    const data = await this.call(`${PLACES}/places:searchText`, {
      method: 'POST',
      fieldMask: 'places.id,places.location,places.displayName,places.types',
      body: {
        textQuery: `${location.name} ${location.address.line1} ${location.address.suburb} ${location.address.state}`,
        locationBias: {
          circle: { center: { latitude: location.position.lat, longitude: location.position.lng }, radius: 300 },
        },
        maxResultCount: 5,
      },
    });
    const candidates = ((Array.isArray(data.places) ? data.places : []) as Array<Record<string, any>>)
      .map((place) => ({
        id: typeof place.id === 'string' ? place.id : null,
        name: typeof place.displayName?.text === 'string' ? place.displayName.text : '',
        types: Array.isArray(place.types) ? (place.types as unknown[]).filter((type): type is string => typeof type === 'string') : [],
        km:
          typeof place.location?.latitude === 'number'
            ? haversineKm(location.position, { lat: place.location.latitude, lng: place.location.longitude })
            : Infinity,
      }))
      .filter((place) => place.id && place.km <= MATCH_RADIUS_KM)
      .sort((a, b) => a.km - b.km);
    const where = [location.address.suburb, location.address.state];
    const named = candidates.find(
      (place) => sameName(location.name, place.name, where) || (location.brand !== null && sameName(location.brand, place.name, where)),
    );
    const match = named ?? candidates.find((place) => place.km <= SAME_SPOT_KM && place.types.some((type) => FITNESS_TYPES.has(type)));

    const placeId = match?.id ?? null;
    // Place IDs may be stored indefinitely under Google's terms; nothing else is.
    this.db
      .prepare('insert or replace into google_places (gym_id, place_id, matched_at, rule) values (?, ?, ?, ?)')
      .run(location.id, placeId, new Date().toISOString(), MATCH_RULE);
    return placeId;
  }

  async lookup(record: GymRecord): Promise<GoogleResult> {
    if (!this.key) return { configured: false };
    // The demo gyms are invented; there is nothing on Google to find.
    if (record.location.isDemoData) return { configured: true, found: false, reason: 'demo' };

    const placeId = await this.placeIdFor(record);
    if (!placeId) return { configured: true, found: false, reason: 'no_match' };

    const data = await this.call(`${PLACES}/places/${encodeURIComponent(placeId)}`, {
      fieldMask: [
        'id',
        'displayName',
        'formattedAddress',
        'rating',
        'userRatingCount',
        'currentOpeningHours.openNow',
        'regularOpeningHours.weekdayDescriptions',
        'nationalPhoneNumber',
        'internationalPhoneNumber',
        'websiteUri',
        'editorialSummary',
        'primaryTypeDisplayName',
        'accessibilityOptions',
        'parkingOptions',
        'paymentOptions',
        'googleMapsUri',
        'businessStatus',
        'photos',
        'reviews',
      ].join(','),
    });

    // Photos: ask Google for a short-lived image URL, so the key stays here.
    const rawPhotos = (Array.isArray(data.photos) ? data.photos : []).slice(0, MAX_PHOTOS) as Array<Record<string, any>>;
    const photos = (
      await Promise.all(
        rawPhotos.map(async (photo) => {
          if (typeof photo.name !== 'string') return null;
          try {
            const media = await this.call(`${PLACES}/${photo.name}/media?maxWidthPx=1000&skipHttpRedirect=true`);
            if (typeof media.photoUri !== 'string') return null;
            const authors = (Array.isArray(photo.authorAttributions) ? photo.authorAttributions : []).map(author);
            return { uri: media.photoUri, authors };
          } catch {
            return null;
          }
        }),
      )
    ).filter((photo): photo is { uri: string; authors: GoogleAuthor[] } => photo !== null);

    const reviews = ((Array.isArray(data.reviews) ? data.reviews : []) as Array<Record<string, any>>).map((review) => ({
      rating: typeof review.rating === 'number' ? review.rating : null,
      text: typeof review.text?.text === 'string' ? review.text.text : typeof review.originalText?.text === 'string' ? review.originalText.text : '',
      when: typeof review.relativePublishTimeDescription === 'string' ? review.relativePublishTimeDescription : null,
      author: author(review.authorAttribution),
      googleMapsUri: typeof review.googleMapsUri === 'string' ? review.googleMapsUri : null,
    }));

    return {
      configured: true,
      found: true,
      place: {
        placeId,
        name: typeof data.displayName?.text === 'string' ? data.displayName.text : record.location.name,
        address: typeof data.formattedAddress === 'string' ? data.formattedAddress : null,
        rating: typeof data.rating === 'number' ? data.rating : null,
        ratingCount: typeof data.userRatingCount === 'number' ? data.userRatingCount : null,
        openNow: typeof data.currentOpeningHours?.openNow === 'boolean' ? data.currentOpeningHours.openNow : null,
        hours: Array.isArray(data.regularOpeningHours?.weekdayDescriptions) ? data.regularOpeningHours.weekdayDescriptions : [],
        phone: typeof data.nationalPhoneNumber === 'string' ? data.nationalPhoneNumber : null,
        phoneInternational: typeof data.internationalPhoneNumber === 'string' ? data.internationalPhoneNumber : null,
        summary: typeof data.editorialSummary?.text === 'string' ? data.editorialSummary.text : null,
        type: typeof data.primaryTypeDisplayName?.text === 'string' ? data.primaryTypeDisplayName.text : null,
        // Only what Google actually says; a missing field stays missing, never "no".
        details: DETAILS.flatMap((item) => {
          const value = (data[item.field] as Record<string, unknown> | undefined)?.[item.key];
          return typeof value === 'boolean' ? [{ group: item.group, label: item.label, value }] : [];
        }),
        website: typeof data.websiteUri === 'string' ? data.websiteUri : null,
        googleMapsUri: typeof data.googleMapsUri === 'string' ? data.googleMapsUri : null,
        businessStatus: typeof data.businessStatus === 'string' ? data.businessStatus : null,
        photos,
        reviews,
      },
    };
  }
}
