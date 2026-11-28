/**
 * A broken personal record, ready to show and share: the set that broke it
 * ("100 kg × 5") and what kind of record it is.
 *
 * No React Native imports here, so it is unit-tested in Node.
 */

import { byFinish } from '@gymgo/domain';
import { isTimedSet, oneRepMax, recordsBroken, setLine, toKg, workingSets, type LoggedSet, type NewRecord, type TrainingSession } from './training';

export const RECORD_WORD: Record<NewRecord['kind'], string> = {
  heaviest: 'Heaviest yet',
  e1rm: 'Strongest set yet',
  volume: 'Biggest set yet',
  reps: 'Most reps yet',
  longest: 'Longest yet',
  furthest: 'Furthest yet',
};

/** Which record to put on the card when there are several: a heavier lift first. */
const RANK: Record<NewRecord['kind'], number> = { heaviest: 0, e1rm: 1, volume: 2, reps: 3, longest: 4, furthest: 5 };

export function bestRecord(records: readonly NewRecord[]): NewRecord | null {
  return [...records].sort((a, b) => RANK[a.kind] - RANK[b.kind])[0] ?? null;
}

/** The set in this session that made the record. */
export function recordSet(session: TrainingSession, record: NewRecord): LoggedSet | null {
  const all = workingSets(session.exercises.find((item) => item.exerciseId === record.exerciseId)?.sets ?? []);
  // By the clock or the tape: the longest or furthest set.
  if (record.kind === 'longest') return all.filter((set) => isTimedSet(set) && set.seconds).sort((a, b) => b.seconds! - a.seconds!)[0] ?? null;
  if (record.kind === 'furthest') return all.filter((set) => isTimedSet(set) && set.metres).sort((a, b) => b.metres! - a.metres!)[0] ?? null;
  const sets = all.filter((set) => !isTimedSet(set));
  const weighted = sets.filter((set) => set.weight !== null && set.weight > 0);
  if (record.kind === 'reps') {
    const bodyweight = sets.filter((set) => set.weight === null || set.weight <= 0);
    return bodyweight.sort((a, b) => b.reps - a.reps)[0] ?? null;
  }
  if (record.kind === 'heaviest') return weighted.sort((a, b) => b.weight! - a.weight! || b.reps - a.reps)[0] ?? null;
  if (record.kind === 'volume') return weighted.sort((a, b) => b.weight! * b.reps - a.weight! * a.reps)[0] ?? null;
  const e1rm = (set: LoggedSet) => oneRepMax(toKg(set.weight!, session.unit), set.reps) ?? 0;
  return weighted.sort((a, b) => e1rm(b) - e1rm(a))[0] ?? null;
}

/** "100 kg × 5", "15 reps" for body weight, "1:30" for a plank. */
export function recordLine(session: TrainingSession, record: NewRecord): string {
  const set = recordSet(session, record);
  return set ? setLine(set, session.unit) : '';
}

export interface RecordMoment {
  /** The workout it was broken in, to open. */
  sessionId: string;
  name: string;
  date: string;
  kind: NewRecord['kind'];
  /** "100 kg × 5", "1:30", "250 m in 0:52". */
  line: string;
}

/**
 * Every record one exercise has broken, newest first: when, in which
 * workout, what kind and the set, counted as the finish screen counts them
 * (the first time is a starting point, not a record).
 */
export function recordHistory(sessions: readonly TrainingSession[], exerciseId: string, limit = 10): RecordMoment[] {
  // Only this exercise, so working out each workout's records stays quick on a long log.
  const ordered = sessions
    .filter((session) => session.exercises.some((logged) => logged.exerciseId === exerciseId))
    .map((session) => ({ ...session, exercises: session.exercises.filter((logged) => logged.exerciseId === exerciseId) }))
    .sort(byFinish);
  const moments: RecordMoment[] = [];
  for (let at = 1; at < ordered.length; at += 1) {
    const session = ordered[at]!;
    for (const record of recordsBroken(session, ordered.slice(0, at))) {
      moments.push({ sessionId: session.id, name: session.name, date: session.finishedAt, kind: record.kind, line: recordLine(session, record) });
    }
  }
  return moments.reverse().slice(0, limit);
}
