import { describe, expect, it } from 'vitest';
import { TEMPLATES, nextTemplateDay, templateDayName } from './templates';
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
