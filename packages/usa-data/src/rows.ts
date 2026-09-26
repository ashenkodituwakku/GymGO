/** The shape of the generated rows in data.ts. */

import type { TrainingType } from '@gymgo/domain';

export type UsCityId =
  | 'new-york'
  | 'los-angeles'
  | 'chicago'
  | 'houston'
  | 'miami'
  | 'san-francisco'
  | 'seattle'
  | 'boston'
  | 'austin'
  | 'denver'
  | 'las-vegas'
  | 'washington-dc'
  | 'atlanta'
  | 'san-diego'
  | 'philadelphia'
  | 'phoenix'
  | 'dallas'
  | 'san-antonio'
  | 'san-jose'
  | 'portland'
  | 'nashville'
  | 'minneapolis'
  | 'new-orleans'
  | 'orlando'
  | 'tampa'
  | 'charlotte'
  | 'salt-lake-city'
  | 'detroit'
  | 'pittsburgh'
  | 'baltimore'
  | 'kansas-city'
  | 'columbus'
  | 'indianapolis'
  | 'raleigh'
  | 'sacramento'
  | 'st-louis'
  | 'honolulu'
  | 'brooklyn'
  | 'oakland'
  | 'cleveland';

export interface GymRow {
  city: UsCityId;
  id: string;
  /** The OpenStreetMap element, e.g. "node/1383939144". */
  osm: string;
  name: string;
  brand?: string;
  /** The brand's Wikidata item, e.g. "Q7201095" for Planet Fitness. */
  brandWikidata?: string;
  branch?: string;
  /** Street address; empty when the map doesn't have one. */
  line1: string;
  locality: string;
  state: string;
  zip: string;
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
  city: UsCityId;
  name: string;
  lat: number;
  lng: number;
}
