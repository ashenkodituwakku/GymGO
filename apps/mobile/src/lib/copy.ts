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

export interface TierCopy {
  emoji: string;
  label: string;
  line: string;
}

export const TIER: Record<ResultTier, TierCopy> = {
  confirmed: {
    emoji: '💪',
    label: 'Good to go',
    line: 'Everything you asked for checks out.',
  },
  needs_confirmation: {
    emoji: '📞',
    label: 'Call first',
    line: "Could work — a few things we couldn't confirm.",
  },
  ruled_out: {
    emoji: '🙅',
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

export const EMPTY = {
  reviews: 'No reviews yet. Train there and be the first.',
  photos: 'No photo supplied yet',
  results: 'Nothing ticks every box. Loosen one and try again.',
  /** No filters are on: what's missing is information, not a looser search. */
  unconfirmedLine: 'Gyms rarely publish everything we check, so each card says exactly what to ask. 📞',
  outOfArea: "We only cover inner Melbourne for now (plus a Sydney demo), so here's the CBD.",
  locationDenied: 'No worries — search a suburb instead.',
  locationFar: "You're outside inner Melbourne, so we're showing the CBD instead.",
  crowd: "Live crowd info isn't something we have — so we won't guess.",
} as const;

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
