import { afterEach, describe, expect, it } from 'vitest';
import { TRAINING_KIT, TRAINING_MUSCLES, type OwnExercise, type Split } from '@gymgo/domain';
import { exerciseFrames, exerciseTempo, hasExerciseGlyph } from './exerciseGlyphs';
import { addedPlan } from './exerciseLibrary';
import { registerOwnTraining } from './ownRegistry';
import { allTemplates, nextTemplateDay, templateDayName, upNext, workoutTitle } from './templates';
import type { TrainingSession } from './training';
import { KIT_LABEL, MUSCLES, doseFor, exerciseById, exerciseName, ownExercises } from './workout';

const own = (over: Partial<OwnExercise> = {}): OwnExercise => ({
  id: 'mine-a1b2c3d4e5',
  name: 'Landmine press',
  primary: ['deltoids'],
  secondary: ['triceps', 'chest'],
  kit: ['barbells'],
  timed: false,
  cue: 'Press up and out from one shoulder.',
  drawnAs: 'ohp',
  archived: false,
  createdAt: '2026-11-03T00:00:00Z',
  updatedAt: '2026-11-03T00:00:00Z',
  ...over,
});

const split: Split = {
  id: 'split-1',
  name: 'My upper / lower',
  days: [
    { name: 'Upper', items: [{ exerciseId: 'bench-press', sets: 4, reps: '6–8', restSeconds: 150 }, { exerciseId: 'mine-a1b2c3d4e5', sets: 3, reps: '10', restSeconds: 90 }] },
    { name: 'Lower', items: [{ exerciseId: 'back-squat', sets: 4, reps: '5', restSeconds: 180 }] },
  ],
  createdAt: '2026-11-03T00:00:00Z',
  updatedAt: '2026-11-03T00:00:00Z',
};

const session = (name: string, finishedAt: string): TrainingSession => ({ id: name + finishedAt, name, unit: 'kg', startedAt: finishedAt, finishedAt, workoutId: null, gymId: null, exercises: [], note: null }) as TrainingSession;

afterEach(() => registerOwnTraining([], []));

describe('exercises and splits of your own, beside GymGO’s', () => {
  it('use the same muscles and kit the server checks against', () => {
    expect(MUSCLES.map((muscle) => muscle.id).sort()).toEqual([...TRAINING_MUSCLES].sort());
    expect(Object.keys(KIT_LABEL).sort()).toEqual([...TRAINING_KIT].sort());
  });

  it('are found by id and named everywhere, a deleted one too, but only live ones are offered', () => {
    expect(exerciseById('mine-a1b2c3d4e5')).toBeUndefined();
    // Before they've loaded: never the id.
    expect(exerciseName('mine-a1b2c3d4e5')).toBe('Your exercise');
    registerOwnTraining([own(), own({ id: 'mine-zzzzzzzzzz', name: 'Old move', archived: true })], []);
    const found = exerciseById('mine-a1b2c3d4e5')!;
    expect(found).toMatchObject({ name: 'Landmine press', primary: ['deltoids'], secondary: ['triceps', 'chest'], needs: [['barbells']], compound: true, own: { drawnAs: 'ohp', archived: false } });
    expect(exerciseName('mine-zzzzzzzzzz')).toBe('Old move');
    expect(ownExercises().map((exercise) => exercise.name)).toEqual(['Landmine press']);
    // Body weight when it needs nothing; a timed one is planned for a time.
    registerOwnTraining([own({ kit: [], timed: true, primary: ['abs'], secondary: [] })], []);
    const hold = exerciseById('mine-a1b2c3d4e5')!;
    expect(hold.needs).toEqual([[]]);
    expect(hold.compound).toBe(false);
    expect(doseFor(hold, 'muscle').measure).toBe('time');
    expect(addedPlan(hold).reps).toBe('30–45 s');
  });

  it('never stand in for one of GymGO’s', () => {
    registerOwnTraining([own({ id: 'bench-press', name: 'Fake bench' })], []);
    expect(exerciseName('bench-press')).toBe('Barbell bench press');
  });

  it('borrow the moving icon they’re drawn as, and fall back to the plain one', () => {
    registerOwnTraining([own()], []);
    expect(hasExerciseGlyph('mine-a1b2c3d4e5')).toBe(true);
    expect(exerciseFrames('mine-a1b2c3d4e5')).toEqual(exerciseFrames('ohp'));
    expect(exerciseTempo('mine-a1b2c3d4e5')).toBe(exerciseTempo('ohp'));
    // Drawn as a hold: it breathes like the plank.
    registerOwnTraining([own({ drawnAs: 'plank' })], []);
    expect(exerciseTempo('mine-a1b2c3d4e5')).toBe('hold');
    expect(exerciseFrames('mine-a1b2c3d4e5')).toEqual(exerciseFrames('plank'));
    registerOwnTraining([own({ drawnAs: null })], []);
    expect(hasExerciseGlyph('mine-a1b2c3d4e5')).toBe(false);
  });

  it('take turns through a split’s days, and Up next follows it like a template', () => {
    registerOwnTraining([own()], [split]);
    const template = allTemplates().find((each) => each.name === 'My upper / lower')!;
    expect(template).toMatchObject({ id: 'own-split-1', level: 'Your own', perWeek: '2 days' });
    expect(templateDayName(template, template.days[0]!)).toBe('Upper · My upper / lower');
    expect(workoutTitle('Upper · My upper / lower')).toEqual({ title: 'Upper', plan: 'My upper / lower' });
    const sessions = [session('Upper · My upper / lower', '2026-11-02T08:00:00Z')];
    expect(nextTemplateDay(template, sessions)).toBe(1);
    expect(upNext(sessions)).toMatchObject({ template: { id: 'own-split-1' }, day: 1 });
    // Deleted: its workouts read as their whole names again.
    registerOwnTraining([], []);
    expect(workoutTitle('Upper · My upper / lower')).toEqual({ title: 'Upper · My upper / lower', plan: null });
    expect(upNext(sessions)).toBeNull();
  });
});
