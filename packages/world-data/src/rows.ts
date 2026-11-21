/** The shape of the generated rows in data.ts. */

import type { TrainingType } from '@gymgo/domain';

export type WorldCityId =
  | 'toronto'
  | 'vancouver'
  | 'montreal'
  | 'mexico-city'
  | 'sao-paulo'
  | 'rio-de-janeiro'
  | 'buenos-aires'
  | 'santiago'
  | 'bogota'
  | 'lima'
  | 'tokyo'
  | 'osaka'
  | 'seoul'
  | 'singapore'
  | 'hong-kong'
  | 'taipei'
  | 'bangkok'
  | 'kuala-lumpur'
  | 'jakarta'
  | 'manila'
  | 'ho-chi-minh-city'
  | 'mumbai'
  | 'delhi'
  | 'bengaluru'
  | 'dubai'
  | 'abu-dhabi'
  | 'doha'
  | 'riyadh'
  | 'tel-aviv'
  | 'istanbul'
  | 'cairo'
  | 'lagos'
  | 'nairobi'
  | 'johannesburg'
  | 'cape-town'
  | 'auckland'
  | 'wellington'
  | 'brussels'
  | 'prague'
  | 'warsaw'
  | 'athens'
  | 'oslo'
  | 'helsinki'
  | 'budapest'
  | 'manchester'
  | 'edinburgh';

export interface GymRow {
  city: WorldCityId;
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
  /** As mapped; often empty. */
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
  city: WorldCityId;
  name: string;
  lat: number;
  lng: number;
}
