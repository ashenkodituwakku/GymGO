import { describe, expect, it } from 'vitest';
import { OWN_LIMITS, cleanOwnExercise, cleanPlanItems, cleanReps, cleanSplit, isOwnExerciseId } from './ownTraining';

describe('reps as a plan writes them', () => {
  it('tidies counts, ranges, seconds and metres, and refuses the rest', () => {
    expect(cleanReps('8')).toBe('8');
    expect(cleanReps(' 8 - 10 ')).toBe('8–10');
    expect(cleanReps('8–10')).toBe('8–10');
    expect(cleanReps('30s')).toBe('30 s');
    expect(cleanReps('30-45 sec')).toBe('30–45 s');
    expect(cleanReps('40 m')).toBe('40 m');
    for (const bad of ['', 'ten', '0', '10–8', '8–8', '1234', '8 reps', 12]) expect(cleanReps(bad)).toBeNull();
  });
});

describe('an exercise of your own', () => {
  const good = { name: '  Landmine   press ', primary: ['deltoids'], secondary: ['triceps', 'deltoids', 'chest'], kit: ['barbells'], timed: false, cue: 'Press up and out from one shoulder.', drawnAs: 'ohp' };

  it('is kept tidied: one name, a muscle it works second only once, kit at once', () => {
    expect(cleanOwnExercise(good)).toEqual({
      ok: true,
      value: { name: 'Landmine press', primary: ['deltoids'], secondary: ['triceps', 'chest'], kit: ['barbells'], timed: false, cue: 'Press up and out from one shoulder.', drawnAs: 'ohp' },
    });
    // Body weight, no icon, nothing said: all fine.
    expect(cleanOwnExercise({ name: 'Ring row', primary: ['upper-back'] })).toEqual({
      ok: true,
      value: { name: 'Ring row', primary: ['upper-back'], secondary: [], kit: [], timed: false, cue: '', drawnAs: null },
    });
  });

  it('says what’s wrong rather than keeping something GymGO can’t use', () => {
    const problem = (over: Record<string, unknown>) => {
      const result = cleanOwnExercise({ ...good, ...over });
      return result.ok ? null : result.problem;
    };
    expect(problem({ name: 'x' })).toMatch(/name of 2 to 60/);
    expect(problem({ name: 'y'.repeat(OWN_LIMITS.name + 1) })).toMatch(/name of 2 to 60/);
    expect(problem({ primary: [] })).toMatch(/one or two muscles/);
    expect(problem({ primary: ['chest', 'biceps', 'abs'] })).toMatch(/one or two muscles/);
    expect(problem({ primary: ['neck'] })).toMatch(/one or two muscles/);
    expect(problem({ secondary: ['wings'] })).toMatch(/aren’t ones GymGO knows/);
    expect(problem({ kit: ['kettlebell'] })).toMatch(/kit isn’t/);
    expect(problem({ kit: ['bench', 'barbells', 'power_rack', 'dumbbells'] })).toMatch(/up to three/);
    expect(problem({ cue: 'z'.repeat(201) })).toMatch(/200 characters/);
    // Its icon is one of GymGO's drawings, never another of your own (or anything else).
    expect(problem({ drawnAs: 'mine-abcdefghij' })).toMatch(/one of GymGO’s/);
    expect(problem({ drawnAs: '<script>' })).toMatch(/one of GymGO’s/);
  });

  it('has an id of its own the server makes', () => {
    expect(isOwnExerciseId('mine-a1b2c3d4e5')).toBe(true);
    expect(isOwnExerciseId('bench-press')).toBe(false);
    expect(isOwnExerciseId('mine-short')).toBe(false);
  });
});

describe('a split of your own', () => {
  const day = (name: string, ids = ['bench-press', 'bb-row']) => ({ name, items: ids.map((exerciseId) => ({ exerciseId, sets: 3, reps: '8-10', restSeconds: 90 })) });

  it('is kept tidied, reps written the usual way', () => {
    const result = cleanSplit({ name: ' My  upper / lower ', days: [day('Upper'), day('Lower', ['back-squat'])] });
    expect(result.ok && result.value.name).toBe('My upper / lower');
    expect(result.ok && result.value.days[0]!.items[0]).toEqual({ exerciseId: 'bench-press', sets: 3, reps: '8–10', restSeconds: 90 });
  });

  it('keeps a superset’s letter only on exercises side by side', () => {
    const items = [
      { exerciseId: 'a', sets: 3, reps: '10', restSeconds: 60, group: 'A' },
      { exerciseId: 'b', sets: 3, reps: '10', restSeconds: 60, group: 'A' },
      { exerciseId: 'c', sets: 3, reps: '10', restSeconds: 60, group: 'B' },
      { exerciseId: 'd', sets: 3, reps: '10', restSeconds: 60 },
      { exerciseId: 'e', sets: 3, reps: '10', restSeconds: 60, group: 'Z' },
    ];
    const cleaned = cleanPlanItems(items, 'Upper');
    expect(cleaned.ok && cleaned.value.map((item) => item.group ?? '-')).toEqual(['A', 'A', '-', '-', '-']);
  });

  it('says what’s wrong, naming the day and exercise', () => {
    const problem = (input: unknown) => {
      const result = cleanSplit(input);
      return result.ok ? null : result.problem;
    };
    expect(problem({ name: 'Mine', days: [] })).toBe('Add at least one day.');
    expect(problem({ name: 'Mine', days: Array.from({ length: 8 }, (_, at) => day(`Day ${at + 1}`)) })).toBe('Up to 7 days in a split.');
    expect(problem({ name: 'Push · Pull', days: [day('A')] })).toMatch(/Leave “ · ” out/);
    expect(problem({ name: 'Mine', days: [day('Upper'), day('upper')] })).toMatch(/Two days are called/);
    expect(problem({ name: 'Mine', days: [{ name: 'Upper', items: [] }] })).toBe('Upper: add at least one exercise.');
    expect(problem({ name: 'Mine', days: [day('Upper', ['bench-press', 'bench-press'])] })).toMatch(/Upper, exercise 2 is in this day twice/);
    expect(problem({ name: 'Mine', days: [{ name: 'Upper', items: [{ exerciseId: 'bench-press', sets: 11, reps: '8', restSeconds: 60 }] }] })).toBe('Upper, exercise 1: 1 to 10 sets.');
    expect(problem({ name: 'Mine', days: [{ name: 'Upper', items: [{ exerciseId: 'bench-press', sets: 3, reps: 'lots', restSeconds: 60 }] }] })).toMatch(/reps as a number/);
    expect(problem({ name: 'Mine', days: [{ name: 'Upper', items: [{ exerciseId: 'bench-press', sets: 3, reps: '8', restSeconds: 900 }] }] })).toMatch(/up to 10 minutes/);
    expect(problem({ name: 'Mine', days: [{ name: 'Upper', items: [{ exerciseId: 'Bench Press!', sets: 3, reps: '8', restSeconds: 60 }] }] })).toMatch(/isn’t an exercise/);
  });
});
