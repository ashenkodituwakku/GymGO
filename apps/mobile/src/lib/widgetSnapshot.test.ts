import { describe, expect, it } from 'vitest';
import type { TrainingSession } from './training';
import { widgetLine, widgetSnapshot } from './widgetSnapshot';

const session = (name: string, finishedAt: string): TrainingSession => ({ id: finishedAt, name, unit: 'kg', startedAt: finishedAt, finishedAt, workoutId: null, gymId: null, exercises: [] });

describe('widget snapshot', () => {
  const now = new Date(2026, 10, 12, 12);
  it('puts a programme’s next day first, with its week', () => {
    const snapshot = widgetSnapshot({
      sessions: [session('Upper A · Strength programme', new Date(2026, 10, 10, 9).toISOString())],
      programme: { goal: 'strength', days: 4, weeks: 8, startedOn: '2026-11-02', swaps: {} },
      weeklyGoal: 3,
      challenge: { days: 2, target: 8, finished: false },
      now,
    });
    expect(snapshot.next).toEqual({ title: 'Lower A', plan: 'Week 2 of 8 · Strength programme', exercises: expect.stringContaining('Barbell back squat') });
    expect(snapshot.thisWeek).toEqual({ done: 1, goal: 3 });
    expect(snapshot.weeksInARow).toBe(1);
    expect(snapshot.challenge).toEqual({ days: 2, target: 8, finished: false });
    expect(widgetLine(snapshot)).toBe('Lower A next · 1 week in a row');
  });

  it('falls back to a template’s next day, and to just the streak', () => {
    const template = widgetSnapshot({ sessions: [session('5×5 A · 5×5 strength', new Date(2026, 10, 3).toISOString())], programme: null, weeklyGoal: null, challenge: null, now });
    expect(template.next).toMatchObject({ title: '5×5 B', plan: '5×5 strength' });
    const none = widgetSnapshot({ sessions: [], programme: null, weeklyGoal: null, challenge: null, now });
    expect(none.next).toBeNull();
    expect(widgetLine(none)).toBe('0 weeks in a row');
  });
});
