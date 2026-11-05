/**
 * Inner-Melbourne suburbs the search box understands.
 *
 * Centres are OpenStreetMap place nodes (© OpenStreetMap contributors, ODbL),
 * queried 23 September 2026. Postcodes are Australia Post's.
 */

import type { LatLng } from '@gymgo/domain';

export interface MelbournePlace {
  name: string;
  postcode: string;
  position: LatLng;
}

export const MELBOURNE_PLACES: MelbournePlace[] = [
  { name: 'Melbourne CBD', postcode: '3000', position: { lat: -37.8142, lng: 144.9632 } },
  { name: 'Southbank', postcode: '3006', position: { lat: -37.8254, lng: 144.964 } },
  { name: 'Docklands', postcode: '3008', position: { lat: -37.8175, lng: 144.9395 } },
  { name: 'East Melbourne', postcode: '3002', position: { lat: -37.8125, lng: 144.9859 } },
  { name: 'West Melbourne', postcode: '3003', position: { lat: -37.8087, lng: 144.9238 } },
  { name: 'North Melbourne', postcode: '3051', position: { lat: -37.7986, lng: 144.9452 } },
  { name: 'Parkville', postcode: '3052', position: { lat: -37.7871, lng: 144.9516 } },
  { name: 'Carlton', postcode: '3053', position: { lat: -37.8004, lng: 144.9684 } },
  { name: 'Carlton North', postcode: '3054', position: { lat: -37.7846, lng: 144.9729 } },
  { name: 'Fitzroy', postcode: '3065', position: { lat: -37.801, lng: 144.9793 } },
  { name: 'Collingwood', postcode: '3066', position: { lat: -37.8021, lng: 144.9881 } },
  { name: 'Abbotsford', postcode: '3067', position: { lat: -37.8046, lng: 144.9989 } },
  { name: 'Fitzroy North', postcode: '3068', position: { lat: -37.7833, lng: 144.9837 } },
  { name: 'Clifton Hill', postcode: '3068', position: { lat: -37.7904, lng: 144.9975 } },
  { name: 'Northcote', postcode: '3070', position: { lat: -37.7728, lng: 145.0009 } },
  { name: 'Brunswick', postcode: '3056', position: { lat: -37.7665, lng: 144.9613 } },
  { name: 'Brunswick East', postcode: '3057', position: { lat: -37.7689, lng: 144.9777 } },
  { name: 'Kensington', postcode: '3031', position: { lat: -37.7944, lng: 144.927 } },
  { name: 'Richmond', postcode: '3121', position: { lat: -37.8204, lng: 145.0025 } },
  { name: 'Cremorne', postcode: '3121', position: { lat: -37.829, lng: 144.9928 } },
  { name: 'South Yarra', postcode: '3141', position: { lat: -37.8378, lng: 144.9919 } },
  { name: 'South Melbourne', postcode: '3205', position: { lat: -37.8334, lng: 144.9571 } },
  { name: 'Albert Park', postcode: '3206', position: { lat: -37.8452, lng: 144.9571 } },
  { name: 'Port Melbourne', postcode: '3207', position: { lat: -37.8334, lng: 144.9219 } },
];

export const MELBOURNE_CENTRE: LatLng = { lat: -37.8142, lng: 144.9632 };
