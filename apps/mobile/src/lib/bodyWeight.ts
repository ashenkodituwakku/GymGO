/**
 * Your body weight over time, for Progress: one weigh-in a day (a second on
 * the same day replaces the first), kept in kilograms and shown in your
 * unit. Kept on this device only: a body measurement is nobody's business,
 * so it never goes to GymGO's server (and so isn't in Download my data or on
 * a second phone).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export interface WeighIn {
  /** The phone's own date, YYYY-MM-DD. */
  date: string;
  kg: number;
}

const KEY = 'gymgo.body-weight.v1';
/** About three years of daily weigh-ins: older ones drop off. */
const KEPT = 1100;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** What a person weighs, broadly: anything outside is a slip of the finger. */
export const BODY_KG = { min: 20, max: 400 } as const;

const plausible = (kg: unknown): kg is number => typeof kg === 'number' && Number.isFinite(kg) && kg >= BODY_KG.min && kg <= BODY_KG.max;

/** Oldest first, one a day (the last one given wins), at most KEPT. */
function tidy(list: WeighIn[]): WeighIn[] {
  const byDay = new Map<string, WeighIn>();
  for (const entry of list) byDay.set(entry.date, entry);
  return [...byDay.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).slice(-KEPT);
}

/** What was kept, with anything damaged or implausible left out. */
export function parseWeighIns(raw: string | null): WeighIn[] {
  try {
    const value = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(value)) return [];
    return tidy(
      value
        .filter((entry): entry is WeighIn => typeof entry === 'object' && entry !== null && typeof entry.date === 'string' && DAY.test(entry.date) && plausible(entry.kg))
        .map((entry) => ({ date: entry.date, kg: entry.kg })),
    );
  } catch {
    return [];
  }
}

export function withWeighIn(list: WeighIn[], date: string, kg: number): WeighIn[] {
  if (!DAY.test(date) || !plausible(kg)) return list;
  return tidy([...list, { date, kg: Math.round(kg * 100) / 100 }]);
}

export const withoutWeighIn = (list: WeighIn[], date: string): WeighIn[] => list.filter((entry) => entry.date !== date);

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/**
 * How the latest weigh-in compares with about a month before it: the last
 * one at least 30 days earlier, or else the first, if that's at least a week
 * before (a day-to-day change is mostly water).
 */
export function weightChange(list: WeighIn[]): { kg: number; since: string; days: number } | null {
  const latest = list[list.length - 1];
  if (!latest) return null;
  const monthBefore = [...list].reverse().find((entry) => daysBetween(entry.date, latest.date) >= 30);
  const from = monthBefore ?? list[0]!;
  const days = daysBetween(from.date, latest.date);
  if (days < 7) return null;
  return { kg: Math.round((latest.kg - from.kg) * 100) / 100, since: from.date, days };
}

/** The last `days` days of weigh-ins, for the chart. */
export function recentWeighIns(list: WeighIn[], today: string, days = 90): WeighIn[] {
  return list.filter((entry) => daysBetween(entry.date, today) <= days && daysBetween(entry.date, today) >= 0);
}

/** The phone's own date today, YYYY-MM-DD. */
export function localToday(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** The weigh-ins, and ways to add and take one away (kept as they change). */
export function useBodyWeight() {
  const [list, setList] = useState<WeighIn[] | null>(null);
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => live && setList(parseWeighIns(raw)))
      .catch(() => live && setList([]));
    return () => {
      live = false;
    };
  }, []);
  const keep = useCallback((change: (current: WeighIn[]) => WeighIn[]) => {
    setList((current) => {
      const next = change(current ?? []);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);
  const add = useCallback((date: string, kg: number) => keep((current) => withWeighIn(current, date, kg)), [keep]);
  const remove = useCallback((date: string) => keep((current) => withoutWeighIn(current, date)), [keep]);
  return { list, add, remove };
}
