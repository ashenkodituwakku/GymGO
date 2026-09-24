import { describe, expect, it } from 'vitest';
import { EQUIPMENT_TYPES } from '@gymgo/domain';
import { MELBOURNE_GYMS } from '@gymgo/melbourne-data';
import { EXERCISES, MUSCLES, TYPICAL_KIT, generateWorkout, knownKit, wayToDo, type Kit } from './workout';

describe('the exercise library', () => {
  it('only names equipment GymGO tracks, and every muscle can be trained with typical kit', () => {
    const tracked = new Set(EQUIPMENT_TYPES.map((type) => type.id));
    for (const exercise of EXERCISES) for (const option of exercise.needs) for (const kit of option) expect(tracked.has(kit)).toBe(true);
    const typical = new Set<Kit>(TYPICAL_KIT);
    for (const muscle of MUSCLES) {
      expect(EXERCISES.some((exercise) => exercise.primary.includes(muscle.id) && wayToDo(exercise, typical))).toBe(true);
    }
  });
});

describe('generateWorkout', () => {
  it('never uses kit the gym does not have', () => {
    const available: Kit[] = ['dumbbells', 'bench'];
    const workout = generateWorkout({ muscles: ['chest', 'upper-back', 'quadriceps'], available, confirmed: available, goal: 'muscle', length: 6, seed: 7 });
    expect(workout.items.length).toBe(6);
    for (const item of workout.items) for (const kit of item.uses) expect(available).toContain(kit);
    expect(workout.items.every((item) => item.confirmed)).toBe(true);
  });

  it('covers every picked muscle when it can, big moves first and core last', () => {
    const workout = generateWorkout({ muscles: ['abs', 'chest', 'quadriceps'], available: TYPICAL_KIT, confirmed: [], goal: 'strength', length: 4, seed: 3 });
    const trained = new Set(workout.items.flatMap((item) => item.exercise.primary));
    expect(trained.has('abs') && trained.has('chest') && trained.has('quadriceps')).toBe(true);
    expect(workout.items[0]!.exercise.compound).toBe(true);
    expect(workout.items.at(-1)!.exercise.primary).toContain('abs');
    // Typical kit is never passed off as this gym's.
    expect(workout.items.filter((item) => item.uses.length > 0).every((item) => !item.confirmed)).toBe(true);
  });

  it('falls back to body weight, and says which muscles it could not cover', () => {
    const workout = generateWorkout({ muscles: ['chest', 'biceps'], available: [], confirmed: [], goal: 'endurance', length: 4, seed: 1 });
    expect(workout.items.every((item) => item.uses.length === 0)).toBe(true);
    expect(workout.uncovered).toEqual(['biceps']);
  });

  it('gives a different plan when shuffled, with the same shape', () => {
    const base = { muscles: ['quadriceps', 'gluteal', 'hamstring'] as const, available: TYPICAL_KIT, confirmed: [], goal: 'muscle' as const, length: 6 as const };
    const plans = [1, 2, 3, 4, 5].map((seed) => generateWorkout({ ...base, muscles: [...base.muscles], seed }).items.map((item) => item.exercise.id).join());
    expect(new Set(plans).size).toBeGreaterThan(1);
  });
});

describe('knownKit', () => {
  it('takes the gym’s published kit and member majority, and remembers what members say is missing', () => {
    const asp = MELBOURNE_GYMS.find((record) => record.location.id === 'australian-strength-performance')!;
    const kit = knownKit(asp, [
      { equipmentTypeId: 'dumbbells', yes: 3, no: 1 },
      { equipmentTypeId: 'leg_press', yes: 0, no: 2 },
      { equipmentTypeId: 'rower', yes: 1, no: 1 },
    ]);
    expect(kit.has.sort()).toEqual(['barbells', 'dumbbells', 'lifting_platform']);
    expect(kit.lacks).toEqual(['leg_press']);
  });
});
