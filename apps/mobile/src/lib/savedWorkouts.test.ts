import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined } }));

import type { SavedWorkout } from './api';
import { libraryDetails, libraryTitle, planSignature } from './savedWorkouts';

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
