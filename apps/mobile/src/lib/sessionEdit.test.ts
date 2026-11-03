import { describe, expect, it } from 'vitest';
import { checkEdits, draftsOf, finishFor, minutesOf } from './sessionEdit';
import type { TrainingSession } from './training';

const session: TrainingSession = {
  id: 's1',
  name: 'Push',
  unit: 'kg',
  startedAt: '2026-10-01T07:00:00.000Z',
  finishedAt: '2026-10-01T07:52:00.000Z',
  workoutId: null,
  gymId: null,
  exercises: [
    { exerciseId: 'bench-press', sets: [{ weight: 60, reps: 10, kind: 'warmup' }, { weight: 100, reps: 5, rpe: 8 }, { weight: 100, reps: 0 }] },
    { exerciseId: 'push-up', sets: [{ weight: null, reps: 20 }] },
  ],
};

describe('editing a logged workout', () => {
  it('turns its sets into rows and back unchanged, leaving out sets never done', () => {
    const drafts = draftsOf(session);
    expect(drafts[0]!.sets).toEqual([
      { weight: '60', reps: '10', done: true, kind: 'warmup' },
      { weight: '100', reps: '5', done: true, rpe: 8 },
    ]);
    expect(drafts[1]!.sets).toEqual([{ weight: '', reps: '20', done: true }]);
    const back = checkEdits(drafts, 'kg');
    expect(back).toEqual({ ok: true, exercises: [{ exerciseId: 'bench-press', sets: [{ weight: 60, reps: 10, kind: 'warmup' }, { weight: 100, reps: 5, rpe: 8 }] }, { exerciseId: 'push-up', sets: [{ weight: null, reps: 20 }] }] });
  });

  it('says what’s wrong, naming the exercise and set, rather than dropping it', () => {
    const drafts = draftsOf(session);
    drafts[0]!.sets[1]!.reps = '';
    // Named as the screen names it: the warm-up isn't counted among the sets.
    expect(checkEdits(drafts, 'kg')).toEqual({ ok: false, problem: 'Barbell bench press, set 1: type how many reps, or remove the set.' });
    drafts[0]!.sets[1]!.reps = '5';
    drafts[1]!.sets[0]!.weight = 'ten';
    expect(checkEdits(drafts, 'kg')).toEqual({ ok: false, problem: 'Push-up, set 1: that weight doesn’t read as a number of kg.' });
  });

  it('leaves out an exercise with no sets left, but keeps a set that isn’t a warm-up', () => {
    const drafts = draftsOf(session);
    drafts[1]!.sets = [];
    const back = checkEdits(drafts, 'kg');
    expect(back.ok && back.exercises.map((logged) => logged.exerciseId)).toEqual(['bench-press']);
    drafts[0]!.sets = drafts[0]!.sets.slice(0, 1);
    expect(checkEdits(drafts, 'kg')).toEqual({ ok: false, problem: 'Keep at least one set that isn’t a warm-up, or delete the workout instead.' });
  });

  it('works out when it finished from how many minutes it took', () => {
    expect(minutesOf(session)).toBe(52);
    expect(finishFor(session.startedAt, '75')).toBe('2026-10-01T08:15:00.000Z');
    expect(finishFor(session.startedAt, '0')).toBeNull();
    expect(finishFor(session.startedAt, '1441')).toBeNull();
    expect(finishFor(session.startedAt, '45.5')).toBeNull();
  });
});
