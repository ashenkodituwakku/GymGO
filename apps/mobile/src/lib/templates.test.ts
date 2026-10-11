import { describe, expect, it } from 'vitest';
import { TEMPLATES, nextTemplateDay, templateDayName, upNext, workoutTitle } from './templates';
import { EXERCISES } from './workout';
import { repRange, type TrainingSession } from './training';

const session = (name: string, finishedAt: string): TrainingSession => ({
  id: finishedAt,
  name,
  unit: 'kg',
  startedAt: finishedAt,
  finishedAt,
  workoutId: null,
  gymId: null,
  exercises: [],
});

describe('workout templates', () => {
  it('use only exercises GymGO has, with sets, reps and rest it understands', () => {
    for (const template of TEMPLATES) {
      expect(template.days.length).toBeGreaterThan(1);
      for (const day of template.days) {
        for (const item of day.items) {
          expect(EXERCISES.some((exercise) => exercise.id === item.exerciseId), `${template.id}: ${item.exerciseId}`).toBe(true);
          expect(item.sets).toBeGreaterThan(0);
          expect(item.restSeconds).toBeGreaterThan(0);
          // Reps are a count or a range, or a time for a hold.
          expect(repRange(item.reps) !== null || /\bs$/.test(item.reps)).toBe(true);
        }
      }
    }
  });

  it('take turns: the day after the last one done, from the start when none is', () => {
    const ppl = TEMPLATES.find((template) => template.id === 'ppl')!;
    expect(nextTemplateDay(ppl, [])).toBe(0);
    const push = templateDayName(ppl, ppl.days[0]!);
    const pull = templateDayName(ppl, ppl.days[1]!);
    const legs = templateDayName(ppl, ppl.days[2]!);
    expect(push).toBe('Push · Push, pull, legs');
    expect(nextTemplateDay(ppl, [session(push, '2026-09-28T08:00:00Z'), session('Chest day', '2026-09-30T08:00:00Z')])).toBe(1);
    expect(nextTemplateDay(ppl, [session(pull, '2026-09-29T08:00:00Z'), session(push, '2026-09-28T08:00:00Z')])).toBe(2);
    expect(nextTemplateDay(ppl, [session(legs, '2026-09-30T08:00:00Z')])).toBe(0);
  });
});

describe('workoutTitle', () => {
  it('splits a template day into the day and its plan', () => {
    const ppl = TEMPLATES.find((template) => template.name === 'Push, pull, legs')!;
    expect(workoutTitle(templateDayName(ppl, ppl.days[0]!))).toEqual({ title: 'Push', plan: 'Push, pull, legs' });
  });

  it('leaves your own names whole, dots and all', () => {
    expect(workoutTitle('Chest day')).toEqual({ title: 'Chest day', plan: null });
    expect(workoutTitle('Legs · heavy')).toEqual({ title: 'Legs · heavy', plan: null });
  });

  it('offers the next day of the plan you did last, and nothing before you’ve started one', () => {
    const ppl = TEMPLATES.find((template) => template.id === 'ppl')!;
    const fiveByFive = TEMPLATES.find((template) => template.id !== 'ppl' && template.days.length === 2)!;
    expect(upNext([])).toBeNull();
    expect(upNext([session('Chest day', '2026-09-30T08:00:00Z')])).toBeNull();
    const pushed = [session(templateDayName(ppl, ppl.days[0]!), '2026-09-28T08:00:00Z'), session('Chest day', '2026-09-30T08:00:00Z')];
    expect(upNext(pushed)).toEqual({ template: ppl, day: 1 });
    // Switching plans: the latest plan is the one followed.
    const switched = [...pushed, session(templateDayName(fiveByFive, fiveByFive.days[0]!), '2026-10-02T08:00:00Z')];
    expect(upNext(switched)).toEqual({ template: fiveByFive, day: 1 });
  });
});
