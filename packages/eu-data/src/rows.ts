/** The shape of the generated rows in data.ts. */

import type { TrainingType } from '@gymgo/domain';

export type EuCityId =
  | 'london'
  | 'paris'
  | 'berlin'
  | 'madrid'
  | 'barcelona'
  | 'rome'
  | 'milan'
  | 'amsterdam'
  | 'dublin'
  | 'lisbon'
  | 'vienna'
  | 'munich'
  | 'stockholm'
  | 'copenhagen'
  | 'zurich';

export interface GymRow {
  city: EuCityId;
  id: string;
  /** The OpenStreetMap element, e.g. "node/1383939144". */
  osm: string;
  name: string;
  brand?: string;
  /** The brand's Wikidata item. */
  brandWikidata?: string;
  branch?: string;
  /** Street address in the country's own order; empty when the map doesn't have one. */
  line1: string;
  /** The district or town, as mapped, else the city. */
  suburb: string;
  /** As mapped; usually empty in Europe. */
  state: string;
  /** As mapped (the shapes vary by country); empty when the map doesn't have one. */
  postcode: string;
  lat: number;
  lng: number;
  type: TrainingType;
  phone?: string;
  website?: string;
  email?: string;
  /** Sports and classes from the map's `sport` tag. */
  activities?: string[];
  /** Facilities the map states outright; unmapped ones stay unknown. */
  amenities?: Partial<Record<'pool' | 'sauna' | 'showers' | 'step_free_entrance', 'yes' | 'no'>>;
  /** Mapped opening hours: round the clock, or [day (0 = Sunday), open, close] in minutes. */
  hours?: 'always' | Array<[number, number, number]>;
}

export interface PlaceRow {
  city: EuCityId;
  name: string;
  lat: number;
  lng: number;
}
