import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined } }));

import type { SavedWorkout } from './api';
import { libraryDetails, libraryTitle, planSignature, doneLine, workoutUse } from './savedWorkouts';

const item = (exerciseId: string, reps = '8–10') => ({ exerciseId, sets: 4, reps, restSeconds: 90, uses: [], confirmed: false });
const saved = (id: string, name: string, createdAt: string, items = [item('bench'), item('fly')]): SavedWorkout => ({
  id,
  name,
  gymId: 'equinox-new-york',
  createdAt,
  plan: { version: 1, muscles: ['chest'], goal: 'muscle', gymName: 'Equinox', items, uncovered: [] },
});

describe('the workout library', () => {
  it('knows the same plan saved twice, and a changed one', () => {
    const a = planSignature('gym', [item('bench'), item('fly')]);
    expect(planSignature('gym', [item('bench'), item('fly')])).toBe(a);
    expect(planSignature('gym', [item('fly'), item('bench')])).not.toBe(a);
    expect(planSignature('gym', [item('bench', '5'), item('fly')])).not.toBe(a);
    expect(planSignature(null, [item('bench'), item('fly')])).not.toBe(a);
  });

  it('drops the gym from a title the line underneath already names', () => {
    expect(libraryTitle('Chest · Equinox', 'Equinox')).toBe('Chest');
    expect(libraryTitle('Equinox', 'Equinox')).toBe('Equinox');
    expect(libraryTitle('Chest', null)).toBe('Chest');
  });

  it('tells apart two with the same title saved the same day by their time', () => {
    const lines = libraryDetails(
      [
        saved('1', 'Chest · Equinox', '2026-09-25T15:40:00'),
        saved('2', 'Chest · Equinox', '2026-09-25T09:05:00'),
        saved('3', 'Chest · Equinox', '2026-09-20T09:05:00', [item('bench')]),
      ],
      'en-US',
    );
    expect(lines.get('1')).toBe('Muscle · 2 exercises · Equinox · Sep 25, 3:40\u00a0PM');
    expect(lines.get('2')).toBe('Muscle · 2 exercises · Equinox · Sep 25, 9:05\u00a0AM');
    expect(lines.get('3')).toBe('Muscle · 1 exercise · Equinox · Sep 20');
  });
});

describe('how often a saved workout is done', () => {
  const done = (workoutId: string | null, finishedAt: string) => ({ id: finishedAt, name: 'Push', unit: 'kg' as const, startedAt: finishedAt, finishedAt, workoutId, gymId: null, exercises: [] });

  it('counts the workouts started from each, and the latest', () => {
    const use = workoutUse([done('a', '2026-11-03T10:00:00Z'), done('a', '2026-11-24T10:00:00Z'), done('a', '2026-11-10T10:00:00Z'), done('b', '2026-11-20T10:00:00Z'), done(null, '2026-11-25T10:00:00Z')]);
    expect(use.get('a')).toEqual({ count: 3, last: '2026-11-24T10:00:00Z' });
    expect(use.get('b')).toEqual({ count: 1, last: '2026-11-20T10:00:00Z' });
    expect(use.size).toBe(2);
  });

  it('says it plainly, with the year only when it isn’t this one', () => {
    const now = new Date('2026-11-27T10:00:00Z');
    expect(doneLine({ count: 1, last: '2026-11-24T10:00:00Z' }, now, 'en-AU')).toBe('Done once, on 24 Nov');
    expect(doneLine({ count: 3, last: '2026-11-24T10:00:00Z' }, now, 'en-AU')).toBe('Done 3 times, last on 24 Nov');
    expect(doneLine({ count: 2, last: '2025-03-02T10:00:00Z' }, now, 'en-AU')).toBe('Done 2 times, last on 2 Mar 2025');
  });
});
