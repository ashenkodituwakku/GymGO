import { describe, expect, it } from 'vitest';
import type { TrainingSession } from './training';
import { weekTotalLabel, weeklyTotals } from './weekly';

const at = (y: number, m: number, d: number, h = 10) => new Date(y, m, d, h).toISOString();
const session = (id: string, finishedAt: string, minutes: number, sets: Array<[number | null, number]>): TrainingSession => ({
  id,
  name: 'W',
  unit: 'kg',
  startedAt: new Date(Date.parse(finishedAt) - minutes * 60_000).toISOString(),
  finishedAt,
  workoutId: null,
  gymId: null,
  exercises: [{ exerciseId: 'bench-press', sets: sets.map(([weight, reps]) => ({ weight, reps })) }],
});

describe('weekly totals', () => {
  // Monday 23 Nov 2026.
  const now = new Date(2026, 10, 23, 18);
  const sessions = [
    session('a', at(2026, 10, 23), 50, [[100, 5], [100, 5]]),
    session('b', at(2026, 10, 22), 40, [[null, 12]]), // Sunday: last week
    session('c', at(2026, 10, 16), 60, [[80, 10]]), // last week's Monday
    session('d', at(2026, 7, 1), 60, [[80, 10]]), // long before
  ];
  it('gives a bar a week, oldest first, this week last', () => {
    const bars = weeklyTotals(sessions, 'duration', now, 12);
    expect(bars).toHaveLength(12);
    expect(bars[11]!.start.getDay()).toBe(1);
    expect(bars[11]).toMatchObject({ value: 50, workouts: 1 });
    expect(bars[10]).toMatchObject({ value: 100, workouts: 2 });
    expect(bars.slice(0, 10).every((bar) => bar.value === 0)).toBe(true);
  });
  it('adds up volume and reps from working sets', () => {
    expect(weeklyTotals(sessions, 'volume', now)[11]!.value).toBe(1000);
    expect(weeklyTotals(sessions, 'reps', now)[10]!.value).toBe(22);
  });
  it('says a week’s total', () => {
    expect(weekTotalLabel(200, 'duration')).toBe('3 h 20 min');
    expect(weekTotalLabel(45, 'duration')).toBe('45 min');
    expect(weekTotalLabel(12400.4, 'volume')).toBe('12,400 kg');
    expect(weekTotalLabel(640, 'reps')).toBe('640 reps');
  });
});
