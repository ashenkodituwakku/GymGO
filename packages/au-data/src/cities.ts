/**
 * The Australian cities GymGO covers from the map alone (Melbourne's gyms are
 * researched one by one, in packages/melbourne-data). Each is the area its
 * gyms were fetched from: a circle around the centre, `radiusKm` across.
 *
 * GymGO's invented demo gyms also sit in inner Sydney. Apps never show the
 * two together: the demo only appears in its own demo mode.
 */

import type { LatLng } from '@gymgo/domain';
import type { AuCityId } from './rows';

export interface AuCity {
  id: AuCityId;
  name: string;
  state: string;
  timezone: string;
  centre: LatLng;
  /** How far from the centre the gyms were fetched. */
  radiusKm: number;
  /** Other names people type. */
  aliases: string[];
}

export const AU_CITIES: AuCity[] = [
  { id: 'sydney', name: 'Sydney', state: 'NSW', timezone: 'Australia/Sydney', centre: { lat: -33.8688, lng: 151.2093 }, radiusKm: 7, aliases: ['Syd', 'Sydney CBD'] },
  { id: 'brisbane', name: 'Brisbane', state: 'QLD', timezone: 'Australia/Brisbane', centre: { lat: -27.4698, lng: 153.0251 }, radiusKm: 7, aliases: ['Brissy', 'Brisvegas'] },
  { id: 'perth', name: 'Perth', state: 'WA', timezone: 'Australia/Perth', centre: { lat: -31.9523, lng: 115.8613 }, radiusKm: 7, aliases: [] },
  { id: 'adelaide', name: 'Adelaide', state: 'SA', timezone: 'Australia/Adelaide', centre: { lat: -34.9285, lng: 138.6007 }, radiusKm: 6, aliases: ['Radelaide'] },
  { id: 'canberra', name: 'Canberra', state: 'ACT', timezone: 'Australia/Sydney', centre: { lat: -35.2809, lng: 149.13 }, radiusKm: 8, aliases: ['ACT'] },
  { id: 'gold-coast', name: 'Gold Coast', state: 'QLD', timezone: 'Australia/Brisbane', centre: { lat: -28.0023, lng: 153.4145 }, radiusKm: 9, aliases: ['Goldy', 'Surfers Paradise'] },
  { id: 'hobart', name: 'Hobart', state: 'TAS', timezone: 'Australia/Hobart', centre: { lat: -42.8821, lng: 147.3272 }, radiusKm: 6, aliases: [] },
];

export const auCity = (id: AuCityId): AuCity => AU_CITIES.find((city) => city.id === id)!;
