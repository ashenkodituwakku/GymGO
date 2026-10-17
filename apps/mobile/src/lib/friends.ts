/**
 * Friends, in the app's terms: a friend's card as something GemCard can
 * draw, invite times to pick from, and dates in words.
 *
 * No React Native imports here, so it is unit-tested in Node.
 */

import type { FriendCard } from '@gymgo/domain';
import type { CollectedGym } from './collection';
import type { CardLook } from './rarity';

/** A friend's card for GemCard: the entry it draws from (with no days) and the look and visits to show. */
export function friendCardProps(card: FriendCard): { entry: CollectedGym; look: CardLook; visits: number } {
  return {
    entry: {
      id: card.id,
      name: card.name,
      suburb: card.suburb,
      city: card.city,
      countryCode: card.countryCode,
      brand: card.brand,
      days: [],
      firstAt: `${card.since}-01T00:00:00.000Z`,
      lastAt: `${card.since}-01T00:00:00.000Z`,
    },
    look: { rarity: card.rarity, gem: card.gem, foil: card.foil, bestDay: null },
    visits: card.visits,
  };
}

/** "Sat 3 Oct, 7:00 am", in the phone's own words. */
export function inviteWhen(at: string, locale?: string): string {
  const date = new Date(at);
  return `${date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}, ${date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}`;
}

/** The times offered for an invite: early, morning, lunch, after work, evening. */
export const INVITE_MINUTES = [6 * 60, 9 * 60, 12 * 60, 17 * 60 + 30, 19 * 60] as const;

/** The moment for an invite: a day from today (0 = today) at a minute of the day, on this phone's clock. */
export function inviteAt(dayOffset: number, minute: number, now: Date = new Date()): Date {
  const at = new Date(now);
  at.setHours(0, 0, 0, 0);
  at.setDate(at.getDate() + dayOffset);
  at.setMinutes(minute);
  return at;
}
