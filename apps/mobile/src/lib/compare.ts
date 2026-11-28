/**
 * A finished workout against the last time you did the same one (the same
 * saved workout, or the same name): how much more you lifted, how many more
 * sets, how much longer it took. As a workout app's summary says it.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import { setCount, volumeKg, type TrainingSession } from './training';

export interface Compared {
  /** The last one, for "your last Push day, Thursday". */
  last: TrainingSession;
  volumeKg: number;
  sets: number;
  minutes: number;
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const minutesOf = (session: TrainingSession) => Math.round((Date.parse(session.finishedAt) - Date.parse(session.startedAt)) / 60_000);

/** Null when there's no earlier one to compare with. */
export function compareWithLast(session: TrainingSession, earlier: readonly TrainingSession[]): Compared | null {
  const last = earlier
    .filter((item) => item.id !== session.id && item.finishedAt < session.finishedAt)
    .filter((item) => (session.workoutId && item.workoutId === session.workoutId) || sameName(item.name, session.name))
    .sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : -1))[0];
  if (!last) return null;
  return {
    last,
    volumeKg: volumeKg(session) - volumeKg(last),
    sets: setCount(session) - setCount(last),
    minutes: minutesOf(session) - minutesOf(last),
  };
}

/** "+320 kg", "−2", "same": a change, signed, with a real minus sign. */
export function signed(value: number, unit = ''): string {
  if (Math.abs(value) < 0.5) return 'same';
  const rounded = Math.round(Math.abs(value)).toLocaleString('en');
  return `${value > 0 ? '+' : '−'}${rounded}${unit ? ` ${unit}` : ''}`;
}
