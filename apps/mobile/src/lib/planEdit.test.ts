import { describe, expect, it } from 'vitest';
import { keptPlan, moveItem, planItemFor, planProblem, removeItem, withSets, type PlanItem } from './planEdit';
import { exerciseById } from './workout';

const item = (exerciseId: string, group?: string): PlanItem => ({ exerciseId, sets: 3, reps: '8–10', restSeconds: 90, ...(group ? { group } : {}) });

describe('editing a plan of your own', () => {
  it('plans an added exercise as the builder would, in reps a plan can keep', () => {
    expect(planItemFor(exerciseById('bench-press')!)).toEqual({ exerciseId: 'bench-press', sets: 4, reps: '8–10', restSeconds: 90 });
    expect(planItemFor(exerciseById('plank')!).reps).toBe('30–45 s');
    // A finisher's "see cue" becomes something a plan can keep.
    const finisher = planItemFor(exerciseById('row-intervals')!);
    expect(finisher).toEqual({ exerciseId: 'row-intervals', sets: 1, reps: '1', restSeconds: 0 });
    expect(planProblem([finisher], 'Day')).toBeNull();
  });

  it('moves an exercise out of its superset, keeping the rest grouped only where they still join', () => {
    const plan = [item('a', 'A'), item('b', 'A'), item('c', 'A'), item('d')];
    expect(moveItem(plan, 2, 1).map((each) => `${each.exerciseId}${each.group ?? ''}`)).toEqual(['aA', 'bA', 'd', 'c']);
    expect(moveItem(plan, 0, 1).map((each) => `${each.exerciseId}${each.group ?? ''}`)).toEqual(['bA', 'aA', 'cA', 'd']);
    // Off either end: nothing moves.
    expect(moveItem(plan, 0, -1)).toEqual(plan);
    expect(moveItem(plan, 3, 1)).toEqual(plan);
  });

  it('removes one, and a superset left with one exercise is no superset', () => {
    expect(removeItem([item('a', 'A'), item('b', 'A'), item('c')], 0).map((each) => each.group ?? '-')).toEqual(['-', '-']);
  });

  it('keeps sets from 1 to 10', () => {
    expect(withSets(item('a'), 0).sets).toBe(1);
    expect(withSets(item('a'), 12).sets).toBe(10);
  });

  it('says what’s wrong by the server’s rules, and keeps reps written the usual way', () => {
    expect(planProblem([], 'Push')).toBe('Push: add at least one exercise.');
    expect(planProblem([{ ...item('bench-press'), reps: 'loads' }], 'Push')).toMatch(/Push, exercise 1: reps as a number/);
    expect(keptPlan([{ ...item('bench-press'), reps: '6-8' }], 'Push')[0]!.reps).toBe('6–8');
  });
});
