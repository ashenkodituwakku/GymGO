import { describe, expect, it } from 'vitest';
import type { SavedWorkoutPlan } from './api';
import { changeLine, routineChange, routineFromSession } from './routineUpdate';
import type { TrainingSession } from './training';

const plan: SavedWorkoutPlan = {
  version: 1,
  muscles: ['chest'],
  goal: 'muscle',
  gymName: null,
  items: [
    { exerciseId: 'bench-press', sets: 3, reps: '8–10', restSeconds: 120, uses: ['barbells', 'bench'], confirmed: true },
    { exerciseId: 'incline-db', sets: 3, reps: '10–12', restSeconds: 90, uses: ['dumbbells', 'bench'], confirmed: true, group: 'A' },
    { exerciseId: 'cable-fly', sets: 3, reps: '12–15', restSeconds: 60, uses: ['cable_station'], confirmed: false, group: 'A' },
  ],
  uncovered: [],
} as unknown as SavedWorkoutPlan;

const set = (weight: number, reps: number, extra: Record<string, unknown> = {}) => ({ weight, reps, ...extra });
const day = (exercises: TrainingSession['exercises']): TrainingSession => ({
  id: 'd',
  name: 'Push',
  unit: 'kg',
  startedAt: '2026-11-27T08:00:00Z',
  finishedAt: '2026-11-27T09:00:00Z',
  workoutId: 'saved-1',
  gymId: null,
  exercises,
});

describe('updating a saved workout to match the day', () => {
  it('sees nothing to change when the day followed the plan', () => {
    const same = day(plan.items.map((item) => ({ exerciseId: item.exerciseId, sets: [set(40, 30, { kind: 'warmup' }), set(60, 8), set(60, 8), set(60, 8)] })));
    expect(routineChange(plan, same)).toEqual({ changed: false, added: 0, removed: 0, sets: 0, moved: false });
  });

  it('counts an exercise added, one not done and sets that changed, and says so', () => {
    const different = day([
      { exerciseId: 'bench-press', sets: [set(60, 8), set(60, 8), set(60, 8), set(60, 6)] },
      { exerciseId: 'incline-db', sets: [set(20, 10), set(20, 10), set(20, 10)] },
      { exerciseId: 'dips', sets: [set(0, 10), set(0, 8)] },
    ]);
    const change = routineChange(plan, different);
    expect(change).toEqual({ changed: true, added: 1, removed: 1, sets: 1, moved: false });
    expect(changeLine(change)).toBe('1 exercise added, 1 not done, 1 with different sets');
  });

  it('builds the plan as the day went: kept ones keep their reps and rest, new ones take theirs from the day', () => {
    const different = day([
      { exerciseId: 'incline-db', sets: [set(20, 10), set(20, 10)] },
      { exerciseId: 'bench-press', sets: [set(60, 8), set(60, 8), set(60, 8), set(60, 6)] },
      { exerciseId: 'plank', sets: [set(0, 0, { seconds: 30 }), set(0, 0, { seconds: 45 })] },
      { exerciseId: 'push-up', sets: [set(0, 12), set(0, 10)] },
    ]);
    expect(routineChange(plan, different)).toMatchObject({ changed: true, moved: true });
    const next = routineFromSession(plan, different)!;
    expect(next.items.map((item) => [item.exerciseId, item.sets, item.reps, item.restSeconds])).toEqual([
      ['incline-db', 2, '10–12', 90],
      ['bench-press', 4, '8–10', 120],
      ['plank', 2, '30–45 s', 90],
      ['push-up', 2, '10–12', 90],
    ]);
    // Cable fly (its superset partner) wasn't done, so incline dumbbell press is no longer in a superset.
    expect(next.items[0]!.group).toBeUndefined();
    expect((next as { version?: number }).version).toBeUndefined();
    expect(next.muscles).toEqual(['chest']);
  });

  it('keeps a superset whose partners are still side by side', () => {
    const next = routineFromSession(plan, day(plan.items.map((item) => ({ exerciseId: item.exerciseId, sets: [set(20, 10)] }))))!;
    expect(next.items.map((item) => item.group ?? null)).toEqual([null, 'A', 'A']);
  });

  it('has nothing to keep from a day with no working sets', () => {
    expect(routineFromSession(plan, day([{ exerciseId: 'bench-press', sets: [set(40, 10, { kind: 'warmup' })] }]))).toBeNull();
  });
});
