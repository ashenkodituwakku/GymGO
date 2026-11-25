import { describe, expect, it } from 'vitest';
import type { SavedWorkout } from './api';
import { folderNames, groupByFolder, moveLine, tidyFolder } from './workoutFolders';

const workout = (id: string, folder?: string | null): SavedWorkout => ({
  id,
  name: `Workout ${id}`,
  gymId: null,
  createdAt: '2026-11-20T09:00:00Z',
  ...(folder !== undefined ? { folder } : {}),
  plan: { version: 1, muscles: [], goal: 'muscle', gymName: null, items: [], uncovered: [] } as unknown as SavedWorkout['plan'],
});

describe('folders for My workouts', () => {
  it('groups workouts by folder, A to Z, the loose ones last', () => {
    const groups = groupByFolder([workout('a', 'week b'), workout('b'), workout('c', 'Week A'), workout('d', 'week b'), workout('e', null), workout('f', 'Week 10'), workout('g', 'Week 9')]);
    expect(groups.map((group) => [group.folder, group.workouts.map((w) => w.id)])).toEqual([
      ['Week 9', ['g']],
      ['Week 10', ['f']],
      ['Week A', ['c']],
      ['week b', ['a', 'd']],
      [null, ['b', 'e']],
    ]);
  });

  it('has no groups but the loose one before any folder is made', () => {
    expect(groupByFolder([workout('a'), workout('b')]).map((group) => group.folder)).toEqual([null]);
    expect(folderNames([workout('a'), workout('b')])).toEqual([]);
    expect(groupByFolder([])).toEqual([]);
  });

  it('tidies a folder name as the server does', () => {
    expect(tidyFolder('  Upper   body ')).toBe('Upper body');
    expect(tidyFolder('   ')).toBeNull();
    expect(tidyFolder('x'.repeat(50))).toHaveLength(40);
  });

  it('says where a workout went', () => {
    expect(moveLine(null, 'Upper body')).toBe('Moved to Upper body.');
    expect(moveLine('Upper body', null)).toBe('Taken out of Upper body.');
    expect(moveLine('Upper body', 'Upper body')).toBe('Already in Upper body.');
  });
});
