/**
 * Friends and leaderboards, the rules shared by the app and the server.
 *
 * - A friend code is eight letters and digits that can't be misread (no 0
 *   and O, 1 and I or L), written in two fours: "K7QM-2XPH". Adding someone
 *   needs their code, and they have to accept.
 * - A friend sees your cards and totals, never the days you trained: each
 *   card comes with its look worked out (rarity, gem, foil) and a visit
 *   count, and the dates stay on your account.
 * - Leaderboards rank by gyms collected, then visits; ties share a place.
 *   Only people who opted in are on the public boards, by display name.
 */

import { cardFor, type Gem, type Rarity } from './cards';
import type { CollectedGym } from './collection';

export const FRIEND_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const FRIEND_CODE_LENGTH = 8;

/** A new friend code from random numbers (0 up to 1). */
export function makeFriendCode(random: () => number): string {
  let code = '';
  for (let at = 0; at < FRIEND_CODE_LENGTH; at++) code += FRIEND_CODE_ALPHABET[Math.floor(random() * FRIEND_CODE_ALPHABET.length)];
  return code;
}

/** "K7QM-2XPH", from the stored "K7QM2XPH". */
export function formatFriendCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * A typed or pasted code as stored, or null when it can't be one. Case,
 * spaces and dashes don't matter; a character codes never use (0, O, 1, I,
 * L) means it isn't one, and it's refused rather than guessed at.
 */
export function normaliseFriendCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== FRIEND_CODE_LENGTH) return null;
  return [...code].every((letter) => FRIEND_CODE_ALPHABET.includes(letter)) ? code : null;
}

/** One of a friend's cards: what it looks like and how often they've been, without the days. */
export interface FriendCard {
  id: string;
  name: string;
  suburb: string;
  city: string;
  countryCode: string;
  brand: string | null;
  visits: number;
  rarity: Rarity;
  gem: Gem;
  foil: boolean;
  /** The month they first collected it ("2026-09"), not the day. */
  since: string;
}

export function friendCard(entry: CollectedGym): FriendCard {
  const look = cardFor(entry);
  return {
    id: entry.id,
    name: entry.name,
    suburb: entry.suburb,
    city: entry.city,
    countryCode: entry.countryCode,
    brand: entry.brand,
    visits: entry.days.length,
    rarity: look.rarity,
    gem: look.gem,
    foil: look.foil,
    since: entry.firstAt.slice(0, 7),
  };
}

export interface CollectionTotals {
  gyms: number;
  visits: number;
  cities: number;
  countries: number;
}

/** Gyms, visits, cities and countries, for the whole collection or one city's part of it. */
export function collectionTotals(
  entries: ReadonlyArray<Pick<CollectedGym, 'city' | 'countryCode'> & { visits: number }>,
  inCity?: { city: string; countryCode: string } | null,
): CollectionTotals {
  const kept = inCity ? entries.filter((entry) => entry.countryCode === inCity.countryCode && entry.city.toLowerCase() === inCity.city.toLowerCase()) : entries;
  return {
    gyms: kept.length,
    visits: kept.reduce((sum, entry) => sum + entry.visits, 0),
    cities: new Set(kept.map((entry) => `${entry.countryCode}:${entry.city.toLowerCase()}`)).size,
    countries: new Set(kept.map((entry) => entry.countryCode)).size,
  };
}

export interface BoardRow {
  /** Only ever compared with your own id, never shown. */
  id: string;
  displayName: string;
  gyms: number;
  visits: number;
}

/** Places on a board: most gyms first, then most visits; equal on both, equal place ("1, 2, 2, 4"). Nobody with no gyms. */
export function rankBoard<T extends BoardRow>(rows: readonly T[]): Array<T & { rank: number }> {
  const sorted = rows
    .filter((row) => row.gyms > 0)
    .sort((a, b) => b.gyms - a.gyms || b.visits - a.visits || a.displayName.localeCompare(b.displayName));
  return sorted.map((row, index) => {
    let first = index;
    while (first > 0 && sorted[first - 1]!.gyms === row.gyms && sorted[first - 1]!.visits === row.visits) first--;
    return { ...row, rank: first + 1 };
  });
}
