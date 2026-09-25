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
  // Added when the US became GymGO's focus: 25 more metros, fetched by bounding box. The
  // sprawling ones get a wider circle (8–10 km, like Los Angeles and Houston), or a downtown
  // circle holds only a handful of mapped gyms.
  { id: 'phoenix', name: 'Phoenix', state: 'AZ', timezone: 'America/Phoenix', centre: { lat: 33.4484, lng: -112.074 }, radiusKm: 10, aliases: [] },
  { id: 'dallas', name: 'Dallas', state: 'TX', timezone: CENTRAL, centre: { lat: 32.7831, lng: -96.8067 }, radiusKm: 10, aliases: ['Big D'] },
  { id: 'san-antonio', name: 'San Antonio', state: 'TX', timezone: CENTRAL, centre: { lat: 29.4252, lng: -98.4946 }, radiusKm: 10, aliases: ['SA'] },
  { id: 'san-jose', name: 'San Jose', state: 'CA', timezone: PACIFIC, centre: { lat: 37.3337, lng: -121.89 }, radiusKm: 6, aliases: [] },
  { id: 'portland', name: 'Portland', state: 'OR', timezone: PACIFIC, centre: { lat: 45.5202, lng: -122.6742 }, radiusKm: 5, aliases: ['PDX'] },
  { id: 'nashville', name: 'Nashville', state: 'TN', timezone: CENTRAL, centre: { lat: 36.1627, lng: -86.7816 }, radiusKm: 9, aliases: [] },
  { id: 'minneapolis', name: 'Minneapolis', state: 'MN', timezone: CENTRAL, centre: { lat: 44.9778, lng: -93.265 }, radiusKm: 5, aliases: [] },
  { id: 'new-orleans', name: 'New Orleans', state: 'LA', timezone: CENTRAL, centre: { lat: 29.9511, lng: -90.0715 }, radiusKm: 8, aliases: ['NOLA'] },
  { id: 'orlando', name: 'Orlando', state: 'FL', timezone: EAST, centre: { lat: 28.5384, lng: -81.3789 }, radiusKm: 10, aliases: [] },
  { id: 'tampa', name: 'Tampa', state: 'FL', timezone: EAST, centre: { lat: 27.9506, lng: -82.4572 }, radiusKm: 6, aliases: [] },
  { id: 'charlotte', name: 'Charlotte', state: 'NC', timezone: EAST, centre: { lat: 35.2271, lng: -80.8431 }, radiusKm: 5, aliases: [] },
  { id: 'salt-lake-city', name: 'Salt Lake City', state: 'UT', timezone: MOUNTAIN, centre: { lat: 40.7608, lng: -111.891 }, radiusKm: 8, aliases: ['SLC'] },
  { id: 'detroit', name: 'Detroit', state: 'MI', timezone: 'America/Detroit', centre: { lat: 42.3314, lng: -83.0458 }, radiusKm: 9, aliases: [] },
  { id: 'pittsburgh', name: 'Pittsburgh', state: 'PA', timezone: EAST, centre: { lat: 40.4406, lng: -79.9959 }, radiusKm: 8, aliases: [] },
  { id: 'baltimore', name: 'Baltimore', state: 'MD', timezone: EAST, centre: { lat: 39.2904, lng: -76.6122 }, radiusKm: 5, aliases: [] },
  { id: 'kansas-city', name: 'Kansas City', state: 'MO', timezone: CENTRAL, centre: { lat: 39.0997, lng: -94.5786 }, radiusKm: 8, aliases: ['KC'] },
  { id: 'columbus', name: 'Columbus', state: 'OH', timezone: EAST, centre: { lat: 39.9612, lng: -82.9988 }, radiusKm: 6, aliases: [] },
  { id: 'indianapolis', name: 'Indianapolis', state: 'IN', timezone: 'America/Indiana/Indianapolis', centre: { lat: 39.7684, lng: -86.1581 }, radiusKm: 10, aliases: ['Indy'] },
  { id: 'raleigh', name: 'Raleigh', state: 'NC', timezone: EAST, centre: { lat: 35.7796, lng: -78.6382 }, radiusKm: 10, aliases: [] },
  { id: 'sacramento', name: 'Sacramento', state: 'CA', timezone: PACIFIC, centre: { lat: 38.5816, lng: -121.4944 }, radiusKm: 9, aliases: [] },
  { id: 'st-louis', name: 'St. Louis', state: 'MO', timezone: CENTRAL, centre: { lat: 38.627, lng: -90.1994 }, radiusKm: 9, aliases: ['Saint Louis', 'STL'] },
  { id: 'honolulu', name: 'Honolulu', state: 'HI', timezone: 'Pacific/Honolulu', centre: { lat: 21.2969, lng: -157.8583 }, radiusKm: 6, aliases: ['Waikiki'] },
  { id: 'brooklyn', name: 'Brooklyn', state: 'NY', timezone: EAST, centre: { lat: 40.675, lng: -73.97 }, radiusKm: 4, aliases: ['BK'] },
  { id: 'oakland', name: 'Oakland', state: 'CA', timezone: PACIFIC, centre: { lat: 37.8044, lng: -122.2712 }, radiusKm: 5, aliases: [] },
  { id: 'cleveland', name: 'Cleveland', state: 'OH', timezone: EAST, centre: { lat: 41.4993, lng: -81.6944 }, radiusKm: 9, aliases: [] },
];

export const usCity = (id: UsCityId): UsCity => US_CITIES.find((city) => city.id === id)!;
