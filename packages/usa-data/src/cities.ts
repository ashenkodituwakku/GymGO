/**
 * The US cities GymGO covers, each the area its gyms were fetched from: a
 * circle around the centre, `radiusKm` across.
 */

import type { LatLng } from '@gymgo/domain';
import type { UsCityId } from './rows';

export interface UsCity {
  id: UsCityId;
  name: string;
  state: string;
  timezone: string;
  centre: LatLng;
  /** How far from the centre the gyms were fetched. */
  radiusKm: number;
  /** Other names people type. */
  aliases: string[];
}

const EAST = 'America/New_York';
const CENTRAL = 'America/Chicago';
const MOUNTAIN = 'America/Denver';
const PACIFIC = 'America/Los_Angeles';

export const US_CITIES: UsCity[] = [
  { id: 'new-york', name: 'New York', state: 'NY', timezone: EAST, centre: { lat: 40.7549, lng: -73.984 }, radiusKm: 6, aliases: ['NYC', 'New York City', 'Manhattan'] },
  { id: 'los-angeles', name: 'Los Angeles', state: 'CA', timezone: PACIFIC, centre: { lat: 34.0736, lng: -118.34 }, radiusKm: 9, aliases: ['LA', 'L.A.'] },
  { id: 'chicago', name: 'Chicago', state: 'IL', timezone: CENTRAL, centre: { lat: 41.89, lng: -87.63 }, radiusKm: 6, aliases: ['Chi-town'] },
  { id: 'houston', name: 'Houston', state: 'TX', timezone: CENTRAL, centre: { lat: 29.75, lng: -95.38 }, radiusKm: 8, aliases: ['HTX'] },
  { id: 'miami', name: 'Miami', state: 'FL', timezone: EAST, centre: { lat: 25.78, lng: -80.16 }, radiusKm: 7, aliases: ['Miami Beach'] },
  { id: 'san-francisco', name: 'San Francisco', state: 'CA', timezone: PACIFIC, centre: { lat: 37.7749, lng: -122.4194 }, radiusKm: 5, aliases: ['SF', 'San Fran'] },
  { id: 'seattle', name: 'Seattle', state: 'WA', timezone: PACIFIC, centre: { lat: 47.615, lng: -122.335 }, radiusKm: 5, aliases: [] },
  { id: 'boston', name: 'Boston', state: 'MA', timezone: EAST, centre: { lat: 42.355, lng: -71.065 }, radiusKm: 5, aliases: [] },
  { id: 'austin', name: 'Austin', state: 'TX', timezone: CENTRAL, centre: { lat: 30.275, lng: -97.74 }, radiusKm: 6, aliases: ['ATX'] },
  { id: 'denver', name: 'Denver', state: 'CO', timezone: MOUNTAIN, centre: { lat: 39.74, lng: -104.985 }, radiusKm: 6, aliases: [] },
  { id: 'las-vegas', name: 'Las Vegas', state: 'NV', timezone: PACIFIC, centre: { lat: 36.14, lng: -115.16 }, radiusKm: 8, aliases: ['Vegas'] },
  { id: 'washington-dc', name: 'Washington, DC', state: 'DC', timezone: EAST, centre: { lat: 38.905, lng: -77.035 }, radiusKm: 5, aliases: ['DC', 'Washington', 'Washington DC'] },
  { id: 'atlanta', name: 'Atlanta', state: 'GA', timezone: EAST, centre: { lat: 33.77, lng: -84.385 }, radiusKm: 6, aliases: ['ATL'] },
  { id: 'san-diego', name: 'San Diego', state: 'CA', timezone: PACIFIC, centre: { lat: 32.73, lng: -117.155 }, radiusKm: 6, aliases: ['SD'] },
  { id: 'philadelphia', name: 'Philadelphia', state: 'PA', timezone: EAST, centre: { lat: 39.9526, lng: -75.1652 }, radiusKm: 5, aliases: ['Philly'] },
];

export const usCity = (id: UsCityId): UsCity => US_CITIES.find((city) => city.id === id)!;
