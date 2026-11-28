import { describe, expect, it } from 'vitest';
import { checkEdits, clockText, draftsOf, finishFor, minutesOf, parseClock, whenFor } from './sessionEdit';
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
    // A rated set made a warm-up keeps no RPE.
    const warmed = draftsOf(session);
    warmed[0]!.sets[1] = { ...warmed[0]!.sets[1]!, kind: 'warmup' };
    warmed[0]!.sets.push({ weight: '100', reps: '5', done: true });
    const saved = checkEdits(warmed, 'kg');
    expect(saved.ok && saved.exercises[0]!.sets[1]).toEqual({ weight: 100, reps: 5, kind: 'warmup' });
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

describe('when a workout was', () => {
  it('reads a start time typed the usual ways', () => {
    expect(parseClock('6:30 pm')).toEqual({ hours: 18, minutes: 30 });
    expect(parseClock('6.30pm')).toEqual({ hours: 18, minutes: 30 });
    expect(parseClock('6 PM')).toEqual({ hours: 18, minutes: 0 });
    expect(parseClock('6:30 p.m.')).toEqual({ hours: 18, minutes: 30 });
    expect(parseClock('12:05 am')).toEqual({ hours: 0, minutes: 5 });
    expect(parseClock('12 pm')).toEqual({ hours: 12, minutes: 0 });
    expect(parseClock('18:30')).toEqual({ hours: 18, minutes: 30 });
    expect(parseClock('0630')).toEqual({ hours: 6, minutes: 30 });
    expect(parseClock('7')).toEqual({ hours: 7, minutes: 0 });
    for (const bad of ['', '25:00', '6:75', '13 pm', '0 am', 'soon', '6:3']) expect(parseClock(bad)).toBeNull();
  });

  it('writes a time of day the way GymGO does', () => {
    expect(clockText(new Date(2026, 10, 24, 18, 5))).toBe('6:05 pm');
    expect(clockText(new Date(2026, 10, 24, 0, 30))).toBe('12:30 am');
    expect(clockText(new Date(2026, 10, 24, 12, 0))).toBe('12:00 pm');
  });

  it('moves a workout to the day and time picked', () => {
    const now = new Date(2026, 10, 25, 9, 0);
    const original = { startedAt: new Date(2026, 10, 25, 7, 0, 41).toISOString() };
    const moved = whenFor({ day: '2026-11-23', start: '6:30 pm', minutes: '50' }, original, now);
    expect(moved).toEqual({ ok: true, startedAt: new Date(2026, 10, 23, 18, 30).toISOString(), finishedAt: new Date(2026, 10, 23, 19, 20).toISOString() });
    // Left as it was: the start keeps its seconds.
    const kept = whenFor({ day: '2026-11-25', start: '7:00 am', minutes: '45' }, original, now);
    expect(kept).toEqual({ ok: true, startedAt: original.startedAt, finishedAt: new Date(Date.parse(original.startedAt) + 45 * 60_000).toISOString() });
  });

  it('says what’s wrong with a time that can’t be', () => {
    const now = new Date(2026, 10, 25, 9, 0);
    const original = { startedAt: new Date(2026, 10, 25, 7, 0).toISOString() };
    expect(whenFor({ day: '2026-11-25', start: '8:30 am', minutes: '60' }, original, now)).toEqual({ ok: false, problem: 'That would finish in the future. Pick an earlier day or time.' });
    expect(whenFor({ day: '2026-11-25', start: 'later', minutes: '60' }, original, now)).toMatchObject({ ok: false, problem: 'Type the start time like 6:30 pm or 18:30.' });
    expect(whenFor({ day: '2026-11-24', start: '7 pm', minutes: '0' }, original, now)).toMatchObject({ ok: false });
  });
});
