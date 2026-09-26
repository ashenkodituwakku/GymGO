/**
 * Reading one mapped gym's details: the parts every use of the map shares,
 * whichever country's address format they're then put in.
 */

import { activities, amenities, keep, parseHours, position, type MappedAmenities, type MappedHours, type OsmElement, type Tags } from './rules';

/** Python-style round(x, digits), so regenerated data stays byte-for-byte stable. */
export function round(value: number, digits: number): number {
  return Number(value.toFixed(digits));
}

export interface Candidate {
  el: OsmElement;
  name: string;
  tags: Tags;
  pos: [number, number];
}

/** A named element with a position that the rules keep, or null. */
export function candidate(el: OsmElement): Candidate | null {
  const tags = el.tags ?? {};
  const name = (tags.name ?? '').trim();
  const pos = position(el);
  if (!name || !pos || !keep(name, tags)) return null;
  return { el, name, tags, pos };
}

export const osmRef = (el: OsmElement): string => `${el.type}/${el.id}`;

/** The branch, without the brackets some mappers put round it. */
export function branchOf(tags: Tags): string | undefined {
  let branch = (tags.branch ?? '').trim();
  if (branch.startsWith('(') && branch.endsWith(')')) branch = branch.slice(1, -1).trim();
  return branch || undefined;
}

/**
 * Countries that write the house number before the street ("12 Mitchell
 * Street", "12 rue de Rivoli"). Most of the rest write it after
 * ("Hauptstraße 12", "Calle Mayor 12").
 */
const NUMBER_FIRST = new Set(['AU', 'US', 'CA', 'GB', 'IE', 'NZ', 'FR', 'LU', 'ZA', 'SG', 'MY', 'PH', 'IN', 'HK', 'NG', 'KE', 'GH']);

export function line1Of(tags: Tags, countryCode = 'AU'): string {
  const street = tags['addr:street'] ?? '';
  const number = tags['addr:housenumber'] ?? '';
  if (!street) return '';
  return (NUMBER_FIRST.has(countryCode) ? `${number} ${street}` : `${street} ${number}`).trim();
}

export function brandOf(tags: Tags): { brand?: string; brandWikidata?: string } {
  const out: { brand?: string; brandWikidata?: string } = {};
  if (tags.brand) out.brand = tags.brand;
  if (/^Q\d+$/.test(tags['brand:wikidata'] ?? '')) out.brandWikidata = tags['brand:wikidata'];
  return out;
}

export function contactOf(tags: Tags): { phone?: string; website?: string; email?: string } {
  const out: { phone?: string; website?: string; email?: string } = {};
  const phone = tags.phone || tags['contact:phone'];
  if (phone) out.phone = phone.split(';')[0]!.trim();
  const site = tags.website || tags['contact:website'];
  if (site && site.startsWith('http')) out.website = site.split(';')[0]!.trim();
  const email = (tags.email || tags['contact:email'] || '').split(';')[0]!.trim();
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) out.email = email;
  return out;
}

export interface Extras {
  activities?: string[];
  amenities?: MappedAmenities;
  hours?: MappedHours;
}

/** Sports, facilities and opening hours; `hoursUnreadable` when hours are mapped but not in the simple form. */
export function extrasOf(tags: Tags): Extras & { hoursUnreadable: boolean } {
  const out: Extras & { hoursUnreadable: boolean } = { hoursUnreadable: false };
  const sports = activities(tags);
  if (sports.length > 0) out.activities = sports;
  const facilities = amenities(tags);
  if (Object.keys(facilities).length > 0) out.amenities = facilities;
  if (tags.opening_hours) {
    const hours = parseHours(tags.opening_hours);
    if (hours === null) out.hoursUnreadable = true;
    else out.hours = hours;
  }
  return out;
}

/**
 * Python's json.dumps(value, ensure_ascii=False): ", " and ": " separators,
 * and floats that happen to be whole keep their ".0". `floats` names the
 * keys that hold floats.
 */
export function pyJson(value: unknown, floats: ReadonlySet<string> = new Set(['lat', 'lng'])): string {
  const write = (item: unknown, key: string | null): string => {
    if (Array.isArray(item)) return `[${item.map((entry) => write(entry, null)).join(', ')}]`;
    if (item && typeof item === 'object') {
      return `{${Object.entries(item)
        .map(([name, entry]) => `${JSON.stringify(name)}: ${write(entry, name)}`)
        .join(', ')}}`;
    }
    if (typeof item === 'number' && key !== null && floats.has(key) && Number.isInteger(item)) return `${item}.0`;
    return JSON.stringify(item);
  };
  return write(value, null);
}
