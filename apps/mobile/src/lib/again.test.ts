import { describe, expect, it } from 'vitest';
import { againPlan } from './again';
import type { LoggedExercise, TrainingSession } from './training';

const session = (exercises: LoggedExercise[]): TrainingSession => ({
  id: 's1',
  name: 'Push',
  unit: 'kg',
  startedAt: '2024-05-14T08:00:00.000Z',
  finishedAt: '2024-05-14T09:00:00.000Z',
  workoutId: 'w1',
  gymId: 'dohertys-gym-city',
  exercises,
});

describe('againPlan', () => {
  it('keeps the exercises in order, with the sets you did and the reps you got', () => {
    const plan = againPlan(
      session([
        { exerciseId: 'bench-press', sets: [{ weight: 65, reps: 6 }, { weight: 65, reps: 6 }, { weight: 60, reps: 8 }] },
        { exerciseId: 'pushdown', sets: [{ weight: 25, reps: 10 }, { weight: 25, reps: 10 }] },
      ]),
    )!;
    expect(plan.name).toBe('Push');
    expect(plan.workoutId).toBe('w1');
    expect(plan.gymId).toBe('dohertys-gym-city');
    expect(plan.items).toEqual([
      { exerciseId: 'bench-press', sets: 3, reps: '6–8', restSeconds: 90 },
      { exerciseId: 'pushdown', sets: 2, reps: '10', restSeconds: 60 },
    ]);
  });

  it('keeps a hold timed, a finisher as its cue, and your own exercise with a usual rest', () => {
    const plan = againPlan(
      session([
        { exerciseId: 'plank', sets: [{ weight: null, reps: 40 }, { weight: null, reps: 45 }] },
        { exerciseId: 'my-own-thing', sets: [{ weight: 10, reps: 12 }] },
        { exerciseId: 'empty', sets: [] },
      ]),
    )!;
    expect(plan.items[0]).toMatchObject({ exerciseId: 'plank', sets: 2, reps: '30–45 s' });
    expect(plan.items[1]).toEqual({ exerciseId: 'my-own-thing', sets: 1, reps: '12', restSeconds: 60 });
    expect(plan.items).toHaveLength(2);
  });

  it('has nothing to start from a workout with no sets', () => {
    expect(againPlan(session([{ exerciseId: 'bench-press', sets: [] }]))).toBeNull();
  });
});
