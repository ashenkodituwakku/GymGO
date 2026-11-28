import { describe, expect, it } from 'vitest';
import { bestRecord, recordHistory, recordLine } from './records';
import type { TrainingSession } from './training';

const session: TrainingSession = {
  id: 's',
  name: 'Push',
  unit: 'kg',
  startedAt: '2026-10-01T07:00:00Z',
  finishedAt: '2026-10-01T08:00:00Z',
  workoutId: null,
  gymId: null,
  exercises: [
    { exerciseId: 'bench-press', sets: [{ weight: 90, reps: 8 }, { weight: 100, reps: 3 }, { weight: 80, reps: 0 }] },
    { exerciseId: 'push-up', sets: [{ weight: null, reps: 22 }, { weight: null, reps: 30 }] },
  ],
} as TrainingSession;

describe('a broken record, to show', () => {
  it('names the set that broke it', () => {
    expect(recordLine(session, { exerciseId: 'bench-press', kind: 'heaviest' })).toBe('100\u00a0kg × 3');
    // 90 × 8 estimates higher than 100 × 3 (114 kg against 110).
    expect(recordLine(session, { exerciseId: 'bench-press', kind: 'e1rm' })).toBe('90\u00a0kg × 8');
    expect(recordLine(session, { exerciseId: 'push-up', kind: 'reps' })).toBe('30 reps');
    // The biggest set: 90 × 8 is 720 kg, against 300 for 100 × 3.
    expect(recordLine(session, { exerciseId: 'bench-press', kind: 'volume' })).toBe('90\u00a0kg × 8');
    expect(recordLine(session, { exerciseId: 'squat', kind: 'heaviest' })).toBe('');
  });

  it('puts the heaviest lift on the card first', () => {
    expect(bestRecord([{ exerciseId: 'a', kind: 'reps' }, { exerciseId: 'b', kind: 'e1rm' }, { exerciseId: 'c', kind: 'heaviest' }])).toEqual({ exerciseId: 'c', kind: 'heaviest' });
    expect(bestRecord([{ exerciseId: 'a', kind: 'reps' }, { exerciseId: 'b', kind: 'volume' }])).toEqual({ exerciseId: 'b', kind: 'volume' });
    expect(bestRecord([])).toBeNull();
  });
});

describe('an exercise’s record history', () => {
  const day = (id: string, date: string, weight: number, reps: number, other = false): TrainingSession => ({
    id,
    name: `Workout ${id}`,
    unit: 'kg',
    startedAt: date,
    finishedAt: date,
    workoutId: null,
    gymId: null,
    exercises: [{ exerciseId: other ? 'back-squat' : 'bench-press', sets: [{ weight, reps }] }],
  });

  it('lists each record broken, newest first, with its workout and set; the first time is a start', () => {
    const history = recordHistory(
      [day('d', '2026-11-20T10:00:00Z', 70, 5), day('a', '2026-11-01T10:00:00Z', 60, 5), day('b', '2026-11-08T10:00:00Z', 65, 5), day('c', '2026-11-15T10:00:00Z', 62.5, 5), day('x', '2026-11-21T10:00:00Z', 200, 5, true)],
      'bench-press',
    );
    expect(history.map((moment) => [moment.sessionId, moment.kind])).toEqual([
      ['d', 'heaviest'],
      ['b', 'heaviest'],
    ]);
    expect(history[0]).toMatchObject({ name: 'Workout d', date: '2026-11-20T10:00:00Z' });
    expect(history[0]!.line).toMatch(/^70\skg × 5$/);
  });

  it('keeps to the limit, and is empty for one done once or never', () => {
    const many = Array.from({ length: 14 }, (_, at) => day(`s${at}`, `2026-10-${String(at + 1).padStart(2, '0')}T10:00:00Z`, 50 + at * 2.5, 5));
    expect(recordHistory(many, 'bench-press', 5)).toHaveLength(5);
    expect(recordHistory([day('a', '2026-11-01T10:00:00Z', 60, 5)], 'bench-press')).toEqual([]);
    expect(recordHistory([], 'bench-press')).toEqual([]);
  });
});
