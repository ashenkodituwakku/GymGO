/**
 * Card rarity in the gym collection: a game of luck on top of your real
 * visits, and nothing more. It says nothing about the gym.
 *
 * Every day you check in at a gym rolls its card once, and the card keeps
 * its best roll, so going back is how a Common card becomes Legendary. Each
 * card also has a gem, its colour, and one in sixteen is Foil; both are
 * fixed when you first collect the gym.
 *
 * The rolls come from a random seed made when you first collect a gym, so
 * a card looks the same every time it's drawn, on any screen, without
 * storing the rolls. A gym collected before rarity existed takes its seed
 * from its id and the moment it was collected. The odds are shown in the
 * app, and nothing about them can be bought.
 */

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const RARITIES: ReadonlyArray<{ id: Rarity; label: string; odds: number }> = [
  { id: 'common', label: 'Common', odds: 0.6 },
  { id: 'uncommon', label: 'Uncommon', odds: 0.25 },
  { id: 'rare', label: 'Rare', odds: 0.1 },
  { id: 'epic', label: 'Epic', odds: 0.04 },
  { id: 'legendary', label: 'Legendary', odds: 0.01 },
];

export type Gem = 'ruby' | 'sapphire' | 'emerald' | 'amethyst' | 'topaz' | 'aquamarine' | 'rose' | 'onyx';

/** Each gem's colours, light to deep, for the card's frame and glow. */
export const GEMS: ReadonlyArray<{ id: Gem; label: string; colors: readonly [string, string, string] }> = [
  { id: 'ruby', label: 'Ruby', colors: ['#FF8A9B', '#E0234E', '#8C0B2E'] },
  { id: 'sapphire', label: 'Sapphire', colors: ['#8EC5FF', '#2563EB', '#1E2A8A'] },
  { id: 'emerald', label: 'Emerald', colors: ['#7EF0B8', '#10A36A', '#0B5E43'] },
  { id: 'amethyst', label: 'Amethyst', colors: ['#D7B4FF', '#8B3FE0', '#4C1D95'] },
  { id: 'topaz', label: 'Topaz', colors: ['#FFE08A', '#F59E0B', '#9A4A07'] },
  { id: 'aquamarine', label: 'Aquamarine', colors: ['#9DF6F0', '#14B8C4', '#0B6477'] },
  { id: 'rose', label: 'Rose quartz', colors: ['#FFC6DE', '#EC5A9C', '#9D1F5E'] },
  { id: 'onyx', label: 'Onyx', colors: ['#B8BFCC', '#4B5563', '#111827'] },
];

/** One card in this many is Foil. */
export const FOIL_ONE_IN = 16;

/** The rainbow a Legendary card's frame and a Foil card's sheen are made of. */
export const PRISM = ['#FF5F6D', '#FFC371', '#F9F871', '#5EF2B5', '#4FC3F7', '#9B7BFF', '#FF6FD8'] as const;

export const rarityRank = (rarity: Rarity) => RARITIES.findIndex((item) => item.id === rarity);
export const rarityLabel = (rarity: Rarity) => RARITIES[rarityRank(rarity)]!.label;
export const gemInfo = (gem: Gem) => GEMS.find((item) => item.id === gem)!;

/** A 32-bit hash of some text (FNV-1a, then mixed), spread evenly enough for dice. */
export function hash32(text: string): number {
  let hash = 0x811c9dc5;
  for (let at = 0; at < text.length; at++) {
    hash ^= text.charCodeAt(at);
    hash = Math.imul(hash, 0x01000193);
  }
  // Mix the bits (from murmur3's finaliser) so similar texts land far apart.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

/** A number from 0 up to 1, the same every time for the same text. */
export const dice = (text: string) => hash32(text) / 0x1_0000_0000;

/** A new card's seed: random, eight letters and digits. */
export function newSeed(random: () => number = Math.random): string {
  let seed = '';
  for (let at = 0; at < 8; at++) seed += Math.floor(random() * 36).toString(36);
  return seed;
}

/** A roll, 0 to 1, as a rarity: the lowest numbers are the rarest. */
export function rarityForRoll(roll: number): Rarity {
  // In thousandths, so the edges are exact (0.01 + 0.04 + 0.1 isn't 0.15 in floating point).
  const at = Math.floor(roll * 1000);
  let from = 0;
  for (const item of [...RARITIES].reverse()) {
    from += Math.round(item.odds * 1000);
    if (at < from) return item.id;
  }
  return 'common';
}

export interface CardLook {
  rarity: Rarity;
  gem: Gem;
  foil: boolean;
  /** The visit whose roll the card kept. */
  bestDay: string | null;
}

const seedOf = (entry: { id: string; firstAt: string; seed?: string }) => entry.seed ?? `${entry.id}|${entry.firstAt}`;

/** What one day's visit rolled, whether or not the card kept it. */
export function rollFor(entry: { id: string; firstAt: string; seed?: string }, day: string): Rarity {
  return rarityForRoll(dice(`${seedOf(entry)}|${day}`));
}

/** How a collected gym's card looks, worked out from its seed and the days you visited. */
export function cardFor(entry: { id: string; firstAt: string; days: readonly string[]; seed?: string }): CardLook {
  const seed = seedOf(entry);
  const gem = GEMS[hash32(`${seed}|gem`) % GEMS.length]!.id;
  const foil = dice(`${seed}|foil`) < 1 / FOIL_ONE_IN;
  let rarity: Rarity = 'common';
  let bestDay: string | null = entry.days[0] ?? null;
  for (const day of entry.days) {
    const rolled = rarityForRoll(dice(`${seed}|${day}`));
    if (rarityRank(rolled) > rarityRank(rarity)) {
      rarity = rolled;
      bestDay = day;
    }
  }
  return { rarity, gem, foil, bestDay };
}

/** "Rare Sapphire", "Legendary Onyx foil". */
export function cardName(look: CardLook): string {
  return `${rarityLabel(look.rarity)} ${gemInfo(look.gem).label}${look.foil ? ' foil' : ''}`;
}

/** The odds as a sentence, for the collection's explanation. */
export function oddsLine(): string {
  const percent = (odds: number) => `${Math.round(odds * 100)}%`;
  return RARITIES.map((item) => `${item.label} ${percent(item.odds)}`).join(', ');
}
