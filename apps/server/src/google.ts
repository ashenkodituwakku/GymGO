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

/**
 * Google bills each photo separately, so a page shows a few, not all ten
 * Google offers. Four keeps the free monthly allowance going further.
 */
const MAX_PHOTOS = 4;

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
      matched_at text not null
    )`);
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

  /** The gym's Google place ID, found once by name and address near our position, then remembered. */
  async placeIdFor(record: GymRecord): Promise<string | null> {
    const known = this.db.prepare('select place_id from google_places where gym_id = ?').get(record.location.id) as
      | { place_id: string | null }
      | undefined;
    if (known) return known.place_id;

    const { location } = record;
    const data = await this.call(`${PLACES}/places:searchText`, {
      method: 'POST',
      fieldMask: 'places.id,places.location',
      body: {
        textQuery: `${location.name} ${location.address.line1} ${location.address.suburb} ${location.address.state}`,
        locationBias: {
          circle: { center: { latitude: location.position.lat, longitude: location.position.lng }, radius: 300 },
        },
        maxResultCount: 5,
      },
    });
    const candidates = (Array.isArray(data.places) ? data.places : []) as Array<Record<string, any>>;
    const match = candidates
      .map((place) => ({
        id: typeof place.id === 'string' ? place.id : null,
        km:
          typeof place.location?.latitude === 'number'
            ? haversineKm(location.position, { lat: place.location.latitude, lng: place.location.longitude })
            : Infinity,
      }))
      .filter((place) => place.id && place.km <= MATCH_RADIUS_KM)
      .sort((a, b) => a.km - b.km)[0];

    const placeId = match?.id ?? null;
    // Place IDs may be stored indefinitely under Google's terms; nothing else is.
    this.db
      .prepare('insert or replace into google_places (gym_id, place_id, matched_at) values (?, ?, ?)')
      .run(location.id, placeId, new Date().toISOString());
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
        'websiteUri',
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
        website: typeof data.websiteUri === 'string' ? data.websiteUri : null,
        googleMapsUri: typeof data.googleMapsUri === 'string' ? data.googleMapsUri : null,
        businessStatus: typeof data.businessStatus === 'string' ? data.businessStatus : null,
        photos,
        reviews,
      },
    };
  }
}
