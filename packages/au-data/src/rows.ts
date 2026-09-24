/** The shape of the generated rows in data.ts. */

import type { TrainingType } from '@gymgo/domain';

export type AuCityId = 'brisbane' | 'perth' | 'adelaide' | 'canberra' | 'gold-coast' | 'hobart';

export interface GymRow {
  city: AuCityId;
  id: string;
  /** The OpenStreetMap element, e.g. "node/1383939144". */
  osm: string;
  name: string;
  brand?: string;
  /** The brand's Wikidata item. */
  brandWikidata?: string;
  branch?: string;
  /** Street address; empty when the map doesn't have one. */
  line1: string;
  suburb: string;
  /** QLD, WA, SA, ACT, TAS… */
  state: string;
  /** Four digits, or empty when the map doesn't have one. */
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
  city: AuCityId;
  name: string;
  lat: number;
  lng: number;
}
