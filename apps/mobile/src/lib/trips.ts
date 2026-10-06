/**
 * Travel mode's trips: where you're going and when. Kept on this device only
 * (where you'll be is nobody else's business), never sent to the server.
 *
 * The gyms for a trip are worked out on the phone by the domain's
 * tripShortlist, from the gyms GymGO carries for that place.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import type { LatLng } from '@gymgo/domain';
import { addDays, nowIn } from './query';

const KEY = 'gymgo.trips.v1';
/** Enough for a year of travel; older trips drop off once they're over. */
export const TRIP_LIMIT = 12;
/** Longest trip you can plan, in nights. */
export const MAX_NIGHTS = 30;

export interface Trip {
  id: string;
  /** What the place is called: "Sydney", "Fitzroy", "Osaka". */
  placeName: string;
  centre: LatLng;
  timezone: string;
  /** ISO 3166-1, for distances in miles or kilometres. */
  countryCode: string;
  /** First and last day, both included, on the place's own calendar. */
  from: string;
  to: string;
}

/** Trips not over yet, soonest first. */
export function upcomingTrips(trips: readonly Trip[], today: string): Trip[] {
  return trips.filter((trip) => trip.to >= today).sort((a, b) => a.from.localeCompare(b.from) || a.placeName.localeCompare(b.placeName));
}

/** The trip to show on Home: one under way, or the next to start within a month. */
export function tripToShow(trips: readonly Trip[], today: string): Trip | null {
  const next = upcomingTrips(trips, today)[0];
  if (!next) return null;
  return next.from <= addDays(today, 30) ? next : null;
}

/** The days left of a trip to plan for: from today if it's under way. */
export function daysToPlan(trip: Trip, today: string): { from: string; to: string } {
  return { from: trip.from < today ? today : trip.from, to: trip.to };
}

const day = (date: string) => new Date(`${date}T12:00:00Z`);

/** "Thu 24 – Sun 27 Sept", "Wed 30 Sept – Fri 2 Oct", "Sat 3 Oct" (the month as the phone's language shortens it). */
export function tripDatesLabel(trip: Pick<Trip, 'from' | 'to'>, locale?: string): string {
  // Built from its parts: locales differ on commas ("Sun, 27 Sept").
  const part = (date: string, option: Intl.DateTimeFormatOptions) => day(date).toLocaleDateString(locale ?? 'en-AU', { timeZone: 'UTC', ...option });
  const label = (date: string, month: boolean) =>
    [part(date, { weekday: 'short' }), String(Number(date.slice(8, 10))), month ? part(date, { month: 'short' }) : null].filter(Boolean).join(' ');
  if (trip.from === trip.to) return label(trip.from, true);
  const sameMonth = trip.from.slice(0, 7) === trip.to.slice(0, 7);
  return `${label(trip.from, !sameMonth)} – ${label(trip.to, true)}`;
}

/**
 * Today's date where the trip is. A trip's days are on the place's own
 * calendar, so this is the "today" to describe it by, wherever the phone is.
 */
export const todayThere = (trip: Pick<Trip, 'timezone'>, now: Date = new Date()): string => nowIn(trip.timezone, now).date;

/** "Today", "Tomorrow", "In 5 days", "Under way", "Last day". */
export function tripWhen(trip: Pick<Trip, 'from' | 'to'>, today: string): string {
  if (trip.from === today) return 'Today';
  if (trip.from < today) return trip.to === today ? 'Last day' : 'Under way';
  const days = Math.round((day(trip.from).getTime() - day(today).getTime()) / 86_400_000);
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

/** Nights between the first and last day. */
export function nights(trip: Pick<Trip, 'from' | 'to'>): number {
  return Math.round((day(trip.to).getTime() - day(trip.from).getTime()) / 86_400_000);
}

function readTrips(raw: string | null): Trip[] {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (trip): trip is Trip =>
        trip &&
        typeof trip.id === 'string' &&
        typeof trip.placeName === 'string' &&
        typeof trip.centre?.lat === 'number' &&
        typeof trip.centre?.lng === 'number' &&
        typeof trip.timezone === 'string' &&
        typeof trip.countryCode === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(trip.from) &&
        /^\d{4}-\d{2}-\d{2}$/.test(trip.to),
    );
  } catch {
    return [];
  }
}

let cache: Trip[] | null = null;
const listeners = new Set<(trips: Trip[]) => void>();

function publish(trips: Trip[]) {
  cache = trips;
  for (const listener of listeners) listener(trips);
  AsyncStorage.setItem(KEY, JSON.stringify(trips)).catch(() => undefined);
}

/** Your trips, and ways to add and remove them. Every screen that uses it sees the same list. */
export function useTrips(today: string): {
  trips: Trip[];
  loaded: boolean;
  addTrip: (trip: Omit<Trip, 'id'>) => Trip;
  removeTrip: (id: string) => void;
} {
  const [trips, setTrips] = useState<Trip[]>(cache ?? []);
  const [loaded, setLoaded] = useState(cache !== null);

  useEffect(() => {
    listeners.add(setTrips);
    if (cache === null) {
      AsyncStorage.getItem(KEY)
        .then((raw) => {
          if (cache === null) cache = readTrips(raw);
          setTrips(cache);
        })
        .catch(() => setTrips((cache ??= [])))
        .finally(() => setLoaded(true));
    }
    return () => {
      listeners.delete(setTrips);
    };
  }, []);

  const addTrip = useCallback(
    (trip: Omit<Trip, 'id'>) => {
      const made: Trip = { ...trip, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` };
      publish([...upcomingTrips(cache ?? [], today), made].slice(-TRIP_LIMIT));
      return made;
    },
    [today],
  );
  const removeTrip = useCallback((id: string) => publish((cache ?? []).filter((trip) => trip.id !== id)), []);

  return { trips: upcomingTrips(trips, today), loaded, addTrip, removeTrip };
}

export const parseTrips = readTrips;
