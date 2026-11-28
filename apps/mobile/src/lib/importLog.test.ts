import { describe, expect, it } from 'vitest';
import { logToCsv } from './insights';
import { matchExercise, newSessions, parseCsv, readDate, readExport } from './importLog';

const NOW = new Date(2026, 10, 28, 12, 0);

describe('reading CSV', () => {
  it('handles quotes, doubled quotes, semicolons and Windows line endings', () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\n1,2,3\r\n')).toEqual([
      ['a', 'b, c', 'say "hi"'],
      ['1', '2', '3'],
    ]);
    expect(parseCsv('a;b\n1,5;2\n')).toEqual([
      ['a', 'b'],
      ['1,5', '2'],
    ]);
  });

  it('reads the dates exports use, as local time', () => {
    expect(readDate('6 Jan 2025, 10:31')?.getTime()).toBe(new Date(2025, 0, 6, 10, 31).getTime());
    expect(readDate('2025-02-01 07:15:00')?.getTime()).toBe(new Date(2025, 1, 1, 7, 15).getTime());
    expect(readDate('2025-02-01T07:15:00Z')?.toISOString()).toBe('2025-02-01T07:15:00.000Z');
    expect(readDate('yesterday')).toBeNull();
  });
});

describe('matching exercises by name', () => {
  it('finds GymGO’s move behind another app’s name', () => {
    const id = (name: string) => matchExercise(name).exerciseId;
    expect(id('Bench Press (Barbell)')).toBe('bench-press');
    expect(id('Bench Press (Dumbbell)')).toBe('db-bench');
    expect(id('Incline Bench Press (Barbell)')).toBe('incline-bench');
    expect(id('Squat (Barbell)')).toBe('back-squat');
    expect(id('Deadlift (Barbell)')).toBe('deadlift');
    expect(id('Lat Pulldown (Cable)')).toBe('pulldown');
    expect(id('Overhead Press (Barbell)')).toBe('ohp');
    expect(id('Pull Up')).toBe('pull-up');
    expect(id('Bicep Curl (Dumbbell)')).toBe('db-curl');
    expect(id('Triceps Pushdown')).toBe('pushdown');
    expect(id('Plank')).toBe('plank');
    expect(id('Barbell bench press')).toBe('bench-press');
  });

  it('keeps one it can’t match under its own name', () => {
    const match = matchExercise('Zercher Carry!');
    expect(match.exercise).toBeNull();
    expect(match.exerciseId).toBe('zercher-carry');
  });
});

describe('reading an export', () => {
  it('reads the layout with weight_kg and duration_seconds columns', () => {
    const csv = [
      '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"',
      '"Push","6 Jan 2025, 10:31","6 Jan 2025, 11:20","Felt strong","Bench Press (Barbell)",,,0,"warmup",40,10,,,',
      '"Push","6 Jan 2025, 10:31","6 Jan 2025, 11:20","Felt strong","Bench Press (Barbell)",,,1,"normal",80,5,,,8',
      '"Push","6 Jan 2025, 10:31","6 Jan 2025, 11:20","Felt strong","Lat Pulldown (Cable)",,,0,"normal",50,10,,,',
      '"Push","6 Jan 2025, 10:31","6 Jan 2025, 11:20","Felt strong","Plank",,,0,"normal",,,,60,',
      '"Push","6 Jan 2025, 10:31","6 Jan 2025, 11:20","Felt strong","Rowing Machine",,,0,"normal",,,0.5,110,',
      '"Legs","8 Jan 2025, 18:00","8 Jan 2025, 19:00","","Squat (Barbell)",,,0,"normal",100,5,,,',
    ].join('\n');
    const result = readExport(csv, 'lb', NOW)!;
    expect(result.format).toBe('columns');
    expect(result.unitInFile).toBe(true);
    expect(result.sessions).toHaveLength(2);
    const push = result.sessions[0]!;
    expect(push).toMatchObject({ name: 'Push', unit: 'kg', note: 'Felt strong', startedAt: new Date(2025, 0, 6, 10, 31).toISOString(), finishedAt: new Date(2025, 0, 6, 11, 20).toISOString() });
    expect(push.exercises).toEqual([
      { exerciseId: 'bench-press', sets: [{ weight: 40, reps: 10, kind: 'warmup' }, { weight: 80, reps: 5, rpe: 8 }] },
      { exerciseId: 'pulldown', sets: [{ weight: 50, reps: 10 }] },
      { exerciseId: 'plank', sets: [{ weight: null, reps: 0, seconds: 60 }] },
      { exerciseId: 'rowing-machine', sets: [{ weight: null, reps: 0, seconds: 110, metres: 500 }] },
    ]);
    expect(result.sessions[1]!.exercises[0]!.exerciseId).toBe('back-squat');
    expect(result.matches.find((match) => match.source === 'Rowing Machine')?.exercise).toBeNull();
  });

  it('reads the layout with Set Order and Duration, in the unit you say, with semicolons', () => {
    const csv = [
      'Date;Workout Name;Duration;Exercise Name;Set Order;Weight;Reps;Distance;Seconds;Notes;Workout Notes;RPE',
      '2025-02-01 07:15:00;Morning;1h 5m;Deadlift (Barbell);W;135;5;0;0;;;',
      '2025-02-01 07:15:00;Morning;1h 5m;Deadlift (Barbell);1;315;3;0;0;;;9',
      '2025-02-01 07:15:00;Morning;1h 5m;Pull Up;1;0;8;0;0;;;',
    ].join('\n');
    const result = readExport(csv, 'lb', NOW)!;
    expect(result.format).toBe('named');
    expect(result.unitInFile).toBe(false);
    const morning = result.sessions[0]!;
    expect(morning.unit).toBe('lb');
    expect(Date.parse(morning.finishedAt) - Date.parse(morning.startedAt)).toBe(65 * 60_000);
    expect(morning.exercises).toEqual([
      { exerciseId: 'deadlift', sets: [{ weight: 135, reps: 5, kind: 'warmup' }, { weight: 315, reps: 3, rpe: 9 }] },
      { exerciseId: 'pull-up', sets: [{ weight: null, reps: 8 }] },
    ]);
  });

  it('reads GymGO’s own export back', () => {
    const csv = logToCsv([
      {
        id: 'a',
        name: 'Upper body',
        unit: 'kg',
        startedAt: new Date(2026, 10, 20, 17, 0).toISOString(),
        finishedAt: new Date(2026, 10, 20, 18, 0).toISOString(),
        workoutId: null,
        gymId: null,
        note: 'Good one',
        exercises: [
          { exerciseId: 'bench-press', sets: [{ weight: 60, reps: 8 }, { weight: 60, reps: 7, kind: 'failure' }] },
          { exerciseId: 'plank', sets: [{ weight: null, reps: 0, seconds: 45 }] },
        ],
      },
    ]);
    const result = readExport(csv, 'lb', NOW)!;
    expect(result.format).toBe('gymgo');
    const session = result.sessions[0]!;
    expect(session).toMatchObject({ name: 'Upper body', unit: 'kg', note: 'Good one', finishedAt: new Date(2026, 10, 20, 18, 0).toISOString() });
    expect(session.exercises).toEqual([
      { exerciseId: 'bench-press', sets: [{ weight: 60, reps: 8 }, { weight: 60, reps: 7, kind: 'failure' }] },
      { exerciseId: 'plank', sets: [{ weight: null, reps: 0, seconds: 45 }] },
    ]);
  });

  it('leaves out workouts with nothing to log or dated in the future, and files it doesn’t know', () => {
    const csv = [
      'Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE',
      '2025-03-01 09:00:00,Warm-ups only,30m,Bench Press (Barbell),W,40,10,,,,,',
      '2027-01-01 09:00:00,Not yet,30m,Bench Press (Barbell),1,60,8,,,,,',
      '2025-03-02 09:00:00,Real,30m,Bench Press (Barbell),1,60,8,,,,,',
    ].join('\n');
    const result = readExport(csv, 'kg', NOW)!;
    expect(result.sessions.map((session) => session.name)).toEqual(['Real']);
    expect(result.skipped).toBe(2);
    expect(readExport('just,some,columns\n1,2,3', 'kg', NOW)).toBeNull();
  });

  it('leaves out workouts already in your log', () => {
    const csv = ['Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps', '2025-03-02 09:00:00,Real,30m,Bench Press (Barbell),1,60,8', '2025-03-04 09:00:00,Another,30m,Bench Press (Barbell),1,62.5,8'].join('\n');
    const result = readExport(csv, 'kg', NOW)!;
    const log = [{ startedAt: new Date(2025, 2, 2, 9, 0, 20).toISOString(), finishedAt: new Date(2025, 2, 2, 9, 30).toISOString() }];
    expect(newSessions(result.sessions, log, result.format).map((session) => session.name)).toEqual(['Another']);
  });
});
