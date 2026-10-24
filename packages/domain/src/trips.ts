/**
 * Travel mode: for a trip (a place and a run of dates), the gyms near there
 * that let visitors in on those days, by their published visitor hours.
 *
 * Each day is checked at a few usual training times (morning, lunch,
 * evening, on the gym's own clock); a day counts when the gym admits a
 * visitor at any of them. "Needs confirmation" is kept apart from yes, and a
 * gym with no yes or maybe on any day of the trip isn't listed.
 */

import { evaluateVisitorAccess, type AccessVerdict } from './access';
import { haversineKm } from './geo';
import { zonedTimeToInstant } from './time';
import type { GymRecord, IsoDate, LatLng } from './types';

/** Longest trip checked day by day; past that, the first fortnight stands for the rest. */
export const TRIP_DAYS_CHECKED = 14;

/** Morning, lunch and evening: when people on a trip usually fit a session in. */
export const TRIP_CHECK_MINUTES = [7 * 60, 12 * 60, 18 * 60] as const;

export interface TripDay {
  date: IsoDate;
  verdict: AccessVerdict;
  /** The first of the usual times a visitor is admitted (or might be), in minutes after midnight. */
  minute: number | null;
}

export interface TripPick {
  record: GymRecord;
  distanceKm: number;
  days: TripDay[];
  /** Days a visitor is admitted at one of the usual times. */
  admitted: number;
  /** Days it may be, once confirmed with the gym. */
  maybe: number;
}

/** The dates from `from` to `to`, both included, at most TRIP_DAYS_CHECKED of them. */
export function tripDates(from: IsoDate, to: IsoDate): IsoDate[] {
  const dates: IsoDate[] = [];
  const [year, month, day] = from.split('-').map(Number) as [number, number, number];
  for (let offset = 0; dates.length < TRIP_DAYS_CHECKED; offset++) {
    const date = new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10);
    if (date > to) break;
    dates.push(date);
  }
  return dates;
}

const RANK: Record<AccessVerdict, number> = { admits_visitor: 3, needs_confirmation: 2, unknown: 1, not_admitted: 0 };

function dayAt(record: GymRecord, date: IsoDate, asOf: Date): TripDay {
  let best: TripDay = { date, verdict: 'not_admitted', minute: null };
  for (const minute of TRIP_CHECK_MINUTES) {
    const instant = zonedTimeToInstant(date, minute, record.location.timezone);
    const { verdict } = evaluateVisitorAccess(record, instant, { asOf });
    if (RANK[verdict] > RANK[best.verdict]) best = { date, verdict, minute: verdict === 'unknown' ? null : minute };
    if (verdict === 'admits_visitor') break;
  }
  return best;
}

/**
 * The gyms within `radiusKm` of the trip's place that admit visitors on at
 * least one day of it (or may), the most days first, then the nearest.
 */
export function tripShortlist(input: {
  records: readonly GymRecord[];
  centre: LatLng;
  from: IsoDate;
  to: IsoDate;
  radiusKm?: number;
  asOf?: Date;
}): TripPick[] {
  const radiusKm = input.radiusKm ?? 10;
  const asOf = input.asOf ?? new Date();
  const dates = tripDates(input.from, input.to);
  const picks: TripPick[] = [];
  for (const record of input.records) {
    const distanceKm = haversineKm(input.centre, record.location.position);
    if (distanceKm > radiusKm) continue;
    const days = dates.map((date) => dayAt(record, date, asOf));
    const admitted = days.filter((day) => day.verdict === 'admits_visitor').length;
    const maybe = days.filter((day) => day.verdict === 'needs_confirmation').length;
    if (admitted + maybe > 0) picks.push({ record, distanceKm, days, admitted, maybe });
  }
  return picks.sort((a, b) => b.admitted - a.admitted || b.maybe - a.maybe || a.distanceKm - b.distanceKm);
}
