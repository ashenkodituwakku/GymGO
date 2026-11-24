import { describe, expect, it } from 'vitest';
import { compareWithLast, signed } from './compare';
import type { TrainingSession } from './training';

const workout = (id: string, name: string, finishedAt: string, minutes: number, sets: Array<[number, number]>, workoutId: string | null = null): TrainingSession => ({
  id,
  name,
  unit: 'kg',
  startedAt: new Date(Date.parse(finishedAt) - minutes * 60_000).toISOString(),
  finishedAt,
  workoutId,
  gymId: null,
  exercises: [{ exerciseId: 'bench-press', sets: sets.map(([weight, reps]) => ({ weight, reps })) }],
});

describe('compared with last time', () => {
  const now = workout('now', 'Push day', '2026-11-23T10:00:00Z', 50, [[100, 5], [100, 5], [100, 5]]);
  it('finds the last one of the same name, before this one', () => {
    const older = workout('a', 'push day ', '2026-11-16T10:00:00Z', 60, [[95, 5]]);
    const last = workout('b', 'Push day', '2026-11-19T10:00:00Z', 55, [[95, 5], [95, 5]]);
    const other = workout('c', 'Leg day', '2026-11-21T10:00:00Z', 40, [[140, 5]]);
    const later = workout('d', 'Push day', '2026-11-24T10:00:00Z', 40, [[50, 5]]);
    const compared = compareWithLast(now, [older, last, other, later, now])!;
    expect(compared.last.id).toBe('b');
    expect(compared.volumeKg).toBe(1500 - 950);
    expect(compared.sets).toBe(1);
    expect(compared.minutes).toBe(-5);
  });
  it('finds it by saved workout too, whatever it was called', () => {
    const renamed = workout('e', 'Chest', '2026-11-20T10:00:00Z', 50, [[90, 5]], 'w1');
    expect(compareWithLast({ ...now, workoutId: 'w1' }, [renamed])?.last.id).toBe('e');
  });
  it('is null the first time', () => {
    expect(compareWithLast(now, [])).toBeNull();
  });
  it('says a change, signed', () => {
    expect(signed(320.4, 'kg')).toBe('+320 kg');
    expect(signed(-2)).toBe('−2');
    expect(signed(0.2, 'min')).toBe('same');
    expect(signed(1250, 'kg')).toBe('+1,250 kg');
  });
});
