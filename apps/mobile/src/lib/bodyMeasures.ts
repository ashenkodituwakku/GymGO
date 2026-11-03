/**
 * Body measurements over time (app/measurements.tsx): waist, chest, hips,
 * neck, shoulders, upper arm, forearm, thigh and calf, and body fat. Kept on
 * this device only, like body weight (lib/bodyWeight.ts): a body
 * measurement is nobody's business, so it never goes to GymGO's server.
 *
 * Lengths are kept in centimetres and shown in inches where weights are in
 * pounds. One entry a day: measuring something again that day replaces it,
 * and anything else measured that day is kept beside it.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import { deviceStore } from './deviceStore';
import type { WeightUnit } from './training';

export type MeasureId = 'waist' | 'chest' | 'hips' | 'neck' | 'shoulders' | 'upperArm' | 'forearm' | 'thigh' | 'calf' | 'bodyFat';

export interface Measure {
  id: MeasureId;
  label: string;
  /** What a person measures, broadly, in cm (or % for body fat): anything outside is a slip of the finger. */
  min: number;
  max: number;
  /** Where to put the tape. */
  how: string;
}

export const MEASURES: readonly Measure[] = [
  { id: 'waist', label: 'Waist', min: 40, max: 200, how: 'At the navel, relaxed, after breathing out' },
  { id: 'chest', label: 'Chest', min: 50, max: 200, how: 'Around the fullest part, under the arms' },
  { id: 'hips', label: 'Hips', min: 50, max: 200, how: 'Around the widest part of the seat' },
  { id: 'neck', label: 'Neck', min: 20, max: 80, how: 'Just below the Adam’s apple' },
  { id: 'shoulders', label: 'Shoulders', min: 70, max: 200, how: 'Around both shoulders at their widest' },
  { id: 'upperArm', label: 'Upper arm', min: 15, max: 70, how: 'Around the biceps at its biggest, arm relaxed' },
  { id: 'forearm', label: 'Forearm', min: 15, max: 60, how: 'Around the thickest part, below the elbow' },
  { id: 'thigh', label: 'Thigh', min: 30, max: 110, how: 'Around the thickest part, standing' },
  { id: 'calf', label: 'Calf', min: 20, max: 70, how: 'Around the thickest part, standing' },
  { id: 'bodyFat', label: 'Body fat', min: 2, max: 70, how: 'From your scale or callipers: an estimate either way' },
];
const BY_ID = new Map(MEASURES.map((measure) => [measure.id, measure]));

export type LengthUnit = 'cm' | 'in';
export const lengthUnitFor = (unit: WeightUnit): LengthUnit => (unit === 'lb' ? 'in' : 'cm');
const CM_PER_INCH = 2.54;

/** What a measure is written in: %, or the length unit. */
export const unitOf = (id: MeasureId, length: LengthUnit) => (id === 'bodyFat' ? '%' : length);

/** A kept value (cm, or %) as shown, to a tenth: "82.5". */
export function shownValue(id: MeasureId, kept: number, length: LengthUnit): number {
  const value = id === 'bodyFat' || length === 'cm' ? kept : kept / CM_PER_INCH;
  return Math.round(value * 10) / 10;
}

/** "82.5 cm", "32.5 in", "18 %". */
export const valueLabel = (id: MeasureId, kept: number, length: LengthUnit) => `${shownValue(id, kept, length)} ${unitOf(id, length)}`;

/** What was typed ("82,5"), in the shown unit, as kept (cm, or %); null if it isn't a plausible value. */
export function keptValue(id: MeasureId, typed: string, length: LengthUnit): number | null {
  const clean = typed.trim().replace(',', '.');
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(clean)) return null;
  const value = Number(clean);
  const kept = id === 'bodyFat' || length === 'cm' ? value : value * CM_PER_INCH;
  const measure = BY_ID.get(id)!;
  return kept >= measure.min && kept <= measure.max ? Math.round(kept * 100) / 100 : null;
}

export interface MeasureDay {
  /** The phone's own date, YYYY-MM-DD. */
  date: string;
  values: Partial<Record<MeasureId, number>>;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** About three years of weekly measuring. */
const KEPT = 400;

const plausible = (id: MeasureId, value: unknown): value is number => {
  const measure = BY_ID.get(id);
  return !!measure && typeof value === 'number' && Number.isFinite(value) && value >= measure.min && value <= measure.max;
};

/** Oldest first, a day once, days with nothing left out, at most KEPT. */
function tidy(days: MeasureDay[]): MeasureDay[] {
  const byDay = new Map<string, MeasureDay>();
  for (const day of days) byDay.set(day.date, { date: day.date, values: { ...byDay.get(day.date)?.values, ...day.values } });
  return [...byDay.values()]
    .filter((day) => Object.keys(day.values).length > 0)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(-KEPT);
}

/** What was stored, with anything damaged or implausible left out. */
export function cleanMeasureDays(stored: unknown): MeasureDay[] {
  if (!Array.isArray(stored)) return [];
  const days: MeasureDay[] = [];
  for (const entry of stored) {
    if (!entry || typeof entry !== 'object' || typeof entry.date !== 'string' || !DAY.test(entry.date) || !entry.values || typeof entry.values !== 'object') continue;
    const values: MeasureDay['values'] = {};
    for (const [id, value] of Object.entries(entry.values as Record<string, unknown>)) if (plausible(id as MeasureId, value)) values[id as MeasureId] = value;
    days.push({ date: entry.date, values });
  }
  return tidy(days);
}

/** The days with `values` measured on `date`: replacing what was measured again that day, keeping the rest. */
export function withMeasures(days: readonly MeasureDay[], date: string, values: MeasureDay['values']): MeasureDay[] {
  if (!DAY.test(date)) return [...days];
  const kept: MeasureDay['values'] = {};
  for (const [id, value] of Object.entries(values)) if (plausible(id as MeasureId, value)) kept[id as MeasureId] = value;
  return tidy([...days, { date, values: kept }]);
}

export const withoutDay = (days: readonly MeasureDay[], date: string): MeasureDay[] => days.filter((day) => day.date !== date);

/** Every day a measure was taken, oldest first: its line on a chart. */
export function seriesOf(days: readonly MeasureDay[], id: MeasureId): Array<{ date: string; value: number }> {
  return days.flatMap((day) => (day.values[id] !== undefined ? [{ date: day.date, value: day.values[id]! }] : []));
}

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/**
 * The latest of a measure, and how it compares with about a month before:
 * the last taken at least 28 days earlier, else the first, if that's at
 * least a week before. No change to say with less to go on.
 */
export function latestOf(days: readonly MeasureDay[], id: MeasureId): { value: number; date: string; change: { by: number; since: string } | null } | null {
  const series = seriesOf(days, id);
  const latest = series[series.length - 1];
  if (!latest) return null;
  const monthBefore = [...series].reverse().find((point) => daysBetween(point.date, latest.date) >= 28);
  const from = monthBefore ?? series[0]!;
  const change = daysBetween(from.date, latest.date) >= 7 ? { by: Math.round((latest.value - from.value) * 100) / 100, since: from.date } : null;
  return { value: latest.value, date: latest.date, change };
}

/** What people measure first: the form starts with these until you've measured something. */
export const STARTER_MEASURES: readonly MeasureId[] = ['waist', 'chest', 'upperArm', 'bodyFat'];

/** The measures the form shows: the ones you've measured before, in the usual order; the starter four if none. */
export function formMeasures(days: readonly MeasureDay[]): MeasureId[] {
  const used = new Set(days.flatMap((day) => Object.keys(day.values)));
  const ids = MEASURES.map((measure) => measure.id).filter((id) => used.has(id));
  return ids.length > 0 ? ids : [...STARTER_MEASURES];
}

export const measureDays = deviceStore<MeasureDay[]>('gymgo.body-measures.v1', cleanMeasureDays, []);
