/**
 * The app's voice.
 *
 * Friendly, short, a bit of gym-floor energy — but never at the expense of
 * the truth. Every phrase here maps onto exactly one state from the domain
 * rules, and none of them promises more than the evidence supports: "worth a
 * call" is what "needs confirmation" actually means to someone standing on the
 * street, and "not a fit" never pretends a gym is bad, only that it doesn't
 * match what was asked for.
 *
 * Pure functions, so every mapping is unit-tested (copy.test.ts).
 */

import type { AccessVerdict, ResultTier } from '@gymgo/domain';
import { countryInSentence } from './country';
import { KM_PER_MILE, distanceLabel, usesMiles } from './places';

export interface TierCopy {
  label: string;
  line: string;
}

export const TIER: Record<ResultTier, TierCopy> = {
  confirmed: {
    label: 'Good to go',
    line: 'Everything you asked for checks out.',
  },
  needs_confirmation: {
    label: 'Call first',
    line: "Could work — a few things we couldn't confirm.",
  },
  ruled_out: {
    label: 'Not a fit',
    line: "Something you need isn't there.",
  },
};

/**
 * A line of greeting above the results, keyed to when they plan to train —
 * not to the clock, so planning tomorrow's 6 am from the couch at 9 pm still
 * reads "Early one?".
 */
export function sessionGreeting(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60) % 24;
  if (hour < 5) return 'Can’t sleep? Same.';
  if (hour < 9) return 'Early one?';
  if (hour < 11) return 'Morning session?';
  if (hour < 14) return 'Lunch-break pump?';
  if (hour < 17) return 'Afternoon session?';
  if (hour < 20) return 'After-work session?';
  return 'Late one?';
}

/** A little personality per verdict, as a short chip for the list. */
/** "7 pm", "6:30 am", "12 pm". */
export function timeLabel(minuteOfDay: number): string {
  const hour24 = Math.floor(minuteOfDay / 60) % 24;
  const minute = minuteOfDay % 60;
  const suffix = hour24 < 12 ? 'am' : 'pm';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return minute === 0 ? `${hour12} ${suffix}` : `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/** The headline for guest entry at the chosen time. */
export function accessLine(verdict: AccessVerdict, minuteOfDay: number): string {
  const at = timeLabel(minuteOfDay);
  switch (verdict) {
    case 'admits_visitor':
      return `Guests welcome at ${at}`;
    case 'needs_confirmation':
      return `Call to check guest entry`;
    case 'not_admitted':
      return `No guests at ${at}`;
    case 'unknown':
      return 'Guest hours unknown';
  }
}

/** The short value in the metric strip. */
export function accessShort(verdict: AccessVerdict): string {
  switch (verdict) {
    case 'admits_visitor':
      return 'Welcome';
    case 'needs_confirmation':
      return 'Check first';
    case 'not_admitted':
      return 'Not then';
    case 'unknown':
      return 'Unknown';
  }
}

export function ratingShort(average: number | null): string {
  return average === null ? 'New' : `★ ${average.toFixed(1)}`;
}

/** The line under the search field. */
export function summaryLine(total: number, confirmed: number, minuteOfDay: number): string {
  if (total === 0) return 'No gyms here yet';
  const gyms = total === 1 ? '1 gym' : `${total} gyms`;
  if (confirmed === 0) return `${gyms} nearby · none a sure thing at ${timeLabel(minuteOfDay)}`;
  return `${gyms} nearby · ${confirmed} good to go at ${timeLabel(minuteOfDay)}`;
}

/**
 * The button at the foot of Filters: how many gyms could still work, and how
 * many of those are sure things. Gyms the filters rule out aren't counted.
 */
export function filtersButtonLabel(counts: { confirmed: number; needs_confirmation: number }): string {
  const possible = counts.confirmed + counts.needs_confirmation;
  if (possible === 0) return 'No gyms — loosen something';
  const gyms = `Show ${possible === 1 ? '1 gym' : `${possible} gyms`}`;
  if (counts.confirmed === possible) return gyms;
  if (counts.confirmed === 0) return `${gyms} · none a sure thing`;
  return `${gyms} · ${counts.confirmed} good to go`;
}

/**
 * When the GymGO server can't be reached at sign-in. In a browser it runs on
 * the same computer; a phone also has to be on that computer's Wi-Fi (or the
 * launcher's tunnel).
 */
export function serverOfflineLine(platform: string): string {
  return platform === 'web'
    ? 'Can’t reach the GymGO server. Start GymGO on this computer, then try again.'
    : 'Can’t reach the GymGO server. Check GymGO is running on your computer and this phone is on the same Wi-Fi, then try again.';
}

/** What members said about whether a gym is still there, in the last six months. */
export function statusSummaryLine(closed: number, open: number): string {
  if (closed + open === 0) return 'The map can be out of date, and no member has said yet.';
  const members = (count: number) => (count === 1 ? '1 member' : `${count} members`);
  if (closed === 0) return `In the last six months, ${members(open)} said it’s still open.`;
  if (open === 0) return `In the last six months, ${members(closed)} said it has closed.`;
  return `In the last six months, ${members(closed)} said it has closed and ${open} said it’s still open.`;
}

export const EMPTY = {
  reviews: 'No reviews yet. Train there and be the first.',
  photos: 'No photo supplied yet',
  results: 'Nothing ticks every box. Loosen one and try again.',
  /** No filters are on: what's missing is information, not a looser search. */
  unconfirmedLine: 'Gyms rarely publish everything we check, so each card says exactly what to ask.',
  /** When looking a typed place up failed (not when it wasn't found). */
  outOfArea: "Couldn't look that place up just now. Try again, or move the map there and tap Search this area.",
  locationApproximate:
    'Your phone is only sharing your approximate location, so distances may be well off. Turn on Precise Location for GymGO in Settings.',
  crowd: "Live crowd info isn't something we have — so we won't guess.",
} as const;

/** A place to type, in the words people use at home: suburbs in Australia, ZIP codes in the US. */
function placeWords(home: string | null): string {
  if (home === 'US') return 'a city or ZIP code';
  if (home === 'AU' || home === 'NZ') return 'a suburb or city';
  return 'a town or city';
}

/** What the search box asks for. */
export function searchPrompt(home: string | null): string {
  if (home === 'US') return 'Search a city, ZIP code or gym';
  if (home === 'AU' || home === 'NZ') return 'Search a suburb, city or gym';
  return 'Search a town, city or gym';
}

/** What to say after finding you, if anything. `home` is the country you chose. */
export function locatedNotice(
  result:
    | { kind: 'here'; fix: { approximate: boolean } }
    | { kind: 'area'; fix: { approximate: boolean }; gyms: number; radiusKm: number; countryCode: string }
    | { kind: 'nearest'; km: number; city: { name: string; country: string } }
    | { kind: 'home'; placeName: string }
    | { kind: 'abroad'; countryCode: string; home: string }
    | { kind: 'denied' }
    | { kind: 'unavailable' },
  home: string | null = null,
): string | null {
  switch (result.kind) {
    case 'denied':
      return `No worries — search ${placeWords(home)} instead.`;
    case 'unavailable':
      return `Couldn't get a fix on where you are. Search ${placeWords(home)} instead.`;
    case 'nearest':
      return `Couldn't search the map around you just now, so here's ${result.city.name}, the nearest city GymGO has built in (${distanceLabel(result.km, result.city.country)} away).`;
    case 'home':
      return `Couldn't search the map around you just now, so here's ${result.placeName}.`;
    case 'abroad':
      return `You're in ${countryInSentence(result.countryCode)}. GymGO Free covers ${countryInSentence(result.home)}, the country you chose; gyms everywhere else are part of Pro. Here's ${countryInSentence(result.home)}.`;
    case 'here':
      return result.fix.approximate ? EMPTY.locationApproximate : null;
    case 'area': {
      const rough = result.fix.approximate ? ` ${EMPTY.locationApproximate}` : '';
      if (result.gyms === 0) return `OpenStreetMap has no gyms mapped close to you yet. Move the map and tap Search this area to look further out.${rough}`;
      if (result.radiusKm > 5) {
        // Whole miles: the steps are 5 and 10 km, and "3.1 mi" reads as more exact than it is.
        const within = (km: number) => (usesMiles(result.countryCode) ? `${Math.round(km / KM_PER_MILE)} mi` : `${km} km`);
        return `Nothing's mapped within ${within(5)} of you, so this shows ${result.gyms === 1 ? 'the gym' : `the ${result.gyms} gyms`} within ${within(result.radiusKm)}, from OpenStreetMap: map-only, so call before you go.${rough}`;
      }
      return `Gyms around you from OpenStreetMap: map-only, so call before you go.${rough}`;
    }
  }
}

export const PLACEHOLDER = 'Where are we lifting?';

/** Sources, in plain words. */
export function sourceLabel(status: string): string {
  switch (status) {
    case 'owner_confirmed':
      return 'From the gym';
    case 'independently_checked':
      return 'Checked by us';
    case 'community_reported':
      return 'From a member';
    case 'conflicting':
      return 'Sources disagree';
    default:
      return 'Not established';
  }
}

/** "Checked today" / "Checked 9 days ago" / "Checked 4 months ago". */
export function checkedAgo(ageDays: number | null): string {
  if (ageDays === null) return 'Never checked';
  if (ageDays <= 0) return 'Checked today';
  if (ageDays === 1) return 'Checked yesterday';
  if (ageDays < 31) return `Checked ${ageDays} days ago`;
  const months = Math.round(ageDays / 30);
  return `Checked ${months} month${months === 1 ? '' : 's'} ago`;
}
