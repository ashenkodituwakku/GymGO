/**
 * Your gym collection, as the app keeps it and your account holds it.
 *
 * The app adds a gym when you check in there (apps/mobile/src/lib/collection.ts
 * decides that, on the phone). Signed in, the account keeps a copy, so the
 * collection follows you between devices: each copy is merged with the
 * other, never overwritten, so a check-in made offline or on another device
 * is never lost. The rules for merging and for what a stored entry may hold
 * live here, shared by the app and the server.
 */

export interface CollectedGym {
  id: string;
  name: string;
  suburb: string;
  /** The nearest big city, for counting cities; the suburb when none is near. */
  city: string;
  countryCode: string;
  brand: string | null;
  /** The local days you checked in, oldest first ("2026-09-27"). Each is one visit. */
  days: string[];
  firstAt: string;
  lastAt: string;
  /** The card's random seed, for its rarity, gem and foil. Missing on gyms collected before cards had them. */
  seed?: string;
}

export type Collection = Record<string, CollectedGym>;

/** The most gyms one collection holds. */
export const COLLECTION_MAX_GYMS = 3000;
/** The most visits a gym keeps (the newest). */
export const COLLECTION_MAX_DAYS = 400;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const text = (value: unknown, max: number): string | null =>
  typeof value === 'string' && value.length <= max ? value.trim().replace(/\s+/g, ' ') : null;

const isDay = (value: unknown): value is string => typeof value === 'string' && DAY.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

/**
 * A stored entry from whatever was sent, or null when it isn't one. Days
 * and times later than `now` allows (a day ahead, for time zones) are
 * dropped; so is an entry left with no days.
 */
export function cleanCollectedGym(value: unknown, now: Date): CollectedGym | null {
  if (!value || typeof value !== 'object') return null;
  const entry = value as Record<string, unknown>;
  const id = typeof entry.id === 'string' && entry.id.length > 0 && entry.id.length <= 200 ? entry.id : null;
  const name = text(entry.name, 200);
  const suburb = text(entry.suburb, 200) ?? '';
  const city = text(entry.city, 200) ?? suburb;
  const countryCode = typeof entry.countryCode === 'string' && /^[A-Z]{2}$/.test(entry.countryCode) ? entry.countryCode : null;
  const brand = entry.brand === null || entry.brand === undefined ? null : text(entry.brand, 200);
  if (!id || !name || !countryCode) return null;
  const latest = new Date(now.getTime() + 86_400_000);
  const lastDay = latest.toISOString().slice(0, 10);
  const days = Array.isArray(entry.days) ? [...new Set(entry.days.filter(isDay).filter((day) => day <= lastDay))].sort().slice(-COLLECTION_MAX_DAYS) : [];
  if (days.length === 0) return null;
  const time = (value: unknown) => (typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value)) && Date.parse(value) <= latest.getTime() ? new Date(value).toISOString() : null);
  const firstAt = time(entry.firstAt) ?? `${days[0]}T00:00:00.000Z`;
  const lastAt = time(entry.lastAt) ?? firstAt;
  const seed = typeof entry.seed === 'string' && entry.seed.length > 0 && entry.seed.length <= 260 ? entry.seed : undefined;
  return { id, name, suburb, city, countryCode, brand: brand || null, days, firstAt, lastAt: lastAt < firstAt ? firstAt : lastAt, ...(seed ? { seed } : {}) };
}

/**
 * One gym's two copies as one: every day either has (the newest kept), the
 * earliest first visit and the latest last, the gym's names as of the later
 * visit, and the card's seed from the copy that had it first (`kept`), so a
 * card looks the same on every device.
 */
export function mergeCollectedGym(kept: CollectedGym, other: CollectedGym): CollectedGym {
  const newer = other.lastAt > kept.lastAt ? other : kept;
  const days = [...new Set([...kept.days, ...other.days])].sort().slice(-COLLECTION_MAX_DAYS);
  const seed = kept.seed ?? other.seed;
  return {
    id: kept.id,
    name: newer.name,
    suburb: newer.suburb,
    city: newer.city,
    countryCode: newer.countryCode,
    brand: newer.brand,
    days,
    firstAt: kept.firstAt < other.firstAt ? kept.firstAt : other.firstAt,
    lastAt: newer.lastAt,
    ...(seed ? { seed } : {}),
  };
}

/** Two collections as one; where both have a gym, `kept`'s card seed wins. */
export function mergeCollections(kept: Collection, other: Collection): Collection {
  const merged: Collection = { ...kept };
  for (const [id, entry] of Object.entries(other)) merged[id] = merged[id] ? mergeCollectedGym(merged[id]!, entry) : entry;
  return merged;
}

/**
 * What's left of a collection after it was reset on `resetDay` (a local day):
 * only visits on later days, which must have been made after the reset. Used
 * when a device that was offline learns of a reset made on another.
 */
export function visitsAfter(collection: Collection, resetDay: string): Collection {
  const left: Collection = {};
  for (const [id, entry] of Object.entries(collection)) {
    const days = entry.days.filter((day) => day > resetDay);
    if (days.length > 0) left[id] = { ...entry, days };
  }
  return left;
}
