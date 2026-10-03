import { describe, expect, it } from 'vitest';
import { bestRecord, recordLine } from './records';
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
    expect(recordLine(session, { exerciseId: 'push-up', kind: 'reps' })).toBe('× 30');
    expect(recordLine(session, { exerciseId: 'squat', kind: 'heaviest' })).toBe('');
  });

  it('puts the heaviest lift on the card first', () => {
    expect(bestRecord([{ exerciseId: 'a', kind: 'reps' }, { exerciseId: 'b', kind: 'e1rm' }, { exerciseId: 'c', kind: 'heaviest' }])).toEqual({ exerciseId: 'c', kind: 'heaviest' });
    expect(bestRecord([])).toBeNull();
  });
});
