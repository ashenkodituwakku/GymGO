import { describe, expect, it } from 'vitest';
import { checkWorkout, fitSummary, withSwaps } from './workoutFit';

const items = (...ids: string[]) => ids.map((exerciseId) => ({ exerciseId, sets: 3, reps: '8', restSeconds: 90 }));

describe('checkWorkout', () => {
  it('counts an exercise as there only when all its kit is known to be', () => {
    const fit = checkWorkout(items('bench-press', 'db-curl', 'push-up'), { has: ['barbells', 'bench', 'dumbbells'], lacks: [] });
    expect(fit.items.map((item) => item.state)).toEqual(['there', 'there', 'there']);
    expect(fit.items[0]!.kit).toEqual(['barbells', 'bench']);
    // Body weight needs nothing.
    expect(fit.items[2]!.kit).toEqual([]);
    expect(fit.counts).toEqual({ there: 3, missing: 0, unknown: 0 });
  });

  it('calls it missing when members say what it needs isn’t there, and offers a swap the known kit allows', () => {
    const fit = checkWorkout(items('pulldown'), { has: ['cable_station', 'dumbbells', 'bench'], lacks: ['lat_pulldown'] });
    expect(fit.items[0]!.state).toBe('missing');
    expect(fit.items[0]!.kit).toEqual(['lat_pulldown']);
    const swap = fit.items[0]!.swap!;
    expect(swap.primary).toContain('upper-back');
    expect(swap.needs.some((option) => option.every((kit) => ['cable_station', 'dumbbells', 'bench'].includes(kit)))).toBe(true);
  });

  it('never takes unknown for missing, nor for there', () => {
    // Nobody has said whether there's a lat pulldown.
    const fit = checkWorkout(items('pulldown'), { has: ['dumbbells', 'bench'], lacks: [] });
    expect(fit.items[0]!.state).toBe('unknown');
    expect(fit.items[0]!.kit).toEqual(['lat_pulldown']);
    expect(fit.counts).toEqual({ there: 0, missing: 0, unknown: 1 });
  });

  it('is missing only when every way of doing it is ruled out', () => {
    // Overhead press: barbell with a squat rack, or with a power rack.
    const oneOut = checkWorkout(items('ohp'), { has: ['barbells'], lacks: ['squat_rack'] });
    expect(oneOut.items[0]!.state).toBe('unknown');
    expect(oneOut.items[0]!.kit).toEqual(['power_rack']);
    const bothOut = checkWorkout(items('ohp'), { has: ['barbells'], lacks: ['squat_rack', 'power_rack'] });
    expect(bothOut.items[0]!.state).toBe('missing');
    expect(bothOut.items[0]!.kit).toEqual(['squat_rack', 'power_rack']);
  });

  it('never swaps in something already in the workout', () => {
    const fit = checkWorkout(items('pulldown', 'cable-row'), { has: ['cable_station'], lacks: ['lat_pulldown'] });
    expect(fit.items[0]!.swap?.id).not.toBe('cable-row');
  });

  it('swaps to a body-weight move when nothing is known to be there', () => {
    const fit = checkWorkout(items('leg-press'), { has: [], lacks: ['leg_press'] });
    expect(fit.items[0]!.swap?.needs.some((option) => option.length === 0)).toBe(true);
  });

  it('has no swap when nothing for that muscle is possible', () => {
    // Nothing trains the lats with body weight alone in GymGO's list.
    const fit = checkWorkout(items('pulldown'), { has: [], lacks: ['lat_pulldown'] });
    const swap = fit.items[0]!.swap;
    expect(swap === null || swap.needs.some((option) => option.length === 0)).toBe(true);
  });

  it('treats an exercise GymGO no longer lists as not known', () => {
    const fit = checkWorkout(items('old-exercise'), { has: ['barbells'], lacks: [] });
    expect(fit.items[0]).toEqual({ exerciseId: 'old-exercise', state: 'unknown', kit: [], swap: null });
  });
});

describe('fitSummary', () => {
  it('says how much is certain', () => {
    expect(fitSummary({ there: 4, missing: 1, unknown: 1 })).toBe('4 of 6 are here for sure · 1 missing · 1 not known yet');
    expect(fitSummary({ there: 1, missing: 0, unknown: 2 })).toBe('1 of 3 is here for sure · 2 not known yet');
    expect(fitSummary({ there: 5, missing: 0, unknown: 0 })).toBe('All 5 are here');
    expect(fitSummary({ there: 1, missing: 0, unknown: 0 })).toBe('It’s all here');
    expect(fitSummary({ there: 0, missing: 0, unknown: 0 })).toBe('Nothing in this workout to check');
  });
});

describe('withSwaps', () => {
  it('puts in only the chosen swaps, keeping sets, reps and rest', () => {
    const plan = items('pulldown', 'bench-press');
    const fit = checkWorkout(plan, { has: ['cable_station'], lacks: ['lat_pulldown', 'barbells'] });
    const swapped = withSwaps(plan, fit, new Set([0]));
    expect(swapped[0]!.exerciseId).toBe(fit.items[0]!.swap!.id);
    expect(swapped[0]).toMatchObject({ sets: 3, reps: '8', restSeconds: 90 });
    expect(swapped[1]!.exerciseId).toBe('bench-press');
  });
});
