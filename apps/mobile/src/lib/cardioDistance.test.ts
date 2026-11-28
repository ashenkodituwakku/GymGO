import { describe, expect, it } from 'vitest';
import { checkEdits, draftsOf } from './sessionEdit';
import { bestPace, draftToLogged, setsSummary } from './training';
import { paceMetres, tracksDistance } from './workout';

describe('cardio machines with a distance', () => {
  it('knows which exercises can say how far as well as how long', () => {
    expect(tracksDistance('row-intervals')).toBe(true);
    expect(tracksDistance('treadmill-sprints')).toBe(true);
    expect(tracksDistance('incline-walk')).toBe(true);
    expect(tracksDistance('bike-intervals')).toBe(true);
    expect(tracksDistance('jumping-jack')).toBe(false);
    expect(tracksDistance('plank')).toBe(false);
    expect(tracksDistance('farmer-carry')).toBe(false);
  });

  it('logs the metres beside the time when given, and the time alone when not', () => {
    const logged = draftToLogged([
      {
        exerciseId: 'row-intervals',
        measure: 'time',
        sets: [
          { weight: '', reps: '', done: true, time: '0:52', distance: '250' },
          { weight: '', reps: '', done: true, time: '0:55', distance: '' },
          { weight: '', reps: '', done: true, time: '0:54', distance: 'far' },
        ],
      },
    ]);
    expect(logged[0]!.sets).toEqual([
      { weight: null, reps: 0, seconds: 52, metres: 250 },
      { weight: null, reps: 0, seconds: 55 },
      { weight: null, reps: 0, seconds: 54 },
    ]);
    expect(setsSummary(logged[0]!.sets, 'kg')).toMatch(/^250\sm in 52\ss, 55\ss/);
  });

  it('edits a rower’s sets as times with their metres beside them', () => {
    const session = {
      id: 'a',
      name: 'Cardio',
      unit: 'kg' as const,
      startedAt: '2026-11-27T10:00:00Z',
      finishedAt: '2026-11-27T10:20:00Z',
      workoutId: null,
      gymId: null,
      exercises: [{ exerciseId: 'row-intervals', sets: [{ weight: null, reps: 0, seconds: 52, metres: 250 }] }],
    };
    const drafts = draftsOf(session);
    expect(drafts[0]!.measure).toBe('time');
    expect(drafts[0]!.sets[0]).toMatchObject({ time: '0:52', distance: '250' });
    const back = checkEdits(drafts, 'kg');
    expect(back.ok && back.exercises[0]!.sets[0]).toEqual({ weight: null, reps: 0, seconds: 52, metres: 250 });
    const wrong = checkEdits([{ ...drafts[0]!, sets: [{ ...drafts[0]!.sets[0]!, distance: 'lots' }] }], 'kg');
    expect(wrong.ok).toBe(false);
  });
});

describe('pace on a cardio machine', () => {
  it('says a rower’s per 500 m and a treadmill’s per km', () => {
    expect(paceMetres('row-intervals')).toBe(500);
    expect(paceMetres('treadmill-sprints')).toBe(1000);
    expect(paceMetres('bike-intervals')).toBe(1000);
    expect(paceMetres('plank')).toBeNull();
  });

  it('finds the best pace among sets with both a time and a distance', () => {
    const sets = [
      { weight: null, reps: 0, seconds: 52, metres: 250 },
      { weight: null, reps: 0, seconds: 50, metres: 250 },
      { weight: null, reps: 0, seconds: 40 },
      { weight: null, reps: 0, seconds: 30, metres: 200, kind: 'warmup' as const },
    ];
    expect(bestPace(sets, 500)).toEqual({ secondsPer: 100, label: '1:40 /500 m' });
    expect(bestPace([{ weight: null, reps: 0, seconds: 1500, metres: 5000 }], 1000)?.label).toBe('5:00 /km');
    expect(bestPace([{ weight: null, reps: 0, seconds: 60 }], 500)).toBeNull();
  });
});
