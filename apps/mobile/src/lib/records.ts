/**
 * A broken personal record, ready to show and share: the set that broke it
 * ("100 kg × 5") and what kind of record it is.
 *
 * No React Native imports here, so it is unit-tested in Node.
 */

import { formatWeight, oneRepMax, toKg, type LoggedSet, type NewRecord, type TrainingSession } from './training';

export const RECORD_WORD: Record<NewRecord['kind'], string> = { heaviest: 'Heaviest yet', e1rm: 'Strongest set yet', reps: 'Most reps yet' };

/** Which record to put on the card when there are several: a heavier lift first. */
const RANK: Record<NewRecord['kind'], number> = { heaviest: 0, e1rm: 1, reps: 2 };

export function bestRecord(records: readonly NewRecord[]): NewRecord | null {
  return [...records].sort((a, b) => RANK[a.kind] - RANK[b.kind])[0] ?? null;
}

/** The set in this session that made the record. */
export function recordSet(session: TrainingSession, record: NewRecord): LoggedSet | null {
  const sets = session.exercises.find((item) => item.exerciseId === record.exerciseId)?.sets.filter((set) => set.reps > 0) ?? [];
  const weighted = sets.filter((set) => set.weight !== null && set.weight > 0);
  if (record.kind === 'reps') {
    const bodyweight = sets.filter((set) => set.weight === null || set.weight <= 0);
    return bodyweight.sort((a, b) => b.reps - a.reps)[0] ?? null;
  }
  if (record.kind === 'heaviest') return weighted.sort((a, b) => b.weight! - a.weight! || b.reps - a.reps)[0] ?? null;
  const e1rm = (set: LoggedSet) => oneRepMax(toKg(set.weight!, session.unit), set.reps) ?? 0;
  return weighted.sort((a, b) => e1rm(b) - e1rm(a))[0] ?? null;
}

/** "100 kg × 5", "× 15" for body weight. */
export function recordLine(session: TrainingSession, record: NewRecord): string {
  const set = recordSet(session, record);
  if (!set) return '';
  return set.weight !== null && set.weight > 0 ? `${formatWeight(set.weight, session.unit)} × ${set.reps}` : `× ${set.reps}`;
}
