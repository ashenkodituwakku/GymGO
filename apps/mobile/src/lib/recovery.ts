/**
 * The recovery map: for each muscle, how many days since you last trained
 * it as a main muscle, from your log (lastTrained), sorted into a few bands
 * for shading the body. It describes your training, nothing more: not
 * whether a muscle is recovered, sore or ready, which GymGO can't know.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import { daysAgo, lastTrained } from './exerciseLibrary';
import type { TrainingSession } from './training';
import { MUSCLES, type Muscle } from './workout';

export type RestBand = 'today' | 'yesterday' | 'days' | 'longer' | 'never';

export const BANDS: Array<{ id: RestBand; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'days', label: '2–3 days ago' },
  { id: 'longer', label: '4 days or more' },
  { id: 'never', label: 'Not in your log' },
];

export function bandFor(days: number | null): RestBand {
  if (days === null) return 'never';
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days <= 3) return 'days';
  return 'longer';
}

export interface MuscleRest {
  muscle: Muscle;
  label: string;
  side: 'front' | 'back';
  /** Whole days since it was last trained as a main muscle; null if never in the log. */
  days: number | null;
  band: RestBand;
}

/** Every muscle, most recently trained first, then the rest. */
export function recoveryMap(sessions: TrainingSession[], now: Date = new Date()): MuscleRest[] {
  const last = lastTrained(sessions);
  return MUSCLES.map((entry) => {
    const at = last.get(entry.id);
    const days = at ? daysAgo(at, now) : null;
    return { muscle: entry.id, label: entry.label, side: entry.side, days, band: bandFor(days) };
  }).sort((a, b) => (a.days ?? Infinity) - (b.days ?? Infinity));
}

/** "Chest: today", "Calves: 6 days ago", "Forearms: not in your log". */
export function restLine(rest: MuscleRest): string {
  if (rest.days === null) return `${rest.label}: not in your log`;
  if (rest.days === 0) return `${rest.label}: today`;
  if (rest.days === 1) return `${rest.label}: yesterday`;
  return `${rest.label}: ${rest.days} days ago`;
}
