/**
 * Your gym collection: gyms you've been to, collected by checking in on the
 * spot. A gym joins it the first time you check in within reach of it, and
 * each day you check in again counts as a visit, which moves its card up a
 * tier: Bronze, then Silver, Gold and Platinum.
 *
 * Checking in compares where you are with the gym's map position here, on
 * the phone; your position is never sent or kept. The collection keeps the
 * gym's name and place, and the days you visited, nothing else; signed in,
 * your account keeps a copy of that too (lib/useCollection.ts).
 */

import { haversineKm, type CollectedGym, type Collection } from '@gymgo/domain';
import { WORLD_CITIES } from './places';
import { cardFor, cardName, newSeed, rarityRank, RARITIES, type Rarity } from './rarity';

// --- Checking in --------------------------------------------------------------------

/** How near counts as "here": a gym's map point can be its door or the middle of its building. */
export const HERE_M = 150;
/** Past this, a fix is too rough to tell whether you're inside or down the road. */
export const ROUGHEST_M = 300;

export type CheckIn = { kind: 'here'; metres: number } | { kind: 'far'; metres: number } | { kind: 'rough'; accuracyM: number };

/** Whether a fix puts you at the gym, allowing for how precise the fix is. */
export function checkIn(fix: { position: { lat: number; lng: number }; accuracyM: number | null }, gym: { lat: number; lng: number }): CheckIn {
  const metres = Math.round(haversineKm(fix.position, gym) * 1000);
  const accuracy = fix.accuracyM ?? 0;
  if (metres <= HERE_M) return { kind: 'here', metres };
  // Within reach once the fix's own error is allowed for, if that error isn't huge.
  if (accuracy > ROUGHEST_M) return metres - accuracy <= HERE_M ? { kind: 'rough', accuracyM: Math.round(accuracy) } : { kind: 'far', metres };
  return metres - accuracy <= HERE_M ? { kind: 'here', metres } : { kind: 'far', metres };
}

// --- The collection -------------------------------------------------------------------

// The entry itself, and how two copies merge, are shared with the server (packages/domain/src/collection.ts).
export type { CollectedGym, Collection };

export const localDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** The big city a gym is in: the nearest of GymGO's world cities within 40 km, else its suburb. */
export function cityFor(position: { lat: number; lng: number }, countryCode: string, suburb: string): string {
  let best: { name: string; km: number } | null = null;
  for (const city of WORLD_CITIES) {
    if (city.country !== countryCode) continue;
    const km = haversineKm(position, city.centre);
    if (km <= 40 && (!best || km < best.km)) best = { name: city.name, km };
  }
  return best?.name ?? suburb;
}

/**
 * The collection after checking in at a gym now: added if it's new, a visit
 * added if you hadn't checked in there today. `fresh` says which happened.
 */
export function collect(
  collection: Collection,
  gym: { id: string; name: string; suburb: string; countryCode: string; brand: string | null; position: { lat: number; lng: number } },
  now: Date = new Date(),
  random: () => number = Math.random,
): { collection: Collection; fresh: 'new' | 'visit' | 'again-today'; entry: CollectedGym } {
  const today = localDay(now);
  const at = now.toISOString();
  const old = collection[gym.id];
  if (old?.days.includes(today)) return { collection, fresh: 'again-today', entry: old };
  const entry: CollectedGym = old
    ? { ...old, name: gym.name, days: [...old.days, today].slice(-400), lastAt: at }
    : {
        id: gym.id,
        name: gym.name,
        suburb: gym.suburb,
        city: cityFor(gym.position, gym.countryCode, gym.suburb),
        countryCode: gym.countryCode,
        brand: gym.brand,
        days: [today],
        firstAt: at,
        lastAt: at,
        seed: newSeed(random),
      };
  return { collection: { ...collection, [gym.id]: entry }, fresh: old ? 'visit' : 'new', entry };
}

// --- Tiers ------------------------------------------------------------------------------

export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';

export const TIERS: Array<{ tier: Tier; label: string; from: number }> = [
  { tier: 'bronze', label: 'Bronze', from: 1 },
  { tier: 'silver', label: 'Silver', from: 3 },
  { tier: 'gold', label: 'Gold', from: 10 },
  { tier: 'platinum', label: 'Platinum', from: 25 },
];

/** A card's tier by your visits, and how many more visits the next one needs. */
export function tierFor(visits: number): { tier: Tier; label: string; next: { label: string; visits: number } | null } {
  const index = TIERS.reduce((found, item, at) => (visits >= item.from ? at : found), 0);
  const current = TIERS[index]!;
  const upcoming = TIERS[index + 1];
  return { tier: current.tier, label: current.label, next: upcoming ? { label: upcoming.label, visits: upcoming.from - visits } : null };
}

// --- The whole collection ------------------------------------------------------------------

export interface CollectionStats {
  gyms: number;
  visits: number;
  cities: number;
  countries: number;
  /** Your best tier anywhere. */
  topTier: Tier | null;
  /** Your rarest card, and how many are Foil. */
  topRarity: Rarity | null;
  foils: number;
}

export function collectionStats(collection: Collection): CollectionStats {
  const entries = Object.values(collection);
  const topIndex = entries.reduce((best, entry) => Math.max(best, TIERS.findIndex((item) => item.tier === tierFor(entry.days.length).tier)), -1);
  return {
    gyms: entries.length,
    visits: entries.reduce((sum, entry) => sum + entry.days.length, 0),
    cities: new Set(entries.map((entry) => `${entry.countryCode}:${entry.city}`)).size,
    countries: new Set(entries.map((entry) => entry.countryCode)).size,
    topTier: topIndex >= 0 ? TIERS[topIndex]!.tier : null,
    topRarity: entries.length
      ? RARITIES[Math.max(...entries.map((entry) => rarityRank(cardFor(entry).rarity)))]!.id
      : null,
    foils: entries.filter((entry) => cardFor(entry).foil).length,
  };
}

export interface Badge {
  id: string;
  title: string;
  detail: string;
  earned: boolean;
}

/** The badges, earned or still to earn, each from a plain count of your own check-ins (and the sets they finish: lib/sets.ts). */
export function badges(stats: CollectionStats, sets: { suburbs: number; cities: number } = { suburbs: 0, cities: 0 }): Badge[] {
  const tierRank = stats.topTier ? TIERS.findIndex((item) => item.tier === stats.topTier) : -1;
  return [
    { id: 'first', title: 'First gym', detail: 'Collect a gym', earned: stats.gyms >= 1 },
    { id: 'five', title: 'Regular', detail: 'Collect 5 gyms', earned: stats.gyms >= 5 },
    { id: 'ten', title: 'Gym hopper', detail: 'Collect 10 gyms', earned: stats.gyms >= 10 },
    { id: 'cities', title: 'City hopper', detail: 'Gyms in 3 cities', earned: stats.cities >= 3 },
    { id: 'countries', title: 'Globetrotter', detail: 'Gyms in 2 countries', earned: stats.countries >= 2 },
    { id: 'gold', title: 'Home gym', detail: 'A gym at Gold', earned: tierRank >= 2 },
    { id: 'platinum', title: 'Platinum', detail: 'A gym at Platinum', earned: tierRank >= 3 },
    { id: 'epic', title: 'Lucky pull', detail: 'An Epic card or better', earned: stats.topRarity !== null && rarityRank(stats.topRarity) >= rarityRank('epic') },
    { id: 'legendary', title: 'Legend', detail: 'A Legendary card', earned: stats.topRarity === 'legendary' },
    { id: 'foil', title: 'Shiny', detail: 'A Foil card', earned: stats.foils > 0 },
    { id: 'suburb-set', title: 'Local hero', detail: 'Finish a suburb set', earned: sets.suburbs >= 1 },
    { id: 'city-set', title: 'City collector', detail: 'Finish a city set', earned: sets.cities >= 1 },
  ];
}

/** The country's flag, from its two letters. */
export function flag(countryCode: string): string {
  if (!/^[A-Z]{2}$/.test(countryCode)) return '';
  return String.fromCodePoint(...[...countryCode].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));
}

/**
 * Your collection as a few lines to send a friend: the totals, then your
 * top cards by visits. Gym names and cities only, never days or times, as
 * a message can travel further than you meant.
 */
export function collectionShareText(collection: Collection): string {
  const stats = collectionStats(collection);
  const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
  const top = Object.values(collection)
    .sort((a, b) => b.days.length - a.days.length || a.name.localeCompare(b.name))
    .slice(0, 5)
    .map((entry) => `${cardName(cardFor(entry))} · ${tierFor(entry.days.length).label}: ${entry.name}, ${entry.city} ${flag(entry.countryCode)}`.trim());
  return [
    `My GymGO collection: ${plural(stats.gyms, 'gym', 'gyms')} in ${plural(stats.cities, 'city', 'cities')} and ${plural(stats.countries, 'country', 'countries')}, ${plural(stats.visits, 'visit', 'visits')}.`,
    '',
    ...top,
  ].join('\n');
}
