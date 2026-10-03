/**
 * The European cities GymGO carries from the map alone, each the area its
 * gyms were fetched from: a circle around the centre, `radiusKm` across.
 */

import type { LatLng } from '@gymgo/domain';
import type { EuCityId } from './rows';

export interface EuCity {
  id: EuCityId;
  name: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
  /** How the country is named under the city: "UK", "France". */
  countryName: string;
  timezone: string;
  centre: LatLng;
  /** How far from the centre the gyms were fetched. */
  radiusKm: number;
  /** Other names people type, including the city's own. */
  aliases: string[];
}

export const EU_CITIES: EuCity[] = [
  { id: 'london', name: 'London', country: 'GB', countryName: 'UK', timezone: 'Europe/London', centre: { lat: 51.5098, lng: -0.118 }, radiusKm: 5, aliases: ['Central London'] },
  { id: 'paris', name: 'Paris', country: 'FR', countryName: 'France', timezone: 'Europe/Paris', centre: { lat: 48.8606, lng: 2.3376 }, radiusKm: 5, aliases: [] },
  { id: 'berlin', name: 'Berlin', country: 'DE', countryName: 'Germany', timezone: 'Europe/Berlin', centre: { lat: 52.5163, lng: 13.3889 }, radiusKm: 6, aliases: [] },
  { id: 'madrid', name: 'Madrid', country: 'ES', countryName: 'Spain', timezone: 'Europe/Madrid', centre: { lat: 40.4168, lng: -3.7038 }, radiusKm: 5, aliases: [] },
  { id: 'barcelona', name: 'Barcelona', country: 'ES', countryName: 'Spain', timezone: 'Europe/Madrid', centre: { lat: 41.3874, lng: 2.1686 }, radiusKm: 5, aliases: ['BCN'] },
  { id: 'rome', name: 'Rome', country: 'IT', countryName: 'Italy', timezone: 'Europe/Rome', centre: { lat: 41.9009, lng: 12.4833 }, radiusKm: 6, aliases: ['Roma'] },
  { id: 'milan', name: 'Milan', country: 'IT', countryName: 'Italy', timezone: 'Europe/Rome', centre: { lat: 45.4642, lng: 9.19 }, radiusKm: 5, aliases: ['Milano'] },
  { id: 'amsterdam', name: 'Amsterdam', country: 'NL', countryName: 'Netherlands', timezone: 'Europe/Amsterdam', centre: { lat: 52.3702, lng: 4.8952 }, radiusKm: 5, aliases: [] },
  { id: 'dublin', name: 'Dublin', country: 'IE', countryName: 'Ireland', timezone: 'Europe/Dublin', centre: { lat: 53.3498, lng: -6.2603 }, radiusKm: 5, aliases: ['Baile Átha Cliath'] },
  { id: 'lisbon', name: 'Lisbon', country: 'PT', countryName: 'Portugal', timezone: 'Europe/Lisbon', centre: { lat: 38.7223, lng: -9.1393 }, radiusKm: 5, aliases: ['Lisboa'] },
  { id: 'vienna', name: 'Vienna', country: 'AT', countryName: 'Austria', timezone: 'Europe/Vienna', centre: { lat: 48.2082, lng: 16.3738 }, radiusKm: 5, aliases: ['Wien'] },
  { id: 'munich', name: 'Munich', country: 'DE', countryName: 'Germany', timezone: 'Europe/Berlin', centre: { lat: 48.1374, lng: 11.5755 }, radiusKm: 5, aliases: ['München', 'Muenchen'] },
  { id: 'stockholm', name: 'Stockholm', country: 'SE', countryName: 'Sweden', timezone: 'Europe/Stockholm', centre: { lat: 59.3326, lng: 18.0649 }, radiusKm: 5, aliases: [] },
  { id: 'copenhagen', name: 'Copenhagen', country: 'DK', countryName: 'Denmark', timezone: 'Europe/Copenhagen', centre: { lat: 55.6761, lng: 12.5683 }, radiusKm: 5, aliases: ['København', 'Kobenhavn', 'CPH'] },
  { id: 'zurich', name: 'Zurich', country: 'CH', countryName: 'Switzerland', timezone: 'Europe/Zurich', centre: { lat: 47.3769, lng: 8.5417 }, radiusKm: 5, aliases: ['Zürich', 'Zuerich'] },
];

export const euCity = (id: EuCityId): EuCity => EU_CITIES.find((city) => city.id === id)!;
