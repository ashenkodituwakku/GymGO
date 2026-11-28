import { describe, expect, it } from 'vitest';
import { bandFor, recoveryMap, restLine } from './recovery';
import type { TrainingSession } from './training';

const session = (finishedAt: string, ...exerciseIds: string[]): TrainingSession => ({
  id: finishedAt,
  name: 'W',
  unit: 'kg',
  startedAt: finishedAt,
  finishedAt,
  workoutId: null,
  gymId: null,
  exercises: exerciseIds.map((exerciseId) => ({ exerciseId, sets: [{ weight: 50, reps: 8 }] })),
});

describe('recovery map', () => {
  const now = new Date(2026, 10, 10, 18);
  it('sorts days since into bands', () => {
    expect([0, 1, 2, 3, 4, 30, null].map(bandFor)).toEqual(['today', 'yesterday', 'days', 'days', 'longer', 'longer', 'never']);
  });

  it('counts days since each muscle was last trained as a main muscle', () => {
    const log = [session(new Date(2026, 10, 10, 8).toISOString(), 'bench-press'), session(new Date(2026, 10, 4, 8).toISOString(), 'back-squat', 'bench-press')];
    const map = recoveryMap(log, now);
    const chest = map.find((rest) => rest.muscle === 'chest')!;
    expect(chest).toMatchObject({ days: 0, band: 'today' });
    expect(map.find((rest) => rest.muscle === 'quadriceps')).toMatchObject({ days: 6, band: 'longer' });
    // Triceps only helped on the bench press: not counted as trained.
    expect(map.find((rest) => rest.muscle === 'triceps')).toMatchObject({ days: null, band: 'never' });
    // Most recent first.
    expect(map[0]!.muscle).toBe('chest');
  });

  it('says it plainly, with no claim about recovery', () => {
    expect(restLine({ muscle: 'chest', label: 'Chest', side: 'front', days: 0, band: 'today' })).toBe('Chest: today');
    expect(restLine({ muscle: 'calves', label: 'Calves', side: 'back', days: 6, band: 'longer' })).toBe('Calves: 6 days ago');
    expect(restLine({ muscle: 'forearm', label: 'Forearms', side: 'front', days: null, band: 'never' })).toBe('Forearms: not in your log');
  });

  it('skips an exercise logged with no sets', () => {
    const empty: TrainingSession = { ...session(new Date(2026, 10, 10).toISOString()), exercises: [{ exerciseId: 'back-squat', sets: [] }] };
    expect(recoveryMap([empty], now).find((rest) => rest.muscle === 'quadriceps')!.band).toBe('never');
  });
});
