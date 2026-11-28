import { describe, expect, it } from 'vitest';
import type { TrainingSession } from './training';
import { agoWords, recapOf } from './welcomeBack';

const NOW = new Date(2026, 10, 25, 9, 0); // Wednesday 25 November 2026, 9 am
const session = (id: string, finished: Date, sets = 3): TrainingSession => ({
  id,
  name: `Workout ${id}`,
  unit: 'kg',
  startedAt: new Date(finished.getTime() - 45 * 60_000).toISOString(),
  finishedAt: finished.toISOString(),
  workoutId: null,
  gymId: null,
  exercises: [{ exerciseId: 'bench-press', sets: Array.from({ length: sets }, () => ({ weight: 60, reps: 8 })) }],
});

describe('recapOf', () => {
  it('greets you by your first name, and says when you last trained', () => {
    const recap = recapOf({ name: 'Sam Rivera', sessions: [session('a', new Date(2026, 10, 22, 18)), session('b', new Date(2026, 10, 24, 7), 5)], weeklyGoal: 3, gyms: 4, now: NOW });
    expect(recap.greeting).toBe('Welcome back, Sam');
    expect(recap.line).toBe('You last trained yesterday.');
    expect(recap.last).toMatchObject({ id: 'b', name: 'Workout b', when: 'yesterday', detail: '45 min · 5 sets' });
    // Monday to now: only Tuesday's counts this week; Sunday's is last week's.
    expect(recap.week).toEqual({ done: 1, goal: 3 });
    expect(recap.streak).toBe(2);
    expect(recap.gyms).toBe(4);
  });

  it('is kind about a long gap, and has words for no workouts at all', () => {
    expect(recapOf({ name: null, sessions: [session('a', new Date(2026, 9, 1))], weeklyGoal: null, gyms: 0, now: NOW }).line).toBe('It’s been a while. Start with something light.');
    const none = recapOf({ name: '  ', sessions: [], weeklyGoal: null, gyms: 0, now: NOW });
    expect(none.greeting).toBe('Welcome back');
    expect(none.line).toBe('Start your first workout today.');
    expect(none.last).toBeNull();
  });

  it('says how long ago in words', () => {
    expect(agoWords(0)).toBe('today');
    expect(agoWords(1)).toBe('yesterday');
    expect(agoWords(5)).toBe('5 days ago');
    expect(agoWords(20)).toBe('2 weeks ago');
    expect(agoWords(90)).toBe('a while ago');
  });
});
