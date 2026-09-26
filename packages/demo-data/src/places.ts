/**
 * The pilot area's suburbs, and lookup by name or postcode.
 *
 * A small local table rather than a geocoding service: the pilot covers one
 * compact area, and a service would mean a licence decision and a credential
 * before the product does anything useful. Anything outside the table returns
 * "we do not cover that area yet", which is the truth.
 */

import type { LatLng } from '@gymgo/domain';

export interface Place {
  name: string;
  postcode: string;
  position: LatLng;
}

export const PILOT_PLACES: Place[] = [
  { name: 'Surry Hills', postcode: '2010', position: { lat: -33.8846, lng: 151.2113 } },
  { name: 'Darlinghurst', postcode: '2010', position: { lat: -33.879, lng: 151.219 } },
  { name: 'Redfern', postcode: '2016', position: { lat: -33.8932, lng: 151.2043 } },
  { name: 'Chippendale', postcode: '2008', position: { lat: -33.8865, lng: 151.1985 } },
  { name: 'Waterloo', postcode: '2017', position: { lat: -33.8995, lng: 151.2085 } },
  { name: 'Zetland', postcode: '2017', position: { lat: -33.906, lng: 151.209 } },
  { name: 'Alexandria', postcode: '2015', position: { lat: -33.9058, lng: 151.1973 } },
  { name: 'Ultimo', postcode: '2007', position: { lat: -33.8795, lng: 151.1975 } },
  { name: 'Haymarket', postcode: '2000', position: { lat: -33.88, lng: 151.204 } },
  { name: 'Pyrmont', postcode: '2009', position: { lat: -33.8695, lng: 151.195 } },
  { name: 'Glebe', postcode: '2037', position: { lat: -33.879, lng: 151.187 } },
  { name: 'Newtown', postcode: '2042', position: { lat: -33.8983, lng: 151.1793 } },
  { name: 'Erskineville', postcode: '2043', position: { lat: -33.903, lng: 151.1855 } },
  { name: 'Camperdown', postcode: '2050', position: { lat: -33.89, lng: 151.176 } },
  { name: 'Paddington', postcode: '2021', position: { lat: -33.8845, lng: 151.227 } },
  { name: 'Potts Point', postcode: '2011', position: { lat: -33.872, lng: 151.224 } },
];

export const PILOT_CENTRE: LatLng = { lat: -33.8846, lng: 151.2113 };
export const PILOT_TIMEZONE = 'Australia/Sydney';

function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export interface GeocodeResult {
  place: Place | null;
  /** Set when we understood the query but do not cover it. */
  outOfArea: boolean;
}

export function geocode(query: string | null): GeocodeResult {
  if (!query || query.trim() === '') return { place: null, outOfArea: false };
  const needle = normalise(query);

  const exact = PILOT_PLACES.find(
    (place) => normalise(place.name) === needle || place.postcode === needle,
  );
  if (exact) return { place: exact, outOfArea: false };

  const partial = PILOT_PLACES.find((place) => normalise(place.name).startsWith(needle));
  if (partial) return { place: partial, outOfArea: false };

  return { place: null, outOfArea: true };
}

/** Suburbs whose name starts with what has been typed so far, for suggestions. */
export function suggestPlaces(query: string, limit = 5): Place[] {
  const needle = normalise(query);
  if (needle === '') return [];
  return PILOT_PLACES.filter(
    (place) => normalise(place.name).includes(needle) || place.postcode.startsWith(needle),
  ).slice(0, limit);
}

export function suburbSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}
