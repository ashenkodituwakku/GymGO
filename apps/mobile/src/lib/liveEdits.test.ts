import { describe, expect, it } from 'vitest';
import type { ActiveItem } from './activeSession';
import { replacementsFor } from './exerciseLibrary';
import { canMove, moveExercise, removeExercise, removeSet, replaceExercise } from './liveEdits';
import { exerciseById } from './workout';

const item = (exerciseId: string, group?: string): ActiveItem => ({
  exerciseId,
  planned: 3,
  reps: '8–10',
  restSeconds: 90,
  sets: [
    { weight: '60', reps: '8', done: false },
    { weight: '', reps: '', done: false },
  ],
  ...(group ? { group } : {}),
});
const ids = (items: ActiveItem[]) => items.map((one) => `${one.exerciseId}${one.group ? `:${one.group}` : ''}`);

describe('moving an exercise in a workout in progress', () => {
  it('trades places with its neighbour', () => {
    const moved = moveExercise([item('a'), item('b'), item('c')], 2, 'up');
    expect(ids(moved.items)).toEqual(['a', 'c', 'b']);
    expect(moved.at).toBe(1);
    expect(moved.group).toBe(false);
  });

  it('goes nowhere past either end', () => {
    const items = [item('a'), item('b')];
    expect(canMove(items, 0, 'up')).toBe(false);
    expect(canMove(items, 1, 'down')).toBe(false);
    expect(ids(moveExercise(items, 0, 'up').items)).toEqual(['a', 'b']);
  });

  it('hops over a whole superset, so the superset stays together', () => {
    const moved = moveExercise([item('a', 'A'), item('b', 'A'), item('c')], 2, 'up');
    expect(ids(moved.items)).toEqual(['c', 'a:A', 'b:A']);
    expect(moved.at).toBe(0);
  });

  it('moves within its superset first', () => {
    const moved = moveExercise([item('x'), item('a', 'A'), item('b', 'A')], 2, 'up');
    expect(ids(moved.items)).toEqual(['x', 'b:A', 'a:A']);
    expect(moved.at).toBe(1);
  });

  it('takes its superset with it from the group’s edge', () => {
    const moved = moveExercise([item('x'), item('a', 'A'), item('b', 'A')], 1, 'up');
    expect(ids(moved.items)).toEqual(['a:A', 'b:A', 'x']);
    expect(moved.at).toBe(0);
    expect(moved.group).toBe(true);
    const down = moveExercise([item('a', 'A'), item('b', 'A'), item('x'), item('y')], 1, 'down');
    expect(ids(down.items)).toEqual(['x', 'a:A', 'b:A', 'y']);
    expect(down.at).toBe(2);
  });

  it('keeps letters in order after a group moves', () => {
    const moved = moveExercise([item('a', 'A'), item('b', 'A'), item('c', 'B'), item('d', 'B')], 2, 'up');
    expect(ids(moved.items)).toEqual(['c:A', 'd:A', 'a:B', 'b:B']);
  });
});

describe('removing an exercise or a set', () => {
  it('undoes a superset left with one exercise', () => {
    expect(ids(removeExercise([item('a', 'A'), item('b', 'A'), item('c')], 0))).toEqual(['b', 'c']);
  });

  it('removes any set, but never the last one', () => {
    expect(removeSet(['1', '2', '3'], 1)).toEqual(['1', '3']);
    expect(removeSet(['1'], 0)).toEqual(['1']);
  });
});

describe('replacing an exercise', () => {
  it('keeps the plan and the number of sets, all blank, for one measured the same way', () => {
    const replaced = replaceExercise({ ...item('bench-press', 'A'), muscle: 'chest' }, exerciseById('incline-bench-press') ?? exerciseById('push-up')!);
    expect(replaced.reps).toBe('8–10');
    expect(replaced.restSeconds).toBe(90);
    expect(replaced.group).toBe('A');
    expect(replaced.muscle).toBeUndefined();
    expect(replaced.sets).toEqual([
      { weight: '', reps: '', done: false },
      { weight: '', reps: '', done: false },
    ]);
  });

  it('takes the usual plan for one timed instead of counted', () => {
    const replaced = replaceExercise(item('bench-press'), exerciseById('plank')!);
    expect(replaced.reps).toMatch(/s$/);
  });

  it('suggests moves for the same muscles first, leaving out ones already in', () => {
    const found = replacementsFor('', ['bench-press', 'push-up'], 'bench-press', 5);
    expect(found.map((one) => one.id)).not.toContain('push-up');
    expect(found.map((one) => one.id)).not.toContain('bench-press');
    for (const one of found) expect(one.primary).toContain('chest');
    expect(replacementsFor('squat', [], 'bench-press').every((one) => /squat/i.test(one.name) || one.primary.includes('quadriceps') || one.primary.includes('gluteal'))).toBe(true);
  });
});
